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
    SurveyMoviesResponse,
)

router = APIRouter(tags=["onboarding"])


# =========================
# OB-01-01 OTT 선택
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
# OB-02-01 초기 취향 조사
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


@router.get(
    "/onboarding/survey/movies",
    response_model=SurveyMoviesResponse,
    summary="온보딩 설문용 랜덤 영화 10개 조회",
)
def get_survey_movies(
    db: Session = Depends(get_db),
) -> SurveyMoviesResponse:
    """키워드별로 랜덤 영화 1개씩, 총 10개 반환"""
    return service.get_onboarding_survey_movies(db)


# Frontend 호환용 별칭 (GET /movies/onboarding)
@router.get(
    "/movies/onboarding",
    response_model=SurveyMoviesResponse,
    summary="온보딩 설문용 영화 조회 (별칭)",
)
def get_onboarding_movies_alias(
    limit: int = 10,
    db: Session = Depends(get_db),
) -> SurveyMoviesResponse:
    """Frontend 호환용 - /onboarding/survey/movies와 동일"""
    return service.get_onboarding_survey_movies(db)


# =========================
# OB-03-01 온보딩 완료 처리
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
# OB-02-02 취향 조사 건너뛰기
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
