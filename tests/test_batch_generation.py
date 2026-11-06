"""Batch failures must preserve existing work and still process later rows."""
from datetime import datetime
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class BatchGenerationTests(unittest.TestCase):
    def run_batch(self, root, topics):
        (root / 'scripts').mkdir(exist_ok=True)
        shutil.copyfile(ROOT / 'scripts/generate_project.py', root / 'scripts/generate_project.py')
        (root / 'topics.txt').write_bytes(topics)
        return subprocess.run(['bash', str(ROOT / 'scripts/batch_generate.sh'), 'topics.txt'],
                              cwd=root, capture_output=True, text=True, timeout=30)

    def test_existing_project_does_not_abort_batch_or_get_overwritten(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            existing = root / 'projects' / (datetime.now().strftime('%Y%m%d') + '_first')
            existing.mkdir(parents=True)
            (existing / '01_brief.md').write_text('user work')
            result = self.run_batch(root, '一|First|||||\n二|Second|||||\n'.encode())
            self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
            self.assertEqual((existing / '01_brief.md').read_text(), 'user work')
            self.assertEqual(len(list((root / 'projects').glob('*_second/02_script.json'))), 1)
            self.assertIn('1', result.stdout)

    def test_crlf_and_final_unterminated_row_are_processed(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            result = self.run_batch(root, '一|First|||cute||\r\n二|Second|||cute||'.encode())
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertEqual(len(list((root / 'projects').glob('*/02_script.json'))), 2)

    def test_invalid_row_does_not_abort_later_rows(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            result = self.run_batch(root, '一|First||INVALID|||\n二|Second|||||\n'.encode())
            self.assertEqual(result.returncode, 1)
            self.assertEqual(len(list((root / 'projects').glob('*_second/02_script.json'))), 1)


if __name__ == '__main__':
    unittest.main()
