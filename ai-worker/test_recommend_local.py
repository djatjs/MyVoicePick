import os
os.environ.setdefault('AWS_DEFAULT_REGION', 'ap-northeast-2')

import unittest

from recommend_local import combine
from types import SimpleNamespace

from voice_match import VERSION, catalog_from_songs, key_shift, rank, reason, result_fields


def song(artist, title, emb, lo, hi):
    return {'artist': artist, 'title': title, 'embedding': emb, 'preview_url': '',
            'range': {'pitch_midi_p10': lo, 'pitch_midi_p50': (lo + hi) / 2, 'pitch_midi_p90': hi}}


USER = {'embedding': [1., 0.], 'range': {'pitch_midi_p10': 50., 'pitch_midi_p50': 55., 'pitch_midi_p90': 60.}}


class KeyShiftTest(unittest.TestCase):
    def test_song_inside_range_stays_original_key(self):
        self.assertEqual(key_shift(USER['range'], song('a', 't', [], 52, 58)['range']), (0, 0, 1.))

    def test_song_two_semitones_high_moves_down(self):
        shift, octave, fit = key_shift(USER['range'], song('a', 't', [], 53, 62)['range'])
        self.assertEqual((shift, octave, fit), (-2, 0, 1.))

    def test_does_not_raise_key_just_to_cover_a_low_edge(self):
        # 1 semitone below the observed bottom, middle already a bit high: raising would only make it sit higher
        shift, octave, _ = key_shift(USER['range'], song('a', 't', [], 49, 58)['range'])
        self.assertEqual((shift, octave), (0, 0))

    def test_song_an_octave_up_is_sung_an_octave_down(self):
        shift, octave, fit = key_shift(USER['range'], song('a', 't', [], 64, 70)['range'])
        self.assertEqual((shift, octave, fit), (0, -12, 1.))


class RankTest(unittest.TestCase):
    def test_similar_voice_first_and_one_song_per_artist(self):
        catalog = [song('A', '1', [1., .1], 52, 58), song('A', '2', [1., .1], 52, 58),
                   song('B', '1', [0., 1.], 52, 58), song('C', '1', [.5, .5], 52, 58)]
        picks = rank(USER, catalog, top=3)
        self.assertEqual([p['artist'] for p in picks], ['A', 'C', 'B'])

    def test_same_voice_prefers_song_not_sitting_high(self):
        # both fit the observed range in the original key; the one sitting above the recording's middle loses
        catalog = [song('High', '1', [1., 0.], 54, 60), song('Mid', '1', [1., 0.], 52, 58)]
        self.assertEqual(rank(USER, catalog, top=1)[0]['artist'], 'Mid')

    def test_low_song_keeps_original_key(self):
        shift, octave, _ = key_shift(USER['range'], song('a', 't', [], 50, 54)['range'])
        self.assertEqual((shift, octave), (0, 0))

    def test_combined_recordings_average_voice_and_widen_range(self):
        a = {'embedding': [1., 0.], 'range': {'pitch_midi_p10': 50., 'pitch_midi_p50': 54., 'pitch_midi_p90': 58.}}
        b = {'embedding': [0., 1.], 'range': {'pitch_midi_p10': 53., 'pitch_midi_p50': 58., 'pitch_midi_p90': 63.}}
        user = combine([a, b])
        self.assertEqual(user['embedding'], [.5, .5])
        self.assertEqual(user['range'], {'pitch_midi_p10': 50., 'pitch_midi_p50': 56., 'pitch_midi_p90': 63.})

    def test_result_fields_report_measurements_not_trait_scores(self):
        catalog = [song('A', '1', [1., 0.], 53, 62), song('B', '1', [.8, .2], 52, 58), song('C', '1', [0., 1.], 50, 55)]
        for i, s in enumerate(catalog):
            s['id'] = i + 1
        result = result_fields(USER, catalog)
        self.assertEqual(result['matched_song_id'], 1)
        self.assertEqual(result['pro_features'], {'key': '-2 Key', 'playlist': [{'title': '1', 'artist': 'B'},
                                                                              {'title': '1', 'artist': 'C'}]})
        self.assertEqual({k: result['vocal_stats'][k] for k in ('range_low', 'range_center', 'range_high')},
                         {'range_low': 'D3', 'range_center': 'G3', 'range_high': 'C4'})
        self.assertEqual(result['vocal_stats']['similar_artists'][0], 'A')
        self.assertEqual((result['voice_tags'], result['vocal_persona']), ([], ''))
        self.assertNotIn('guide', result['pro_features'])

    def test_narrow_recording_gives_no_key(self):
        narrow = {'embedding': [1., 0.], 'range': {'pitch_midi_p10': 52., 'pitch_midi_p50': 54., 'pitch_midi_p90': 57.}}
        catalog = [song('A', '1', [1., 0.], 58, 66)]
        catalog[0]['id'] = 1
        result = result_fields(narrow, catalog)
        self.assertIsNone(result['pro_features']['key'])
        self.assertIn('키는 판단하지 않았어요', result['recommend_reason'])

    def test_no_catalog_still_reports_range_without_a_match(self):
        result = result_fields(USER, [])
        self.assertIsNone(result['matched_song_id'])
        self.assertEqual(result['vocal_stats']['range_high'], 'C4')

    def test_db_catalog_keeps_only_current_voice_profiles(self):
        voice = '{"voice": {"version": "%s", "embedding": [1, 0], "range": {"pitch_midi_p10": 50}}}'
        rows = [SimpleNamespace(id=1, title='a', artist='A', analysis_profile=voice % VERSION),
                SimpleNamespace(id=2, title='b', artist='B', analysis_profile=voice % 'old'),
                SimpleNamespace(id=3, title='c', artist='C', analysis_profile='{"scope": "preview"}'),
                SimpleNamespace(id=4, title='d', artist='D', analysis_profile='not json')]
        self.assertEqual([s['id'] for s in catalog_from_songs(rows)], [1])

    def test_reason_states_key_and_range(self):
        pick = rank(USER, [song('A', '1', [1., 0.], 53, 62), song('B', '1', [0., 1.], 50, 55)], top=1)[0]
        self.assertIn('-2키', reason(pick, USER))


if __name__ == '__main__':
    unittest.main()
