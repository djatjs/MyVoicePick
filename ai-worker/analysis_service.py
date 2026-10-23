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
    def extract_audio_features(y: np.ndarray, sr: int, include_song_profile=False) -> dict:
        """Librosa 로부터 핵심 음향 지표들을 효율적으로 추출한다.
        최적화를 위해 피치 분석은 16kHz로 다운샘플링하여 진행합니다.
        """
        # --- 최적화: 분석용 다운샘플링 (16kHz) ---
        target_sr = 16000
        y_low = librosa.resample(y, orig_sr=sr, target_sr=target_sr) if sr != target_sr else y
        
        # 시간축을 보존한 단일 F0로 평균과 분포를 함께 계산한다.
        f0, voiced, probability = librosa.pyin(
            y_low, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C7'),
            sr=target_sr, hop_length=512)
        from song_features import vocal_pitch_profile
        f0, song_profile = vocal_pitch_profile(y_low, target_sr, f0, voiced, probability, 512)
        song_profile['f0_hop_length'] = 512
        valid_f0 = f0[np.isfinite(f0)]
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
            **({"song_profile": song_profile} if include_song_profile else {}),
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
    def process_audio(task_uuid: str, s3_file_url: str = None, s3_key: str = None) -> dict:
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
        # Presigned URL에는 서명이 들어 있으므로 로그에 남기지 않는다
        logger.info(f"[AnalysisService] '{task_uuid}' 분석 시작. S3 키: {s3_key or '(Presigned URL 사용)'}")
        
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
                bucket = os.getenv("AWS_S3_BUCKET")
                if s3_key and bucket:
                    # 워커의 자격 증명으로 직접 내려받는다. 대기열에서 오래 기다려도 만료되지 않는다.
                    s3_client.download_file(bucket, s3_key, local_file_path)
                elif s3_file_url:
                    import urllib.request
                    urllib.request.urlretrieve(s3_file_url, local_file_path)
                else:
                    raise RuntimeError("AWS_S3_BUCKET 환경 변수가 없고 Presigned URL도 전달되지 않았습니다")
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
            
            # 3. 분리 보컬로 음색(ECAPA)·음역을 재고 카탈로그 곡과 맞춥니다. 곡 프로필은 recommend_local.py export-db로 채웁니다.
            if not os.path.exists(vocals_path):
                logger.error(f"[AnalysisService] 보컬 파일을 찾을 수 없습니다: {vocals_path}")
                raise FileNotFoundError("보컬 분리 결과물(vocals.wav)이 생성되지 않았습니다.")

            from voice_match import SR as VOICE_SR, catalog_from_songs, result_fields, voice_features
            y, _ = librosa.load(vocals_path, sr=VOICE_SR)
            user_voice = voice_features(y)
            db = SessionLocal()
            try:
                catalog = catalog_from_songs(db.query(Song).filter(Song.analysis_profile.isnot(None)).all())
            finally:
                # DB 세션을 반드시 반환하여 커넥션 풀을 관리합니다.
                db.close()
            if not catalog:
                logger.warning("[AnalysisService] 음색 프로필이 있는 곡이 없습니다. 매칭을 건너뜁니다.")

            result = result_fields(user_voice, catalog)
            logger.info(f"[AnalysisService] 매칭 완료. Song ID: {result['matched_song_id']} | 유사도 {result['similarity_score']} | 후보 {len(catalog)}곡")
            return result
            
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

