import unittest
import numpy as np

from song_features import summarize_pitch


class SongFeaturesTest(unittest.TestCase):
    def test_pitch_distribution_ignores_unvoiced_frames(self):
        result = summarize_pitch(np.array([220., np.nan, 440., 0.]), 0.1)
        self.assertEqual(result['pitch_midi_p50'], 63.)
        self.assertAlmostEqual(result['voiced_ratio'], 0.5)
        self.assertAlmostEqual(result['pitched_seconds'], 0.2)
        self.assertEqual(result['longest_voiced_seconds'], 0.1)

    def test_no_pitch_is_missing_not_zero_range(self):
        result = summarize_pitch(np.array([np.nan, 0.]), 0.1)
        self.assertIsNone(result['pitch_midi_p50'])
        self.assertEqual(result['voiced_ratio'], 0.)

    def test_contiguous_frames_keep_duration(self):
        result = summarize_pitch(np.array([220., 220., np.nan, 440.]), 0.1)
        self.assertAlmostEqual(result['longest_voiced_seconds'], 0.2)


if __name__ == '__main__':
    unittest.main()
