import os
import json
import logging
import redis
from dotenv import load_dotenv

from database import SessionLocal
from models import AnalysisTask
from analysis_service import AnalysisService

# .env 파일 로드
load_dotenv()

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 환경 변수에서 Redis 설정 가져오기
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_QUEUE_NAME = os.getenv("REDIS_QUEUE_NAME", "voice_analysis_queue")

def process_queue_message(message_data: dict):
    """
    큐에서 꺼낸 메시지를 처리하고 DB 상태를 업데이트합니다.
    """
    task_uuid = message_data.get("taskId")
    s3_file_url = message_data.get("s3FileUrl")
    
    if not task_uuid or not s3_file_url:
        logger.error(f"잘못된 메시지 포맷입니다. 누락된 필드 확인: {message_data}")
        return

    # DB 세션 생성
    db = SessionLocal()
    
    try:
        # 1. DB에서 작업 조회 (레이스 컨디션 방어용 재시도 로직)
        #
        # [설계 의도]
        # Spring Boot가 DB 커밋 완료 후 Redis에 발행하지만,
        # 네트워크 지연이나 DB 복제 지연 등으로 인해
        # 파이썬이 조회 시점에 아직 레코드가 보이지 않는 경우가 있습니다.
        # 최대 3회, 0.5초 간격으로 재시도하여 이 타이밍 문제를 방어합니다.
        MAX_RETRIES = 3
        task = None

        for attempt in range(1, MAX_RETRIES + 1):
            task = db.query(AnalysisTask).filter(AnalysisTask.task_uuid == task_uuid).first()
            if task:
                break
            if attempt < MAX_RETRIES:
                logger.warning(
                    f"DB에서 작업을 찾지 못했습니다. "
                    f"{attempt}/{MAX_RETRIES}회 시도, 0.5초 후 재시도... taskUuid: {task_uuid}"
                )
                time.sleep(0.5)
                # 캐시된 세션 결과가 남아있을 수 있으므로 세션을 갱신합니다.
                db.expire_all()

        if not task:
            logger.error(
                f"{MAX_RETRIES}회 재시도 후에도 DB에서 작업을 찾을 수 없습니다. "
                f"taskUuid: {task_uuid}"
            )
            return

            
        # 2. 상태를 PROCESSING으로 변경
        logger.info(f"작업 시작. taskUuid: {task_uuid}")
        task.status = "PROCESSING"
        db.commit()
        
        # 3. AI 분석 서비스 호출
        result = AnalysisService.process_audio(task_uuid, s3_file_url)
        matched_song_id = result["matched_song_id"]
        voice_tags = result.get("voice_tags", [])
        similarity_score = result.get("similarity_score", 0)
        pitch_hz = result.get("pitch_hz", 0)
        recommend_reason = result.get("recommend_reason", "")
        vocal_persona = result.get("vocal_persona", "")
        vocal_stats = result.get("vocal_stats", {})

        # 4. 분석 성공 시: 상태를 COMPLETED로 변경 및 결과 업데이트
        task.status = "COMPLETED"
        task.matched_song_id = matched_song_id
        task.voice_tags = json.dumps(voice_tags, ensure_ascii=False)
        task.similarity_score = similarity_score
        task.pitch_hz = pitch_hz
        task.recommend_reason = recommend_reason
        task.vocal_persona = vocal_persona
        task.vocal_stats = json.dumps(vocal_stats, ensure_ascii=False)  # dict → JSON 문자열

        db.commit()
        logger.info(f"작업 완료. taskUuid: {task_uuid}, matchedSongId: {matched_song_id}, similarity: {similarity_score}%, persona: {vocal_persona}")
        
    except Exception as e:
        # 5. 분석 실패 시: 상태를 FAILED로 변경
        logger.error(f"작업 처리 중 에러 발생. taskUuid: {task_uuid}, 에러: {e}")
        db.rollback() # 이전 변경사항 롤백
        
        # 실패 상태로 다시 업데이트
        try:
            # 실패 처리를 위해 task 객체를 최신 상태로 가져옵니다.
            task = db.query(AnalysisTask).filter(AnalysisTask.task_uuid == task_uuid).first()
            if task:
                task.status = "FAILED"
                db.commit()
                logger.info(f"작업 실패 상태 업데이트 완료. taskUuid: {task_uuid}")
        except Exception as db_e:
            logger.error(f"작업 실패 상태 DB 업데이트 중 에러: {db_e}")
            
    finally:
        # DB 세션 자원 반환
        db.close()

def main():
    """
    메인 컨슈머 루프: Redis 큐에서 메시지를 대기하며 꺼내어 처리합니다.
    """
    logger.info("AI Worker가 시작되었습니다.")
    logger.info(f"Redis 연결 시도: {REDIS_HOST}:{REDIS_PORT}")
    
    try:
        # Redis 클라이언트 생성
        # decode_responses=True: 바이트(bytes) 대신 문자열(str)로 데이터를 반환받습니다.
        redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
        # 연결 테스트 (ping)
        redis_client.ping()
        logger.info("Redis 연결 성공.")
    except redis.ConnectionError as e:
        logger.error(f"Redis 서버에 연결할 수 없습니다: {e}")
        return

    logger.info(f"'{REDIS_QUEUE_NAME}' 큐를 구독하며 대기 중입니다...")
    
    # 무한 루프를 돌며 큐에서 작업을 대기(Polling)합니다.
    while True:
        try:
            # brpop: 리스트의 끝(오른쪽)에서 데이터를 꺼냅니다. 데이터가 없으면 들어올 때까지 대기합니다.
            # 반환값은 튜플 형태: (큐_이름, 데이터)
            result = redis_client.brpop(REDIS_QUEUE_NAME, timeout=0)
            
            if result:
                queue_name, message = result
                logger.info(f"메시지 수신됨: {message}")
                
                try:
                    # JSON 문자열을 파이썬 딕셔너리로 변환
                    message_data = json.loads(message)
                    # 메시지 처리 로직 호출
                    process_queue_message(message_data)
                except json.JSONDecodeError:
                    logger.error(f"JSON 파싱 실패. 잘못된 포맷의 메시지입니다: {message}")
                    
        except redis.ConnectionError:
            logger.error("Redis 서버와의 연결이 끊어졌습니다. 5초 후 재시도합니다.")
            import time
            time.sleep(5)
        except KeyboardInterrupt:
            # Ctrl+C 로 중단할 때 우아하게 종료
            logger.info("워커를 종료합니다.")
            break
        except Exception as e:
            logger.error(f"예상치 못한 에러 발생: {e}")
            import time
            time.sleep(1)

if __name__ == "__main__":
    main()
