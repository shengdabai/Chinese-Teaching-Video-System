#!/bin/bash
# 添加片头片尾，并给静音片段补齐音轨，避免丢失正文旁白。
# 用法: bash scripts/add_intro_outro.sh <project_id>
set -euo pipefail

PROJECT_ID="${1:-}"
if [ -z "$PROJECT_ID" ]; then
    echo "❌ 用法: bash scripts/add_intro_outro.sh <project_id>"
    exit 1
fi

PROJECT_DIR="projects/$PROJECT_ID"
mkdir -p "$PROJECT_DIR/logs"
python3 - "$PROJECT_DIR" "$PROJECT_ID" <<'PY'
import json
import math
from pathlib import Path
import subprocess
import sys

project = Path(sys.argv[1])
log_path = project / 'logs/add_intro_outro.log'
try:
    main = project / 'output/rough_cut_with_audio.mp4'
    if not main.is_file():
        raise ValueError(f'Missing main video: {main}')
    clips = [p for p in (Path('assets/brand/intro/intro_1s.mp4'), main,
                         Path('assets/brand/outro/cta_3s.mp4')) if p.is_file()]
    metadata = []
    for clip in clips:
        clip.resolve().relative_to(Path.cwd().resolve())
        probe = subprocess.run(['ffprobe', '-v', 'error', '-show_format', '-show_streams',
                                '-of', 'json', str(clip)], capture_output=True, text=True, check=True)
        data = json.loads(probe.stdout)
        duration = float(data['format']['duration'])
        if not math.isfinite(duration) or duration <= 0:
            raise ValueError(f'Invalid clip duration: {clip}')
        metadata.append((data, duration))
    main_data = metadata[clips.index(main)][0]
    video = next(s for s in main_data['streams'] if s['codec_type'] == 'video')
    width, height = int(video['width']), int(video['height'])
    inputs, filters, labels = [], [], []
    for index, (clip, (data, duration)) in enumerate(zip(clips, metadata)):
        inputs.extend(['-i', str(clip)])
        filters.append(f'[{index}:v]scale={width}:{height}:force_original_aspect_ratio=decrease,'
                       f'pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,'
                       f'setpts=PTS-STARTPTS[v{index}]')
        if any(s['codec_type'] == 'audio' for s in data['streams']):
            filters.append(f'[{index}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,'
                           f'apad,atrim=duration={duration},asetpts=PTS-STARTPTS[a{index}]')
        else:
            filters.append(f'anullsrc=r=48000:cl=stereo,atrim=duration={duration},'
                           f'asetpts=PTS-STARTPTS[a{index}]')
        labels.append(f'[v{index}][a{index}]')
    filters.append(''.join(labels) + f'concat=n={len(clips)}:v=1:a=1[v][a]')
    output = project / f'output/final_{sys.argv[2]}.mp4'
    command = ['ffmpeg', '-y', *inputs, '-filter_complex', ';'.join(filters), '-map', '[v]',
               '-map', '[a]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-c:a', 'aac',
               '-b:a', '192k', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(output)]
    with log_path.open('w', encoding='utf-8') as log:
        subprocess.run(command, stderr=log, check=True)
    print(f'✅ 最终成片: {output}')
    if sum(duration for _, duration in metadata) > 60:
        print('⚠️ 警告：视频时长超过60秒！YouTube Shorts要求≤60秒')
except (OSError, ValueError, KeyError, StopIteration, subprocess.CalledProcessError) as error:
    print(f'❌ 片头片尾拼接失败: {error}; FFmpeg 日志: {log_path}', file=sys.stderr)
    sys.exit(1)
PY
