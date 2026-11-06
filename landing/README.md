# Chinese Teaching Video System — Landing Page

Welcome to the **Chinese Teaching Video System** — an open-source production pipeline for creating AI-powered Chinese teaching short videos.

## What Is It?

A complete system that turns one Chinese teaching topic into a professional YouTube Shorts video through:
1. **Standardized project scaffolding** — 10-file project structure
2. **AI-assisted content creation** — Script, prompts, SEO metadata
3. **FFmpeg automation** — Normalize, assemble, subtitle, mix, publish

## Key Features

- **Fixed Character IP**: Consistent panda teacher identity across all videos
- **Web Console**: Browser-based project management (no install required)
- **Full Pipeline Automation**: One command from raw assets to final video
- **Quality Check**: Automated validation before publishing
- **SEO Package**: Auto-generated titles, descriptions, tags

## For Creators

### Start in 3 Steps
```bash
# 1. Generate a project
python3 scripts/generate_project.py

# 2. Generate assets (LiblibAI → PixVerse → 即梦AI)

# 3. Run pipeline
bash scripts/full_pipeline.sh 20260418_xiexie
```

### Web Console
Open `console/index.html` to manage all your projects — no dependencies, runs in any browser.

## For Developers

- **Python 3**: Project generation and quality checking
- **Bash + FFmpeg**: Video processing automation
- **Pure HTML/CSS/JS**: Console with zero dependencies
- **Docker support**: `docker build -t chinese-video-system .`
- **CI/CD**: GitHub Actions with Python tests + Bash syntax checks

## Documentation

- [Workflow Guide](../docs/workflow_guide.md)
- [Platform Guide](../docs/platform_guide.md)
- [FFmpeg Cheatsheet](../docs/ffmpeg_cheatsheet.md)
- [YouTube SEO Guide](../docs/youtube_seo_guide.md)
- [Brand System](../docs/brand_system.md)

## License

MIT — free for personal and commercial use.
