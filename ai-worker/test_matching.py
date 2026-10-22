"""매칭 로직 자체 점검. 실행: python test_matching.py"""
import numpy as np

from analysis_service import AnalysisService


def make_songs():
    rng = np.random.default_rng(0)
    songs = []
    for i in range(30):
        mfcc = rng.normal(0, 10, 20)
        mfcc[0] = rng.uniform(-600, -150)  # 실제 데이터처럼 c0(음량)가 크고 곡마다 다르다
        songs.append({"id": i, "pitch": float(rng.uniform(160, 420)), "mfcc": mfcc.tolist()})
    return songs


def test_same_voice_ranks_first_even_at_different_volume():
    songs = make_songs()
    target = songs[7]
    query = np.array(target["mfcc"])
    query[0] -= 300  # 녹음 음량이 달라도 음색이 같으면 같은 곡이 1위여야 한다
    ranked = AnalysisService.rank_songs(query, target["pitch"], songs)
    assert ranked[0]["id"] == 7, ranked[:3]
    assert ranked[0]["cosine"] > 0.99


def test_scores_spread_out():
    songs = make_songs()
    ranked = AnalysisService.rank_songs(np.array(songs[0]["mfcc"]), songs[0]["pitch"], songs)
    scores = [AnalysisService.cosine_to_score(c["cosine"]) for c in ranked]
    assert max(scores) - min(scores) > 40, scores


def test_semitone_gap_folds_octave():
    assert abs(AnalysisService.semitone_gap(220, 220)) < 1e-9
    assert abs(AnalysisService.semitone_gap(130, 260)) < 1e-9  # 한 옥타브 아래로 부르면 맞는 곡
    assert round(AnalysisService.semitone_gap(220, 196)) == 2
    assert AnalysisService.semitone_gap(0, 220) == 12.0


def test_pro_playlist_has_no_placeholder_songs():
    pro = AnalysisService.generate_pro_features(200, 210, {}, "가수", "곡", [{"title": "다른 곡", "artist": "가수2"}])
    assert pro["playlist"] == [{"title": "다른 곡", "artist": "가수2"}]


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print("ok", name)
