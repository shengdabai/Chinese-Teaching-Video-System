#!/usr/bin/env python3
"""
质量检查脚本
用法: python scripts/quality_check.py <project_id>
"""

import os
import json
import math
import subprocess
import sys


def main():
    if len(sys.argv) < 2:
        print("❌ 用法: python scripts/quality_check.py <project_id>")
        sys.exit(1)

    project_arg = os.path.normpath(sys.argv[1])
    project_dir = project_arg if os.path.isdir(project_arg) else os.path.join("projects", project_arg)
    project_id = os.path.basename(project_dir)

    if not os.path.isdir(project_dir):
        print(f"❌ 项目目录不存在: {project_dir}")
        sys.exit(1)

    print("🔍 质量检查开始...")
    print("=" * 60)

    checks = []
    required_files = [
        "01_brief.md",
        "02_script.json",
        "03_shotlist.csv",
        "04_character_sheet.md",
        "05_image_prompts.md",
        "06_video_prompts.md",
        "07_subtitles.srt",
        "08_voiceover.txt",
        "09_seo_package.md",
        "10_edit_manifest.json"
    ]

    contents = {}
    for filename in required_files:
        filepath = os.path.join(project_dir, filename)
        try:
            with open(filepath, "r", encoding="utf-8") as handle:
                content = handle.read()
            valid = bool(content.strip())
            contents[filename] = content
        except (OSError, UnicodeError):
            valid = False
        checks.append(("文件完整性", filename, "PASS" if valid else "FAIL", "" if valid else "🔴"))
        if valid and filename.endswith(".json"):
            try:
                if not isinstance(json.loads(content), dict):
                    raise ValueError("项目 JSON 顶层必须为对象")
                checks.append(("JSON格式", filename, "PASS", ""))
            except ValueError:
                checks.append(("JSON格式", f"{filename} 不是有效的 JSON 对象", "FAIL", "🔴"))

    todo_count = 0
    for filename in required_files:
        filepath = os.path.join(project_dir, filename)
        if filename in contents:
            content = contents[filename]
            count = content.count("[TODO")
            if count > 0:
                todo_count += count
                checks.append(("内容完整性", f"{filename} 有 {count} 个 [TODO] 未填写", "WARN", "🟡"))
    if todo_count == 0:
        checks.append(("内容完整性", "所有[TODO]已填写", "PASS", ""))

    final_video = os.path.join(project_dir, "output", f"final_{project_id}.mp4")
    if os.path.exists(final_video):
        try:
            result = subprocess.run(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", final_video],
                capture_output=True,
                text=True,
                check=True,
                timeout=30
            )
            duration = float(result.stdout.strip())
            if not math.isfinite(duration) or duration <= 0:
                checks.append(("视频时长", "时长必须为有限正数", "FAIL", "🔴"))
            elif duration > 60:
                checks.append(("视频时长", f"{duration:.1f}秒 (超过60秒!)", "FAIL", "🔴"))
            elif duration > 58:
                checks.append(("视频时长", f"{duration:.1f}秒 (接近上限)", "WARN", "🟡"))
            else:
                checks.append(("视频时长", f"{duration:.1f}秒", "PASS", ""))
        except (OSError, ValueError, subprocess.SubprocessError):
            checks.append(("视频时长", "无法检测，请检查 ffprobe 和视频文件", "FAIL", "🔴"))

        try:
            result = subprocess.run(
                ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", final_video],
                capture_output=True,
                text=True,
                check=True,
                timeout=30
            )
            dims = result.stdout.strip()
            if dims in ("1080,1920", "1080x1920"):
                checks.append(("分辨率", "1080x1920 ✓", "PASS", ""))
            else:
                checks.append(("分辨率", f"{dims} (应为1080x1920)", "FAIL", "🔴"))
        except (OSError, ValueError, subprocess.SubprocessError):
            checks.append(("分辨率", "无法检测，请检查 ffprobe 和视频文件", "FAIL", "🔴"))
    else:
        checks.append(("最终视频", "文件不存在", "FAIL", "🔴"))

    seo_path = os.path.join(project_dir, "09_seo_package.md")
    if "09_seo_package.md" in contents:
        seo_content = contents["09_seo_package.md"]
        if "YouTube Title" in seo_content and "[TODO" not in seo_content:
            checks.append(("SEO就绪", "标题和描述已填写", "PASS", ""))
        else:
            checks.append(("SEO就绪", "SEO包未完成", "WARN", "🟡"))

    checks.append(("AI标注", "⚠️ 上传时必须勾选 'Altered or synthetic content'", "REMIND", "⚠️"))

    print(f"\n{'类别':<15} {'检查项':<45} {'结果':<8} {'标记'}")
    print("-" * 75)

    fail_count = 0
    warn_count = 0
    for category, item, result, flag in checks:
        print(f"{category:<15} {item:<45} {result:<8} {flag}")
        if result == "FAIL":
            fail_count += 1
        elif result == "WARN":
            warn_count += 1

    print("\n" + "=" * 60)
    if fail_count > 0:
        print(f"❌ 有 {fail_count} 个必须修复的问题")
    elif warn_count > 0:
        print(f"⚠️  有 {warn_count} 个警告，建议处理后再发布")
    else:
        print("✅ 所有检查通过！可以发布")

    return 1 if fail_count > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
