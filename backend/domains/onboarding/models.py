from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from backend.core.db import Base


class OnboardingCandidate(Base):
    __tablename__ = "onboarding_candidates"
    __table_args__ = {"schema": "b2c"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    movie_id = Column(Integer, ForeignKey("movies.movie_id"), nullable=False)
    mood_tag = Column(String, nullable=False)

    # [ERD 추가]
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
