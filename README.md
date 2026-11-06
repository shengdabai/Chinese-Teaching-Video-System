# AI Video Production Pipeline

Automated production system for creating Chinese teaching short videos (YouTube Shorts format).

## Features

- **Project Generation**: Python script creates standardized project structures from topic briefs
- **FFmpeg Pipeline**: Full automation — normalize, auto-edit, burn subtitles, mix audio
- **Web Console**: Browser-based project management with localStorage persistence
- **Quality Check**: Automated validation of file integrity, video duration, resolution, and SEO
- **Brand System**: Fixed character IP (panda teacher) with consistent visual identity
- **SEO Package**: Auto-generated titles, descriptions, tags, and thumbnails

## Quick Start

### 1. Generate a New Project

```bash
python3 scripts/generate_project.py
```

Enter the Chinese and English topic at the prompts. An existing project with the
same date and English topic is rejected without overwriting its files.

### 2. Open the Web Console

```bash
open console/index.html
```

### 3. Run the Full Pipeline

```bash
bash scripts/full_pipeline.sh YOUR_PROJECT
```

### 4. Quality Check

```bash
python3 scripts/quality_check.py YOUR_PROJECT
```

Run these commands from the repository root. Quality checking also accepts
`projects/YOUR_PROJECT`; empty required files, invalid JSON, and unavailable or
invalid video metadata fail the check.

## Project Structure

```
├── config/             # Brand configuration and character sheets
├── console/            # Web-based project management console
├── docs/               # Guides and documentation
├── projects/           # Generated video projects (10-file standard)
├── scripts/            # Automation scripts (Python + Bash)
└── templates/          # Templates for briefs, scripts, shotlists, etc.
```

## Each Project Contains

| # | File | Purpose |
|---|------|---------|
| 01 | `01_brief.md` | Topic brief and teaching objectives |
| 02 | `02_script.json` | Structured script with timing |
| 03 | `03_shotlist.csv` | Shot-by-shot production list |
| 04 | `04_character_sheet.md` | Character design reference |
| 05 | `05_image_prompts.md` | AI image generation prompts |
| 06 | `06_video_prompts.md` | AI video generation prompts |
| 07 | `07_subtitles.srt` | Subtitle file with timestamps |
| 08 | `08_voiceover.txt` | Voiceover script |
| 09 | `09_seo_package.md` | YouTube SEO metadata |
| 10 | `10_edit_manifest.json` | Final editing instructions |

## Docker

```bash
docker build -t chinese-video-system .
docker run chinese-video-system
```

## CI/CD

GitHub Actions runs on every push:
- Python test suite (pytest)
- Bash syntax validation
- File integrity checks

Local regression checks (Python standard library; FFmpeg audio tests skip if
FFmpeg or ffprobe is unavailable):

```bash
python3 -m unittest discover -s tests -p test_regressions.py -v
python3 -m unittest discover -s tests -p test_audio_pipeline.py -v
python3 -m unittest discover -s tests -p test_batch_generation.py -v
python3 -m unittest discover -s tests -p test_edit_pipeline.py -v
node --test tests/test_console_security.cjs
```

The original test suite requires an existing pytest installation:
`python3 -m pytest tests/ -v`. There is no typecheck, lint, or build step for this
plain JavaScript console. CI checks JavaScript and Bash syntax directly.

Batch generation continues after a failed row and exits nonzero if any row
failed. It preserves existing projects and accepts CRLF or an unterminated last row.
The editor applies `start_trim` / `end_trim` as seconds in each source clip and
rejects invalid or out-of-range trims. It builds the body only; the final stage
adds optional brand clips once and supplies silence for clips without audio.
Transition metadata is currently reported as a warning and rendered as hard cuts.
Browser rendering and interaction checks must still run in a browser; the Node
tests exercise the real HTML render functions with an in-memory DOM substitute.

## Tech Stack

- **Python 3**: Project generation and quality checking
- **Bash + FFmpeg**: Video processing automation
- **HTML/CSS/JS**: Web console (pure frontend, no dependencies)
- **JSON/CSV/Markdown**: Data formats
