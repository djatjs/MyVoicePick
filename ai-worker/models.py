from sqlalchemy import Column, BigInteger, String, DateTime, Float, Text
from database import Base

class AnalysisTask(Base):
    """
    MySQL의 `analysis_tasks` 테이블과 매핑되는 SQLAlchemy 모델입니다.
    Spring Boot의 엔티티와 동일한 구조를 가집니다.
    """
    __tablename__ = "analysis_tasks"

    id = Column(BigInteger, primary_key=True, index=True)
    task_uuid = Column(String(255), unique=True, nullable=False)
    user_id = Column(BigInteger, nullable=False)
    s3_file_url = Column(String(255), nullable=False)
    
    # Enum 대신 String으로 처리 (파이썬에서 처리하기 단순화)
    # 가능한 값: "PENDING", "PROCESSING", "COMPLETED", "FAILED"
    status = Column(String(50), nullable=False)
    
    matched_song_id = Column(BigInteger, nullable=True)
    created_at = Column(DateTime, nullable=False)

class Song(Base):
    """
    실제 DB의 `songs` 테이블과 매핑되는 모델. (테이블명 및 구조 가정)
    """
    __tablename__ = "songs"

    id = Column(BigInteger, primary_key=True, index=True)
    pitch = Column(Float, nullable=True)
    mfcc_vector = Column(Text, nullable=True)
