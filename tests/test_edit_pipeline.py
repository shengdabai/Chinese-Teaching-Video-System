"""Timeline regressions use small synthetic clips, never user media."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


@unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'FFmpeg required')
class EditPipelineTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.project = self.root / 'projects/demo'
        for directory in ['normalized', 'output', 'logs']:
            (self.project / directory).mkdir(parents=True)
        self.source = self.project / "normalized/shot's clip.mp4"
        self.command(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i',
                      'color=red:s=96x160:r=30:d=1', '-f', 'lavfi', '-i',
                      'color=green:s=96x160:r=30:d=1', '-f', 'lavfi', '-i',
                      'color=blue:s=96x160:r=30:d=1', '-filter_complex',
                      '[0:v][1:v][2:v]concat=n=3:v=1:a=0[v]', '-map', '[v]',
                      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', str(self.source)])
        self.manifest = {'timeline': [
            {'type': 'brand_intro', 'source': 'assets/brand/intro/intro_1s.mp4', 'duration': 0.5},
            {'type': 'shot', 'source': str(self.source.relative_to(self.root)),
             'start_trim': 1, 'end_trim': 2},
            {'type': 'brand_outro', 'source': 'assets/brand/outro/cta_3s.mp4', 'duration': 0.5}]}

    def command(self, args):
        result = subprocess.run(args, cwd=self.root, capture_output=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stderr.decode(errors='replace'))
        return result

    def edit(self):
        (self.project / '10_edit_manifest.json').write_text(json.dumps(self.manifest))
        return subprocess.run(['bash', str(ROOT / 'scripts/auto_edit.sh'), 'demo'],
                              cwd=self.root, capture_output=True, text=True, timeout=30)

    def duration(self, path):
        return float(self.command(['ffprobe', '-v', 'error', '-show_entries',
                                  'format=duration', '-of', 'csv=p=0', str(path)]).stdout)

    def test_trim_selects_actual_frames_and_branding_is_added_only_at_final_step(self):
        for name, color in [('intro/intro_1s', 'white'), ('outro/cta_3s', 'black')]:
            dest = self.root / f'assets/brand/{name}.mp4'
            dest.parent.mkdir(parents=True)
            self.command(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i',
                          f'color={color}:s=96x160:r=30:d=0.5', '-c:v', 'libx264', str(dest)])
        result = self.edit()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        rough = self.project / 'output/rough_cut_no_audio.mp4'
        self.assertAlmostEqual(self.duration(rough), 1, delta=0.08)
        pixel = self.command(['ffmpeg', '-v', 'error', '-ss', '0.5', '-i', str(rough),
                              '-vf', 'scale=1:1', '-frames:v', '1', '-f', 'rawvideo',
                              '-pix_fmt', 'rgb24', '-']).stdout
        self.assertGreater(pixel[1], pixel[0] + 50, pixel)
        self.assertGreater(pixel[1], pixel[2] + 50, pixel)
        main = self.project / 'output/rough_cut_with_audio.mp4'
        self.command(['ffmpeg', '-v', 'error', '-i', str(rough), '-f', 'lavfi', '-i',
                      'sine=frequency=440:duration=1', '-c:v', 'copy', '-c:a', 'aac', str(main)])
        self.command(['bash', str(ROOT / 'scripts/add_intro_outro.sh'), 'demo'])
        final = self.project / 'output/final_demo.mp4'
        self.assertAlmostEqual(self.duration(final), 2, delta=0.1)
        import array
        samples = array.array('h', self.command([
            'ffmpeg', '-v', 'error', '-i', str(final), '-map', '0:a:0',
            '-ac', '1', '-ar', '8000', '-f', 's16le', '-']).stdout)
        self.assertGreater(len(samples), 15000)
        self.assertLess(max(abs(v) for v in samples[800:2400]), 30, 'intro must be silent')
        self.assertGreater(max(abs(v) for v in samples[6400:9600]), 1000, 'main narration lost')
        self.assertLess(max(abs(v) for v in samples[13600:15200]), 30, 'outro must be silent')

    def test_optional_brand_files_are_not_required_by_rough_cut(self):
        result = self.edit()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertAlmostEqual(self.duration(self.project / 'output/rough_cut_no_audio.mp4'), 1, delta=0.08)

    def test_multiple_trimmed_clips_keep_order_and_timing(self):
        shot = self.manifest['timeline'][1]
        self.manifest['timeline'] = [shot, {**shot, 'start_trim': 2, 'end_trim': 3}]
        self.assertEqual(self.edit().returncode, 0)
        rough = self.project / 'output/rough_cut_no_audio.mp4'
        self.assertAlmostEqual(self.duration(rough), 2, delta=0.08)
        pixel = self.command(['ffmpeg', '-v', 'error', '-ss', '1.5', '-i', str(rough),
                              '-vf', 'scale=1:1', '-frames:v', '1', '-f', 'rawvideo',
                              '-pix_fmt', 'rgb24', '-']).stdout
        self.assertGreater(pixel[2], pixel[1] + 50, pixel)

    def test_invalid_trim_and_empty_timeline_fail_without_creating_video(self):
        for timeline in [[], [{'type': 'shot', 'source': str(self.source), 'start_trim': 2, 'end_trim': 1}],
                         [{'type': 'shot', 'source': str(self.source), 'end_trim': 'nan'}],
                         [{'type': 'shot', 'source': str(self.source), 'end_trim': 4}],
                         [{'type': 'shot', 'source': 'https://invalid.example/clip.mp4', 'duration': 1}]]:
            with self.subTest(timeline=timeline):
                self.manifest['timeline'] = timeline
                self.assertNotEqual(self.edit().returncode, 0)
                self.assertFalse((self.project / 'output/rough_cut_no_audio.mp4').exists())


if __name__ == '__main__':
    unittest.main()
