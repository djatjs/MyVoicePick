"""Observed pitch statistics; these describe the analyzed excerpt, not ability."""
import numpy as np

FEATURE_VERSION = "song-v1"


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
