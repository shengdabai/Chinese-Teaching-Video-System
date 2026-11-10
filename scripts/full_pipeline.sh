#!/bin/bash
# 一键全流程脚本
# 用法: bash scripts/full_pipeline.sh <project_id>

set -euo pipefail

PROJECT_ID="${1:-}"
if [ -z "$PROJECT_ID" ]; then
    echo "❌ 用法: bash scripts/full_pipeline.sh <project_id>"
    exit 1
fi

source "$(dirname "${BASH_SOURCE[0]}")/project_guard.sh" "$PROJECT_ID"

echo "🐼 ═══════════════════════════════════════════"
echo "   AI中文教学视频 — 一键生产流水线"
echo "   项目: $PROJECT_ID"
echo "═══════════════════════════════════════════════"

echo ""
echo "📦 Step 1/5: 素材预处理..."
bash scripts/normalize_clips.sh "$PROJECT_ID"

echo ""
echo "🎬 Step 2/5: 自动拼接时间线..."
bash scripts/auto_edit.sh "$PROJECT_ID"

echo ""
echo "📝 Step 3/5: 字幕烧录..."
bash scripts/burn_subtitles.sh "$PROJECT_ID"

echo ""
echo "🎵 Step 4/5: 音频混合..."
bash scripts/mix_audio.sh "$PROJECT_ID"

echo ""
echo "🎞️  Step 5/5: 添加片头片尾..."
bash scripts/add_intro_outro.sh "$PROJECT_ID"

echo ""
echo "═══════════════════════════════════════════════"
echo "✅ 全流程完成！"
echo ""
echo "📁 最终文件: projects/$PROJECT_ID/output/final_${PROJECT_ID}.mp4"
echo ""
echo "⏭️  后续步骤："
echo "   1. 用剪映/CapCut打开最终文件，做美化微调"
echo "   2. 检查质量清单: python scripts/quality_check.py $PROJECT_ID"
echo "   3. 上传YouTube Studio，填写SEO信息（见 09_seo_package.md）"
echo "   4. ⚠️  勾选 'Altered or synthetic content' 选项"
echo "═══════════════════════════════════════════════"
