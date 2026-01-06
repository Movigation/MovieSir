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


class MovieClick(Base):
    __tablename__ = "movie_clicks"
    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True))
    movie_id = Column(Integer)
    provider_id = Column(Integer)  # SQL 스키마 추가
    clicked_at = Column(TIMESTAMP, server_default=func.now())


class RecommendationSession(Base):
    __tablename__ = "recommendation_sessions"

    session_id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), nullable=True)
    req_genres = Column(ARRAY(String), nullable=True)  # SQL 스키마: varchar[]
    req_runtime_max = Column(Integer, nullable=True)
    recommended_movie_ids = Column(ARRAY(Integer), nullable=True)  # SQL 스키마: integer[]
    feedback_details = Column(JSONB, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())