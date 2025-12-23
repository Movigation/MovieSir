# backend/domains/user/models.py

from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from backend.core.db import Base


class User(Base):

    __tablename__ = "users"

    user_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,  # 새 회원 생성 시 UUID 자동 발급
    )
    email = Column(
        String,
        nullable=False,
        unique=True,  # 이메일 중복 가입 방지
        index=True,
    )
    password_hash = Column(
        String,
        nullable=False,  # 해시된 비밀번호 저장
    )
    nickname = Column(
        String(30),
        nullable=False,
    )
    onboarding_completed_at = Column(
        DateTime,
        nullable=True,  # NULL이면 온보딩 미완료, 값이 있으면 완료
    )
    deleted_at = Column(
        DateTime,
        nullable=True,  # 탈퇴 안 했으면 NULL
    )
    
    # [Level 1 로그아웃 구현용]
    refresh_token = Column(String, nullable=True)

    # [ERD 추가]
    role = Column(String, default="USER")
    is_email_verified = Column(Boolean, default=False)
    profile_image_url = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # === REG 도메인에서 쓰는 관계들 ===
    ott_subscriptions = relationship(
        "UserOttMap",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    onboarding_answers = relationship(
        "UserOnboardingAnswer",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class UserOttMap(Base):

    __tablename__ = "user_ott_map"

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        primary_key=True,
    )
    provider_id = Column(
        ForeignKey("ott_providers.provider_id", ondelete="CASCADE"),
        primary_key=True,
    )

    user = relationship("User", back_populates="ott_subscriptions")
    provider = relationship("OttProvider", back_populates="user_mappings")


class UserOnboardingAnswer(Base):

    __tablename__ = "user_onboarding_answers"

    from sqlalchemy import Integer
    
    # [ERD 일치 수정] SERIAL id PK 추가
    id = Column(Integer, primary_key=True, autoincrement=True)

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    movie_id = Column(
        ForeignKey("movies.movie_id", ondelete="CASCADE"),
        nullable=False,
    )

    user = relationship("User", back_populates="onboarding_answers")
    movie = relationship("Movie", back_populates="onboarding_answers")


class UserVector(Base):
    """
    user_vectors 테이블
    - 사용자 임베딩 벡터 저장 (pgvector)
    """
    __tablename__ = "user_vectors"

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        primary_key=True,
    )
    embedding = Column(Vector(1024))  # SQL 스키마와 일치 (1024차원)
    updated_at = Column(DateTime, nullable=True)
