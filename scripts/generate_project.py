#!/usr/bin/env python3
"""
AI中文教学视频 — 项目生成器
用法: python generate_project.py

运行后交互式输入:
- 主题（中英文）
- 目标人群
- 视频时长模板（55s/35s）
- 风格
- 系列标签
- SEO关键词

输出：在 projects/ 目录下创建完整的项目文件夹，包含10份模板文件。
"""

import csv
import json
import os
import re
import shutil
from datetime import datetime


def main():
    print("=" * 60)
    print("🐼 AI中文教学视频 — 新项目生成器")
    print("=" * 60)

    topic_cn = input("主题（中文，如：谢谢）: ").strip()
    topic_en = input("主题（英文，如：Thank You）: ").strip()
    audience = input("目标人群 (beginner/intermediate/business/children) [beginner]: ").strip() or "beginner"
    template = input("模板类型 (A_55s/B_35s) [A_55s]: ").strip() or "A_55s"
    style = input("风格 (cute/professional/casual) [cute]: ").strip() or "cute"
    series_tag = input("系列标签 (如 DailyMandarin): ").strip() or "DailyMandarin"
    seo_keywords = input("SEO关键词（逗号分隔）: ").strip()

    date_str = datetime.now().strftime("%Y%m%d")
    topic_slug = re.sub(r"[^a-z0-9]+", "_", topic_en.lower()).strip("_")[:30]
    if not topic_cn or not topic_slug:
        raise SystemExit("❌ 请填写中文主题和包含英文字母或数字的英文主题")
    if template not in ("A_55s", "B_35s"):
        raise SystemExit("❌ 模板必须为 A_55s 或 B_35s")
    project_id = f"{date_str}_{topic_slug}"

    project_dir = os.path.join("projects", project_id)
    if os.path.islink("projects"):
        raise SystemExit("❌ projects 目录不能是符号链接，未写入任何文件")
    try:
        os.makedirs(project_dir, exist_ok=False)
    except FileExistsError:
        raise SystemExit(f"❌ 项目已存在，未覆盖任何文件: {project_dir}") from None
    for subdir in ["raw_clips", "normalized", "keyframes", "output", "logs"]:
        subdir_path = os.path.join(project_dir, subdir)
        os.makedirs(subdir_path, exist_ok=True)
        write_raw_file(os.path.join(subdir_path, ".gitkeep"), "")

    character_sheet_path = os.path.join("config", "character_sheet.md")
    character_block_en = ""
    character_block_cn = ""
    if os.path.exists(character_sheet_path):
        with open(character_sheet_path, "r", encoding="utf-8") as handle:
            content = handle.read()
            if "[CHARACTER_BLOCK_EN]" in content and "[/CHARACTER_BLOCK_EN]" in content:
                character_block_en = content.split("[CHARACTER_BLOCK_EN]")[1].split("[/CHARACTER_BLOCK_EN]")[0].strip()
            if "[CHARACTER_BLOCK_CN]" in content and "[/CHARACTER_BLOCK_CN]" in content:
                character_block_cn = content.split("[CHARACTER_BLOCK_CN]")[1].split("[/CHARACTER_BLOCK_CN]")[0].strip()

    brand_config = {}
    brand_config_path = os.path.join("config", "brand_config.json")
    if os.path.exists(brand_config_path):
        with open(brand_config_path, "r", encoding="utf-8") as handle:
            brand_config = json.load(handle)

    if template == "A_55s":
        total_duration = 55
        shots_config = [
            {"num": 1, "name": "Hook", "start": "00:00:00.000", "end": "00:00:04.000", "dur": 4, "platform": "pixverse", "camera": "medium shot, front, static", "action": "surprised expression"},
            {"num": 2, "name": "Vocab_Display", "start": "00:00:04.000", "end": "00:00:10.000", "dur": 6, "platform": "pixverse", "camera": "medium shot, front, static", "action": "pointing at chalkboard"},
            {"num": 3, "name": "Pronunciation", "start": "00:00:10.000", "end": "00:00:20.000", "dur": 10, "platform": "pixverse", "camera": "close-up, front, slow push", "action": "talking gesture, nodding to rhythm"},
            {"num": 4, "name": "Scene_1", "start": "00:00:20.000", "end": "00:00:30.000", "dur": 10, "platform": "pixverse", "camera": "medium shot, slight angle", "action": "dialogue scene"},
            {"num": 5, "name": "Scene_2", "start": "00:00:30.000", "end": "00:00:40.000", "dur": 10, "platform": "jimeng", "camera": "medium shot, front", "action": "dialogue scene, different environment"},
            {"num": 6, "name": "Quiz", "start": "00:00:40.000", "end": "00:00:48.000", "dur": 8, "platform": "pixverse", "camera": "medium shot, front, static", "action": "thinking pose"},
            {"num": 7, "name": "CTA", "start": "00:00:48.000", "end": "00:00:55.000", "dur": 7, "platform": "reusable", "camera": "medium shot, front, static", "action": "waving goodbye"}
        ]
    else:
        total_duration = 35
        shots_config = [
            {"num": 1, "name": "Controversy_Hook", "start": "00:00:00.000", "end": "00:00:03.000", "dur": 3, "platform": "pixverse", "camera": "close-up, front", "action": "shocked expression"},
            {"num": 2, "name": "Wrong_Demo", "start": "00:00:03.000", "end": "00:00:10.000", "dur": 7, "platform": "pixverse", "camera": "medium shot", "action": "exaggerated wrong pronunciation"},
            {"num": 3, "name": "Correct_Demo", "start": "00:00:10.000", "end": "00:00:20.000", "dur": 10, "platform": "pixverse", "camera": "medium close-up", "action": "clear correct pronunciation"},
            {"num": 4, "name": "Quick_Scene", "start": "00:00:20.000", "end": "00:00:30.000", "dur": 10, "platform": "pixverse", "camera": "medium shot", "action": "quick dialogue"},
            {"num": 5, "name": "CTA", "start": "00:00:30.000", "end": "00:00:35.000", "dur": 5, "platform": "reusable", "camera": "medium shot, front", "action": "waving"}
        ]

    brief_content = f"""# Project Brief — {project_id}

## 基本信息
- **项目ID**: {project_id}
- **主题**: {topic_cn} / {topic_en}
- **目标人群**: {audience}
- **模板**: {template}
- **风格**: {style}
- **系列标签**: #{series_tag}
- **目标时长**: {total_duration}秒
- **创建时间**: {datetime.now().strftime("%Y-%m-%d %H:%M")}

## 教学目标
- 学习者能正确发音「{topic_cn}」
- 学习者理解该词的含义和使用场景
- 学习者能在至少2个场景中正确使用

## 核心词汇
| 汉字 | 拼音 | 英文 | 词性 |
|------|------|------|------|
| {topic_cn} | [填写拼音] | {topic_en} | [填写词性] |

## CTA
- 主CTA: Follow for daily Chinese lessons!
- 次CTA: Comment your answer below!

## 发布信息
- 平台: YouTube Shorts
- 比例: 9:16 (1080x1920)
- AI内容标注: 必须在YouTube Studio勾选
"""
    write_file(project_dir, "01_brief.md", brief_content)

    script = {
        "project_id": project_id,
        "topic_cn": topic_cn,
        "topic_en": topic_en,
        "template_type": template,
        "target_audience": audience,
        "style": style,
        "series_tag": series_tag,
        "total_duration_target": total_duration,
        "shots": []
    }
    for shot in shots_config:
        script["shots"].append({
            "shot_number": shot["num"],
            "shot_name": shot["name"],
            "start_time": shot["start"],
            "end_time": shot["end"],
            "duration_seconds": shot["dur"],
            "voiceover_text_en": f"[TODO: Write EN voiceover for {shot['name']}]",
            "voiceover_text_cn": f"[TODO: Write CN voiceover for {shot['name']}]",
            "character_action": shot["action"],
            "environment": "[TODO: Specify environment]",
            "camera": shot["camera"],
            "generation_platform": shot["platform"],
            "reusable_asset": None if shot["platform"] != "reusable" else "[TODO: Specify asset filename]",
            "on_screen_text": {
                "chinese": "",
                "pinyin": "",
                "english": ""
            }
        })
    script["audio"] = {
        "voiceover_language": "en+cn",
        "voiceover_style": "friendly, clear, slightly slow",
        "bgm_mood": "upbeat, cute" if style == "cute" else "calm, professional",
        "bgm_file": "[TODO: Select BGM file]"
    }
    script["seo"] = {
        "title": f'How to Say "{topic_en}" in Chinese 🇨🇳 {topic_cn} | Learn Mandarin',
        "description": f"Learn to say {topic_cn} in Chinese! Perfect for beginners.",
        "tags": [keyword.strip() for keyword in seo_keywords.split(",")] if seo_keywords else [],
        "thumbnail_text": f"{topic_cn} = {topic_en}"
    }
    write_file(project_dir, "02_script.json", json.dumps(script, indent=2, ensure_ascii=False))

    csv_path = os.path.join(project_dir, "03_shotlist.csv")
    with open(csv_path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["shot_number", "shot_name", "start_time", "end_time", "duration_sec", "camera", "character_action", "environment", "generation_platform", "reusable_asset", "status"])
        for shot in shots_config:
            writer.writerow([shot["num"], shot["name"], shot["start"], shot["end"], shot["dur"], shot["camera"], shot["action"], "[TODO]", shot["platform"], "", "pending"])

    if os.path.exists(character_sheet_path):
        shutil.copy2(character_sheet_path, os.path.join(project_dir, "04_character_sheet.md"))
    else:
        write_file(project_dir, "04_character_sheet.md", "# Character Sheet\n\n[请先填写 config/character_sheet.md]")

    image_prompts = f"# Image Prompts — {project_id}\n\n"
    image_prompts += "## 使用说明\n"
    image_prompts += "1. 所有图片在LiblibAI生成\n"
    image_prompts += "2. 每条prompt前面必须粘贴Character Identity Block\n"
    image_prompts += "3. 生成后保存到 keyframes/ 子目录\n"
    image_prompts += "4. 文件命名：keyframe_shot[编号]_v[版本].png\n\n---\n\n"
    for shot in shots_config:
        image_prompts += f"## Shot {shot['num']} — {shot['name']}\n"
        image_prompts += "### LiblibAI Prompt:\n```text\n"
        image_prompts += f"{character_block_en}\n"
        image_prompts += f"The panda {shot['action']}. [TODO: Add specific environment and details]. {shot['camera']}. Cartoon style, 3D render, Pixar style, soft lighting, vibrant colors. Vertical composition 9:16.\n```\n\n"
    write_file(project_dir, "05_image_prompts.md", image_prompts)

    video_prompts = f"# Video Prompts — {project_id}\n\n"
    video_prompts += "## 使用说明\n"
    video_prompts += "1. 主镜头在PixVerse V6生成（Image-to-Video模式）\n"
    video_prompts += "2. 环境镜头在即梦AI生成\n"
    video_prompts += "3. 上传对应的keyframe图片作为起始帧\n"
    video_prompts += "4. 设置：V6 Standard, 1080p, 9:16, 15s, Motion Strength: medium-low\n\n---\n\n"
    for shot in shots_config:
        if shot["platform"] == "reusable":
            video_prompts += f"## Shot {shot['num']} — {shot['name']} (从可复用素材库调取)\n"
            video_prompts += "使用素材：assets/reusable/[对应文件]\n\n"
            continue

        platform_label = "PixVerse V6" if shot["platform"] == "pixverse" else "即梦AI"
        video_prompts += f"## Shot {shot['num']} — {shot['name']} ({platform_label})\n"
        video_prompts += f"### 起始帧：keyframe_shot{shot['num']:02d}_v1.png\n"
        if shot["platform"] == "pixverse":
            video_prompts += "### Prompt:\n```text\n"
            video_prompts += f"{character_block_en}\n"
            video_prompts += f"The panda {shot['action']}. [TODO: Add motion and environment details]. Camera: {shot['camera']}. Soft even lighting.\n```\n"
            video_prompts += "### Negative Prompt:\n```text\ntext, words, letters, subtitles, captions, watermark, blurry, distorted face, extra limbs, duplicate characters\n```\n\n"
        else:
            video_prompts += "### Prompt:\n```text\n"
            video_prompts += f"{character_block_cn}\n"
            video_prompts += f"熊猫{shot['action']}。[TODO: 添加动作和环境细节]。镜头：{shot['camera']}。\n```\n\n"
    write_file(project_dir, "06_video_prompts.md", video_prompts)

    srt_content = ""
    for index, shot in enumerate(shots_config, start=1):
        start = shot["start"].replace(".", ",")
        end = shot["end"].replace(".", ",")
        srt_content += f"{index}\n{start} --> {end}\n"
        srt_content += f"[EN] [TODO: English text for {shot['name']}]\n"
        srt_content += "[CN] [TODO: 中文文本]\n\n"
    write_file(project_dir, "07_subtitles.srt", srt_content)

    voiceover_content = f"# Voiceover Script — {project_id}\n\n"
    voiceover_content += "## 语速标注: [normal] = 正常语速, [slow] = 慢速, [pause:1s] = 暂停1秒\n\n"
    for shot in shots_config:
        voiceover_content += f"### Shot {shot['num']} — {shot['name']} ({shot['dur']}s)\n"
        voiceover_content += "[TODO: Write voiceover]\n\n"
    write_file(project_dir, "08_voiceover.txt", voiceover_content)

    seo_content = f"""# SEO Package — {project_id}

## YouTube Title（60字符内）
How to Say "{topic_en}" in Chinese 🇨🇳 {topic_cn} | Learn Mandarin

## YouTube Description
Learn to say {topic_cn} ({topic_en}) in Chinese! Perfect for absolute beginners.
Watch the full #{series_tag} series: [playlist link]

---
📝 In this lesson:
- {topic_cn} = {topic_en}
- [TODO: Add more vocabulary]

---
🐼 {brand_config.get('default_cta', 'Follow for daily Chinese lessons!')}

#LearnChinese #Mandarin #{series_tag}

## Tags
{', '.join([keyword.strip() for keyword in seo_keywords.split(',')]) if seo_keywords else '[TODO: Add tags]'}

## Thumbnail
- 角色表情：[TODO: 指定表情]
- 主文字：{topic_cn}
- 副文字：{topic_en}
- 配色：品牌红+黄

## AI Content Disclosure
⚠️ 必须在YouTube Studio上传时勾选 "Altered or synthetic content"
"""
    write_file(project_dir, "09_seo_package.md", seo_content)

    manifest = {
        "project_id": project_id,
        "export_preset": "youtube_shorts",
        "timeline": [
            {
                "type": "brand_intro",
                "source": "assets/brand/intro/intro_1s.mp4",
                "duration": 1.0
            }
        ],
        "audio_layers": [
            {
                "type": "voiceover",
                "source": f"projects/{project_id}/08_voiceover_audio.wav",
                "volume": 1.0
            },
            {
                "type": "bgm",
                "source": "[TODO: Select BGM file]",
                "volume_normal": 0.3,
                "volume_ducked": 0.08,
                "duck_when": "voiceover_active",
                "loop": True
            }
        ],
        "subtitle_layer": {
            "source": f"projects/{project_id}/07_subtitles.ass",
            "burn_in": True
        },
        "outro": {
            "type": "brand_outro",
            "source": "assets/brand/outro/cta_3s.mp4",
            "duration": 3.0
        }
    }
    for shot in shots_config:
        manifest["timeline"].append({
            "type": "shot",
            "shot_number": shot["num"],
            "source": f"projects/{project_id}/normalized/shot_{shot['num']:02d}.mp4",
            "start_trim": 0.0,
            "end_trim": float(shot["dur"]),
            "transition_in": "crossfade_0.3s" if shot["num"] > 1 else "none",
            "transition_out": "crossfade_0.3s"
        })
    manifest["timeline"].append({
        "type": "brand_outro",
        "source": "assets/brand/outro/cta_3s.mp4",
        "duration": 3.0
    })
    write_file(project_dir, "10_edit_manifest.json", json.dumps(manifest, indent=2, ensure_ascii=False))

    print("\n" + "=" * 60)
    print("✅ 项目创建成功！")
    print(f"📁 项目路径：{project_dir}")
    print("📋 已生成10份文件：")
    for filename in sorted(os.listdir(project_dir)):
        if os.path.isfile(os.path.join(project_dir, filename)):
            print(f"   - {filename}")
    print("\n⏭️  下一步：")
    print("   1. 填写所有 [TODO] 标记的内容")
    print("   2. 在LiblibAI生成关键帧图 → 保存到 keyframes/")
    print("   3. 在PixVerse V6/即梦AI生成视频 → 保存到 raw_clips/")
    print(f"   4. 运行 bash scripts/full_pipeline.sh {project_id}")
    print("=" * 60)


def write_file(directory, filename, content):
    filepath = os.path.join(directory, filename)
    with open(filepath, "w", encoding="utf-8") as handle:
        handle.write(content)


def write_raw_file(filepath, content):
    with open(filepath, "w", encoding="utf-8") as handle:
        handle.write(content)


if __name__ == "__main__":
    main()
