#!/bin/bash
# 素材预处理脚本：统一所有原始素材的格式、比例、帧率
# 用法: bash scripts/normalize_clips.sh <project_id>

set -euo pipefail
shopt -s nullglob

PROJECT_ID="${1:-}"
if [ -z "$PROJECT_ID" ]; then
    echo "❌ 用法: bash scripts/normalize_clips.sh <project_id>"
    exit 1
fi

source "$(dirname "${BASH_SOURCE[0]}")/project_guard.sh" "$PROJECT_ID"

PROJECT_DIR="projects/$PROJECT_ID"
RAW_DIR="$PROJECT_DIR/raw_clips"
NORM_DIR="$PROJECT_DIR/normalized"
LOG_DIR="$PROJECT_DIR/logs"

mkdir -p "$NORM_DIR" "$LOG_DIR"

WIDTH=1080
HEIGHT=1920
FPS=30

echo "🔄 开始预处理素材..."
echo "📁 输入目录: $RAW_DIR"
echo "📁 输出目录: $NORM_DIR"

files=("$RAW_DIR"/*.mp4 "$RAW_DIR"/*.mov "$RAW_DIR"/*.webm "$RAW_DIR"/*.avi)
if [ "${#files[@]}" -eq 0 ]; then
    echo "⚠️  没有找到可处理的原始视频文件"
    exit 0
fi

count=0
for file in "${files[@]}"; do
    [ -f "$file" ] || continue

    filename="$(basename "$file")"
    name="${filename%.*}"
    output="$NORM_DIR/${name}.mp4"

    echo "  处理: $filename"

    ffmpeg -y -i "$file" \
        -vf "scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2:black,setsar=1" \
        -r "$FPS" \
        -c:v libx264 -preset medium -crf 20 \
        -c:a aac -b:a 192k -ar 44100 \
        -pix_fmt yuv420p \
        -movflags +faststart \
        "$output" \
        2>"$LOG_DIR/normalize_${name}.log"

    count=$((count + 1))
done

echo "✅ 预处理完成！共处理 $count 个文件"
echo "📁 输出目录: $NORM_DIR"
