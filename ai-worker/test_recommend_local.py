import os
os.environ.setdefault('AWS_DEFAULT_REGION', 'ap-northeast-2')

import unittest

from recommend_local import key_shift, rank, reason


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

    def test_song_an_octave_up_is_sung_an_octave_down(self):
        shift, octave, fit = key_shift(USER['range'], song('a', 't', [], 64, 70)['range'])
        self.assertEqual((shift, octave, fit), (0, -12, 1.))


class RankTest(unittest.TestCase):
    def test_similar_voice_first_and_one_song_per_artist(self):
        catalog = [song('A', '1', [1., .1], 52, 58), song('A', '2', [1., .1], 52, 58),
                   song('B', '1', [0., 1.], 52, 58), song('C', '1', [.5, .5], 52, 58)]
        picks = rank(USER, catalog, top=3)
        self.assertEqual([p['artist'] for p in picks], ['A', 'C', 'B'])

    def test_reason_states_key_and_range(self):
        pick = rank(USER, [song('A', '1', [1., 0.], 53, 62), song('B', '1', [0., 1.], 50, 55)], top=1)[0]
        self.assertIn('-2키', reason(pick, USER))


if __name__ == '__main__':
    unittest.main()
