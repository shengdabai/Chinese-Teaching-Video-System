"""Real FFmpeg checks using synthetic media, never project/student assets."""
import array
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


@unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'FFmpeg required')
class AudioPipelineTests(unittest.TestCase):
    def run_command(self, args, cwd):
        result = subprocess.run(args, cwd=cwd, capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        return result

    def test_mixing_preserves_video_duration(self):
        for voiceover, bgm in [(False, False), (True, False), (False, True), (True, True)]:
            with self.subTest(voiceover=voiceover, bgm=bgm), tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                project = root / 'projects/demo'
                (project / 'output').mkdir(parents=True)
                (root / 'assets/bgm').mkdir(parents=True)
                source = project / 'output/rough_cut_subtitled.mp4'
                self.run_command(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i',
                                  'color=c=blue:s=160x284:r=30:d=2', '-c:v', 'libx264',
                                  '-pix_fmt', 'yuv420p', str(source)], root)
                for enabled, destination in [
                        (voiceover, project / '08_voiceover_audio.wav'),
                        (bgm, root / 'assets/bgm/test.wav')]:
                    if enabled:
                        self.run_command(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i',
                                          'sine=frequency=440:duration=0.4', str(destination)], root)
                result = subprocess.run(['bash', str(ROOT / 'scripts/mix_audio.sh'), 'demo'],
                                        cwd=root, capture_output=True, text=True, timeout=30)
                log = project / 'logs/mix_audio.log'
                self.assertEqual(result.returncode, 0,
                                 result.stderr + (log.read_text() if log.exists() else ''))
                output = project / 'output/rough_cut_with_audio.mp4'
                probe = self.run_command(['ffprobe', '-v', 'error', '-show_format',
                                          '-show_streams', '-of', 'json', str(output)], root)
                data = json.loads(probe.stdout)
                video = next(s for s in data['streams'] if s['codec_type'] == 'video')
                self.assertAlmostEqual(float(video['duration']), 2.0, delta=0.1)
                if voiceover or bgm:
                    audio = next(s for s in data['streams'] if s['codec_type'] == 'audio')
                    self.assertAlmostEqual(float(audio['duration']), 2.0, delta=0.1)

    def test_no_external_audio_preserves_trimmed_clip_audio_and_silent_gaps(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            project = root / 'projects/demo'
            (project / 'output').mkdir(parents=True)
            (root / 'assets/bgm').mkdir(parents=True)
            source = project / 'source.mp4'
            silent = project / 'silent.mp4'
            # The retained second has a tone; the trimmed-away first second is silent.
            self.run_command(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i',
                              'color=blue:s=96x160:r=30:d=2', '-f', 'lavfi', '-i',
                              'sine=frequency=440:duration=1', '-af', 'adelay=1000',
                              '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac',
                              str(source)], root)
            self.run_command(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i',
                              'color=red:s=96x160:r=30:d=0.5', '-c:v', 'libx264',
                              '-pix_fmt', 'yuv420p', str(silent)], root)
            manifest = {'timeline': [
                {'type': 'shot', 'source': 'projects/demo/silent.mp4', 'duration': 0.5},
                {'type': 'shot', 'source': 'projects/demo/source.mp4',
                 'start_trim': 1, 'end_trim': 2},
                {'type': 'shot', 'source': 'projects/demo/silent.mp4', 'duration': 0.5}]}
            (project / '10_edit_manifest.json').write_text(json.dumps(manifest))
            for script in ['auto_edit.sh', 'burn_subtitles.sh', 'mix_audio.sh']:
                self.run_command(['bash', str(ROOT / 'scripts' / script), 'demo'], root)
            output = project / 'output/rough_cut_with_audio.mp4'
            probe = self.run_command(['ffprobe', '-v', 'error', '-show_streams',
                                      '-of', 'json', str(output)], root)
            streams = json.loads(probe.stdout)['streams']
            audio = [s for s in streams if s['codec_type'] == 'audio']
            self.assertEqual(len(audio), 1, 'original clip audio was discarded')
            self.assertAlmostEqual(float(audio[0]['duration']), 2.0, delta=0.1)
            result = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(output),
                                     '-map', '0:a:0', '-ac', '1', '-ar', '8000',
                                     '-f', 's16le', '-'], cwd=root, capture_output=True, timeout=30)
            self.assertEqual(result.returncode, 0, result.stderr.decode(errors='replace'))
            samples = array.array('h', result.stdout)
            self.assertGreater(len(samples), 15000)
            self.assertLess(max(abs(v) for v in samples[800:2400]), 30)
            self.assertGreater(max(abs(v) for v in samples[6400:9600]), 1000,
                               'trimmed clip tone must survive without narration or BGM')
            self.assertLess(max(abs(v) for v in samples[13600:15200]), 30)


if __name__ == '__main__':
    unittest.main()
