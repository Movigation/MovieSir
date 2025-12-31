# backend/domains/registration/router.py

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from backend.domains.auth.utils import get_current_user
from backend.core.db import get_db
from backend.domains.user.models import User

from . import service
from .schema import (
    SignupConfirm,
    SignupConfirmResponse,
    SignupRequest,
    SignupRequestResponse,
)

router = APIRouter(tags=["registration"])


# =========================
# REG-01-01 회원가입 요청
# =========================
@router.post(
    "/auth/signup/request",
    response_model=SignupRequestResponse,
    summary="회원가입 요청 (인증 메일 발송)",
)
def request_signup(
    payload: SignupRequest,
    db: Session = Depends(get_db),
) -> SignupRequestResponse:  # 성공 시, 인증 만료 시간(expires_in)을 함께 반환한다.
    return service.request_signup(db, payload)


# =========================
# REG-01-01-1 이메일 인증 코드 검증
# =========================
@router.post(
    "/auth/signup/verify",
    summary="이메일 인증 코드 검증 (회원가입 전)",
)
def verify_signup_code(
    payload: SignupConfirm,
) -> dict:
    """인증 코드만 검증 (회원가입은 하지 않음)"""
    return service.verify_code(payload)


# =========================
# REG-01-02 이메일 인증 확인 및 회원가입 확정
# =========================
@router.post(
    "/auth/signup/confirm",
    response_model=SignupConfirmResponse,
    summary="이메일 인증 코드 확인 및 회원가입 확정",
)
def confirm_signup(
    payload: SignupConfirm,
    response: Response,  # ✅ Response 추가 (쿠키 설정용)
    db: Session = Depends(get_db),
) -> SignupConfirmResponse:
    return service.confirm_signup(db, payload, response)



