"""Pipeline entry points must reject escapes before creating files or invoking tools."""
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ['normalize_clips', 'auto_edit', 'burn_subtitles', 'mix_audio',
           'add_intro_outro', 'full_pipeline']


class ProjectPathTests(unittest.TestCase):
    def run_script(self, root, script, project_id):
        return subprocess.run(['bash', str(ROOT / 'scripts' / f'{script}.sh'), project_id],
                              cwd=root, capture_output=True, text=True, timeout=10)

    def test_unsafe_ids_are_rejected_before_writing(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            for script in SCRIPTS:
                for project_id in ['../escape', '/tmp/escape', '.', '..', '-option',
                                   'demo,filter', "demo'quote", 'demo;command', 'a' * 101]:
                    with self.subTest(script=script, project_id=project_id):
                        result = self.run_script(root, script, project_id)
                        self.assertNotEqual(result.returncode, 0)
                        self.assertIn('Invalid project ID', result.stderr)
                        self.assertEqual(list(root.iterdir()), [])

    def test_symlink_escapes_are_rejected_before_writing(self):
        for script in SCRIPTS:
            for link in ['projects', 'projects/demo', 'projects/demo/output',
                         'projects/demo/logs', 'projects/demo/07_subtitles.ass']:
                with self.subTest(script=script, link=link), tempfile.TemporaryDirectory() as temp:
                    root = Path(temp)
                    outside = root / 'outside'
                    outside.mkdir()
                    destination = root / link
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    destination.symlink_to(outside, target_is_directory=True)
                    result = self.run_script(root, script, 'demo')
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn('symlink', result.stderr)
                    self.assertEqual(list(outside.iterdir()), [])

    def test_valid_id_with_empty_media_directory_is_supported(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'projects/20260101_demo-1/raw_clips').mkdir(parents=True)
            result = self.run_script(root, 'normalize_clips', '20260101_demo-1')
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertTrue((root / 'projects/20260101_demo-1/normalized').is_dir())


if __name__ == '__main__':
    unittest.main()
