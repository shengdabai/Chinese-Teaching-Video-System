#!/bin/bash
# 字幕烧录脚本
# 用法: bash scripts/burn_subtitles.sh <project_id>

set -euo pipefail

PROJECT_ID="${1:-}"
if [ -z "$PROJECT_ID" ]; then
    echo "❌ 用法: bash scripts/burn_subtitles.sh <project_id>"
    exit 1
fi

source "$(dirname "${BASH_SOURCE[0]}")/project_guard.sh" "$PROJECT_ID"

PROJECT_DIR="projects/$PROJECT_ID"
INPUT="$PROJECT_DIR/output/rough_cut_no_audio.mp4"
SUBTITLE="$PROJECT_DIR/07_subtitles.ass"
OUTPUT="$PROJECT_DIR/output/rough_cut_subtitled.mp4"
LOG_DIR="$PROJECT_DIR/logs"

mkdir -p "$LOG_DIR"

if [ ! -f "$INPUT" ]; then
    echo "❌ 找不到输入视频: $INPUT"
    exit 1
fi

SRT_FILE="$PROJECT_DIR/07_subtitles.srt"
if [ ! -f "$SUBTITLE" ] && [ -f "$SRT_FILE" ]; then
    echo "  📝 将SRT转换为ASS格式..."
    ffmpeg -y -i "$SRT_FILE" "$SUBTITLE" 2>"$LOG_DIR/srt_to_ass.log"
fi

if [ ! -f "$SUBTITLE" ]; then
    echo "⚠️  字幕文件不存在，跳过字幕烧录"
    cp "$INPUT" "$OUTPUT"
    exit 0
fi

echo "📝 烧录字幕..."
ffmpeg -y -i "$INPUT" \
    -vf "ass=$SUBTITLE" \
    -c:v libx264 -preset slow -crf 18 \
    -pix_fmt yuv420p \
    "$OUTPUT" \
    2>"$LOG_DIR/burn_subtitles.log"

echo "✅ 字幕烧录完成: $OUTPUT"
