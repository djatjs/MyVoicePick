"""Observed pitch statistics; these describe the analyzed excerpt, not ability."""
import numpy as np

FEATURE_VERSION = "song-v2"


def vocal_activity(y, hop_length=256):
    import librosa
    rms = librosa.feature.rms(y=y, frame_length=1024, hop_length=hop_length)[0]
    peak = float(rms.max()) if rms.size else 0.
    return (rms > peak * 10 ** (-35 / 20)) & (rms > 0.00001)


def vocal_pitch_profile(y, sr, f0, voiced, probability, hop_length):
    active = vocal_activity(y, hop_length)[:len(f0)]
    return pitch_profile_from_activity(y, sr, f0, voiced, probability, hop_length, active)


def pitch_profile_from_activity(y, sr, f0, voiced, probability, hop_length, active):
    """Reuse a full-track activity mask without deriving a new excerpt peak."""
    if len(active) != len(f0):
        raise ValueError('활동 마스크와 F0 프레임 수가 다릅니다.')
    # shortcut: -35dB 활동 기준과 F0 확률 0.3은 실험값. 가창 평가 세트로 보정 후 운영에 적용.
    valid = active & voiced & np.isfinite(f0) & (probability >= .3)
    filtered = np.where(valid, f0, np.nan)
    result = summarize_pitch(filtered, hop_length / sr)
    weights = np.clip(len(y) / sr - np.arange(len(f0)) * hop_length / sr, 0, hop_length / sr)
    active_seconds = float(weights[active].sum())
    result.update({
        'voiced_ratio': float(valid.sum() / active.sum()) if active.any() else 0.,
        'full_frame_voiced_ratio': float(valid.mean()) if valid.size else 0.,
        'pitched_seconds': float(weights[valid].sum()),
        'longest_voiced_seconds': min(result['longest_voiced_seconds'], len(y) / sr),
        'vocal_active_seconds': active_seconds,
        'vocal_activity_ratio': active_seconds / (len(y) / sr),
        'duration_seconds': len(y) / sr,
        'f0_probability_threshold': .3,
        'activity_threshold_db': -35,
        'activity_method': 'separated_vocal_relative_rms',
    })
    return filtered, result


def summarize_pitch(f0, frame_seconds):
    valid = np.isfinite(f0) & (f0 > 0)
    midi = 69 + 12 * np.log2(f0[valid] / 440)
    runs = np.diff(np.flatnonzero(np.concatenate(([True], ~valid, [True])))) - 1
    quantiles = np.percentile(midi, [10, 50, 90]) if midi.size else [None] * 3
    return {
        "pitch_midi_p10": None if quantiles[0] is None else float(quantiles[0]),
        "pitch_midi_p50": None if quantiles[1] is None else float(quantiles[1]),
        "pitch_midi_p90": None if quantiles[2] is None else float(quantiles[2]),
        "voiced_ratio": float(valid.mean()) if valid.size else 0.,
        "pitched_seconds": float(valid.sum() * frame_seconds),
        "longest_voiced_seconds": float(runs.max() * frame_seconds),
    }
