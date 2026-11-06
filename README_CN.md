# 中文教学短视频生产系统

[English README](./README.md)

这是一个开源的 AI 中文教学动画短视频生产系统，面向 YouTube Shorts 等短视频场景。项目把网页控制台、标准化模板和 FFmpeg 自动化脚本结合在一起，帮助创作者把一个中文教学主题快速落成一条可复用的短视频生产流程。

## 项目预览

### 网页控制台
![中文教学短视频控制台](./docs/media/console-home.png)

### 演示 GIF
![中文教学短视频演示](./docs/media/console-demo.gif)

## 为什么做这个项目

AI 教学短视频的生产流程往往很碎片化：
- 选题在文档里
- 分镜在表格里
- 提示词散落在不同平台
- 素材进度靠手工记
- 后期步骤重复而机械

这个仓库的目标就是把这些环节收束成一套可复制系统：
- 固定熊猫老师角色锚定
- 标准化项目文件结构
- LiblibAI、PixVerse V6、即梦 AI 的提示词支持
- FFmpeg 后期自动化
- 浏览器控制台统一管理生产和发布准备

## 核心能力

- 通过 [config/character_sheet.md](./config/character_sheet.md) 固定角色身份
- 通过 [templates](./templates) 标准化脚本、提示词、字幕、SEO 和 manifest
- 通过 [scripts/generate_project.py](./scripts/generate_project.py) 一键创建单条视频项目
- 通过 [scripts](./scripts) 自动完成预处理、拼接、字幕、混音和片头片尾
- 通过 [console](./console) 提供纯前端网页控制台
- 通过 [projects/_example_project](./projects/_example_project) 提供示例项目
- 通过 [docs](./docs) 提供工作流、平台、FFmpeg、排错和 SEO 文档

## 标准工作流

1. 按主题生成项目文件夹
2. 补齐 brief、script、prompt、subtitle、voiceover、SEO 和 manifest
3. 在 LiblibAI 生成关键帧
4. 在 PixVerse V6 和即梦 AI 生成视频镜头
5. 把素材放回项目目录
6. 运行 FFmpeg 自动流水线
7. 检查成片并发布，同时勾选 AI 内容标注

## 仓库结构

```text
chinese-teaching-video-system/
├── config/      # 角色、品牌、导出和平台配置
├── templates/   # 脚本、提示词、字幕、SEO、manifest 模板
├── scripts/     # 项目生成和后期自动化脚本
├── assets/      # 可复用素材和占位目录
├── projects/    # 单条视频项目目录与示例项目
├── console/     # 浏览器控制台
└── docs/        # 工作流与参考文档
```

## 快速开始

### 1. 进入项目目录
```bash
cd /Users/adam/Desktop/chinese-teaching-video-system
```

### 2. 创建一个新项目
```bash
python3 scripts/generate_project.py
```

### 3. 打开网页控制台
直接用浏览器打开 [console/index.html](./console/index.html)。

控制台可以帮助你：
- 录入主题和生产计划
- 导入和编辑 `02_script.json`
- 生成图片和视频提示词包
- 跟踪镜头状态
- 导入 `10_edit_manifest.json`
- 准备 FFmpeg 命令和发布资料

### 4. 运行完整生产流水线
```bash
bash scripts/full_pipeline.sh <project_id>
```

### 5. 运行质量检查
```bash
python3 scripts/quality_check.py <project_id>
```

## 网页控制台模块

1. Topic Intake
2. Script Engine
3. Prompt Pack Builder
4. Clip Inbox & Asset Manager
5. Auto Editor
6. Publish Dashboard

## 生产规则

- 不要让 AI 视频平台直接生成汉字、拼音或英文字幕
- 尽量优先使用 Image-to-Video 以提高角色一致性
- 角色身份块必须原文粘贴
- 导出统一为 `1080x1920`、`30fps`、`H.264 MP4`
- 上传到 YouTube Studio 时必须勾选 AI 合成内容标注

## 文档入口

- [项目规范说明](./PROJECT_SPEC.md)
- [完整工作流指南](./docs/workflow_guide.md)
- [平台操作指南](./docs/platform_guide.md)
- [FFmpeg 速查](./docs/ffmpeg_cheatsheet.md)
- [常见问题排查](./docs/troubleshooting.md)
- [YouTube SEO 指南](./docs/youtube_seo_guide.md)

## 校验情况

仓库当前已经完成以下校验：
- 网页控制台 JavaScript 语法检查
- Python 脚本编译检查
- Shell 脚本语法检查

## 后续规划

- 浏览器状态和磁盘项目文件之间的双向同步
- 更完整的时间线编辑和 manifest 持久化
- 更好的可复用素材预览能力
- 可选的 n8n 或发布平台自动化集成
- 更完整的展示素材自动生成能力

## 贡献

欢迎贡献，尤其适合以下方向：
- 新的视频模板或提示词模板
- 更强的 FFmpeg 转场和字幕样式
- 更好的导入导出工作流
- Prompt Builder 的逻辑增强
- 文档补充和多语言支持

提交时请尽量保持改动聚焦，清楚说明对生产流程的影响，并避免提交非示例性质的真实生产素材。

## 开源协议

本项目使用 [MIT License](./LICENSE)。
