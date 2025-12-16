# backend/core/db.py

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """모든 ORM 모델이 상속할 공통 Base 클래스"""

    pass

# ======================================================
# DATABASE_URL
# ======================================================
# DATABASE_URL만 넣으면 됩니다
DATABASE_URL = os.getenv("DATABASE_URL", "")

if not DATABASE_URL:
    # DATABASE_URL이 없으면 에러 뜨게 해놨어요!
    raise RuntimeError(
        "DATABASE_URL 환경변수가 설정되지 않았습니다. "
        "테스트 환경에서 DB 연결을 위해 반드시 값이 필요합니다."
    )

# ======================================================
# SQLAlchemy 기본 세팅
# ======================================================
engine = create_engine(
    DATABASE_URL,
    echo=False,  # 에러뜨면 True로 바꿔서 sql 체크!
    future=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# ======================================================
# FastAPI에서 사용되는 get_db()
# ======================================================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ======================================================
# 초기 DB 테이블 생성 함수
# ======================================================
def init_db():  # 테스트 환경에서 최초 한 번만 실행.

    Base.metadata.create_all(bind=engine)
