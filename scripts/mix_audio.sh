#!/bin/bash
# 音频混合脚本：旁白 + BGM（自动ducking）
# 用法: bash scripts/mix_audio.sh <project_id>

set -euo pipefail

PROJECT_ID="${1:-}"
if [ -z "$PROJECT_ID" ]; then
    echo "❌ 用法: bash scripts/mix_audio.sh <project_id>"
    exit 1
fi

PROJECT_DIR="projects/$PROJECT_ID"
VIDEO_INPUT="$PROJECT_DIR/output/rough_cut_subtitled.mp4"
OUTPUT="$PROJECT_DIR/output/rough_cut_with_audio.mp4"
LOG_DIR="$PROJECT_DIR/logs"

mkdir -p "$LOG_DIR"

if [ ! -f "$VIDEO_INPUT" ]; then
    echo "❌ 找不到输入视频: $VIDEO_INPUT"
    exit 1
fi

VOICEOVER=""
for ext in wav mp3 aac m4a; do
    if [ -f "$PROJECT_DIR/08_voiceover_audio.$ext" ]; then
        VOICEOVER="$PROJECT_DIR/08_voiceover_audio.$ext"
        break
    fi
done

BGM="$(find assets/bgm/ -type f \( -name "*.mp3" -o -name "*.wav" -o -name "*.aac" -o -name "*.m4a" \) | head -1 || true)"

if [ -z "$VOICEOVER" ] && [ -z "$BGM" ]; then
    echo "⚠️  没有找到旁白或 BGM，保留视频原音"
    cp "$VIDEO_INPUT" "$OUTPUT"
    exit 0
fi

echo "🎵 混合音频..."

if [ -n "$VOICEOVER" ] && [ -n "$BGM" ]; then
    ffmpeg -y -i "$VIDEO_INPUT" -i "$VOICEOVER" -stream_loop -1 -i "$BGM" \
        -filter_complex "[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=1.0,apad,asplit=2[vo_mix][vo_sidechain]; \
                         [2:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=0.3[bgm_raw]; \
                         [bgm_raw][vo_sidechain]sidechaincompress=threshold=0.02:ratio=8:attack=200:release=1000[bgm_ducked]; \
                         [vo_mix][bgm_ducked]amix=inputs=2:duration=first:dropout_transition=2[aout]" \
        -map 0:v -map "[aout]" \
        -c:v copy -c:a aac -b:a 192k \
        -shortest \
        "$OUTPUT" \
        2>"$LOG_DIR/mix_audio.log"
elif [ -n "$VOICEOVER" ]; then
    ffmpeg -y -i "$VIDEO_INPUT" -i "$VOICEOVER" \
        -map 0:v -map 1:a \
        -af apad \
        -c:v copy -c:a aac -b:a 192k \
        -shortest \
        "$OUTPUT" \
        2>"$LOG_DIR/mix_audio.log"
else
    DURATION="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VIDEO_INPUT")"
    ffmpeg -y -i "$VIDEO_INPUT" -stream_loop -1 -i "$BGM" \
        -filter_complex "[1:a]volume=0.3,atrim=0:${DURATION}[aout]" \
        -map 0:v -map "[aout]" \
        -c:v copy -c:a aac -b:a 192k \
        -shortest \
        "$OUTPUT" \
        2>"$LOG_DIR/mix_audio.log"
fi

echo "✅ 音频混合完成: $OUTPUT"
