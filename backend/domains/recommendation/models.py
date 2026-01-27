# backend/domains/recommendation/models.py

from sqlalchemy import Column, Integer, TIMESTAMP, ForeignKey, BigInteger
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy.sql import func
from sqlalchemy import String
from backend.core.db import Base


class MovieLog(Base):
    __tablename__ = "movie_logs"
    user_id = Column(UUID(as_uuid=True), primary_key=True)
    movie_id = Column(Integer, primary_key=True)
    watched_at = Column(TIMESTAMP, server_default=func.now())


class UserMovieFeedback(Base):
    """
    사용자 영화 피드백 통합 테이블
    - OTT 클릭: feedback_type='ott_click:{provider_id}' (예: 'ott_click:8')
    - 만족도 조사: feedback_type='satisfaction_positive' or 'satisfaction_negative'
    - 재추천: feedback_type='re_recommendation'
    """
    __tablename__ = "user_movie_feedback"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    movie_id = Column(Integer, nullable=False)
    session_id = Column(BigInteger, nullable=True)  # 추천 세션 ID (만족도 조사에서 사용)
    feedback_type = Column(String(30), nullable=False)  # 'ott_click:8', 'satisfaction_positive', 'satisfaction_negative', 're_recommendation'
    created_at = Column(TIMESTAMP, server_default=func.now())


# 하위 호환성을 위한 별칭
MovieClick = UserMovieFeedback


class RecommendationSession(Base):
    __tablename__ = "recommendation_sessions"

    session_id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), nullable=True)
    req_genres = Column(ARRAY(String), nullable=True)  # SQL 스키마: varchar[]
    req_runtime_max = Column(Integer, nullable=True)
    recommended_movie_ids = Column(ARRAY(Integer), nullable=True)  # SQL 스키마: integer[]
    feedback_details = Column(JSONB, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())