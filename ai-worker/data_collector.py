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
import requests
from bs4 import BeautifulSoup

warnings.filterwarnings('ignore')

def load_target_songs_from_melon() -> list:
    """
    [기능] 멜론 장르별 차트(발라드, R&B, 록/메탈 등)를 크롤링하여 다양한 보컬 스펙트럼의 곡을 수집합니다.
    """
    print("  🍈 멜론 장르별 차트에서 보컬 분석에 적합한 곡들을 불러오는 중...")
    
    # [개선 1] 수집 선정 기준 개선: 실시간 Top100(아이돌 편중) 대신 보컬이 돋보이는 장르 위주 다중 수집
    # GN0100: 발라드, GN0400: R&B/Soul, GN0600: 록/메탈, GN0500: 인디음악
    genre_codes = ["GN0100", "GN0400", "GN0600", "GN0500"]
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    songs = []
    seen = set() # 장르 간 중복 곡 방지

    for code in genre_codes:
        url = f"https://www.melon.com/chart/genre/index.htm?classCd={code}"
        try:
            response = requests.get(url, headers=headers)
            soup = BeautifulSoup(response.text, 'html.parser')
            tracks = soup.select('.lst50, .lst100')
            
            for track in tracks:
                title_tag = track.select_one('.ellipsis.rank01 a')
                artist_tag = track.select_one('.ellipsis.rank02 a')
                
                if title_tag and artist_tag:
                    title = title_tag.text.strip()
                    artist = artist_tag.text.strip()
                    identifier = f"{title}-{artist}"
                    
                    if identifier not in seen:
                        seen.add(identifier)
                        songs.append({"title": title, "artist": artist})
                        
        except Exception as e:
            print(f"  🚨 장르 {code} 데이터 수집 중 오류 발생: {e}")

    return songs


def main():
    print("🚀 YouTube 기반 음원 자동 수집 및 보컬 분석 배치를 시작합니다...")

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

    # 2. 멜론 차트에서 자동 수집 (YouTube Music 대체)
    target_songs = load_target_songs_from_melon()
    
    if not target_songs:
        print("🚨 수집된 곡이 없어 배치를 종료합니다.")
        return

    print(f"📌 총 {len(target_songs)}곡의 자동 수집 리스트를 확보했습니다.")

    # 임시 디렉토리 설정
    temp_dir = "temp"
    demucs_out_dir = "temp_demucs"
    os.makedirs(temp_dir, exist_ok=True)

    success_count = 0
    fail_count = 0

    for idx, song in enumerate(target_songs):
        title = song["title"]
        artist = song["artist"]
        temp_mp3_path = None
        specific_demucs_folder = None

        print(f"\n[{idx+1}/{len(target_songs)}] 확인 중: {title} - {artist}")

        try:
            # [추가] 중복 체크: 이미 DB에 있는 곡은 처리를 건너뜁니다.
            check_query = text("SELECT id FROM songs WHERE title = :title AND artist = :artist")
            with engine.connect() as conn:
                existing_song = conn.execute(check_query, {"title": title, "artist": artist}).fetchone()
                
            if existing_song:
                print(f"  ⏩ 이미 수집된 곡입니다. (Skip)")
                success_count += 1
                continue

            print(f"  🆕 신규 곡 발견! 수집을 시작합니다.")
            
            # [개선 2] 유튜브 검색어 개선: 일반인의 커버 곡이나 라이브 영상 방지
            search_query = f"{artist} {title} Official Audio"
            temp_mp3_path = os.path.join(temp_dir, f"track_{idx}.mp3")
            specific_demucs_folder = os.path.join(demucs_out_dir, "htdemucs", f"track_{idx}")

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

            # [개선 1] 수집 속도 최적화: 곡의 1분 지점부터 45초만 추출 (가장 보컬이 확실한 구간)
            print("  ⏱️ 전체 분리는 오래 걸리므로 45초 하이라이트 구간만 트리밍합니다...")
            trimmed_mp3_path = os.path.join(temp_dir, f"track_{idx}_trimmed.mp3")
            try:
                trim_cmd = [
                    "ffmpeg", "-y", "-i", temp_mp3_path,
                    "-ss", "60", "-t", "45", # 60초부터 45초간
                    "-ac", "2", "-ar", "44100",
                    trimmed_mp3_path
                ]
                subprocess.run(trim_cmd, check=True, capture_output=True)
                input_for_demucs = trimmed_mp3_path
                print("  ✅ 트리밍 완료")
            except Exception as e:
                print(f"  ⚠️ 트리밍 실패(원본 사용): {e}")
                input_for_demucs = temp_mp3_path

            # 4. Demucs 보컬 분리
            print("  ✂️ 보컬 분리 중 (Demucs, 수 분이 소요될 수 있습니다)...")
            cmd = [sys.executable, "-m", "demucs.separate", "-n", "htdemucs", input_for_demucs, "-o", demucs_out_dir]
            process = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

            if process.returncode != 0:
                error_msg = process.stderr.decode('utf-8', errors='ignore')
                raise Exception(f"Demucs 분리 실패: {error_msg}")

            # 트리밍 적용 여부에 따라 파일명이 달라지므로 베이스 네임으로 경로 재계산
            base_name = os.path.splitext(os.path.basename(input_for_demucs))[0]
            specific_demucs_folder = os.path.join(demucs_out_dir, "htdemucs", base_name)
            vocal_path = os.path.join(specific_demucs_folder, "vocals.wav")

            if not os.path.exists(vocal_path):
                raise Exception(f"보컬 결과 파일을 찾을 수 없습니다: {vocal_path}")

            # 5. 특징 추출 (librosa)
            print("  🎵 음향 특징(Pitch, MFCC) 추출 중...")
            y, sr = librosa.load(vocal_path, sr=22050, mono=True)

            # [개선 2] 기준점 정확도 향상: 분석 서비스와 동일하게 노이즈(무음) 구간 필터링
            intervals = librosa.effects.split(y, top_db=30)
            if len(intervals) > 0:
                y_voiced = np.concatenate([y[start:end] for start, end in intervals])
            else:
                y_voiced = y

            # 최적화를 위해 피치는 16kHz로 다운샘플링 후 pyin 수행
            y_voiced_16k = librosa.resample(y_voiced, orig_sr=sr, target_sr=16000)
            f0, _, _ = librosa.pyin(
                y_voiced_16k,
                fmin=librosa.note_to_hz('C2'),
                fmax=librosa.note_to_hz('C7'),
                sr=16000,
                hop_length=1024
            )
            valid_f0 = f0[~np.isnan(f0)]
            avg_pitch = float(np.mean(valid_f0)) if len(valid_f0) > 0 else 0.0

            mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=20)
            avg_mfcc = np.mean(mfcc, axis=1).tolist()
            mfcc_json = json.dumps(avg_mfcc)

            # 6. DB 저장 (중복 체크 추가 권장)
            print(f"  💾 DB에 저장 중... (Pitch: {avg_pitch:.2f}Hz)")
            insert_query = text("""
                INSERT INTO songs (title, artist, album_cover_url, preview_url, pitch, mfcc_vector)
                VALUES (:title, :artist, :album_cover_url, :preview_url, :pitch, :mfcc)
                ON DUPLICATE KEY UPDATE pitch = VALUES(pitch), mfcc_vector = VALUES(mfcc_vector)
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
            if temp_mp3_path and os.path.exists(temp_mp3_path):
                os.remove(temp_mp3_path)
            
            # [수정] 트리밍된 파일(trimmed_mp3_path)도 함께 삭제하여 용량 누수 방지
            if 'trimmed_mp3_path' in locals() and os.path.exists(trimmed_mp3_path):
                os.remove(trimmed_mp3_path)
 
            if specific_demucs_folder and os.path.exists(specific_demucs_folder):
                shutil.rmtree(specific_demucs_folder, ignore_errors=True)

    print("\n=========================================")
    print(f"🎉 배치 작업 종료! (총 {len(target_songs)}곡 중 성공: {success_count}곡, 실패: {fail_count}곡)")
    print("=========================================")

if __name__ == "__main__":
    main()
