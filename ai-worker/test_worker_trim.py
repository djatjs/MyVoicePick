import os
os.environ.setdefault('AWS_DEFAULT_REGION', 'ap-northeast-2')

import unittest

from analysis_service import AnalysisService


class TrimCommandTest(unittest.TestCase):
    def test_short_recording_is_used_whole(self):
        args = AnalysisService.trim_command('in.m4a', 'out.wav', 40)
        self.assertNotIn('-ss', args)
        self.assertEqual(args[-1], 'out.wav')

    def test_long_recording_takes_verse_and_chorus_windows(self):
        args = AnalysisService.trim_command('in.m4a', 'out.wav', 240)
        starts = [float(args[i + 1]) for i, a in enumerate(args) if a == '-ss']
        self.assertEqual(starts, [57.0, 153.0])
        self.assertIn('concat=n=2:v=0:a=1', args)


if __name__ == '__main__':
    unittest.main()
