"""매칭 로직 자체 점검. 실행: python test_matching.py"""
from analysis_service import AnalysisService


def test_pro_playlist_has_no_placeholder_songs():
    pro = AnalysisService.generate_pro_features(200, 210, {}, "가수", "곡", [{"title": "다른 곡", "artist": "가수2"}])
    assert pro["playlist"] == [{"title": "다른 곡", "artist": "가수2"}]


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print("ok", name)
