import os
import sys
import csv
import json
import shutil
import subprocess
import warnings

import yt_dlp
import librosa
import numpy as np
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

warnings.filterwarnings('ignore')

# CSV 파일 경로 (스크립트와 같은 폴더 기준)
CSV_FILE_PATH = os.path.join(os.path.dirname(__file__), "songs.csv")

def load_target_songs_from_csv(csv_path: str) -> list:
    """
    songs.csv 파일을 읽어 타겟 곡 리스트를 반환합니다.
    컬럼 순서: title, artist (헤더 필수)
    """
    if not os.path.exists(csv_path):
        print(f"🚨 오류: '{csv_path}' 파일이 존재하지 않습니다.")
        print("   같은 폴더에 'title,artist' 헤더가 있는 songs.csv 파일을 생성해 주세요.")
        sys.exit(1)

    songs = []
    try:
        # UTF-8-sig는 Excel에서 저장한 CSV의 BOM 마커를 자동으로 처리합니다.
        with open(csv_path, newline='', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                title = row.get('title', '').strip()
                artist = row.get('artist', '').strip()
                if title and artist:
                    songs.append({"title": title, "artist": artist})
    except Exception as e:
        print(f"🚨 CSV 파일 읽기 실패: {e}")
        sys.exit(1)

    if not songs:
        print("🚨 CSV 파일에 유효한 데이터가 없습니다. title, artist 컬럼을 확인해 주세요.")
        sys.exit(1)

    return songs


def main():
    print("🚀 YouTube 기반 음원 수집 및 보컬 분석 배치를 시작합니다...")

    # 1. 환경 변수 로드
    load_dotenv()

    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("🚨 오류: .env 파일에 DATABASE_URL이 설정되지 않았습니다.")
        sys.exit(1)

    try:
        engine = create_engine(db_url)
    except Exception as e:
        print(f"🚨 DB 연결 실패: {e}")
        sys.exit(1)

    # 2. CSV 파일에서 타겟 곡 리스트 로드 (하드코딩 대체)
    target_songs = load_target_songs_from_csv(CSV_FILE_PATH)
    print(f"📌 songs.csv에서 총 {len(target_songs)}곡의 타겟 리스트를 불러왔습니다.")

    # 임시 디렉토리 설정
    temp_dir = "temp"
    demucs_out_dir = "temp_demucs"
    os.makedirs(temp_dir, exist_ok=True)

    success_count = 0
    fail_count = 0

    for idx, song in enumerate(target_songs):
        title = song["title"]
        artist = song["artist"]

        print(f"\n[{idx+1}/{len(target_songs)}] 처리 중: {title} - {artist}")

        # 검색어 생성 (audio 키워드 추가로 오디오 중심 영상 유도)
        search_query = f"{artist} {title} audio"

        temp_mp3_path = os.path.join(temp_dir, f"track_{idx}.mp3")
        specific_demucs_folder = os.path.join(demucs_out_dir, "htdemucs", f"track_{idx}")

        try:
            # 3. YouTube 오디오 추출 (yt-dlp)
            print("  ⬇️ YouTube 검색 및 오디오 다운로드 중...")

            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': os.path.join(temp_dir, f"track_{idx}.%(ext)s"),
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }],
                'quiet': True,
                'no_warnings': True,
                'default_search': 'ytsearch1',
                'noplaylist': True
            }

            video_url = None
            thumbnail_url = None

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f"ytsearch1:{search_query}", download=True)

                if 'entries' in info and len(info['entries']) > 0:
                    video_info = info['entries'][0]
                else:
                    video_info = info

                video_url = video_info.get('webpage_url', f"https://www.youtube.com/watch?v={video_info.get('id')}")
                thumbnail_url = video_info.get('thumbnail')

            if not os.path.exists(temp_mp3_path):
                raise Exception("yt-dlp 다운로드 또는 MP3 변환에 실패하여 파일을 찾을 수 없습니다.")

            # 4. Demucs 보컬 분리
            print("  ✂️ 보컬 분리 중 (Demucs, 수 분이 소요될 수 있습니다)...")
            cmd = ["demucs", "-n", "htdemucs", temp_mp3_path, "-o", demucs_out_dir]
            process = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

            if process.returncode != 0:
                error_msg = process.stderr.decode('utf-8', errors='ignore')
                raise Exception(f"Demucs 분리 실패: {error_msg}")

            vocal_path = os.path.join(specific_demucs_folder, "vocals.wav")

            if not os.path.exists(vocal_path):
                raise Exception(f"보컬 결과 파일을 찾을 수 없습니다: {vocal_path}")

            # 5. 특징 추출 (librosa)
            print("  🎵 음향 특징(Pitch, MFCC) 추출 중...")
            y, sr = librosa.load(vocal_path, sr=22050, mono=True)

            f0, voiced_flag, voiced_probs = librosa.pyin(
                y,
                fmin=librosa.note_to_hz('C2'),
                fmax=librosa.note_to_hz('C7')
            )
            valid_f0 = f0[~np.isnan(f0)]
            avg_pitch = float(np.mean(valid_f0)) if len(valid_f0) > 0 else 0.0

            mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=20)
            avg_mfcc = np.mean(mfcc, axis=1).tolist()
            mfcc_json = json.dumps(avg_mfcc)

            # 6. DB 저장
            print(f"  💾 DB에 저장 중... (Pitch: {avg_pitch:.2f}Hz)")
            insert_query = text("""
                INSERT INTO songs (title, artist, album_cover_url, preview_url, pitch, mfcc_vector)
                VALUES (:title, :artist, :album_cover_url, :preview_url, :pitch, :mfcc)
            """)

            with engine.begin() as conn:
                conn.execute(insert_query, {
                    "title": title,
                    "artist": artist,
                    "album_cover_url": thumbnail_url,
                    "preview_url": video_url,
                    "pitch": avg_pitch,
                    "mfcc": mfcc_json
                })

            print("  ✅ 처리 완료!")
            success_count += 1

        except Exception as e:
            print(f"  ❌ 에러 발생: {str(e)}")
            fail_count += 1

        finally:
            # 7. 임시 파일 정리
            print("  🧹 임시 파일 정리 중...")
            if os.path.exists(temp_mp3_path):
                os.remove(temp_mp3_path)

            if os.path.exists(specific_demucs_folder):
                shutil.rmtree(specific_demucs_folder, ignore_errors=True)

    print("\n=========================================")
    print(f"🎉 배치 작업 종료! (총 {len(target_songs)}곡 중 성공: {success_count}곡, 실패: {fail_count}곡)")
    print("=========================================")

if __name__ == "__main__":
    main()
