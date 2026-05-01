import os
import time
import logging
import math
import boto3
from urllib.parse import urlparse
import sys
import re
import subprocess
import shutil
import json
import librosa
import numpy as np
from numpy.linalg import norm

from database import SessionLocal
from models import Song

# 로거 설정
logger = logging.getLogger(__name__)

# S3 클라이언트 초기화 (boto3는 기본적으로 환경 변수에서 자격 증명을 읽어옵니다)
s3_client = boto3.client('s3')

class AnalysisService:
    """
    실제 AI 분석 (보컬 분리, 특징 추출 등) 로직을 담당하는 서비스 클래스.
    """

    @staticmethod
    def generate_voice_tags(avg_pitch: float, avg_mfcc: np.ndarray) -> list:
        """
        추출된 음성 특징 수치를 바탕으로 한글 UX 태그 리스트를 생성합니다.
        해시태그의 언더스코어(_)를 제거하여 가독성을 높입니다.
        """
        tags = []

        # --- 1. Pitch 기반 음역대 태그 ---
        if avg_pitch < 130:
            tags.append("#묵직한저음")
        elif avg_pitch < 200:
            tags.append("#부드러운보컬")
        elif avg_pitch < 300:
            tags.append("#맑은중고음")
        else:
            tags.append("#시원한고음")

        # --- 2. MFCC 기반 장르 성향 태그 ---
        mfcc_variance = float(np.var(avg_mfcc))
        mfcc_low_energy = float(np.mean(avg_mfcc[1:4]))
        mfcc_mid_energy = float(np.mean(avg_mfcc[4:8]))

        if mfcc_variance < 200 and mfcc_low_energy > 0:
            tags.append("#감성발라드")
        elif mfcc_variance > 200 and mfcc_mid_energy > 0:
            tags.append("#R&B소울")
        elif mfcc_low_energy < 0:
            tags.append("#어쿠스틱무드")
        else:
            tags.append("#트렌디한팝")

        logger.info(f"[AnalysisService] 생성된 목소리 태그 (포맷팅 완료): {tags}")
        return tags

    @staticmethod
    def cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
        """
        두 벡터 간의 코사인 유사도를 -1~1 사이로 반환합니다.

        [설계 의도 - 블랙홀 버그 해결]
        - 유클리디안 거리는 MFCC[0](에너지/음량)의 절대값이 커서
          다른 모든 차원을 '덮어먹는' 현상이 발생합니다. (블랙홀 버그 원인)
        - 코사인 유사도는 벡터의 방향(패턴/지문)만 비교하므로
          절대 음량에 무관하게 목소리의 '음색 지문'을 비교합니다.
        """
        norm_a = norm(vec_a)
        norm_b = norm(vec_b)
        # 제로 벡터 예외 처리 (ZeroDivisionError 방지)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(vec_a, vec_b) / (norm_a * norm_b))

    @staticmethod
    def cosine_to_score(cosine_sim: float) -> int:
        """
        코사인 유사도(-1~1)를 사용자 친화적인 표시 점수(50~95%)로 변환합니다.
        - cosine 1.0  -> 95%
        - cosine 0.9  -> ~85%
        - cosine 0.5  -> ~60%
        - cosine < 0  -> 50% (floor)
        """
        score = 60 + (cosine_sim * 35)
        return int(max(50, min(95, round(score))))

    @staticmethod
    def generate_recommend_reason(tags: list, artist: str, user_pitch: float, song_pitch: float, vocal_stats: dict) -> str:
        """
        추천 이유 텍스트에 피치 평균 대비 톤 설명과 감정 점수 근거를 추가합니다.
        """
        # 1) 톤(피치) 설명 – 일반 평균(165Hz) 대비
        avg_base = 165.0
        diff = user_pitch - avg_base
        if diff > 30:
            tone_desc = "뛰어난 하이톤"
        elif diff > 10:
            tone_desc = "약간 높은 하이톤"
        elif diff < -30:
            tone_desc = "낮은 로우톤"
        elif diff < -10:
            tone_desc = "약간 낮은 로우톤"
        else:
            tone_desc = "보통 톤"

        # 2) 감정 수치(Emotion) 강조
        emotion_score = vocal_stats.get("emotion") if isinstance(vocal_stats, dict) else None
        emotion_part = f"감정 표현 수치({emotion_score}점)가 특히 돋보입니다. " if emotion_score is not None else ""

        # 3) 기본 추천 문구
        voice_style = tags[0].replace("#", "") if tags else ""
        mood = tags[1].replace("#", "") if len(tags) > 1 else ""
        pitch_diff = abs(user_pitch - song_pitch)
        base_reason = f"당신의 {voice_style} 목소리는 {artist}의 {mood} 감성과 완벽하게 어울립니다. 이 곡을 통해 당신의 매력을 발견해보세요."

        # 4) Pitch 차이 50Hz 이상이면 키(Key) 변경 추천 자동 추가
        key_tip = " 다만, 원곡과 음역대 차이가 있으니 키(Key)를 조정해서 부르는 것을 강력히 추천해요!" if pitch_diff >= 50 else ""

        return f"당신의 목소리는 {tone_desc}이며, {emotion_part}{base_reason}{key_tip}"

    @staticmethod
    def generate_vocal_persona(avg_pitch: float, avg_mfcc: np.ndarray, stats: dict) -> str:
        """Top 2 스탯을 조합해 페르소나를 결정합니다.
        - Pitch 구간 (low/mid/high) 를 먼저 판정합니다.
        - stats 딕셔너리에서 점수가 높은 두 개의 키를 추출합니다.
        - (pitch_group, stat1, stat2) 조합에 따라 다양한 감성 타이틀을 매핑합니다.
        """
        # 1) Pitch 구간 판정
        if avg_pitch < 140:
            pitch_group = "low"
        elif avg_pitch < 200:
            pitch_group = "mid"
        else:
            pitch_group = "high"

        # 2) 상위 2 스탯 추출 (점수 내림차순)
        sorted_stats = sorted(stats.items(), key=lambda x: x[1], reverse=True)
        top_two = [k for k, _ in sorted_stats[:2]] if len(sorted_stats) >= 2 else [sorted_stats[0][0]]
        # 정렬된 튜플 키 생성 (항상 알파벳 순서) – 중복 방지를 위해 정렬
        combo_key = (pitch_group, *sorted(top_two))

        # 3) 페르소나 매핑 (최소 15개 이상)
        persona_map = {
            ("low", "power", "warmth"): "깊고 강렬한 저음 바리톤",
            ("low", "power", "clarity"): "깨끗한 저음 파워 보컬",
            ("low", "warmth", "emotion"): "감성적인 저음 서정가",
            ("mid", "power", "rhythm"): "역동적인 리듬감 미드보이스",
            ("mid", "warmth", "clarity"): "부드럽고 투명한 중음 볼륨",
            ("mid", "emotion", "clarity"): "섬세한 감정 표현의 미드톤",
            ("high", "power", "rhythm"): "스카이 파워와 박자를 겸비한 하이톤",
            ("high", "warmth", "emotion"): "따뜻하고 감정이 풍부한 고음 스타",
            ("high", "clarity", "rhythm"): "청명한 고음과 리듬이 살아있는 EDM 보컬",
            ("high", "power", "clarity"): "고음에서 폭발적인 선명도와 힘",
            ("mid", "power", "warmth"): "알찬 중음과 따뜻함이 어우러진 소울",
            ("low", "rhythm", "emotion"): "저음 리듬과 감정의 조화로운 서사",
            ("mid", "rhythm", "clarity"): "리듬감과 투명함이 돋보이는 재즈 보컬",
            ("high", "emotion", "warmth"): "감성 고음의 포근함",
            ("mid", "emotion", "power"): "힘있는 감정 표현의 중음",
        }
        default_persona = "특색 있는 보컬"
        return persona_map.get(combo_key, default_persona)

    # @staticmethod
    # def generate_vocal_stats(raw_features: dict) -> dict:
    #     def clamp(v, lo=0, hi=100):
    #         return max(lo, min(hi, int(v)))

    #     warmth_raw = (low_energy / (total_energy + 1e-9)) * 100  # 0~100 비율

    #     # 2) clarity – spectral flatness 역수
    #     mag = np.abs(avg_mfcc) + 1e-9
    #     geometric = np.exp(np.mean(np.log(mag)))
    #     arithmetic = np.mean(mag)
    #     sf = geometric / arithmetic  # 0~1, 낮을수록 명료
    #     clarity_raw = (1 - sf) * 100

    #     # 3) power – RMS 에너지
    #     power_raw = np.sqrt(np.mean(np.square(avg_mfcc))) * 10  # 스케일 보정

    #     # 4) rhythm – 고주파 변동성
    #     high_var = np.var(avg_mfcc[8:13])
    #     rhythm_raw = high_var * 20  # 스케일 보정

    #     # 5) emotion – Pitch 변동성 (현재 평균 피치만으로 대체, 범위 80~400)
    #     # 가정: 평균보다 높을수록 변동성이 커진다고 가정(단순화)
    #     emotion_raw = ((avg_pitch - 120) / (400 - 120)) * 100

    #     # ---- Min‑Max 스케일링 (성인 평균 범위 가정) ----
    #     # 각 메트릭 별 기대 최소/최대값 (경험값)
    #     ranges = {
    #         "warmth": (10, 90),
    #         "clarity": (20, 80),
    #         "power": (15, 95),
    #         "rhythm": (5, 70),
    #         "emotion": (10, 90),
    #     }
    #     def minmax_scale(val, name):
    #         lo, hi = ranges[name]
    #         scaled = (val - lo) / (hi - lo) * 100
    #         return clamp(scaled)

    #     warmth = minmax_scale(warmth_raw, "warmth")
    #     clarity = minmax_scale(clarity_raw, "clarity")
    #     power = minmax_scale(power_raw, "power")
    #     rhythm = minmax_scale(rhythm_raw, "rhythm")
    #     emotion = minmax_scale(emotion_raw, "emotion")

    #     return {
        
    #         "warmth": warmth,
    #         "clarity": clarity,
    #         "power": power,
    #         "rhythm": rhythm,
    #         "emotion": emotion,
    #     }

    @staticmethod
    def extract_audio_features(y: np.ndarray, sr: int) -> dict:
        """Librosa 로부터 핵심 음향 지표들을 모두 추출한다."""
        # 1. Pitch & Emotion
        f0, _, _ = librosa.pyin(y, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C7'))
        valid_f0 = f0[~np.isnan(f0)]
        avg_pitch = float(np.mean(valid_f0)) if valid_f0.size > 0 else 0.0
        emotion = float(np.std(valid_f0)) if valid_f0.size > 0 else 0.0

        # 2. Power (RMS)
        rms = librosa.feature.rms(y=y)
        power = float(np.mean(rms))

        # 3. Rhythm (Onset)
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        rhythm = float(np.std(onset_env))

        # 4. Clarity (Spectral Flatness)
        sf = librosa.feature.spectral_flatness(y=y)
        clarity = float(np.mean(sf))

        # 5. Warmth & MFCC
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=20)
        avg_mfcc = np.mean(mfcc, axis=1)
        warmth = float(np.mean(avg_mfcc[1:4]))

        return {
            "pitch": avg_pitch,
            "mfcc": avg_mfcc,
            "emotion": emotion,
            "power": power,
            "rhythm": rhythm,
            "clarity": clarity,
            "warmth": warmth,
        }

    @staticmethod
    def generate_vocal_stats(raw_features: dict) -> dict:
        """Raw 음향 지표를 0~100 점수로 정규화합니다."""
        def clamp(v, lo=0, hi=100):
            return max(lo, min(hi, int(v)))

        ranges = {
            "warmth": (0, 100),       
            "clarity": (0.0, 1.0),    
            "power": (0.0, 0.2),      
            "rhythm": (0.0, 2.0),     
            "emotion": (0.0, 200),    
        }

        def minmax_scale(val, name):
            lo, hi = ranges[name]
            if hi - lo == 0: return 0
            scaled = (val - lo) / (hi - lo) * 100
            return clamp(scaled)

        return {
            "warmth": minmax_scale(raw_features.get("warmth", 0), "warmth"),
            "clarity": minmax_scale(raw_features.get("clarity", 0), "clarity"),
            "power": minmax_scale(raw_features.get("power", 0), "power"),
            "rhythm": minmax_scale(raw_features.get("rhythm", 0), "rhythm"),
            "emotion": minmax_scale(raw_features.get("emotion", 0), "emotion"),
        }

    @staticmethod
    def process_audio(task_uuid: str, s3_file_url: str) -> dict:
        """
        오디오 파일을 분석하고 매칭 결과와 목소리 태그를 반환합니다.

        Args:
            task_uuid (str): 작업 고유 식별자
            s3_file_url (str): 다운로드할 오디오 파일의 S3 URL

        Returns:
            dict: { "matched_song_id": int, "voice_tags": List[str] }

        Raises:
            Exception: 분석 중 오류가 발생한 경우
        """
        logger.info(f"[AnalysisService] '{task_uuid}' 분석 시작. 파일 URL: {s3_file_url}")
        
        # 임시 디렉토리 생성
        temp_dir = os.path.join(os.path.dirname(__file__), "temp")
        os.makedirs(temp_dir, exist_ok=True)
        local_file_path = ""
        
        try:
            # 1. 파일 다운로드 로직 추가 (boto3)
            logger.info(f"[AnalysisService] 파일 다운로드 중...")
            
            # S3 URL에서 버킷과 키 파싱 (예: https://bucket-name.s3.ap-northeast-2.amazonaws.com/uuid_filename.mp3)
            match = re.match(r"https://(.*?)\.s3\..*?\.amazonaws\.com/(.*)", s3_file_url)
            if not match:
                raise ValueError(f"S3 URL 포맷이 올바르지 않습니다: {s3_file_url}")
                
            bucket_name = match.group(1)
            object_key = match.group(2)
            
            local_file_path = os.path.join(temp_dir, f"{task_uuid}_{os.path.basename(object_key)}")
            
            # 파일 다운로드
            s3_client.download_file(bucket_name, object_key, local_file_path)
            logger.info(f"[AnalysisService] 파일 다운로드 완료: {local_file_path}")
            
            # 2. 보컬 분리 (Demucs 활용)
            logger.info(f"[AnalysisService] Demucs(htdemucs)로 보컬 분리 진행 중...")
            
            # 분리된 파일이 저장될 출력 디렉토리 (temp/demucs_out_uuid)
            output_dir = os.path.join(temp_dir, f"demucs_out_{task_uuid}")
            os.makedirs(output_dir, exist_ok=True)
            
            # CPU 환경에서도 빠르게 돌아갈 수 있는 htdemucs 모델을 사용하며, vocals(보컬) 스템만 추출합니다.
            # python -m demucs.separate 의 형태로 호출하여 모듈을 안전하게 실행합니다.
            command = [
                sys.executable, "-m", "demucs.separate",
                "-n", "htdemucs",
                "--two-stems", "vocals",
                "-o", output_dir,
                local_file_path
            ]
            
            try:
                subprocess.run(command, check=True, capture_output=True, text=True)
                logger.info(f"[AnalysisService] 보컬 분리 완료. 결과 저장 디렉토리: {output_dir}")
            except subprocess.CalledProcessError as e:
                # logger.error(f"[AnalysisService] Demucs 분리 실패: {e.stderr}")
                # raise RuntimeError(f"보컬 분리 중 오류가 발생했습니다: {e.stderr}")
                
                # 에러 확성기(stderr)가 비어있다면 일반 확성기(stdout)의 내용을 뺏어옵니다!
                error_msg = e.stderr if e.stderr.strip() else e.stdout
                logger.error(f"[AnalysisService] Demucs 분리 실패 상세: \n{error_msg}")
                raise RuntimeError(f"보컬 분리 중 오류가 발생했습니다: {error_msg}")
            
            # demucs 기본 출력 구조: {output_dir}/htdemucs/{원래 파일명}/vocals.wav
            original_filename = os.path.splitext(os.path.basename(local_file_path))[0]
            vocals_path = os.path.join(output_dir, "htdemucs", original_filename, "vocals.wav")
            
            # 3. 오디오 특징 추출 (Pitch, MFCC)
            logger.info(f"[AnalysisService] 분리된 보컬 파일 존재 여부 확인 중...")
            
            if os.path.exists(vocals_path):
                logger.info(f"[AnalysisService] 보컬 파일 추출 성공: {vocals_path}")
                
                # librosa를 사용한 특징 추출
                logger.info("[AnalysisService] 보컬의 오디오 특징(Pitch, MFCC) 추출을 시작합니다.")
                
                # 오디오 파일 로드 (sr=None으로 원본 샘플링 레이트 유지)
                y, sr = librosa.load(vocals_path, sr=None)
                
                # # 1) Pitch (F0) 추출: 기본 주파수 평균값 계산 (사람 목소리 음역대 C2 ~ C7 기준)
                # f0, voiced_flag, voiced_probs = librosa.pyin(y, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C7'))
                # valid_f0 = f0[~np.isnan(f0)] # NaN 값 제외
                # avg_pitch = float(np.mean(valid_f0)) if len(valid_f0) > 0 else 0.0
                # logger.info(f"[AnalysisService] 추출된 평균 Pitch (F0): {avg_pitch:.2f} Hz")

                # # 2) MFCC 추출: 목소리의 음색을 파악하는 20차원 배열 생성
                # mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=20)
                # avg_mfcc = np.mean(mfcc, axis=1) # 프레임별 평균을 구해 1차원 배열로 변환
                # logger.info(f"[AnalysisService] 추출된 평균 MFCC (20 dims): {avg_mfcc}")

                # # 2-1) 목소리 프로파일링 태그 생성
                # voice_tags = AnalysisService.generate_voice_tags(avg_pitch, avg_mfcc)

                # 1) 원시 지표 전체 추출 (Pitch, MFCC, RMS, Onset 등 통합 추출)
                raw_features = AnalysisService.extract_audio_features(y, sr)
                avg_pitch = raw_features["pitch"]
                avg_mfcc = raw_features["mfcc"]
                
                logger.info(f"[AnalysisService] 추출된 평균 Pitch (F0): {avg_pitch:.2f} Hz")
                
                # 2) 스탯 정규화 (0~100) 및 페르소나 생성
                vocal_stats = AnalysisService.generate_vocal_stats(raw_features)
                vocal_persona = AnalysisService.generate_vocal_persona(avg_pitch, avg_mfcc, vocal_stats)
                
                # 3) 목소리 프로파일링 태그 생성
                voice_tags = AnalysisService.generate_voice_tags(avg_pitch, avg_mfcc)
                
                # 4. DB 연동: 곡(Song) 데이터 로드 및 파싱
                logger.info("[AnalysisService] DB에서 전체 곡(Song) 데이터를 조회합니다.")
                db = SessionLocal()
                try:
                    songs = db.query(Song).all()
                    
                    if not songs:
                        logger.warning("[AnalysisService] DB에 곡 데이터가 하나도 없습니다. 매칭을 건너뜁니다.")
                        matched_song_id = None
                    else:
                        # =========================================================
                        # 5. 코사인 유사도(Cosine Similarity) 기반 매칭
                        # [알고리즘 변경 이유]
                        # - 기존 StandardScaler + 유클리디안 방식은 MFCC[0](에너지)의
                        #   절대값이 커서 다른 모든 차원을 씹어먹어
                        #   항상 같은 곡만 매칭되는 '블랙홀 현상' 발생.
                        # - 코사인 유사도는 벡터의 방향(패턴)만 비교하므로
                        #   절대 음량과 무관하게 목소리의 '음색 지문'을 비교합니다.
                        # - Pitch는 매칭에서 제외하고 키 변경 추천 지표로만 사용합니다.
                        # =========================================================
                        logger.info("[AnalysisService] MFCC 코사인 유사도 기반 매칭 시작...")

                        best_song_id = None
                        best_cosine = -1.0      # 코사인 값은 높을수록 유사
                        best_song_pitch = 0.0   # 키 변경 추천을 위한 저장

                        for song in songs:
                            try:
                                song_mfcc = np.array(json.loads(song.mfcc_vector)) if song.mfcc_vector else np.zeros(20)
                            except Exception:
                                logger.warning(f"[AnalysisService] Song ID {song.id} MFCC 파싱 실패, 0 벡터 사용")
                                song_mfcc = np.zeros(20)

                            cosine = AnalysisService.cosine_similarity(avg_mfcc, song_mfcc)
                            song_pitch_val = song.pitch if song.pitch is not None else 0.0

                            logger.info(f"[AnalysisService] Song ID {song.id} | MFCC 코사인: {cosine:.4f} | Pitch: {song_pitch_val:.1f}Hz")

                            if cosine > best_cosine:
                                best_cosine = cosine
                                best_song_id = song.id
                                best_song_pitch = song_pitch_val

                        matched_song_id = best_song_id
                        logger.info(f"[AnalysisService] 최종 매칭 완료! Song ID: {matched_song_id} | 코사인 유사도: {best_cosine:.4f}")

                        # 세션이 닫히기 전에 아티스트 정보를 미리 조회합니다.
                        matched_song = db.query(Song).filter(Song.id == matched_song_id).first() if matched_song_id else None
                        matched_artist = matched_song.artist if matched_song else "알 수 없는 아티스트"

                finally:
                    # DB 세션을 반드시 반환하여 커넥션 풀을 관리합니다.
                    db.close()

            else:
                logger.error(f"[AnalysisService] 보컬 파일을 찾을 수 없습니다: {vocals_path}")
                raise FileNotFoundError(f"보컬 분리 결과물(vocals.wav)이 생성되지 않았습니다.")

            # 매칭 결과, 목소리 태그, 추가 분석 데이터를 함께 반환합니다.
            vt = voice_tags if 'voice_tags' in locals() else []
            ap = avg_pitch if 'avg_pitch' in locals() else 0.0
            am = avg_mfcc if 'avg_mfcc' in locals() else np.zeros(20)

            # # [신규] 보컬 스탯 생성 (추천 사유와 페르소나의 근거가 됨)
            # # 원시 오디오 특징 추출
            # raw_features = AnalysisService.extract_audio_features(y, sr)
            # # 스탯 정규화 (Min‑Max Scaling)
            # vocal_stats = AnalysisService.generate_vocal_stats(raw_features)

            # # [신규] 보컬 페르소나 생성 (Top2 스탯 조합 기반)
            # vocal_persona = AnalysisService.generate_vocal_persona(ap, am, vocal_stats)

            similarity_score = AnalysisService.cosine_to_score(best_cosine) if matched_song_id else 0
            
            # [신규] 추천 사유 생성 (stats 포함)
            recommend_reason = AnalysisService.generate_recommend_reason(
                vt,
                matched_artist if 'matched_artist' in locals() else "알 수 없는 아티스트",
                ap,
                best_song_pitch if 'best_song_pitch' in locals() else 0.0,
                vocal_stats
            ) if matched_song_id else ""

            logger.info(f"[AnalysisService] 보컬 페르소나: {vocal_persona}")
            logger.info(f"[AnalysisService] 보컬 스탯: {vocal_stats}")

            return {
                "matched_song_id": matched_song_id,
                "voice_tags": vt,
                "similarity_score": similarity_score,
                "pitch_hz": int(ap),
                "recommend_reason": recommend_reason,
                "vocal_persona": vocal_persona,
                "vocal_stats": vocal_stats
            }
            
        except Exception as e:
            logger.error(f"[AnalysisService] '{task_uuid}' 분석 중 오류 발생: {e}")
            raise e # 상위 워커에서 처리할 수 있도록 에러를 다시 던집니다.
            
        finally:
            # 작업이 끝난 후 (성공/실패 무관) 로컬 임시 파일 및 분리된 디렉토리를 즉시 삭제하여 디스크 용량 관리
            if local_file_path and os.path.exists(local_file_path):
                try:
                    os.remove(local_file_path)
                    logger.info(f"[AnalysisService] 로컬 원본 파일 삭제 완료: {local_file_path}")
                except Exception as cleanup_error:
                    logger.error(f"[AnalysisService] 원본 파일 삭제 중 오류 발생: {cleanup_error}")
                    
            if 'output_dir' in locals() and os.path.exists(output_dir):
                try:
                    shutil.rmtree(output_dir)
                    logger.info(f"[AnalysisService] 분리된 보컬 디렉토리 삭제 완료: {output_dir}")
                except Exception as cleanup_error:
                    logger.error(f"[AnalysisService] 분리된 보컬 디렉토리 삭제 중 오류 발생: {cleanup_error}")

