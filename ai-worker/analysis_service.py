import os
import time
import logging
import boto3
from urllib.parse import urlparse
import re

# 로거 설정
logger = logging.getLogger(__name__)

# S3 클라이언트 초기화 (boto3는 기본적으로 환경 변수에서 자격 증명을 읽어옵니다)
s3_client = boto3.client('s3')

class AnalysisService:
    """
    실제 AI 분석 (보컬 분리, 특징 추출 등) 로직을 담당하는 서비스 클래스.
    현재는 Mock(가짜) 로직으로 동작합니다.
    """

    @staticmethod
    def process_audio(task_uuid: str, s3_file_url: str) -> int:
        """
        오디오 파일을 분석하고 매칭된 곡의 ID를 반환합니다.
        
        Args:
            task_uuid (str): 작업 고유 식별자
            s3_file_url (str): 다운로드할 오디오 파일의 S3 URL
            
        Returns:
            int: 매칭된 곡의 ID (matched_song_id)
            
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
            
            # 2. 보컬 분리 (Mock)
            logger.info(f"[AnalysisService] 보컬 분리 진행 중...")
            time.sleep(2) # 보컬 분리 시간 시뮬레이션
            
            # 3. 오디오 특징 추출 및 유사도 비교 (Mock)
            logger.info(f"[AnalysisService] 특징 추출 및 유사도 비교 중...")
            time.sleep(1) # 분석 시간 시뮬레이션
            
            # 4. 완료: 더미 데이터로 1번 곡이 매칭되었다고 가정
            matched_song_id = 1
            logger.info(f"[AnalysisService] 분석 완료. 매칭된 곡 ID: {matched_song_id}")
            
            return matched_song_id
            
        except Exception as e:
            logger.error(f"[AnalysisService] '{task_uuid}' 분석 중 오류 발생: {e}")
            raise e # 상위 워커에서 처리할 수 있도록 에러를 다시 던집니다.
            
        finally:
            # 작업이 끝난 후 (성공/실패 무관) 로컬 임시 파일 즉시 삭제
            if local_file_path and os.path.exists(local_file_path):
                try:
                    os.remove(local_file_path)
                    logger.info(f"[AnalysisService] 로컬 임시 파일 삭제 완료: {local_file_path}")
                except Exception as cleanup_error:
                    logger.error(f"[AnalysisService] 파일 삭제 중 오류 발생: {cleanup_error}")

