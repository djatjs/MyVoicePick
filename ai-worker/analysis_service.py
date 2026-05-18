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
            tone_desc = "상위 15% 수준의 유니크한 하이톤"
        elif diff > 10:
            tone_desc = "디테일이 살아있는 맑은 톤"
        elif diff < -30:
            tone_desc = "하위 15% 수준의 묵직한 딥 로우톤"
        elif diff < -10:
            tone_desc = "풍부한 울림을 가진 로우톤"
        else:
            tone_desc = "가장 안정적이고 대중적인 미드톤"

        # 2) 감정 및 스탯 강조
        emotion_score = vocal_stats.get("emotion") if isinstance(vocal_stats, dict) else 0
        power_score = vocal_stats.get("power") if isinstance(vocal_stats, dict) else 0
        
        if emotion_score and emotion_score > 70:
            stat_highlight = f"특히 {emotion_score}점에 달하는 압도적인 감정 표현력(Emotion)이 곡의 몰입도를 극대화할 것입니다."
        elif power_score and power_score > 70:
            stat_highlight = f"특히 {power_score}점에 달하는 단단한 성량(Power)이 이 곡의 클라이맥스와 완벽한 시너지를 냅니다."
        else:
            stat_highlight = "128-point 음색 DNA와 주파수 파형이 이 곡의 악기 구성과 가장 이상적인 대역폭을 공유하고 있습니다."

        # 3) 기본 추천 문구
        voice_style = tags[0].replace("#", "") if tags else "매력적인"
        mood = tags[1].replace("#", "") if len(tags) > 1 else "독보적인"
        pitch_diff = abs(user_pitch - song_pitch)
        
        # 좀 더 세련된 AI 프로듀서 느낌의 멘트로 변경
        base_reason = (
            f"당신의 목소리 지문(Voice Print)을 분석한 결과, {int(user_pitch)}Hz 기반의 '{tone_desc}'을 가지고 있습니다. "
            f"이러한 {voice_style} 보컬 데이터는 {artist}의 {mood} 감성과 매우 정밀한 음향적 일치율을 보입니다. "
            f"{stat_highlight}"
        )

        # 4) Pitch 차이 50Hz 이상이면 키(Key) 변경 추천 자동 추가
        key_tip = " (단, 원곡과의 기본 음역대 편차가 감지되었으므로, 맞춤 Key 조정을 통해 당신만의 스타일로 재해석하는 것을 권장합니다.)" if pitch_diff >= 50 else ""

        return f"{base_reason}{key_tip}"

    @staticmethod
    def generate_pro_features(user_pitch: float, best_song_pitch: float, vocal_stats: dict, matched_artist: str, matched_song_title: str, similar_songs: list) -> dict:
        """
        PRO 유저를 위한 보컬 성장 솔루션 데이터를 생성합니다.
        """
        import math
        import random

        # 1. Key 추천 로직 고도화 (남녀 옥타브 차이 및 반음계 정밀 계산)
        if best_song_pitch > 0 and user_pitch > 0:
            semitones_diff = round(12 * math.log2(user_pitch / best_song_pitch))
            
            # [개선] 남녀 옥타브 차이 보정 로직
            # 남성 평균 음역(120~150Hz), 여성 평균 음역(200~250Hz)
            # user가 낮고 song이 매우 높은 경우 (남자가 여자 노래 부를 때) -> 옥타브를 낮추는 방향으로 보정
            if semitones_diff < -8: 
                semitones_diff += 12 # 한 옥타브 올려서 반음 차이를 줄임 (예: -12 -> 0)
                octave_guide = " (여성 곡을 남성 키로 변환)"
            # user가 높고 song이 매우 낮은 경우 (여자가 남자 노래 부를 때)
            elif semitones_diff > 8:
                semitones_diff -= 12
                octave_guide = " (남성 곡을 여성 키로 변환)"
            else:
                octave_guide = ""

            key_diff = semitones_diff
            
            if key_diff == 0:
                key_recommend = f"원키 (Original Key){octave_guide}"
            elif key_diff > 0:
                key_recommend = f"+{key_diff} Key (원곡보다 높게){octave_guide}"
            else:
                key_recommend = f"{key_diff} Key (원곡보다 낮게){octave_guide}"
        else:
            key_recommend = "원키 (Original Key)"

        # 2. 보컬 트레이닝 피드백 생성 로직 세분화 (10개 이상의 템플릿)
        power = vocal_stats.get("power", 0)
        clarity = vocal_stats.get("clarity", 0)
        emotion = vocal_stats.get("emotion", 0)
        warmth = vocal_stats.get("warmth", 0)
        rhythm = vocal_stats.get("rhythm", 0)
        
        # [개선] 스탯 조합을 더 다채롭게 분기
        if power > 70 and clarity > 70:
            guide = "성량이 폭발적이고 딕션(발음)이 매우 정확합니다! 폭발적인 고음을 낼 때 어깨에 힘이 들어가지 않도록 목 주변의 긴장을 푸는 스트레칭을 병행하면 금상첨화입니다."
        elif power < 40 and clarity > 70:
            guide = "음색이 아주 맑고 투명하여 '공기 반 소리 반'의 매력이 돋보입니다. 다만 장시간 가창 시 성대에 무리가 갈 수 있으니, 호흡을 뱉기 전 배에 압력을 유지하는 '복압 훈련'을 추천합니다."
        elif warmth > 70 and emotion > 70:
            guide = "목소리 톤이 매우 따뜻하고 감정 표현력이 압도적입니다. 이 매력을 살리면서 가사가 더 잘 들리게 하려면, 노래를 부를 때 입 모양을 세로로 조금 더 벌려 공간을 확보해 보세요."
        elif rhythm > 70 and power > 50:
            guide = "박자를 타는 리듬감이 매우 뛰어나며, 소리를 뱉어내는 타이밍이 정확합니다. R&B나 팝 장르에서 그루브를 더 살리기 위해 강세(Accent)를 조금 더 뒤로 미뤄 부르는 '레이백' 연습을 해보세요."
        elif emotion > 70 and clarity < 50:
            guide = "음정이 다이나믹하게 변하며 감정선이 매우 풍부한 훌륭한 보컬입니다! 감정에 너무 몰입하면 발음이 흐려질 수 있으니, 볼펜을 물고 가사를 또박또박 읽는 연습이 큰 도움이 됩니다."
        elif power > 70 and emotion < 40:
            guide = "성량이 매우 뛰어나고 힘 있는 보컬을 가지고 계시네요! 곡의 몰입도를 높이기 위해, 잔잔한 파트(Verse)에서는 말하듯이 힘을 빼고 부르는 '다이나믹(강약 조절)' 연습을 추가해 보세요."
        elif warmth < 40 and clarity > 60:
            guide = "소리가 매우 날카롭고 선명하게 꽂히는 트렌디한 음색입니다. 여기에 따뜻함을 살짝 더하려면 하품할 때처럼 목젖을 살짝 내리고 소리를 내보는 '후두 내리기' 연습을 추천합니다."
        elif rhythm < 40 and emotion > 60:
            guide = "서정적인 감정 표현은 뛰어나지만, 박자가 조금 밀리는 경향이 있습니다. 메트로놈을 켜두고 정박자에 맞춰 손뼉을 치며 부르는 연습을 꾸준히 해보시면 훨씬 단단한 보컬이 됩니다."
        elif power < 40 and emotion < 40 and clarity < 40:
            guide = "아직 목소리의 잠재력이 완전히 깨어나지 않은 상태입니다. 호흡이 약해 음정이 불안정할 수 있으니, 가장 편안한 키(Key)에서 피아노 건반 소리에 맞춰 한 음을 길게 유지하는 '롱톤(Long Tone)' 연습부터 차근차근 시작해보세요."
        elif rhythm < 40 and power < 40:
            guide = "아직 성대 주변 근육과 호흡이 노래에 완전히 적응하지 못한 상태입니다. 멜로디에 집중하기보다, 일정한 박자에 맞춰 숨을 '쯧, 쯧' 하고 강하게 끊어 뱉는 훈련을 통해 발성 코어 근육을 단련해보세요."
        elif power > 60 and rhythm > 60 and emotion > 60:
            guide = "현재 보컬의 전반적인 스탯 밸런스가 매우 훌륭합니다! 탄탄한 기본기를 갖추고 있으니, 자신이 좋아하는 다양한 장르의 곡들을 자유롭게 연습해 보세요."
        else:
            guide = "보컬의 스탯이 특정 성향에 치우치지 않고 비교적 평이하게 분포되어 있습니다. 아직 자신만의 독특한 무기가 돋보이지 않는 상태이므로, 다양한 곡을 카피해 부르며 내가 가장 매력적으로 소리 낼 수 있는 음역대와 톤을 발굴해 보세요."

        # 3. 찰떡 매칭 3곡 플레이리스트 (Faiss 검색 기반 상위 랭커 활용)
        import copy
        pool = [s for s in similar_songs if s.get("title") != matched_song_title]
        
        # 만약 Faiss에서 넘어온 유사 곡이 충분하지 않다면 안전장치(Fallback)
        if len(pool) >= 3:
            selected_songs = pool[:3]
        else:
            selected_songs = pool

        playlist = [{"title": s.get("title"), "artist": s.get("artist")} for s in selected_songs]
        
        # 땜빵 로직: 곡이 부족한 경우
        idx = 1
        while len(playlist) < 3:
            playlist.append({"title": f"추천 명곡 {idx}", "artist": "Various Artists"})
            idx += 1

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
        
        # [개선] 노이즈 필터링: 일정 데시벨(dB) 이하의 무음 구간(침묵, 노이즈) 제거
        # top_db=30은 최대 음량 기준 -30dB 이하를 침묵으로 간주하여 필터링
        intervals = librosa.effects.split(y_low, top_db=30)
        if len(intervals) > 0:
            y_voiced = np.concatenate([y_low[start:end] for start, end in intervals])
        else:
            y_voiced = y_low  # 유효 구간이 없으면 원본 그대로 사용

        # 1. Pitch & Emotion (pyin 최적화: hop_length 늘림)
        # 16kHz에서 hop_length=1024는 약 64ms 간격입니다.
        # [개선] 노이즈가 제거된 y_voiced 를 사용하여 정확한 Pitch 분석
        f0, _, _ = librosa.pyin(
            y_voiced, 
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
                
                # 4. DB 연동: 곡(Song) 데이터 로드 (Pitch 1차 필터링 적용)
                logger.info("[AnalysisService] DB에서 곡 데이터를 조회합니다. (Pitch 1차 필터링)")
                db = SessionLocal()
                try:
                    # [성능 최적화 1단계] 내 음역대(Pitch) 기준 +- 50Hz 범위 내의 곡만 1차 필터링하여 DB에서 가져옵니다. (O(N) 탐색 모수 대폭 감소)
                    min_pitch = avg_pitch - 50.0
                    max_pitch = avg_pitch + 50.0
                    songs = db.query(Song).filter(Song.pitch >= min_pitch, Song.pitch <= max_pitch).all()
                    
                    # 만약 필터링된 곡이 없다면 전체 곡을 가져옵니다 (Fallback)
                    if not songs:
                        logger.warning("[AnalysisService] 필터링된 곡이 없어 전체 곡을 조회합니다.")
                        songs = db.query(Song).all()

                    if not songs:
                        logger.warning("[AnalysisService] DB에 곡 데이터가 하나도 없습니다. 매칭을 건너뜁니다.")
                        matched_song_id = None
                    else:
                        # =========================================================
                        # 5. 종합 가중치 매칭 + Faiss 고속 벡터 검색 [개선]
                        # - [성능 최적화 2단계] Faiss 라이브러리를 도입하여 MFCC 벡터 유사도를 O(log N) 속도로 고속 검색합니다.
                        # - 추출된 Top K 개의 곡에 대해서만 Pitch 가중치를 합산하여 최종 1곡을 선정합니다.
                        # =========================================================
                        logger.info(f"[AnalysisService] Faiss를 활용한 고속 벡터 검색 및 가중치 합산 시작 (후보 곡 수: {len(songs)})")

                        best_song_id = None
                        best_score = -1.0
                        best_cosine = 0.0
                        best_song_pitch = 0.0

                        # Faiss 인덱스에 넣을 데이터 준비
                        import faiss
                        
                        song_ids = []
                        song_pitches = []
                        song_mfccs = []
                        
                        for song in songs:
                            try:
                                vec = np.array(json.loads(song.mfcc_vector), dtype=np.float32)
                                song_mfccs.append(vec)
                                song_ids.append(song.id)
                                song_pitches.append(song.pitch if song.pitch is not None else 0.0)
                            except Exception:
                                continue

                        if len(song_mfccs) > 0:
                            # 데이터 변환 및 정규화 (코사인 유사도는 L2 정규화 후 내적(Inner Product)과 동일)
                            song_mfccs_np = np.array(song_mfccs)
                            faiss.normalize_L2(song_mfccs_np)
                            
                            # Faiss 내적(Inner Product) 인덱스 생성
                            dimension = 20 # MFCC 차원 수
                            index = faiss.IndexFlatIP(dimension)
                            index.add(song_mfccs_np)
                            
                            # 쿼리 벡터 준비 및 정규화
                            query_vec = np.array([avg_mfcc], dtype=np.float32)
                            faiss.normalize_L2(query_vec)
                            
                            # 검색 (Top 10 추출 후 최종 가중치 계산)
                            k = min(10, len(song_ids))
                            distances, indices = index.search(query_vec, k)
                            
                            candidates = []
                            for i in range(k):
                                idx = indices[0][i]
                                if idx == -1: continue # 결과 없음
                                
                                cosine = float(distances[0][i]) # Faiss 내적 결과가 곧 코사인 유사도
                                current_song_id = song_ids[idx]
                                current_pitch = song_pitches[idx]
                                
                                # 1) 코사인 유사도를 0 ~ 1.0 범위로 정규화 (음색 점수)
                                mfcc_score = max(0.0, (cosine + 1) / 2.0)
                                
                                # 2) Pitch 차이를 바탕으로 음역대 점수 산출 (0 ~ 1.0)
                                pitch_diff = abs(avg_pitch - current_pitch)
                                pitch_score = max(0.0, 1.0 - (pitch_diff / 100.0))
                                
                                # 3) 가중치 합산 (음색 70%, 음역대 30%)
                                total_score = (mfcc_score * 0.7) + (pitch_score * 0.3)
                                
                                candidates.append({
                                    "id": current_song_id,
                                    "pitch": current_pitch,
                                    "cosine": cosine,
                                    "score": total_score
                                })

                            # 점수 내림차순 정렬
                            candidates.sort(key=lambda x: x["score"], reverse=True)

                            if candidates:
                                best = candidates[0]
                                best_score = best["score"]
                                best_cosine = best["cosine"]
                                best_song_id = best["id"]
                                best_song_pitch = best["pitch"]
                                
                                # 상위 2~4위 곡의 ID 저장 (찰떡 매칭용 플레이리스트 후보)
                                top_similar_ids = [c["id"] for c in candidates[1:4]]

                        matched_song_id = best_song_id
                        logger.info(f"[AnalysisService] 최종 매칭 완료! Song ID: {matched_song_id} | 최고 종합 점수: {best_score:.4f} (코사인 {best_cosine:.4f})")

                        # 세션이 닫히기 전에 아티스트 정보를 미리 조회합니다.
                        matched_song = db.query(Song).filter(Song.id == matched_song_id).first() if matched_song_id else None
                        matched_artist = matched_song.artist if matched_song else "알 수 없는 아티스트"
                        matched_song_title = matched_song.title if matched_song else "알 수 없는 곡"

                        # PRO 플레이리스트 추천을 위한 데이터 (Faiss 검색 결과 2~4위 곡)
                        similar_songs_data = []
                        if 'top_similar_ids' in locals() and top_similar_ids:
                            sim_songs = db.query(Song).filter(Song.id.in_(top_similar_ids)).all()
                            similar_songs_data = [{"title": s.title, "artist": s.artist} for s in sim_songs if s.title and s.artist]
                        else:
                            # 만약 Faiss 검색 결과가 적다면 전체 곡 중 일부로 대체(Fallback)
                            similar_songs_data = [{"title": s.title, "artist": s.artist} for s in songs if s.title and s.artist]

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
                similar_songs_data if 'similar_songs_data' in locals() else []
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

