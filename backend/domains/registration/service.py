# backend/domains/registration/service.py

from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import delete
from sqlalchemy.orm import Session

from backend.domains.auth.utils import create_access_token  # JWT 발급 함수
from backend.domains.user.models import User, UserOnboardingAnswer, UserOttMap
from .mail import (
    generate_signup_code,
    send_signup_code_email,
)
from backend.utils.password import hash_password
from backend.utils.redis import get_redis_client

from .schema import (
    SignupConfirm,
    SignupConfirmResponse,
    SignupRequest,
    SignupRequestResponse,
)

# ========================================
# 설정 값
# ========================================
SIGNUP_CODE_TTL = 600  # 10분 (초 단위)
SIGNUP_REDIS_KEY = "signup:{email}"


def _redis_key(email: str) -> str:
    """Redis Key 생성"""
    return SIGNUP_REDIS_KEY.format(email=email)


# ========================================
# REG-01-01 회원가입 요청
# ========================================
def request_signup(
    db: Session, payload: SignupRequest
) -> SignupRequestResponse:  # 이메일 중복 체크, 인증코드 생성 후 발송까지

    # 이미 가입된 이메일인지 체크
    email_exists = db.query(User).filter(User.email == payload.email).first()
    if email_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 가입된 이메일입니다.",
        )

    # 닉네임 중복 체크 추가
    nickname_exists = db.query(User).filter(User.nickname == payload.nickname).first()
    if nickname_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 사용 중인 닉네임입니다.",
        )

    # 인증 코드 생성 (6자리 숫자)
    code = generate_signup_code()

    # Redis 저장
    redis = get_redis_client()
    key = _redis_key(payload.email)

    print(f"[DEBUG] Saving to Redis key: '{key}'")
    print(f"[DEBUG] Code to save: '{code}'")

    redis.hset(
        key,
        mapping={  # type: ignore[arg-type]
            "email": payload.email,
            "password": hash_password(payload.password),
            "nickname": payload.nickname,
            "code": code,
        },
    )
    redis.expire(key, SIGNUP_CODE_TTL)

    # 확인
    saved_data = redis.hgetall(key)
    print(f"[DEBUG] Saved data in Redis: {saved_data}")

    # 메일 발송 (SMTP 환경변수 없으면 콘솔에만 출력)
    send_signup_code_email(payload.email, code)

    return SignupRequestResponse(email=payload.email, expires_in=SIGNUP_CODE_TTL)


# ========================================
# REG-01-01-1 이메일 인증 코드 검증 (회원가입 전)
# ========================================
def verify_code(payload: SignupConfirm) -> dict:
    """
    인증 코드만 검증 (회원가입은 하지 않음)
    프론트엔드에서 "인증 확인" 버튼 클릭 시 호출
    """
    redis = get_redis_client()
    key = _redis_key(payload.email)

    data = redis.hgetall(key)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="인증 정보가 만료되었거나 존재하지 않습니다.",
        )

    stored_code = data.get("code", "")

    # 디버깅 로그
    print(f"[DEBUG] Redis stored code: '{stored_code}'")
    print(f"[DEBUG] User input code: '{payload.code}'")
    print(f"[DEBUG] Codes match: {stored_code == payload.code}")

    if stored_code != payload.code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="인증 코드가 올바르지 않습니다.",
        )

    # 인증 성공
    return {"valid": True, "message": "인증되었습니다"}


# ========================================
# REG-01-02 이메일 인증 후 실제 유저 생성
# ========================================
def confirm_signup(
    db: Session, payload: SignupConfirm, response
) -> SignupConfirmResponse:  # 인증코드 확인하고 가입 승인, 토큰은 쿠키로 발급

    import os  # 환경변수 사용을 위해 import
    
    redis = get_redis_client()
    key = _redis_key(payload.email)

    data = redis.hgetall(key)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="인증 정보가 만료되었거나 존재하지 않습니다.",
        )

    stored_code = data.get("code", "")

    # 디버깅 로그
    print(f"[DEBUG] Redis stored code: '{stored_code}'")
    print(f"[DEBUG] User input code: '{payload.code}'")
    print(f"[DEBUG] Codes match: {stored_code == payload.code}")

    if stored_code != payload.code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="인증 코드가 올바르지 않습니다.",
        )

    # 중복 가입 방지 (이 타이밍에도 다시 체크)
    exists = db.query(User).filter(User.email == payload.email).first()
    if exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 가입된 이메일입니다.",
        )

    # 실제 유저 생성
    user = User(
        email=data["email"],
        password_hash=data["password"],  # password_hash로 저장
        nickname=data["nickname"],  # nickname 추가
        onboarding_completed_at=None,  # 온보딩 미완료 (NULL)
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Redis 데이터 삭제
    redis.delete(key)

    # JWT 발급
    token = create_access_token({"sub": str(user.user_id)})
    
    # 환경별 쿠키 보안 설정
    COOKIE_SECURE = os.getenv("ENVIRONMENT", "development") == "production"
    COOKIE_SAMESITE = "lax"
    
    # HttpOnly 쿠키에 토큰 설정
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=1800,  # 30분
        path="/",
    )
    
    response.set_cookie(
        key="refresh_token",
        value=token,  # 실제로는 refresh token을 따로 생성해야 함
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=604800,  # 7일
        path="/",
    )

    return SignupConfirmResponse(
        user_id=str(user.user_id),
        email=user.email,
        nickname=user.nickname,
        onboarding_completed=user.onboarding_completed_at is not None,
    )



