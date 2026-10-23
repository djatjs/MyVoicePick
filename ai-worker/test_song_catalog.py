import os
os.environ['AWS_EC2_METADATA_DISABLED'] = 'true'
os.environ.setdefault('AWS_DEFAULT_REGION', 'ap-northeast-2')

import json
import unittest
from unittest.mock import patch
import numpy as np
from sqlalchemy import create_engine
from sqlalchemy import BigInteger
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import Session
from database import Base
from models import Song
import data_collector as collector


@compiles(BigInteger, 'sqlite')
def sqlite_bigint(type_, compiler, **kw):
    return 'INTEGER'


class SongCatalogTest(unittest.TestCase):
    def test_short_audio_has_clear_error(self):
        with patch.object(collector.librosa, 'load', return_value=(np.ones(16000), 16000)), \
             patch.object(collector.librosa.effects, 'split', return_value=np.array([[0, 16000]])):
            with self.assertRaisesRegex(RuntimeError, '보컬 구간이 너무 짧습니다'):
                collector.extract_song_features('unused.wav')

    def test_real_pitch_extraction_on_synthetic_vocal(self):
        sr = 16000
        t = np.arange(sr * 12) / sr
        audio = 0.3 * np.sin(2 * np.pi * 220 * t)
        with patch.object(collector.librosa, 'load', return_value=(audio, sr)):
            pitch, mfcc, profile = collector.extract_song_features('synthetic.wav')
        self.assertAlmostEqual(profile['pitch_midi_p50'], 57., delta=0.3)
        self.assertEqual(profile['duration_seconds'], 12.)
        self.assertEqual(profile['scope'], 'preview')
        self.assertIsNone(profile['source_offset_seconds'])
        self.assertEqual(len(mfcc), 20)
        self.assertGreater(pitch, 0)

    def test_save_and_reanalyze_preserves_editorial_notes(self):
        engine = create_engine('sqlite://')
        Base.metadata.create_all(engine)
        with Session(engine) as db:
            entry = {'title': '곡', 'artist': '가수', 'genre': '댄스',
                     'source_track_id': '123', 'source_track_title': '곡 (Live)',
                     'source_track_url': 'https://example.com/123'}
            profile = {'scope': 'preview', 'feature_version': 'song-v1'}
            collector.save_song(db, entry, 220., [1.] * 20, profile)
            song = db.query(Song).one()
            song.editorial_notes = '{"reviewed":true}'
            db.commit()
            collector.save_song(db, entry, 230., [2.] * 20, profile)
            db.expire_all()
            song = db.query(Song).one()
            self.assertEqual(song.genre, '댄스')
            self.assertEqual(song.source_track_id, '123')
            self.assertEqual(json.loads(song.analysis_profile), profile)
            self.assertEqual(song.pitch, 230.)
            self.assertEqual(song.editorial_notes, '{"reviewed":true}')

    def test_extraction_rejects_insufficient_pitched_audio(self):
        with patch.object(collector.librosa, 'load', return_value=(np.ones(16000 * 12), 16000)), \
             patch.object(collector.librosa.effects, 'split', return_value=np.array([[0, 16000 * 12]])), \
             patch.object(collector.AnalysisService, 'extract_audio_features', return_value={
                 'pitch': 220., 'mfcc': np.ones(20), 'song_profile': {'pitched_seconds': 1.}}):
            with self.assertRaisesRegex(RuntimeError, '음높이 구간'):
                collector.extract_song_features('unused.wav')

    def test_collector_keeps_genre(self):
        html = '<tbody><tr><td class="ellipsis rank01"><a>곡</a></td><td class="ellipsis rank02"><a>가수</a></td></tr></tbody>'
        with patch.dict(collector.MELON_GENRES, {'GN0200': '댄스'}, clear=True), \
             patch.object(collector.requests, 'get') as get, patch.object(collector.time, 'sleep'), \
             patch('builtins.print'):
            get.return_value.text = html
            self.assertEqual(collector.load_target_songs_from_melon(1),
                             [{'title': '곡', 'artist': '가수', 'genre': '댄스'}])


if __name__ == '__main__':
    unittest.main()
