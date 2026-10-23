import os
import re
import sys
import json
import time
import shutil
import hashlib
import argparse
import subprocess
import warnings
from concurrent.futures import ThreadPoolExecutor

import requests
import librosa
from bs4 import BeautifulSoup
from sqlalchemy import inspect

from database import engine, SessionLocal
from models import Song
from analysis_service import AnalysisService
from song_features import FEATURE_VERSION
from datetime import datetime, timezone

warnings.filterwarnings('ignore')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATE_PATH = os.path.join(BASE_DIR, "collector_state.json")
TEMP_DIR = os.path.join(BASE_DIR, "temp", "collector")
DEMUCS_OUT_DIR = os.path.join(BASE_DIR, "temp_demucs")

MELON_GENRE_URL = "https://www.melon.com/genre/song_list.htm"
MELON_PAGE_SIZE = 50
MELON_GENRES = {
    "GN0100": "발라드",
    "GN0200": "댄스",
    "GN0400": "R&B/Soul",
    "GN0600": "록/메탈",
    "GN0500": "인디음악",
}

ITUNES_SEARCH_URL = "https://itunes.apple.com/search"
ITUNES_LOOKUP_URL = "https://itunes.apple.com/lookup"
ITUNES_INTERVAL_SEC = 3.1      # iTunes Search API는 분당 약 20회 제한 (곡당 검색+조회 2~3회 호출)
DOWNLOAD_WORKERS = 4

# 보컬 유효성 기준 (미리듣기 30초 중 보컬이 거의 없는 곡은 저장하지 않음)
MIN_VOICED_SEC = 10.0
MIN_VOCAL_PEAK = 0.05

# 곡별 진행 상태
PENDING = "PENDING"        # 아직 아무것도 안 함
META_OK = "META_OK"        # iTunes 메타/미리듣기 URL 확보
DONE = "DONE"              # DB 저장 완료
FAILED = "FAILED"          # 실패 (reason 참고, --retry-failed 로 재시도)

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"


# ---------------------------------------------------------------------------
# 곡 목록 (멜론 장르별 스테디셀러)
# ---------------------------------------------------------------------------
def load_target_songs_from_melon(per_genre: int) -> list:
    """
    [기능] 멜론 장르별 스테디셀러 목록(발라드, R&B, 록/메탈 등)을 크롤링하여 다양한 보컬 스펙트럼의 곡을 수집합니다.
    """
    print("  🍈 멜론 장르별 목록에서 보컬 분석에 적합한 곡들을 불러오는 중...")

    by_genre = []
    seen = set()  # 장르 간 중복 곡 방지

    for code, genre_name in MELON_GENRES.items():
        headers = {
            "User-Agent": USER_AGENT,
            # Referer가 없으면 2페이지부터 빈 응답(304)이 내려옵니다.
            "Referer": f"{MELON_GENRE_URL}?gnrCode={code}&steadyYn=Y",
        }
        genre_songs = []
        try:
            for start_index in range(1, per_genre + 1, MELON_PAGE_SIZE):
                response = requests.get(MELON_GENRE_URL, headers=headers, timeout=10, params={
                    "gnrCode": code,
                    "steadyYn": "Y",
                    "startIndex": start_index,
                    "pageSize": MELON_PAGE_SIZE,
                })
                response.raise_for_status()
                soup = BeautifulSoup(response.text, 'html.parser')

                page_count = 0
                for track in soup.select('tbody tr'):
                    title_tag = track.select_one('.ellipsis.rank01 a')
                    artist_tag = track.select_one('.ellipsis.rank02 a')
                    if not (title_tag and artist_tag):
                        continue
                    page_count += 1

                    # 멜론은 띄어쓰기를 &nbsp;로 내려주므로 일반 공백으로 바꿉니다.
                    title = title_tag.text.replace("\xa0", " ").strip()
                    artist = artist_tag.text.replace("\xa0", " ").strip()
                    identifier = f"{title}-{artist}"

                    if identifier not in seen and len(genre_songs) < per_genre:
                        seen.add(identifier)
                        genre_songs.append({"title": title, "artist": artist, "genre": genre_name})

                if page_count == 0:
                    break
                time.sleep(0.5)

        except Exception as e:
            print(f"  🚨 장르 {genre_name}({code}) 데이터 수집 중 오류 발생: {e}")

        if not genre_songs:
            print(f"  ⚠️ 장르 {genre_name}({code}): 곡을 하나도 찾지 못했습니다. (차단 또는 페이지 구조 변경 의심)")
        else:
            print(f"     - {genre_name}: {len(genre_songs)}곡")
        by_genre.append(genre_songs)

    # --limit 으로 일부만 돌려도 장르가 골고루 섞이도록 장르별로 번갈아 배치
    songs = []
    for rank in range(max((len(g) for g in by_genre), default=0)):
        for genre_songs in by_genre:
            if rank < len(genre_songs):
                songs.append(genre_songs[rank])
    return songs


# ---------------------------------------------------------------------------
# 진행 상태 파일 (중단 후 이어서 실행하기 위한 기록)
# ---------------------------------------------------------------------------
def song_key(title: str, artist: str) -> str:
    return f"{title}||{artist}"


def file_id(key: str) -> str:
    # Demucs 출력 폴더명으로 쓰이므로 한글/특수문자 없는 안전한 이름을 사용
    return "c_" + hashlib.md5(key.encode("utf-8")).hexdigest()[:12]


def load_state() -> dict:
    if not os.path.exists(STATE_PATH):
        return {}
    with open(STATE_PATH, encoding="utf-8") as f:
        return json.load(f)


def save_state(state: dict):
    tmp_path = STATE_PATH + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)
    os.replace(tmp_path, STATE_PATH)


def mark(state: dict, key: str, status: str, reason: str = None):
    state[key]["status"] = status
    state[key]["reason"] = reason
    save_state(state)


# ---------------------------------------------------------------------------
# ① iTunes 메타데이터 / 미리듣기 URL 조회
# ---------------------------------------------------------------------------
_BRACKETS = re.compile(r"[\(\[（【].*?[\)\]）】]")
_NON_VOCAL = re.compile(r"inst|karaoke|반주|\bmr\b", re.IGNORECASE)
_ALT_VERSION = re.compile(r"live|라이브|mix|믹스|ver\b|version|버전|acoustic|어쿠스틱", re.IGNORECASE)
_last_itunes_call_at = 0.0
_artist_id_cache = {}


def _normalize(s: str) -> str:
    """비교용 정규화: 괄호 안 부가정보, 공백, 기호를 제거하고 소문자로 맞춥니다."""
    stripped = _BRACKETS.sub("", s)
    if not stripped.strip():
        stripped = s
    return re.sub(r"[\W_]+", "", stripped.lower())


def _bracket_matches(pattern, name: str) -> bool:
    return any(pattern.search(b) for b in _BRACKETS.findall(name))


def _same(a: str, b: str) -> bool:
    return bool(a) and bool(b) and (a == b or a in b or b in a)


def _same_title(a: str, b: str) -> bool:
    """
    제목 비교. 한쪽이 다른 쪽을 포함하는 경우는 한글 제목과 영문 부제가 나뉜 형태일 때만 같은 곡으로 봅니다.
    ('안아줘' ↔ '안아줘 Hug Me', '내 사람: Partner For Life' ↔ 'Partner for Life'는 허용,
     '체념' ↔ '체념 後'는 다른 곡)
    """
    if not a or not b:
        return False
    if a == b:
        return True
    short, long_ = sorted((a, b), key=len)
    if short not in long_:
        return False
    remainder = long_.replace(short, "", 1)
    return remainder.isascii() or (short.isascii() and len(short) >= 4)


def pick_itunes_track(results: list, korean_names: dict, title: str, artist: str, resolve_artist_ids):
    """
    검색 결과 중 요청한 곡과 제목·가수가 모두 일치하는 트랙을 고릅니다. 없으면 None.
    스튜디오 버전을 우선하고, 없을 때만 라이브/리믹스 버전을 사용합니다.

    resolve_artist_ids: 가수명 표기가 달라(예: 'SG 워너비' ↔ 'SG Wannabe') 이름으로 확인이 안 될 때
                        iTunes 아티스트 ID 집합을 돌려주는 함수. 필요할 때만 호출합니다.
    """
    want_title = _normalize(title)
    want_artist = _normalize(artist)

    title_matched = []
    for track in results:
        if not track.get("previewUrl"):
            continue

        # 미국 스토어 표기(영문)와 한국 스토어 표기(한글) 둘 다로 비교
        names = [(track.get("trackName", ""), track.get("artistName", ""))]
        if track.get("trackId") in korean_names:
            names.insert(0, korean_names[track["trackId"]])

        track_titles = [n[0] for n in names]
        if not _bracket_matches(_NON_VOCAL, title) and any(_bracket_matches(_NON_VOCAL, t) for t in track_titles):
            continue
        if not any(_same_title(want_title, _normalize(t)) for t in track_titles):
            continue

        artist_ok = any(_same(want_artist, _normalize(n[1])) for n in names)
        title_matched.append((track, names[0], artist_ok))

    if any(not artist_ok for _, _, artist_ok in title_matched):
        artist_ids = resolve_artist_ids()
        title_matched = [
            (track, name, artist_ok or track.get("artistId") in artist_ids)
            for track, name, artist_ok in title_matched
        ]

    matched = [(track, name) for track, name, artist_ok in title_matched if artist_ok]
    if not matched:
        return None, None

    def priority(item):
        track, name = item
        # 스튜디오 버전 우선, 그다음 제목이 완전히 같은 트랙 우선
        exact = want_title in (_normalize(name[0]), _normalize(track.get("trackName", "")))
        alt_version = _bracket_matches(_ALT_VERSION, name[0]) and not _bracket_matches(_ALT_VERSION, title)
        return (alt_version, not exact)

    return min(matched, key=priority)


def _itunes_get(session: requests.Session, url: str, params: dict) -> list:
    global _last_itunes_call_at
    for attempt in range(3):
        wait_sec = ITUNES_INTERVAL_SEC - (time.time() - _last_itunes_call_at)
        if wait_sec > 0:
            time.sleep(wait_sec)
        _last_itunes_call_at = time.time()

        response = session.get(url, params=params, timeout=10)
        # 호출 제한에 걸리면 403/429가 내려옵니다. 잠시 쉬었다가 재시도합니다.
        if response.status_code in (403, 429) or response.status_code >= 500:
            backoff_sec = 30 * (attempt + 1)
            print(f"  ⏳ iTunes 응답 {response.status_code}, {backoff_sec}초 후 재시도합니다...")
            time.sleep(backoff_sec)
            continue
        response.raise_for_status()
        return response.json().get("results", [])
    raise RuntimeError("iTunes API 호출 제한이 풀리지 않았습니다.")


def search_itunes(session: requests.Session, title: str, artist: str) -> list:
    # 한국 스토어(country=KR)는 음원 검색 결과가 비어 있어 미국 스토어에서 검색합니다.
    return _itunes_get(session, ITUNES_SEARCH_URL, {
        "term": f"{artist} {title}",
        "country": "US",
        "media": "music",
        "entity": "song",
        "limit": 10,
    })


def lookup_korean_names(session: requests.Session, track_ids: list) -> dict:
    """
    미국 스토어 검색 결과는 제목/가수가 영문으로 번역되어 내려오므로(예: '밤편지' → 'Through the Night'),
    같은 트랙을 한국 스토어 기준으로 다시 조회해 한글 표기를 얻습니다.
    반환: {trackId: (한글 제목, 한글 가수명)}
    """
    if not track_ids:
        return {}
    results = _itunes_get(session, ITUNES_LOOKUP_URL, {
        "id": ",".join(str(i) for i in track_ids),
        "country": "KR",
        "lang": "ko_kr",
    })
    return {
        r["trackId"]: (r.get("trackName", ""), r.get("artistName", ""))
        for r in results if r.get("trackId")
    }


def find_artist_ids(session: requests.Session, artist: str) -> set:
    """가수명(한글)으로 iTunes 아티스트 ID를 찾습니다. 같은 가수는 한 번만 조회합니다."""
    if artist in _artist_id_cache:
        return _artist_id_cache[artist]

    # 'AKMU (악뮤)', '넬 (NELL)' 같은 표기는 전체 → 괄호 밖 → 괄호 안 순서로 시도
    terms = [artist, _BRACKETS.sub("", artist).strip()]
    terms += [b[1:-1].strip() for b in _BRACKETS.findall(artist)]

    artist_ids = set()
    for term in dict.fromkeys(t for t in terms if t):
        results = _itunes_get(session, ITUNES_SEARCH_URL, {
            "term": term,
            "country": "US",
            "media": "music",
            "entity": "musicArtist",
            "limit": 1,
        })
        artist_ids = {r["artistId"] for r in results if r.get("artistId")}
        if artist_ids:
            break

    _artist_id_cache[artist] = artist_ids
    return artist_ids


def fetch_meta(session: requests.Session, entry: dict):
    """entry에 미리듣기 URL과 앨범 커버를 채웁니다. 일치하는 곡이 없으면 예외를 던집니다."""
    results = search_itunes(session, entry["title"], entry["artist"])
    korean_names = lookup_korean_names(session, [r["trackId"] for r in results if r.get("trackId")])

    track, name = pick_itunes_track(
        results, korean_names, entry["title"], entry["artist"],
        lambda: find_artist_ids(session, entry["artist"])
    )
    if track is None:
        raise RuntimeError("iTunes에서 일치하는 곡(미리듣기 포함)을 찾지 못했습니다.")

    cover_url = track.get("artworkUrl100")
    if cover_url:
        cover_url = cover_url.replace("100x100bb", "600x600bb")

    entry["source_track_id"] = str(track["trackId"])
    entry["source_track_title"] = track.get("trackName")
    entry["source_track_url"] = track.get("trackViewUrl")
    entry["preview_url"] = track["previewUrl"]
    entry["album_cover_url"] = cover_url
    entry["itunes_track"] = f"{name[0]} - {name[1]}"


# ---------------------------------------------------------------------------
# ② 미리듣기 다운로드
# ---------------------------------------------------------------------------
def download_preview(session: requests.Session, url: str, dest_path: str):
    with session.get(url, stream=True, timeout=30) as response:
        response.raise_for_status()
        with open(dest_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=64 * 1024):
                f.write(chunk)

    if os.path.getsize(dest_path) < 10 * 1024:
        raise RuntimeError("다운로드된 미리듣기 파일이 비정상적으로 작습니다.")


# ---------------------------------------------------------------------------
# ③ Demucs 보컬 분리 (여러 곡을 한 번에 넘겨 모델 로딩을 배치당 1회로 줄임)
# ---------------------------------------------------------------------------
def _vocal_path(audio_path: str) -> str:
    base_name = os.path.splitext(os.path.basename(audio_path))[0]
    return os.path.join(DEMUCS_OUT_DIR, "htdemucs", base_name, "vocals.wav")


def _run_demucs(audio_paths: list) -> str:
    cmd = [
        sys.executable, "-m", "demucs.separate",
        "-n", "htdemucs",
        "--two-stems", "vocals",
        "-o", DEMUCS_OUT_DIR,
        *audio_paths
    ]
    process = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="ignore")
    if process.returncode == 0:
        return ""
    return (process.stderr or process.stdout or "").strip()[-300:]


def separate_vocals(audio_paths: list) -> dict:
    """반환: {입력 파일 경로: 에러 메시지 또는 None(성공)}"""
    error_msg = _run_demucs(audio_paths)
    result = {}
    for path in audio_paths:
        if os.path.exists(_vocal_path(path)):
            result[path] = None
        elif len(audio_paths) > 1:
            # 배치 중 한 곡이 깨져 있으면 Demucs가 통째로 종료되므로, 결과가 없는 곡만 단독 재시도
            retry_msg = _run_demucs([path])
            result[path] = None if os.path.exists(_vocal_path(path)) else f"Demucs 분리 실패: {retry_msg}"
        else:
            result[path] = f"Demucs 분리 실패: {error_msg}"
    return result


# ---------------------------------------------------------------------------
# ④ 특징 추출 / DB 저장
# ---------------------------------------------------------------------------
def extract_song_features(vocal_path: str):
    """
    사용자 분석과 동일한 기준으로 비교되도록 AnalysisService의 추출 로직을 그대로 사용합니다.
    (로딩 방식도 워커와 동일하게 sr=None)
    """
    y, sr = librosa.load(vocal_path, sr=None)

    peak = float(abs(y).max()) if y.size > 0 else 0.0
    if peak < MIN_VOCAL_PEAK:
        raise RuntimeError(f"미리듣기 구간에 보컬이 거의 없습니다. (peak {peak:.3f})")

    intervals = librosa.effects.split(y, top_db=30)
    voiced_sec = sum(int(end - start) for start, end in intervals) / sr
    if voiced_sec < MIN_VOICED_SEC:
        raise RuntimeError(f"보컬 구간이 너무 짧습니다. ({voiced_sec:.1f}초)")

    features = AnalysisService.extract_audio_features(y, sr, include_song_profile=True)
    if features["pitch"] <= 0:
        raise RuntimeError("Pitch를 추출하지 못했습니다.")

    profile = features["song_profile"]
    if profile["pitched_seconds"] < MIN_VOICED_SEC:
        raise RuntimeError("유효한 음높이 구간이 너무 짧습니다.")
    profile.update({"feature_version": FEATURE_VERSION, "scope": "preview",
        "source": "itunes", "source_offset_seconds": None,
        "analyzed_at": datetime.now(timezone.utc).isoformat()})
    return features["pitch"], features["mfcc"].tolist(), profile


def save_song(db, entry: dict, pitch: float, mfcc: list, profile: dict):
    source_id = entry.get("source_track_id")
    song = db.query(Song).filter(Song.source_track_id == source_id).first() if source_id else None
    if song is None:
        song = db.query(Song).filter(Song.title == entry["title"], Song.artist == entry["artist"]).first()
    if song is not None and song.source_track_id and source_id and song.source_track_id != source_id:
        raise ValueError("동일 제목/가수의 다른 트랙 버전입니다. 기존 출처를 덮어쓰지 않습니다.")
    if song is None:
        song = Song(title=entry["title"], artist=entry["artist"])
        db.add(song)

    song.album_cover_url = entry.get("album_cover_url")
    song.preview_url = entry.get("preview_url")
    song.genre = entry.get("genre")
    song.source_track_id = entry.get("source_track_id")
    song.source_track_title = entry.get("source_track_title")
    song.source_track_url = entry.get("source_track_url")
    song.analysis_profile = json.dumps(profile, ensure_ascii=False, allow_nan=False)
    song.pitch = pitch
    song.mfcc_vector = json.dumps(mfcc)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise


def check_songs_table():
    """songs 테이블이 수집 결과를 받을 수 있는 구조인지 시작 전에 확인합니다."""
    inspector = inspect(engine)
    if not inspector.has_table("songs"):
        print("🚨 오류: DB에 songs 테이블이 없습니다. 기본 스키마와 docs/song-data.md의 마이그레이션을 먼저 적용하세요.")
        sys.exit(1)

    columns = {col["name"] for col in inspector.get_columns("songs")}
    required = {"title", "artist", "album_cover_url", "preview_url", "pitch", "mfcc_vector", "genre", "source_track_id", "source_track_title", "source_track_url", "analysis_profile"}
    missing = required - columns
    if missing:
        print(f"🚨 오류: songs 테이블에 컬럼이 없습니다: {', '.join(sorted(missing))}")
        if "pitch" in missing:
            print("   예) ALTER TABLE songs ADD COLUMN pitch DOUBLE NULL;")
        sys.exit(1)


def cleanup(paths: list):
    for path in paths:
        if os.path.exists(path):
            os.remove(path)
        shutil.rmtree(os.path.dirname(_vocal_path(path)), ignore_errors=True)


# ---------------------------------------------------------------------------
# 배치 본체
# ---------------------------------------------------------------------------
def process_batch(keys: list, state: dict, session: requests.Session, db):
    # ① 메타 조회 (호출 제한 때문에 순차 처리)
    for key in keys:
        entry = state[key]
        if entry["status"] != PENDING:
            continue
        try:
            fetch_meta(session, entry)
            print(f"  🔎 [{entry['title']} - {entry['artist']}] → {entry['itunes_track']}")
            mark(state, key, META_OK)
        except Exception as e:
            print(f"  ❌ [{entry['title']} - {entry['artist']}] 메타 조회 실패: {e}")
            mark(state, key, FAILED, str(e))

    ready = [key for key in keys if state[key]["status"] == META_OK]
    if not ready:
        return

    # ② 다운로드 (병렬)
    print(f"  ⬇️ 미리듣기 {len(ready)}곡 다운로드 중...")
    audio_paths = {key: os.path.join(TEMP_DIR, f"{file_id(key)}.m4a") for key in ready}

    def _download(key):
        try:
            download_preview(session, state[key]["preview_url"], audio_paths[key])
            return key, None
        except Exception as e:
            return key, str(e)

    downloaded = []
    with ThreadPoolExecutor(max_workers=DOWNLOAD_WORKERS) as pool:
        for key, error in pool.map(_download, ready):
            if error:
                print(f"  ❌ [{state[key]['title']} - {state[key]['artist']}] 다운로드 실패: {error}")
                mark(state, key, FAILED, f"다운로드 실패: {error}")
            else:
                downloaded.append(key)

    try:
        if not downloaded:
            return

        # ③ 보컬 분리
        print(f"  ✂️ 보컬 분리 중 (Demucs, {len(downloaded)}곡)...")
        separation = separate_vocals([audio_paths[key] for key in downloaded])

        # ④ 특징 추출 + DB 저장
        for key in downloaded:
            entry = state[key]
            label = f"{entry['title']} - {entry['artist']}"
            try:
                error = separation[audio_paths[key]]
                if error:
                    raise RuntimeError(error)

                pitch, mfcc, profile = extract_song_features(_vocal_path(audio_paths[key]))
                save_song(db, entry, pitch, mfcc, profile)
                print(f"  ✅ [{label}] 저장 완료 (Pitch: {pitch:.2f}Hz, 보컬 {profile['pitched_seconds']:.1f}초)")
                mark(state, key, DONE)
            except Exception as e:
                print(f"  ❌ [{label}] 에러 발생: {e}")
                mark(state, key, FAILED, str(e))
    finally:
        cleanup(list(audio_paths.values()))


def main():
    parser = argparse.ArgumentParser(description="멜론 장르별 곡 목록 + iTunes 미리듣기 기반 음원 수집 및 보컬 분석 배치")
    parser.add_argument("--per-genre", type=int, default=100, help="장르별로 가져올 곡 수")
    parser.add_argument("--retry-failed", action="store_true", help="이전에 실패한 곡을 다시 시도")
    parser.add_argument("--limit", type=int, default=None, help="이번 실행에서 처리할 최대 곡 수")
    parser.add_argument("--batch-size", type=int, default=20, help="Demucs에 한 번에 넘길 곡 수")
    parser.add_argument("--reanalyze", action="store_true", help="기존 곡도 새 특징으로 다시 분석 (limit 적용)")
    args = parser.parse_args()

    print("🚀 iTunes 미리듣기 기반 음원 자동 수집 및 보컬 분석 배치를 시작합니다...")

    check_songs_table()

    # 1. 멜론 장르별 목록에서 자동 수집
    target_songs = load_target_songs_from_melon(max(1, args.per_genre))
    if not target_songs:
        print("🚨 수집된 곡이 없어 배치를 종료합니다.")
        return

    # 2. 진행 상태 동기화
    state = load_state()
    db = SessionLocal()
    try:
        existing = {song_key(title, artist) for title, artist in db.query(Song.title, Song.artist).all()}

        keys = []
        for song in target_songs:
            key = song_key(song["title"], song["artist"])
            if key in keys:
                continue
            keys.append(key)

            entry = state.setdefault(key, {"title": song["title"], "artist": song["artist"], "status": PENDING, "reason": None})
            entry["genre"] = song["genre"]
            if args.reanalyze:
                entry["status"] = PENDING
                entry["reason"] = None
            elif key in existing:
                entry["status"] = DONE
                entry["reason"] = None
            elif entry["status"] == DONE:
                # 상태 파일에는 완료인데 DB에 없는 경우(DB가 바뀜) 다시 수집
                entry["status"] = PENDING
            elif entry["status"] == FAILED and args.retry_failed:
                entry["status"] = PENDING
                entry["reason"] = None
        save_state(state)

        todo = [key for key in keys if state[key]["status"] in (PENDING, META_OK)]
        if args.limit is not None:
            todo = todo[:args.limit]

        skipped = sum(1 for key in keys if state[key]["status"] == DONE)
        print(f"📌 총 {len(keys)}곡 중 이미 수집 {skipped}곡, 이번 실행 대상 {len(todo)}곡")

        # 3. 배치 처리
        os.makedirs(TEMP_DIR, exist_ok=True)
        session = requests.Session()
        session.headers.update({"User-Agent": USER_AGENT})

        batch_size = max(1, args.batch_size)
        for start in range(0, len(todo), batch_size):
            batch = todo[start:start + batch_size]
            print(f"\n[{start + 1}~{start + len(batch)}/{len(todo)}] 배치 처리 중...")
            process_batch(batch, state, session, db)
    finally:
        db.close()

    success_count = sum(1 for key in todo if state[key]["status"] == DONE)
    failed = [key for key in todo if state[key]["status"] == FAILED]

    print("\n=========================================")
    print(f"🎉 배치 작업 종료! (대상 {len(todo)}곡 중 성공: {success_count}곡, 실패: {len(failed)}곡, 기존 수집: {skipped}곡)")
    for key in failed:
        print(f"   - {state[key]['title']} - {state[key]['artist']}: {state[key]['reason']}")
    if failed:
        print("   실패한 곡은 --retry-failed 옵션으로 다시 시도할 수 있습니다.")
    print("=========================================")


if __name__ == "__main__":
    main()
