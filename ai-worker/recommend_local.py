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
from song_features import vocal_activity, vocal_pitch_profile

SR, HOP = 16000, 256
BASE = Path(__file__).parent
CATALOG_DIR = BASE / 'temp' / 'catalog'
CATALOG_PATH = CATALOG_DIR / 'catalog.json'
VERSION = 'local-rec-v1'
_encoder = None


def encoder():
    global _encoder
    if _encoder is None:
        from speechbrain.inference.speaker import EncoderClassifier
        from speechbrain.utils.fetching import LocalStrategy
        _encoder = EncoderClassifier.from_hparams(
            source='speechbrain/spkrec-ecapa-voxceleb', savedir=str(BASE / 'temp' / 'ecapa'),
            local_strategy=LocalStrategy.COPY, run_opts={'device': 'cpu'})
    return _encoder


def voice_features(vocals):
    """Embedding and pitch range from a separated vocal track (16 kHz)."""
    import torch
    active = vocal_activity(vocals, HOP)
    # silence and accompaniment bleed between phrases would dilute the voice embedding
    frames = np.repeat(active, HOP)[:len(vocals)]
    voiced = vocals[:len(frames)][frames]
    if len(voiced) < SR * 5:
        raise ValueError(f'보컬 구간이 너무 짧습니다. ({len(voiced) / SR:.1f}초)')
    embedding = encoder().encode_batch(torch.tensor(voiced)[None]).squeeze().numpy()
    f0, flag, prob = librosa.pyin(vocals, sr=SR, fmin=librosa.note_to_hz('C2'),
                                  fmax=librosa.note_to_hz('C7'), hop_length=HOP)
    _, profile = vocal_pitch_profile(vocals, SR, f0, flag, prob, HOP)
    mfcc = np.mean(librosa.feature.mfcc(y=voiced, sr=SR, n_mfcc=20), axis=1)
    return {'embedding': embedding.tolist(), 'mfcc': mfcc.tolist(),
            'range': {k: profile[k] for k in ('pitch_midi_p10', 'pitch_midi_p50', 'pitch_midi_p90')},
            'pitched_seconds': profile['pitched_seconds'], 'vocal_active_seconds': profile['vocal_active_seconds']}


def key_shift(user, song):
    """Semitones to move the song so its p10~p90 sits inside the user's observed p10~p90.
    Returns (shift, octave, fit 0~1). Shifts past 6 semitones mean singing an octave away instead."""
    u_lo, u_hi = user['pitch_midi_p10'], user['pitch_midi_p90']
    s_lo, s_hi = song['pitch_midi_p10'], song['pitch_midi_p90']
    best = None
    for octave in (-12, 0, 12):
        for shift in range(-6, 7):
            lo, hi = s_lo + octave + shift, s_hi + octave + shift
            overlap = max(0., min(hi, u_hi) - max(lo, u_lo)) / max(hi - lo, 1.)
            # going over the top strains the voice; the observed bottom is only the lowest note sung this time,
            # so up to 2 semitones under it is free and beyond that counts half
            misfit = (max(0., hi - u_hi) + .5 * max(0., u_lo - lo - 2)) / max(hi - lo, 1.)
            # change key only to fix a misfit, never just to move the song around
            score = -misfit - abs(shift) * .03 - (octave != 0) * .05
            if best is None or score > best[0]:
                best = (score, shift, octave, overlap)
    _, shift, octave, overlap = best
    return shift, octave, overlap


def cosine(a, b):
    a, b = np.asarray(a), np.asarray(b)
    return float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b) or 1.))


def center_gap(user, song, shift, octave):
    """Semitones the song's middle (p50, after the key change) sits above (+) or below (-) the recording's middle."""
    return song['pitch_midi_p50'] + shift + octave - user['pitch_midi_p50']


def rank(user, catalog, top=5):
    """Timbre percentile 60% + range 40% (fit inside the observed range, and how near its middle the song sits),
    at most one song per artist."""
    sims = np.array([cosine(user['embedding'], s['embedding']) for s in catalog])
    pct = sims.argsort().argsort() / max(len(sims) - 1, 1)
    scored = []
    for song, sim, p in zip(catalog, sims, pct):
        shift, octave, fit = key_shift(user['range'], song['range'])
        gap = center_gap(user['range'], song['range'], shift, octave)
        # sitting above the recording's middle is the strain; sitting lower is easy
        # shortcut: 6반음 위면 0점인 선형 감점은 실험값. 사용자 피드백이 쌓이면 보정할 것
        comfort = max(0., 1 - max(gap, 0.) / 6)
        scored.append({**song, 'similarity': float(sim), 'timbre_pct': float(p), 'shift': shift,
                       'octave': octave, 'fit': fit, 'center_gap': gap,
                       'score': .6 * p + .4 * (.5 * fit + .5 * comfort)})
    scored.sort(key=lambda s: -s['score'])
    picks, artists = [], set()
    for song in scored:
        if song['artist'] not in artists:
            picks.append(song)
            artists.add(song['artist'])
        if len(picks) == top:
            break
    return picks


def similar_artists(user, catalog, top=3):
    by_artist = {}
    for s in catalog:
        by_artist.setdefault(s['artist'], []).append(s['embedding'])
    sims = [(a, cosine(user['embedding'], np.mean(e, axis=0))) for a, e in by_artist.items()]
    return sorted(sims, key=lambda x: -x[1])[:top]


def note(midi):
    return librosa.midi_to_note(midi, unicode=False)


def reason(song, user):
    r = song['range']
    parts = [f"음색이 카탈로그 곡 중 상위 {round((1 - song['timbre_pct']) * 100) or 1}%로 가까워요"]
    span = f"곡의 주 음역 {note(r['pitch_midi_p10'])}~{note(r['pitch_midi_p90'])}"
    if song['shift'] == 0 and song['octave'] == 0:
        parts.append(f'{span}가 녹음에서 들린 음역 안에 {song["fit"]:.0%} 들어와 원키로 시작해 보세요')
    else:
        key = f"{song['shift']:+d}키" if song['shift'] else '원키'
        octave = ' (한 옥타브 ' + ('낮게' if song['octave'] < 0 else '높게') + ')' if song['octave'] else ''
        parts.append(f'{span}라 {key}{octave}로 옮기면 녹음 음역 안에 {song["fit"]:.0%} 들어와요')
    gap = song.get('center_gap', 0)
    if abs(gap) <= 1.5:
        parts.append('곡이 주로 머무는 높이가 녹음에서 가장 많이 낸 높이와 비슷해요')
    elif gap > 0:
        parts.append(f'다만 곡이 녹음에서 가장 많이 낸 높이보다 {gap:.0f}반음 높은 쪽에 머물러 조금 힘이 들 수 있어요')
    else:
        parts.append(f'곡이 녹음에서 가장 많이 낸 높이보다 {-gap:.0f}반음 낮은 쪽에 머물러 편하게 부를 수 있어요')
    return '. '.join(parts) + '.'


def load_catalog():
    return json.loads(CATALOG_PATH.read_text(encoding='utf-8')) if CATALOG_PATH.exists() else {}


def build(limit=None, melon_per_genre=0):
    CATALOG_DIR.mkdir(parents=True, exist_ok=True)
    catalog = load_catalog()
    failed_path = CATALOG_DIR / 'failed.json'
    failed = json.loads(failed_path.read_text(encoding='utf-8')) if failed_path.exists() else {}
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


def recommend(audio, vocals_path=None, output=BASE.parent / 'tmp' / 'recommend'):
    from local_analysis import separate_vocals
    catalog = list(load_catalog().values())
    if not catalog:
        raise SystemExit('카탈로그가 없습니다. 먼저 build를 실행하세요.')
    vocals, _ = librosa.load(vocals_path or separate_vocals(audio, BASE.parent / 'tmp' / 'audio-analysis' / 'separation-cache'), sr=SR)
    user = voice_features(vocals)
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
    (folder / 'report.json').write_text(json.dumps({'user': user, 'picks': picks, 'similar_artists': artists},
                                                   ensure_ascii=False), encoding='utf-8')
    print('리포트:', (folder / 'report.html').resolve())


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest='cmd', required=True)
    b = sub.add_parser('build')
    b.add_argument('--limit', type=int)
    b.add_argument('--melon', type=int, default=0, help='멜론 장르별 차트에서 장르당 가져올 곡 수')
    sub.add_parser('eval')
    r = sub.add_parser('recommend')
    r.add_argument('audio', type=Path)
    r.add_argument('--vocals', type=Path)
    args = parser.parse_args()
    if args.cmd == 'build':
        build(args.limit, args.melon)
    elif args.cmd == 'eval':
        evaluate()
    else:
        recommend(args.audio, args.vocals)


if __name__ == '__main__':
    sys.exit(main())
