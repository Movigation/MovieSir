# backend/domains/recommendation/models.py

from sqlalchemy import Column, Integer, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from backend.core.db import Base

class MovieLog(Base):
    __tablename__ = "movie_logs"
    user_id = Column(UUID(as_uuid=True), primary_key=True)
    movie_id = Column(Integer, primary_key=True)
    watched_at = Column(TIMESTAMP, server_default=func.now())

class MovieClick(Base):
    __tablename__ = "movie_clicks"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True))
    movie_id = Column(Integer)
    clicked_at = Column(TIMESTAMP, server_default=func.now())

class RecommendationSession(Base):
    __tablename__ = "recommendation_sessions"
    
    from sqlalchemy import String, JSON
    
    session_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), nullable=True)
    req_genre = Column(String, nullable=True)
    req_runtime_max = Column(Integer, nullable=True)
    recommended_movie_ids = Column(JSON, nullable=True)
    feedback_details = Column(JSON, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())