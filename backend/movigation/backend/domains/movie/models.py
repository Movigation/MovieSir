from sqlalchemy import Boolean, Column, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector  # [필수] pip install pgvector

from backend.core.db import Base

class Movie(Base):
    """
    movies 테이블
    - 온보딩 설문 후보 + 추천 시스템 메타데이터 통합
    """
    __tablename__ = "movies"

    movie_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    tmdb_id = Column(Integer, nullable=False, unique=True, index=True)
    title = Column(String, nullable=False)
    
    # [Set A 추가] 영화 상세 정보 (추천 결과 화면용)
    overview = Column(Text, nullable=True)
    poster_path = Column(String, nullable=True)
    vote_average = Column(Float, nullable=True)
    
    # [Set A 변경] 추천 필터링을 위해 ARRAY 타입 사용 (기존 String -> ARRAY)
    # 예: ['Action', 'Comedy']
    genres = Column(ARRAY(String), nullable=True)
    
    runtime = Column(Integer, nullable=True)
    adult = Column(Boolean, nullable=False, server_default="false")
    popularity = Column(Float, nullable=True)
    tag_genome = Column(JSONB, nullable=True)

    # === Relationships ===
    
    # [Set B] 온보딩 설문 답변 관계
    onboarding_answers = relationship(
        "UserOnboardingAnswer",
        back_populates="movie",
        cascade="all, delete-orphan",
    )
    
    # [Common] OTT 매핑 관계
    ott_mappings = relationship(
        "MovieOttMap",
        back_populates="movie",
        cascade="all, delete-orphan",
    )

    # [Set A] 추천 시스템용 벡터 (1:1 관계)
    vectors = relationship(
        "MovieVector", 
        back_populates="movie", 
        uselist=False,
        cascade="all, delete-orphan"
    )


class MovieVector(Base):
    """
    [Set A New] movie_vectors 테이블
    - AI 모델이 생성한 영화 벡터 저장 (pgvector)
    """
    __tablename__ = "movie_vectors"

    movie_id = Column(Integer, ForeignKey("movies.movie_id", ondelete="CASCADE"), primary_key=True)
    embedding = Column(Vector(768))  # 모델 차원수에 맞춰 설정 (예: 768)

    movie = relationship("Movie", back_populates="vectors")


class OttProvider(Base):
    """
    ott_providers 테이블
    """
    __tablename__ = "ott_providers"

    provider_id = Column(Integer, primary_key=True, autoincrement=True)
    provider_name = Column(String, nullable=False)
    
    # [Set B] 로고 경로 (프론트엔드 표시용)
    logo_path = Column(String, nullable=True)

    # [Set B] 유저가 구독 중인 OTT
    user_mappings = relationship(
        "UserOttMap",
        back_populates="provider",
        cascade="all, delete-orphan",
    )
    
    # [Common] 영화별 제공 OTT
    movie_mappings = relationship(
        "MovieOttMap",
        back_populates="provider",
        cascade="all, delete-orphan",
    )


class MovieOttMap(Base):
    """
    movie_ott_map 테이블 (N:N 매핑)
    """
    __tablename__ = "movie_ott_map"

    movie_id = Column(
        Integer,
        ForeignKey("movies.movie_id", ondelete="CASCADE"),
        primary_key=True,
    )
    provider_id = Column(
        Integer,
        ForeignKey("ott_providers.provider_id", ondelete="CASCADE"),
        primary_key=True,
    )
    link_url = Column(String, nullable=True)

    movie = relationship("Movie", back_populates="ott_mappings")
    provider = relationship("OttProvider", back_populates="movie_mappings")