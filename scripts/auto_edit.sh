#!/bin/bash
# 按 manifest 裁剪并拼接正文；片头片尾仅由 add_intro_outro.sh 添加。
# 用法: bash scripts/auto_edit.sh <project_id>
set -euo pipefail

PROJECT_ID="${1:-}"
if [ -z "$PROJECT_ID" ]; then
    echo "❌ 用法: bash scripts/auto_edit.sh <project_id>"
    exit 1
fi

source "$(dirname "${BASH_SOURCE[0]}")/project_guard.sh" "$PROJECT_ID"

PROJECT_DIR="projects/$PROJECT_ID"
OUTPUT_DIR="$PROJECT_DIR/output"
LOG_DIR="$PROJECT_DIR/logs"
mkdir -p "$OUTPUT_DIR" "$LOG_DIR"

python3 - "$PROJECT_DIR/10_edit_manifest.json" "$OUTPUT_DIR/rough_cut_no_audio.mp4" "$LOG_DIR/concat.log" <<'PY'
import json
import math
from pathlib import Path
import subprocess
import sys


def number(value):
    if isinstance(value, bool):
        raise ValueError('Invalid trim time')
    result = float(value)
    if not math.isfinite(result) or result < 0:
        raise ValueError('Trim times must be finite and non-negative')
    return result


try:
    manifest = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    inputs, filters, labels = [], [], []
    audio_filters, has_audio = [], False
    for item in manifest['timeline']:
        if item.get('type') in ('brand_intro', 'brand_outro'):
            continue
        source = Path(item['source']).resolve()
        # Only local workspace media may be read; no URLs or outside symlinks.
        source.relative_to(Path.cwd().resolve())
        if not source.is_file():
            raise ValueError(f'Missing clip: {item["source"]}')
        start = number(item.get('start_trim', 0))
        end = number(item['end_trim']) if 'end_trim' in item else start + number(item['duration'])
        if end <= start:
            raise ValueError('end_trim must be greater than start_trim')
        probe = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=codec_type',
                                '-of', 'json', str(source)], capture_output=True, text=True, check=True)
        metadata = json.loads(probe.stdout)
        if end > number(metadata['format']['duration']) + 0.04:
            raise ValueError(f'Trim exceeds clip duration: {item["source"]}')
        index = len(labels)
        inputs.extend(['-i', str(source)])
        filters.append(f'[{index}:v]trim=start={start}:end={end},setpts=PTS-STARTPTS,fps=30,setsar=1[v{index}]')
        labels.append(f'[v{index}]')
        if any(stream['codec_type'] == 'audio' for stream in metadata.get('streams', [])):
            has_audio = True
            audio_filters.append(f'[{index}:a:0]atrim=start={start}:end={end},asetpts=PTS-STARTPTS,'
                                 f'aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,'
                                 f'apad,atrim=duration={end-start}[a{index}]')
        else:
            audio_filters.append(f'anullsrc=r=44100:cl=stereo,atrim=duration={end-start},'
                                 f'asetpts=PTS-STARTPTS[a{index}]')
        if any(item.get(key, 'none') != 'none' for key in ('transition_in', 'transition_out')):
            print('⚠️ 转场元数据暂不执行；正文使用硬切。', file=sys.stderr)
    if not labels:
        raise ValueError('Timeline contains no shot clips')
    if has_audio:
        filters.extend(audio_filters)
        filters.append(''.join(f'[v{i}][a{i}]' for i in range(len(labels)))
                       + f'concat=n={len(labels)}:v=1:a=1[outv][outa]')
        audio_options = ['-map', '[outa]', '-c:a', 'aac', '-b:a', '192k']
    else:
        filters.append(''.join(labels) + f'concat=n={len(labels)}:v=1:a=0[outv]')
        audio_options = ['-an']
    command = ['ffmpeg', '-y', *inputs, '-filter_complex', ';'.join(filters), '-map', '[outv]',
               *audio_options, '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', sys.argv[2]]
    with open(sys.argv[3], 'w', encoding='utf-8') as log:
        subprocess.run(command, stderr=log, check=True)
    print(f'✅ Rough cut 生成完成: {sys.argv[2]}')
except (OSError, ValueError, KeyError, TypeError, AttributeError, subprocess.CalledProcessError) as error:
    print(f'❌ 自动剪辑失败: {error}; FFmpeg 日志: {sys.argv[3]}', file=sys.stderr)
    sys.exit(1)
PY
