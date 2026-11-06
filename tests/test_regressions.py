"""Local regression tests; only Python's standard library is required."""
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def load_script(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / f'{name}.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


generator = load_script('generate_project')
quality = load_script('quality_check')


class WorkspaceTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        original = Path.cwd()
        os.chdir(self.temp.name)
        self.addCleanup(os.chdir, original)


class GenerationTests(WorkspaceTest):
    def generate(self, english='Thank You', template='A_55s'):
        values = ['谢谢', english, '', template, '', '', '']
        with patch('builtins.input', side_effect=values), contextlib.redirect_stdout(io.StringIO()):
            generator.main()

    def test_existing_project_is_never_overwritten(self):
        self.generate()
        brief = next(Path('projects').glob('*/01_brief.md'))
        brief.write_text('user-edited brief', encoding='utf-8')
        with self.assertRaises(SystemExit):
            self.generate()
        self.assertEqual(brief.read_text(), 'user-edited brief')

    def test_slug_contains_only_safe_characters(self):
        self.generate('Food / Drink: hello?')
        project = next(Path('projects').iterdir())
        self.assertRegex(project.name, r'^\d{8}_food_drink_hello$')
        self.assertTrue((project / '10_edit_manifest.json').is_file())

    def test_empty_topic_is_rejected_before_writing(self):
        with self.assertRaises(SystemExit):
            self.generate('')
        self.assertFalse(Path('projects').exists())

    def test_unknown_template_is_rejected_before_writing(self):
        with self.assertRaises(SystemExit):
            self.generate(template='typo')
        self.assertFalse(Path('projects').exists())

    def test_both_templates_produce_consistent_timing(self):
        for template, duration in [('A_55s', 55), ('B_35s', 35)]:
            with self.subTest(template=template):
                self.generate(english=template, template=template)
                path = next(Path('projects').glob(f'*_{template.lower()}/02_script.json'))
                script = json.loads(path.read_text())
                self.assertEqual(sum(s['duration_seconds'] for s in script['shots']), duration)


class QualityTests(WorkspaceTest):
    def setUp(self):
        super().setUp()
        self.project = Path('projects/demo')
        (self.project / 'output').mkdir(parents=True)
        for filename in ['01_brief.md', '02_script.json', '03_shotlist.csv',
                         '04_character_sheet.md', '05_image_prompts.md',
                         '06_video_prompts.md', '07_subtitles.srt', '08_voiceover.txt',
                         '09_seo_package.md', '10_edit_manifest.json']:
            (self.project / filename).write_text('{}' if filename.endswith('.json') else 'filled')
        (self.project / 'output/final_demo.mp4').touch()

    def check(self, duration='35', dimensions='1080,1920', probe_error=None, arg='demo'):
        from subprocess import CompletedProcess
        results = [CompletedProcess([], 0, duration, ''), CompletedProcess([], 0, dimensions, '')]
        output = io.StringIO()
        with patch('sys.argv', ['quality_check.py', arg]), \
                patch.object(quality.subprocess, 'run', side_effect=probe_error or results), \
                contextlib.redirect_stdout(output):
            status = quality.main()
        return status, output.getvalue()

    def test_valid_media_passes(self):
        self.assertEqual(self.check()[0], 0)

    def test_empty_required_file_fails(self):
        (self.project / '01_brief.md').write_text('  \n')
        self.assertEqual(self.check()[0], 1)

    def test_malformed_json_fails(self):
        (self.project / '02_script.json').write_text('{bad')
        self.assertEqual(self.check()[0], 1)

    def test_non_object_json_fails(self):
        (self.project / '10_edit_manifest.json').write_text('[]')
        self.assertEqual(self.check()[0], 1)

    def test_invalid_durations_fail(self):
        for duration in ['0', '-1', 'nan', 'inf', 'N/A', '61']:
            with self.subTest(duration=duration):
                self.assertEqual(self.check(duration=duration)[0], 1)

    def test_probe_unavailable_fails(self):
        self.assertEqual(self.check(probe_error=FileNotFoundError())[0], 1)

    def test_similar_but_wrong_resolution_fails(self):
        self.assertEqual(self.check(dimensions='11080,1920')[0], 1)

    def test_documented_project_path_is_accepted(self):
        self.assertEqual(self.check(arg='projects/demo')[0], 0)


if __name__ == '__main__':
    unittest.main()
