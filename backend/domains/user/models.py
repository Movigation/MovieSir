# backend/domains/user/models.py

from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

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

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        primary_key=True,
    )
    movie_id = Column(
        ForeignKey("movies.movie_id", ondelete="CASCADE"),
        primary_key=True,
    )
    selected_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )

    user = relationship("User", back_populates="onboarding_answers")
    movie = relationship("Movie", back_populates="onboarding_answers")
