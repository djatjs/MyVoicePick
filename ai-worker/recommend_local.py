"""Local, free song recommendation experiment: ECAPA timbre + observed pitch range. No paid API.

python recommend_local.py build [--limit N] [--melon 60]   # iTunes previews of local DB (+ Melon chart) songs
python recommend_local.py eval                # same-artist retrieval: ECAPA vs mean-MFCC
python recommend_local.py recommend <audio>   # top songs for a recording, HTML report
"""
import argparse
import html
import json
import os
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

import librosa
import numpy as np
import requests

import data_collector as collector
from voice_match import BASE, SR, VERSION, note, rank, reason, similar_artists, voice_features

CATALOG_DIR = BASE / 'temp' / 'catalog'
CATALOG_PATH = CATALOG_DIR / 'catalog.json'


def load_catalog():
    return json.loads(CATALOG_PATH.read_text(encoding='utf-8')) if CATALOG_PATH.exists() else {}


def build(limit=None, melon_per_genre=0):
    CATALOG_DIR.mkdir(parents=True, exist_ok=True)
    catalog = load_catalog()
    failed_path = CATALOG_DIR / 'failed.json'
    failed = json.loads(failed_path.read_text(encoding='utf-8')) if failed_path.exists() else {}
    targets = []
    # the original 56-song local DB is optional; elsewhere the Melon charts are the only source
    if (BASE / 'local_temp.db').exists():
        with sqlite3.connect(BASE / 'local_temp.db') as db:
            targets = [{'id': i, 'title': t, 'artist': a}
                       for i, t, a in db.execute('select id, title, artist from songs order by id')]
    if melon_per_genre:
        targets += collector.load_target_songs_from_melon(melon_per_genre)
    done = {collector.song_key(s['title'], s['artist']) for s in catalog.values()}
    tracks = {s['source_track_id'] for s in catalog.values()}
    todo = []
    for target in targets:
        key = collector.song_key(target['title'], target['artist'])
        if key not in done and key not in failed:
            done.add(key)
            todo.append(target)
    todo = todo[:limit]
    session = requests.Session()
    session.headers['User-Agent'] = collector.USER_AGENT

    def fail(entry, error):
        print(f'  건너뜀 {entry["artist"]} - {entry["title"]}: {error}')
        failed[collector.song_key(entry['title'], entry['artist'])] = str(error)[:200]

    for i in range(0, len(todo), 8):
        batch, paths = [], []
        for target in todo[i:i + 8]:
            entry = dict(target)
            path = CATALOG_DIR / f'{collector.file_id(collector.song_key(entry["title"], entry["artist"]))}.m4a'
            try:
                collector.fetch_meta(session, entry)
                if entry['source_track_id'] in tracks:
                    raise ValueError('이미 카탈로그에 있는 iTunes 트랙입니다.')
                if not path.exists():
                    collector.download_preview(session, entry['preview_url'], str(path))
            except Exception as error:
                fail(entry, error)
                continue
            tracks.add(entry['source_track_id'])
            batch.append(entry)
            paths.append(str(path))
        if not paths:
            continue
        print(f'보컬 분리 {i + 1}~{i + len(todo[i:i + 8])} / {len(todo)}', flush=True)
        errors = collector.separate_vocals(paths)
        for entry, path in zip(batch, paths):
            try:
                if errors[path]:
                    raise RuntimeError(errors[path])
                vocals, _ = librosa.load(collector._vocal_path(path), sr=SR)
                features = voice_features(vocals)
                if features['pitched_seconds'] < 5:
                    raise ValueError('유효 음높이 구간이 5초 미만입니다.')
            except Exception as error:
                fail(entry, error)
                continue
            # DB songs keep their numeric id as key; chart songs use title||artist
            key = str(entry['id']) if entry.get('id') else collector.song_key(entry['title'], entry['artist'])
            catalog[key] = {'id': entry.get('id'), 'title': entry['title'], 'artist': entry['artist'],
                            'genre': entry.get('genre'), 'source_track_id': entry['source_track_id'],
                            'source_track_title': entry.get('itunes_track'),
                            'preview_url': entry['preview_url'], 'version': VERSION, **features}
        CATALOG_PATH.write_text(json.dumps(catalog, ensure_ascii=False), encoding='utf-8')
        failed_path.write_text(json.dumps(failed, ensure_ascii=False), encoding='utf-8')
    print(f'카탈로그 {len(catalog)}곡: {CATALOG_PATH}')


def export_db():
    """Upsert the catalog into the songs table so the worker can recommend from it (DATABASE_URL)."""
    from database import SessionLocal
    from models import Song
    catalog = list(load_catalog().values())
    session = requests.Session()
    session.headers['User-Agent'] = collector.USER_AGENT
    covers = {}
    ids = [s['source_track_id'] for s in catalog]
    for i in range(0, len(ids), 50):
        for r in collector._itunes_get(session, collector.ITUNES_LOOKUP_URL, {'id': ','.join(ids[i:i + 50]), 'country': 'KR'}):
            if r.get('artworkUrl100'):
                covers[str(r['trackId'])] = r['artworkUrl100'].replace('100x100bb', '600x600bb')
    db = SessionLocal()
    try:
        for entry in catalog:
            song = db.query(Song).filter(Song.source_track_id == entry['source_track_id']).first()
            if song is None:
                song = db.query(Song).filter(Song.title == entry['title'], Song.artist == entry['artist']).first()
            if song is None:
                song = Song(title=entry['title'], artist=entry['artist'])
                db.add(song)
            r = entry['range']
            try:
                profile = json.loads(song.analysis_profile or '{}')
            except ValueError:
                profile = {}
            profile['voice'] = {'version': VERSION, 'embedding': entry['embedding'], 'range': r,
                                'source': 'itunes', 'scope': 'preview'}
            song.analysis_profile = json.dumps(profile, ensure_ascii=False, allow_nan=False)
            song.source_track_id = entry['source_track_id']
            song.preview_url = entry['preview_url']
            song.album_cover_url = covers.get(entry['source_track_id']) or song.album_cover_url
            song.genre = song.genre or entry.get('genre')
            song.pitch = float(librosa.midi_to_hz(r['pitch_midi_p50']))
            song.mfcc_vector = json.dumps(entry['mfcc'])
        db.commit()
    finally:
        db.close()
    print(f'DB에 {len(catalog)}곡 저장 (표지 {len(covers)}개)')


def evaluate():
    """Leave-one-out: for songs whose artist has 2+ songs, is the nearest other song by the same artist?"""
    songs = list(load_catalog().values())
    X = {'ecapa': np.array([s['embedding'] for s in songs])}
    M = np.array([s['mfcc'] for s in songs])[:, 1:]
    X['mfcc_z (기존)'] = (M - M.mean(0)) / (M.std(0) + 1e-9)
    artists = [s['artist'] for s in songs]
    queries = [i for i, a in enumerate(artists) if artists.count(a) > 1]
    print(f'곡 {len(songs)}개, 같은 가수 곡이 있는 질의 {len(queries)}개, 무작위 기대값 '
          f'{np.mean([(artists.count(artists[i]) - 1) / (len(songs) - 1) for i in queries]):.0%}')
    for name, x in X.items():
        x = x / np.linalg.norm(x, axis=1, keepdims=True)
        sims = x @ x.T
        np.fill_diagonal(sims, -np.inf)
        top1 = np.mean([artists[int(np.argmax(sims[i]))] == artists[i] for i in queries])
        top5 = np.mean([artists[i] in [artists[j] for j in np.argsort(-sims[i])[:5]] for i in queries])
        print(f'{name:<14} 같은 가수 1위 {top1:.0%}, 5위 안 {top5:.0%}')


def combine(profiles):
    """One singer from several recordings: average voice, and every note heard in any of them counts."""
    ranges = [p['range'] for p in profiles]
    # shortcut: 녹음별 분위수를 min/평균/max로 합침. 녹음이 많아지면 F0 프레임을 모아 분위수를 다시 계산할 것
    return {'embedding': np.mean([p['embedding'] for p in profiles], axis=0).tolist(),
            'range': {'pitch_midi_p10': min(r['pitch_midi_p10'] for r in ranges),
                      'pitch_midi_p50': float(np.mean([r['pitch_midi_p50'] for r in ranges])),
                      'pitch_midi_p90': max(r['pitch_midi_p90'] for r in ranges)}}


def recommend(audios, vocals_path=None, output=BASE.parent / 'tmp' / 'recommend'):
    from local_analysis import separate_vocals
    catalog = list(load_catalog().values())
    if not catalog:
        raise SystemExit('카탈로그가 없습니다. 먼저 build를 실행하세요.')
    profiles = []
    for audio in audios:
        vocals, _ = librosa.load(vocals_path or separate_vocals(audio, BASE.parent / 'tmp' / 'audio-analysis' / 'separation-cache'), sr=SR)
        profiles.append(voice_features(vocals))
        if len(audios) > 1:
            r = profiles[-1]['range']
            print(f"[{Path(audio).name}] 음역 {note(r['pitch_midi_p10'])}~{note(r['pitch_midi_p90'])} · 닮은 가수 "
                  f"{', '.join(a for a, _ in similar_artists(profiles[-1], catalog))} · 추천 "
                  f"{', '.join(s['artist'] + ' - ' + s['title'] for s in rank(profiles[-1], catalog))}")
    user = combine(profiles) if len(profiles) > 1 else profiles[0]
    audio = audios[0] if len(audios) == 1 else Path(f'녹음 {len(audios)}개 합산')
    picks, artists = rank(user, catalog), similar_artists(user, catalog)
    r = user['range']
    print(f"녹음에서 들린 음역 {note(r['pitch_midi_p10'])}~{note(r['pitch_midi_p90'])} (중심 {note(r['pitch_midi_p50'])})")
    print('닮은 가수:', ', '.join(f'{a} ({s:.2f})' for a, s in artists))
    for n, s in enumerate(picks, 1):
        print(f"{n}. {s['artist']} - {s['title']}  [점수 {s['score']:.2f}] {reason(s, user)}")
    esc = lambda v: html.escape(str(v))
    rows = ''.join(f"<li><strong>{esc(s['artist'])} - {esc(s['title'])}</strong>"
                   f"<audio controls preload=none src='{esc(s['preview_url'])}'></audio><p>{esc(reason(s, user))}</p></li>"
                   for s in picks)
    folder = Path(output) / datetime.now().strftime('%Y%m%d-%H%M%S')
    folder.mkdir(parents=True)
    page = (f"<!doctype html><meta charset=utf-8><title>추천 결과</title>"
            f"<body style='max-width:760px;margin:40px auto;font-family:system-ui;line-height:1.7'>"
            f"<h1>{esc(Path(audio).name)} 추천곡</h1><p>녹음에서 들린 음역 {note(r['pitch_midi_p10'])}~{note(r['pitch_midi_p90'])}. "
            f"편한 음역이 아니라 이번 녹음에서 관측한 범위입니다.</p>"
            f"<p>닮은 가수: {esc(', '.join(a for a, _ in artists))}</p><ol>{rows}</ol>"
            f"<p><small>{VERSION} · 카탈로그 {len(catalog)}곡 · 유료 API 미사용</small></p>")
    (folder / 'report.html').write_text(page, encoding='utf-8')
    (folder / 'report.json').write_text(json.dumps({'inputs': [str(a) for a in audios], 'user': user,
                                                    'picks': picks, 'similar_artists': artists},
                                                   ensure_ascii=False), encoding='utf-8')
    print('리포트:', (folder / 'report.html').resolve())


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest='cmd', required=True)
    b = sub.add_parser('build')
    b.add_argument('--limit', type=int)
    b.add_argument('--melon', type=int, default=0, help='멜론 장르별 차트에서 장르당 가져올 곡 수')
    sub.add_parser('eval')
    sub.add_parser('export-db')
    r = sub.add_parser('recommend')
    r.add_argument('audio', type=Path, nargs='+', help='같은 사람의 녹음 여러 개를 주면 합쳐서 추천')
    r.add_argument('--vocals', type=Path)
    args = parser.parse_args()
    if args.cmd == 'build':
        build(args.limit, args.melon)
    elif args.cmd == 'export-db':
        export_db()
    elif args.cmd == 'eval':
        evaluate()
    else:
        recommend(args.audio, args.vocals)


if __name__ == '__main__':
    sys.exit(main())
