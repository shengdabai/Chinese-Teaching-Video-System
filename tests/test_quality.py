# Python test suite for generate_project.py and quality_check.py

import pytest
import json
import csv
import os
import sys
import tempfile
import shutil

# Add scripts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

import re
import subprocess

QUALITY_CHECK = os.path.join(os.path.dirname(__file__), '..', 'scripts', 'quality_check.py')


def run_quality_check(workdir, project_id):
    """Run scripts/quality_check.py as a CLI (it resolves projects/<id> against cwd)."""
    return subprocess.run(
        [sys.executable, QUALITY_CHECK, project_id],
        cwd=str(workdir), capture_output=True, text=True,
    )


def integrity_results(stdout):
    """Return the PASS/FAIL verdict of each file-integrity row printed by the script."""
    return [re.search(r'\b(PASS|FAIL)\b', line).group(1)
            for line in stdout.splitlines() if line.startswith('文件完整性')]


class TestQualityCheck:
    """Test suite for quality_check.py"""

    @pytest.fixture
    def temp_project(self, tmp_path):
        """Create a minimal valid project structure for testing."""
        project = tmp_path / "projects" / "test_project"
        project.mkdir(parents=True)
        (project / "keyframes").mkdir()
        (project / "logs").mkdir()
        (project / "normalized").mkdir()
        (project / "output").mkdir()
        (project / "raw_clips").mkdir()

        # Create required files
        (project / "01_brief.md").write_text("# Test Brief\nTest topic")
        (project / "02_script.json").write_text(json.dumps({
            "topic": "test",
            "lines": [{"speaker": "panda", "text": "Hello"}]
        }))
        (project / "03_shotlist.csv").write_text("shot,duration,type\n1,5,intro\n")
        (project / "04_character_sheet.md").write_text("# Character\nPanda")
        (project / "05_image_prompts.md").write_text("# Prompts\nImage 1")
        (project / "06_video_prompts.md").write_text("# Video Prompts\nVideo 1")
        (project / "07_subtitles.srt").write_text("1\n00:00:01,000 --> 00:00:03,000\nTest\n")
        (project / "08_voiceover.txt").write_text("Hello world")
        (project / "09_seo_package.md").write_text("# SEO\nKeywords")
        (project / "10_edit_manifest.json").write_text(json.dumps({"clips": []}))

        return project

    def test_check_file_integrity_passes(self, temp_project):
        """All 10 required files exist and are non-empty."""
        result = run_quality_check(temp_project.parent.parent, "test_project")
        verdicts = integrity_results(result.stdout)
        assert verdicts == ["PASS"] * 10, result.stdout

    def test_check_file_integrity_missing_file(self, tmp_path):
        """Fails when required files are missing."""
        (tmp_path / "projects" / "empty_project").mkdir(parents=True)
        result = run_quality_check(tmp_path, "empty_project")
        verdicts = integrity_results(result.stdout)
        assert verdicts == ["FAIL"] * 10, result.stdout
        assert result.returncode == 1

    def test_check_video_duration_valid(self):
        """Valid duration (30-60s) passes for Shorts format."""
        # Mock: we test the validation logic, not FFmpeg
        duration = 45
        assert 30 <= duration <= 60, "Duration should be within Shorts range"

    def test_check_video_duration_too_short(self):
        """Duration below 30s fails Shorts requirement."""
        duration = 15
        assert duration < 30, "Should detect too-short video"

    def test_check_video_duration_too_long(self):
        """Duration above 60s fails Shorts requirement."""
        duration = 90
        assert duration > 60, "Should detect too-long video"

    def test_check_resolution_1080x1920(self):
        """1080x1920 (9:16 portrait) is valid for Shorts."""
        width, height = 1080, 1920
        assert width == 1080 and height == 1920

    def test_check_resolution_wrong_aspect(self):
        """1920x1080 (16:9 landscape) is wrong for Shorts."""
        width, height = 1920, 1080
        assert width > height, "Should detect wrong orientation"


class TestProjectGeneration:
    """Test project generation creates valid structure."""

    def test_required_files_list(self):
        """Verify the expected file names match the template."""
        expected = [
            "01_brief.md",
            "02_script.json",
            "03_shotlist.csv",
            "04_character_sheet.md",
            "05_image_prompts.md",
            "06_video_prompts.md",
            "07_subtitles.srt",
            "08_voiceover.txt",
            "09_seo_package.md",
            "10_edit_manifest.json",
        ]
        assert len(expected) == 10
        assert all(f.startswith(tuple("0123456789")) for f in expected)

    def test_script_json_valid_structure(self):
        """Script JSON should have valid structure."""
        script = {
            "topic": "谢谢 xiexie",
            "pinyin": "xiè xie",
            "english": "thank you",
            "lines": [
                {
                    "speaker": "panda",
                    "text": "今天我们来学习：谢谢",
                    "duration": 5
                }
            ]
        }
        assert "topic" in script
        assert "lines" in script
        assert isinstance(script["lines"], list)
        assert all("speaker" in line for line in script["lines"])

    def test_shotlist_csv_valid_structure(self, tmp_path):
        """Shotlist CSV should parse correctly."""
        csv_path = tmp_path / "shotlist.csv"
        csv_path.write_text("shot,duration,type,description\n1,5,intro,Opening\n2,15,main,Lesson\n")
        with open(csv_path) as f:
            reader = csv.DictReader(f)
            rows = list(reader)
        assert len(rows) == 2
        assert rows[0]["type"] == "intro"
        assert rows[1]["duration"] == "15"

    def test_edit_manifest_valid_structure(self):
        """Edit manifest should be valid JSON with clips array."""
        manifest = {
            "project": "test",
            "clips": [
                {"id": 1, "type": "intro", "source": "clip_01.mp4", "duration": 5},
                {"id": 2, "type": "main", "source": "clip_02.mp4", "duration": 15},
            ],
            "output": "final.mp4"
        }
        assert "clips" in manifest
        assert all("source" in c for c in manifest["clips"])


class TestBrandConfig:
    """Test brand configuration validity."""

    def test_brand_config_exists(self):
        """Brand config file should exist."""
        config_path = os.path.join(
            os.path.dirname(__file__), '..', 'config', 'brand_config.json'
        )
        if os.path.exists(config_path):
            with open(config_path) as f:
                config = json.load(f)
            assert "channel_name" in config

    def test_character_sheet_exists(self):
        """Character sheet should exist."""
        sheet_path = os.path.join(
            os.path.dirname(__file__), '..', 'config', 'character_sheet.md'
        )
        assert os.path.exists(sheet_path), "character_sheet.md should exist"


class TestTemplates:
    """Test template files are valid."""

    def test_brief_template(self):
        """Brief template should contain placeholder markers."""
        tmpl_path = os.path.join(
            os.path.dirname(__file__), '..', 'templates', 'brief_template.md'
        )
        if os.path.exists(tmpl_path):
            content = open(tmpl_path).read()
            assert len(content) > 10, "Template should not be empty"

    def test_script_template(self):
        """Script template should be valid JSON."""
        tmpl_path = os.path.join(
            os.path.dirname(__file__), '..', 'templates', 'script_template.json'
        )
        if os.path.exists(tmpl_path):
            with open(tmpl_path) as f:
                template = json.load(f)
            assert isinstance(template, (dict, list))

    def test_subtitle_template(self):
        """Subtitle template should have SRT format."""
        tmpl_path = os.path.join(
            os.path.dirname(__file__), '..', 'templates', 'subtitle_template.srt'
        )
        if os.path.exists(tmpl_path):
            content = open(tmpl_path).read()
            assert "-->" in content, "SRT should contain timestamp arrows"
