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
    def generate_pro_features(user_pitch: float, best_song_pitch: float, vocal_stats: dict, matched_artist: str, matched_song_title: str, available_songs: list) -> dict:
        """
        PRO 유저를 위한 보컬 성장 솔루션 데이터를 생성합니다.
        """
        import math
        import random

        # 1. Key 추천 로직 (음악 이론의 반음계(Semitone) 기반 계산)
        # 1 옥타브 = 12 반음 = 주파수 2배
        if best_song_pitch > 0 and user_pitch > 0:
            semitones_diff = round(12 * math.log2(user_pitch / best_song_pitch))
            # 옥타브 차이를 무시하기 위해 12로 나눈 나머지를 구함 (단, -6 ~ +6 사이의 값으로 맞춤)
            key_diff = semitones_diff % 12
            if key_diff > 6:
                key_diff -= 12
            
            if key_diff == 0:
                key_recommend = "원키 (Original Key)"
            elif key_diff > 0:
                key_recommend = f"+{key_diff} Key (원곡보다 높게)"
            else:
                key_recommend = f"{key_diff} Key (원곡보다 낮게)"
        else:
            key_recommend = "원키 (Original Key)"

        # 2. 보컬 트레이닝 피드백 생성 로직 (Stats 기반 정교화)
        guide = ""
        power = vocal_stats.get("power", 0)
        clarity = vocal_stats.get("clarity", 0)
        emotion = vocal_stats.get("emotion", 0)
        warmth = vocal_stats.get("warmth", 0)

        if power < 40 and clarity > 60:
            guide = "음색이 아주 맑고 투명하여 공기 반 소리 반의 매력이 돋보입니다! 다만 장시간 가창 시 성대에 무리가 갈 수 있으니, 호흡을 뱉기 전 복압을 유지하는 '성대 접촉 훈련'을 병행하면 훨씬 안정적인 보컬이 완성됩니다."
        elif power > 70 and emotion < 40:
            guide = "성량이 매우 뛰어나고 힘 있는 보컬을 가지고 계시네요! 곡의 몰입도를 높이기 위해, 잔잔한 파트(Verse)에서는 말하듯이 힘을 빼고 부르는 '다이나믹(강약 조절)' 연습을 추가해 보세요."
        elif clarity < 40 and warmth > 60:
            guide = "소리의 질감이 묵직하고 따뜻한 공명감이 매우 매력적입니다. 이 매력을 살리면서 가사가 더 잘 들리게 하려면, 노래를 부를 때 입 모양을 세로로 조금 더 벌려 공간을 확보해 보세요."
        elif emotion > 70:
            guide = "음정이 다이나믹하게 변하며 감정선이 매우 풍부한 훌륭한 보컬입니다. 현재의 감정 표현을 유지하면서, 고음역대 진입 시 시선을 살짝 아래로 향하게 하면 음이탈을 방지할 수 있습니다."
        else:
            guide = "현재 보컬의 전반적인 밸런스가 매우 훌륭합니다! 지금의 톤을 유지하면서 자신이 좋아하는 장르의 곡들을 꾸준히 연습해 보세요."

        # 3. 큐레이션 플레이리스트 (실제 DB에 있는 곡들 중 무작위 3곡 추출, 매칭곡 제외)
        import copy
        pool = [s for s in available_songs if s.get("title") != matched_song_title]
        if len(pool) >= 3:
            selected_songs = random.sample(pool, 3)
        else:
            selected_songs = pool

        playlist = [{"title": s.get("title"), "artist": s.get("artist")} for s in selected_songs]
        
        # 만약 DB 곡이 너무 적어서 3곡이 안 채워지면 땜빵
        while len(playlist) < 3:
            playlist.append({"title": f"{matched_song_title} (Cover)", "artist": "Various Artists"})

        return {
            "key": key_recommend,
            "guide": guide,
            "playlist": playlist
        }

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

        # 2) 상위 2 스탯 추출 (dna_128_points 등 리스트 제외, 점수 내림차순)
        # dna_128_points는 시각화용이므로 페르소나 계산에서는 제외합니다.
        filterable_stats = {k: v for k, v in stats.items() if isinstance(v, (int, float))}
        sorted_stats = sorted(filterable_stats.items(), key=lambda x: x[1], reverse=True)
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


    @staticmethod
    def extract_audio_features(y: np.ndarray, sr: int) -> dict:
        """Librosa 로부터 핵심 음향 지표들을 효율적으로 추출한다.
        최적화를 위해 피치 분석은 16kHz로 다운샘플링하여 진행합니다.
        """
        # --- 최적화: 분석용 다운샘플링 (16kHz) ---
        target_sr = 16000
        y_low = librosa.resample(y, orig_sr=sr, target_sr=target_sr) if sr != target_sr else y
        
        # 1. Pitch & Emotion (pyin 최적화: hop_length 늘림)
        # 16kHz에서 hop_length=1024는 약 64ms 간격입니다.
        f0, _, _ = librosa.pyin(
            y_low, 
            fmin=librosa.note_to_hz('C2'), 
            fmax=librosa.note_to_hz('C7'),
            sr=target_sr,
            hop_length=1024
        )
        valid_f0 = f0[~np.isnan(f0)]
        avg_pitch = float(np.mean(valid_f0)) if valid_f0.size > 0 else 0.0
        emotion = float(np.std(valid_f0)) if valid_f0.size > 0 else 0.0

        # 2. Power (RMS) - 원본 해상도 유지
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

        # [신규] 6. 128-point DNA (Mel Spectrogram)
        # 사람의 청각 특성을 반영한 128개의 주파수 대역 에너지 (보통 -80 ~ 0 dB)
        mel_spec = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128)
        mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)
        # 보기 좋게 양수로 변환 (+80) 및 정수화
        dna_128 = [int(v + 80) for v in np.mean(mel_spec_db, axis=1)]

        return {
            "pitch": avg_pitch,
            "mfcc": avg_mfcc,
            "emotion": emotion,
            "power": power,
            "rhythm": rhythm,
            "clarity": clarity,
            "warmth": warmth,
            "dna_128_points": dna_128,
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
            "dna_128_points": raw_features.get("dna_128_points", []),
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
            # 1. 파일 다운로드 로직 (Pre-signed URL 지원)
            logger.info(f"[AnalysisService] 파일 다운로드 중...")
            
            # Pre-signed URL은 인증 정보가 쿼리 스트링으로 포함되어 있어 
            # 단순 HTTP GET 요청으로 다운로드하는 것이 가장 확실하고 안전합니다.
            local_file_path = os.path.join(temp_dir, f"{task_uuid}_input.mp3")
            
            try:
                import urllib.request
                urllib.request.urlretrieve(s3_file_url, local_file_path)
                logger.info(f"[AnalysisService] 파일 다운로드 완료: {local_file_path}")
            except Exception as download_error:
                logger.error(f"[AnalysisService] S3 파일 다운로드 실패: {download_error}")
                raise RuntimeError(f"파일 다운로드에 실패했습니다: {download_error}")
            
            # 2. 보컬 분리 (Demucs 활용)
            logger.info(f"[AnalysisService] Demucs(htdemucs)로 보컬 분리 진행 중...")
            
            # [속도 최적화] 분석용 45초 구간 추출 (전체 곡 분리는 너무 오래 걸림)
            trimmed_file_path = os.path.join(temp_dir, f"{task_uuid}_trimmed.mp3")
            try:
                # 15초 지점부터 45초간 추출 (보컬이 존재할 확률이 높은 구간)
                trim_command = [
                    "ffmpeg", "-y", "-i", local_file_path,
                    "-ss", "15", "-t", "45",
                    "-ac", "2", "-ar", "44100",
                    trimmed_file_path
                ]
                subprocess.run(trim_command, check=True, capture_output=True)
                input_for_separation = trimmed_file_path
                logger.info(f"[AnalysisService] 분석 속도 향상을 위해 45초 구간 트리밍 완료")
            except Exception as trim_error:
                logger.warning(f"[AnalysisService] 트리밍 실패, 원본 사용: {trim_error}")
                input_for_separation = local_file_path

            # 분리된 파일이 저장될 출력 디렉토리
            output_dir = os.path.join(temp_dir, f"demucs_out_{task_uuid}")
            os.makedirs(output_dir, exist_ok=True)
            
            command = [
                sys.executable, "-m", "demucs.separate",
                "-n", "htdemucs",
                "--two-stems", "vocals",
                "-o", output_dir,
                input_for_separation
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
            
            # demucs 기본 출력 구조: {output_dir}/htdemucs/{입력 파일명}/vocals.wav
            # 트리밍된 파일을 사용했을 경우를 고려하여 input_for_separation 기준으로 파일명을 추출합니다.
            used_filename = os.path.splitext(os.path.basename(input_for_separation))[0]
            vocals_path = os.path.join(output_dir, "htdemucs", used_filename, "vocals.wav")
            
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
                        matched_song_title = matched_song.title if matched_song else "알 수 없는 곡"

                        # PRO 플레이리스트 추천을 위해 사용 가능한 곡 목록을 메모리에 미리 복사
                        available_songs_data = [{"title": s.title, "artist": s.artist} for s in songs if s.title and s.artist]

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

            # [신규] PRO 솔루션 데이터 생성
            pro_features = AnalysisService.generate_pro_features(
                ap,
                best_song_pitch if 'best_song_pitch' in locals() else 0.0,
                vocal_stats,
                matched_artist if 'matched_artist' in locals() else "알 수 없는 아티스트",
                matched_song_title if 'matched_song_title' in locals() else "알 수 없는 곡",
                available_songs_data if 'available_songs_data' in locals() else []
            )

            return {
                "matched_song_id": matched_song_id,
                "voice_tags": vt,
                "similarity_score": similarity_score,
                "pitch_hz": int(ap),
                "recommend_reason": recommend_reason,
                "vocal_persona": vocal_persona,
                "vocal_stats": vocal_stats,
                "pro_features": pro_features
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
            
            # [수정] 트리밍된 임시 파일 삭제 누락 해결
            if 'trimmed_file_path' in locals() and os.path.exists(trimmed_file_path):
                try:
                    os.remove(trimmed_file_path)
                    logger.info(f"[AnalysisService] 트리밍된 임시 파일 삭제 완료: {trimmed_file_path}")
                except Exception as cleanup_error:
                    logger.error(f"[AnalysisService] 트리밍 파일 삭제 중 오류 발생: {cleanup_error}")
                    
            if 'output_dir' in locals() and os.path.exists(output_dir):
                try:
                    shutil.rmtree(output_dir)
                    logger.info(f"[AnalysisService] 분리된 보컬 디렉토리 삭제 완료: {output_dir}")
                except Exception as cleanup_error:
                    logger.error(f"[AnalysisService] 분리된 보컬 디렉토리 삭제 중 오류 발생: {cleanup_error}")

