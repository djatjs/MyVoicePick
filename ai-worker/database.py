import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# 환경 변수에서 DATABASE_URL 가져오기
# MySQL 연결 문자열 (예: mysql+pymysql://root:password@localhost:3306/dbname)
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "mysql+pymysql://root:1234@localhost:3306/myvoicepick"
)

# SQLAlchemy 엔진 생성
# pool_pre_ping=True: 연결 풀에서 연결을 가져올 때 연결이 유효한지 확인하여 끊어진 연결 문제 방지
engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)

# 데이터베이스 세션 팩토리 생성
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# SQLAlchemy 모델의 기본 클래스
Base = declarative_base()

# DB 세션 의존성 주입을 위한 제너레이터 함수
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
