"""
B2B 도메인 SQLAlchemy 모델
- b2b 스키마의 테이블들과 매핑
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, BigInteger, String, Boolean, Date,
    DateTime, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from backend.core.db import Base


class Company(Base):
    """기업 고객 테이블"""
    __tablename__ = "companies"
    __table_args__ = {"schema": "b2b"}

    company_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    manager_email = Column(String(100), unique=True)
    password_hash = Column(String(255))
    plan_type = Column(String(20), default="BASIC")  # BASIC, PRO, ENTERPRISE
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)  # 슈퍼 어드민 여부
    oauth_provider = Column(String(20))  # google, github (소셜 로그인 사용자)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    api_keys = relationship("ApiKey", back_populates="company", cascade="all, delete-orphan")
    content_rules = relationship("ContentRule", back_populates="company", cascade="all, delete-orphan")


class ApiKey(Base):
    """API 키 관리 테이블"""
    __tablename__ = "api_keys"
    __table_args__ = {"schema": "b2b"}

    key_id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("b2b.companies.company_id", ondelete="CASCADE"))
    access_key = Column(String(64), unique=True, nullable=False)  # 해시된 키
    key_name = Column(String(50))
    daily_limit = Column(Integer, default=1000)
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    company = relationship("Company", back_populates="api_keys")
    usage_logs = relationship("ApiUsage", back_populates="api_key", cascade="all, delete-orphan")
    api_logs = relationship("ApiLog", back_populates="api_key", cascade="all, delete-orphan")
    guest_sessions = relationship("GuestSession", back_populates="api_key", cascade="all, delete-orphan")


class ApiUsage(Base):
    """일별 사용량 집계 테이블"""
    __tablename__ = "api_usage"
    __table_args__ = {"schema": "b2b"}

    usage_id = Column(BigInteger, primary_key=True, autoincrement=True)
    key_id = Column(Integer, ForeignKey("b2b.api_keys.key_id", ondelete="CASCADE"))
    usage_date = Column(Date, default=datetime.utcnow)
    request_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)

    # Relationships
    api_key = relationship("ApiKey", back_populates="usage_logs")


class ApiLog(Base):
    """API 원천 로그 테이블"""
    __tablename__ = "api_logs"
    __table_args__ = {"schema": "b2b"}

    log_id = Column(BigInteger, primary_key=True, autoincrement=True)
    key_id = Column(Integer, ForeignKey("b2b.api_keys.key_id", ondelete="CASCADE"))
    endpoint = Column(String(100))
    status_code = Column(Integer)
    process_time_ms = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    api_key = relationship("ApiKey", back_populates="api_logs")


class ContentRule(Base):
    """브랜드 안전성 규칙 테이블"""
    __tablename__ = "content_rules"
    __table_args__ = {"schema": "b2b"}

    rule_id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("b2b.companies.company_id", ondelete="CASCADE"))
    filter_type = Column(String(20))  # KEYWORD, GENRE, ID
    filter_value = Column(String(100))
    description = Column(Text)

    # Relationships
    company = relationship("Company", back_populates="content_rules")


class GuestSession(Base):
    """게스트 세션 테이블"""
    __tablename__ = "guest_sessions"
    __table_args__ = {"schema": "b2b"}

    session_id = Column(String(36), primary_key=True)  # UUID
    key_id = Column(Integer, ForeignKey("b2b.api_keys.key_id", ondelete="CASCADE"))
    flight_time_minutes = Column(Integer)
    req_otts = Column(String(200))
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)

    # Relationships
    api_key = relationship("ApiKey", back_populates="guest_sessions")
