import unittest
from unittest.mock import patch, Mock
import numpy as np

from local_analysis import measure_audio, analyze_voice, render_report, validate_observations


class LocalAnalysisTest(unittest.TestCase):
    def test_measure_known_pitch_without_cloud(self):
        sr = 16000
        y = .3 * np.sin(2 * np.pi * 220 * np.arange(sr * 3) / sr)
        result = measure_audio(y, sr)
        self.assertAlmostEqual(result['pitch_midi_p50'], 57., delta=.3)
        self.assertEqual(result['scope'], 'uploaded_excerpt')

    def test_silence_is_rejected(self):
        with self.assertRaisesRegex(ValueError, '소리'):
            measure_audio(np.zeros(16000 * 3), 16000)

    def test_cloud_request_contains_audio_and_no_filename(self):
        response = Mock(status_code=200)
        response.json.return_value = {'candidates': [{'finishReason': 'STOP', 'content': {'parts': [
            {'text': '{"summary":"담백한 인상","observations":[],"limitations":["짧은 녹음"]}'},
        ]}}], 'usageMetadata': {'totalTokenCount': 123}}
        with patch('local_analysis.requests.post', return_value=response) as post:
            result = analyze_voice(b'RIFF-audio', 3., 'test-key', 'gemini-test')
        payload = post.call_args.kwargs['json']
        self.assertIn('inlineData', payload['contents'][0]['parts'][0])
        self.assertEqual(result['usage']['totalTokenCount'], 123)
        self.assertEqual(result['analysis']['summary'], '담백한 인상')

    def test_invalid_time_range_rejected(self):
        with self.assertRaises(ValueError):
            validate_observations({'summary': 'test', 'limitations': [], 'observations': [
                {'start_seconds': 1, 'end_seconds': 8, 'feature': 'timbre',
                 'description': 'claim', 'confidence': 'low'}]}, 3.)

    def test_report_escapes_model_text(self):
        html = render_report({'measurement': {}, 'model_result': {'analysis': {
            'summary': '<script>alert(1)</script>', 'observations': [], 'limitations': []}}})
        self.assertNotIn('<script>alert(1)</script>', html)
        self.assertIn('&lt;script&gt;', html)

    def test_ambiguous_tiny_evidence_interval_is_rejected(self):
        with self.assertRaises(ValueError):
            validate_observations({'summary': 'test', 'limitations': [], 'observations': [
                {'start_seconds': .21, 'end_seconds': .22, 'feature': 'expression',
                 'description': 'vibrato', 'confidence': 'high'}]}, 45.)

    def test_low_pitch_coverage_warning(self):
        self.assertIn('유효 비율이 낮습니다', render_report({'measurement': {'voiced_ratio': .1}}))


if __name__ == '__main__':
    unittest.main()
