# backend/domains/registration/router.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.domains.auth.utils import get_current_user
from backend.core.db import get_db
from backend.domains.user.models import User

from . import service
from .schema import (
    OnboardingCompleteResponse,
    OnboardingOTTRequest,
    OnboardingSurveyRequest,
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
    db: Session = Depends(get_db),
) -> SignupConfirmResponse:
    return service.confirm_signup(db, payload)


# =========================
# REG-03-01 온보딩 – OTT 선택
# =========================
@router.post(
    "/onboarding/ott",
    summary="온보딩: 구독 중인 OTT 플랫폼 선택",
)
def select_ott(
    payload: OnboardingOTTRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    service.save_user_ott(db, current_user, payload)
    return {"status": "ok"}


# =========================
# REG-04-01 온보딩 – 취향 설문
# =========================
@router.post(
    "/onboarding/survey",
    summary="온보딩: 영화 포스터 설문 응답 저장",
)
def survey(
    payload: OnboardingSurveyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    service.save_onboarding_answers(db, current_user, payload)
    return {"status": "ok"}


# =========================
# REG-05-01 온보딩 완료
# =========================
@router.post(
    "/onboarding/complete",
    response_model=OnboardingCompleteResponse,
    summary="온보딩 완료 처리",
)
def complete(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OnboardingCompleteResponse:
    return service.complete_onboarding(db, current_user)


# =========================
# REG-05-02 온보딩 스킵
# =========================
@router.post(
    "/onboarding/skip",
    response_model=OnboardingCompleteResponse,
    summary="온보딩 스킵 처리",
)
def skip(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OnboardingCompleteResponse:
    return service.skip_onboarding(db, current_user)
