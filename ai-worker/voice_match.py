"""Voice matching shared by the worker and the local tools: ECAPA timbre + observed pitch range."""
import json
from pathlib import Path

import librosa
import numpy as np

from song_features import vocal_activity, vocal_pitch_profile

SR, HOP = 16000, 256
BASE = Path(__file__).parent
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


def range_known(user):
    """Enough notes heard to suggest a key: p10~p90 spans at least 7 semitones."""
    # shortcut: 7반음 기준은 실험값. 녹음별 결과가 쌓이면 보정할 것
    return user['pitch_midi_p90'] - user['pitch_midi_p10'] >= 7


def center_gap(user, song, shift, octave):
    """Semitones the song's middle (p50, after the key change) sits above (+) or below (-) the recording's middle."""
    return song['pitch_midi_p50'] + shift + octave - user['pitch_midi_p50']


def rank(user, catalog, top=5):
    """Timbre percentile 60% + range 40% (fit inside the observed range, and how near its middle the song sits),
    at most one song per artist."""
    sims = np.array([cosine(user['embedding'], s['embedding']) for s in catalog])
    pct = sims.argsort().argsort() / max(len(sims) - 1, 1)
    scored = []
    judge_key = range_known(user['range'])
    for song, sim, p in zip(catalog, sims, pct):
        # a narrow recording says little about where the voice can go; keep the original key and skip the fit
        shift, octave, fit = key_shift(user['range'], song['range']) if judge_key else (0, 0, 1.)
        gap = center_gap(user['range'], song['range'], shift, octave)
        # sitting above the recording's middle is the strain; sitting lower is easy
        # shortcut: 6반음 위면 0점인 선형 감점은 실험값. 사용자 피드백이 쌓이면 보정할 것
        comfort = max(0., 1 - max(gap, 0.) / 6)
        scored.append({**song, 'similarity': float(sim), 'timbre_pct': float(p), 'shift': shift,
                       'octave': octave, 'fit': fit, 'center_gap': gap, 'key_judged': judge_key,
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


def result_fields(user, catalog):
    """Analysis task fields from measurements only: the range heard, the closest singers, the picks with a
    reason, the key and the Pro playlist. Persona, tags and 0~100 trait scores are left empty on purpose."""
    r = user['range']
    picks = rank(user, catalog) if catalog else []
    best = picks[0] if picks else None
    key = None
    if best and best['key_judged']:
        octave = f" (한 옥타브 {'낮게' if best['octave'] < 0 else '높게'})" if best['octave'] else ''
        key = (f"{best['shift']:+d} Key" if best['shift'] else '원키 (Original Key)') + octave
    return {
        'matched_song_id': best['id'] if best else None,
        'similarity_score': round((best['similarity'] + 1) / 2 * 100) if best else 0,
        'pitch_hz': int(librosa.midi_to_hz(r['pitch_midi_p50'])),
        'recommend_reason': reason(best, user) if best else '',
        'voice_tags': [],
        'vocal_persona': '',
        'vocal_stats': {'version': VERSION, 'range_low': note(r['pitch_midi_p10']),
                        'range_high': note(r['pitch_midi_p90']), 'range_center': note(r['pitch_midi_p50']),
                        'similar_artists': [a for a, _ in similar_artists(user, catalog)] if catalog else []},
        'pro_features': {'key': key, 'playlist': [{'title': p['title'], 'artist': p['artist']} for p in picks[1:5]]},
    }


def catalog_from_songs(songs):
    """DB Song rows whose analysis_profile carries a voice profile of this VERSION -> rank() catalog entries."""
    catalog = []
    for song in songs:
        try:
            voice = json.loads(song.analysis_profile or '{}').get('voice') or {}
        except ValueError:
            continue
        if voice.get('version') == VERSION and voice.get('embedding') and voice.get('range'):
            catalog.append({'id': song.id, 'title': song.title, 'artist': song.artist,
                            'embedding': voice['embedding'], 'range': voice['range']})
    return catalog


def note(midi):
    return librosa.midi_to_note(midi, unicode=False)


def reason(song, user):
    r = song['range']
    parts = [f"음색이 카탈로그 곡 중 상위 {round((1 - song['timbre_pct']) * 100) or 1}%로 가까워요"]
    span = f"곡의 주 음역 {note(r['pitch_midi_p10'])}~{note(r['pitch_midi_p90'])}"
    if not song.get('key_judged', True):
        parts.append(f'{span}예요. 이번 녹음에서 들린 음역이 좁아서 키는 판단하지 않았어요')
    elif song['shift'] == 0 and song['octave'] == 0:
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
