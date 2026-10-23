import copy
import unittest
from unittest.mock import patch
import numpy as np

from local_analysis import (measure_audio, select_window, consistency_report,
                            check_pitch_claims, TRAIT_VALUES, validate_observations)


def traits():
    return {name: {'value': values[0], 'confidence': 'medium'}
            for name, values in TRAIT_VALUES.items()}


class AnalysisV2Test(unittest.TestCase):
    def test_window_uses_vocal_activity_and_keeps_time(self):
        sr = 16000
        y = np.zeros(sr * 70)
        y[sr * 40:sr * 60] = .3
        start = select_window(y, sr, 20)
        self.assertAlmostEqual(start, 40, delta=.04)

    def test_activity_denominator_excludes_silence(self):
        y = np.concatenate([np.zeros(16000 * 5), np.ones(16000 * 5) * .3])
        n = len(y) // 256 + 1
        f0 = np.full(n, 220.)
        with patch('local_analysis.librosa.pyin', return_value=(f0, np.ones(n, bool), np.ones(n))):
            result = measure_audio(y, 16000)
        self.assertAlmostEqual(result['vocal_active_seconds'], 5, delta=.2)
        self.assertEqual(result['voiced_ratio'], 1.)
        self.assertLess(result['vocal_activity_ratio'], .6)
        self.assertEqual(result['f0_probability_threshold'], .3)

    def test_consistency_counts_unknown_separately(self):
        runs = [{'analysis': {'traits': traits()}} for _ in range(3)]
        runs[1] = copy.deepcopy(runs[1])
        runs[1]['analysis']['traits']['brightness']['value'] = 'high'
        result = consistency_report(runs)
        self.assertAlmostEqual(result['traits']['brightness']['pairwise_agreement'], 1/3)
        self.assertEqual(result['successful_runs'], 3)

    def test_partial_runs_do_not_claim_repetition_success(self):
        result = consistency_report([{'analysis': {'traits': traits()}}])
        self.assertIsNone(result['pairwise_agreement'])

    def test_missing_traits_rejected(self):
        with self.assertRaises(ValueError):
            validate_observations({'summary': 's', 'observations': [], 'limitations': []}, 45)

    def test_explicit_pitch_claim_compared_without_gender_cutoff(self):
        analysis = {'pitch_claims': [{'description': '관측 음역', 'low_midi': 72, 'high_midi': 80}]}
        checked = check_pitch_claims(analysis, {'pitch_midi_p10': 50, 'pitch_midi_p90': 58})
        self.assertEqual(checked[0]['status'], 'conflict')
        analysis['pitch_claims'][0].update(low_midi=None, high_midi=None)
        self.assertEqual(check_pitch_claims(analysis, {})[0]['status'], 'unverifiable')


if __name__ == '__main__':
    unittest.main()
