#!/bin/bash
# 批量项目生成脚本
# 用法: bash scripts/batch_generate.sh topics.txt
# topics.txt 格式（每行一个主题）:
#   谢谢|Thank You|beginner|A_55s|cute|DailyMandarin|learn chinese thank you

set -euo pipefail

TOPICS_FILE="${1:-}"
if [ -z "$TOPICS_FILE" ] || [ ! -f "$TOPICS_FILE" ]; then
    echo "❌ 用法: bash scripts/batch_generate.sh <topics_file>"
    echo "   topics.txt格式: 中文主题|英文主题|人群|模板|风格|系列标签|SEO关键词"
    exit 1
fi

echo "📦 批量生成项目..."

count=0
failed=0
while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    IFS='|' read -r topic_cn topic_en audience template style series seo <<< "$line"
    [ -z "$topic_cn" ] && continue
    [[ "$topic_cn" == \#* ]] && continue

    echo ""
    echo "━━━ 生成: $topic_cn / $topic_en ━━━"

    if printf "%s\n%s\n%s\n%s\n%s\n%s\n%s\n" \
        "$topic_cn" \
        "$topic_en" \
        "$audience" \
        "$template" \
        "$style" \
        "$series" \
        "$seo" | python3 scripts/generate_project.py; then
        count=$((count + 1))
    else
        failed=$((failed + 1))
        echo "❌ 本行生成失败，继续处理后续主题: $topic_cn" >&2
    fi
done < "$TOPICS_FILE"

echo ""
echo "📦 批量处理完成：成功 $count 个，失败 $failed 个"
[ "$failed" -eq 0 ]
