from datetime import datetime
import random
from sqlalchemy import delete
from sqlalchemy.orm import Session

from backend.domains.user.models import User, UserOnboardingAnswer, UserOttMap
from backend.domains.movie.models import Movie
from .models import OnboardingCandidate
from .schema import (
    OnboardingCompleteResponse,
    OnboardingOTTRequest,
    OnboardingSurveyRequest,
    SurveyMovieItem,
    SurveyMoviesResponse,
)

# ========================================
# OB-01-01 OTT 선택
# ========================================
def save_user_ott(
    db: Session, user: User, payload: OnboardingOTTRequest
) -> None:  # 선택한 ott 저장

    # 기존 데이터 삭제 후 다시 저장 (idempotent)
    db.execute(delete(UserOttMap).where(UserOttMap.user_id == user.user_id))

    for provider_id in payload.provider_ids:
        db.add(UserOttMap(user_id=user.user_id, provider_id=provider_id))

    db.commit()


# ========================================
# OB-02-01 초기 취향 조사
# ========================================
def save_onboarding_answers(
    db: Session,
    user: User,
    payload: OnboardingSurveyRequest,
) -> None:  # 선택한 영화 저장

    # 기존 기록 삭제 후 새로 저장
    db.execute(
        delete(UserOnboardingAnswer).where(UserOnboardingAnswer.user_id == user.user_id)
    )

    for movie_id in payload.movie_ids:
        db.add(
            UserOnboardingAnswer(
                user_id=user.user_id,
                movie_id=movie_id,
                # created_at은 DB에서 자동 생성
            )
        )

    # 설문 완료 시 온보딩 완료 처리
    user.onboarding_completed_at = datetime.utcnow()
    db.add(user)
    db.commit()


# ========================================
# OB-03-01 온보딩 완료 처리
# ========================================
def complete_onboarding(
    db: Session, user: User
) -> OnboardingCompleteResponse:  # 온보딩 완료
    user.onboarding_completed_at = datetime.utcnow()
    db.add(user)
    db.commit()
    db.refresh(user)

    return OnboardingCompleteResponse(
        user_id=str(user.user_id),
        onboarding_completed=user.onboarding_completed_at is not None,
    )


# ========================================
# OB-02-02 취향 조사 건너뛰기
# ========================================
def skip_onboarding(
    db: Session, user: User
) -> OnboardingCompleteResponse:  # 온보딩 스킵으로 완료
    # 스킵 시에도 온보딩 완료 처리 (메인 진입 허용)
    user.onboarding_completed_at = datetime.utcnow()
    db.add(user)
    db.commit()
    db.refresh(user)

    return OnboardingCompleteResponse(
        user_id=str(user.user_id),
        onboarding_completed=user.onboarding_completed_at is not None,
    )


def get_onboarding_survey_movies(db: Session) -> SurveyMoviesResponse:
    """
    키워드별로 랜덤 영화 1개씩 선택 (총 10개)
    "불멸의 명작" + "평론가 추천 / 예술" 통합
    """
    # 10개 키워드 정의 (통합된 키워드 포함)
    keywords = [
        "가벼운 재미 / 코미디",
        "설레는 로맨스",
        "환상적인 모험",
        "동심의 세계 / 애니메이션",
        ["불멸의 명작", "평론가 추천 / 예술"],  # 통합 키워드
        "감성 인디 / 인간관계",
        "압도적 스케일 / 히어로",
        "SF / 우주 / 미래",
        "등골이 오싹한 / 공포",
        "짜릿한 액션 / 범죄",
    ]

    result_movies = []

    for keyword in keywords:
        # 통합 키워드 처리
        if isinstance(keyword, list):
            # 두 키워드 모두에서 후보 가져오기
            candidates = (
                db.query(OnboardingCandidate, Movie)
                .join(Movie, OnboardingCandidate.movie_id == Movie.movie_id)
                .filter(OnboardingCandidate.mood_tag.in_(keyword))
                .all()
            )
            mood_tag = " / ".join(keyword)  # 표시용 통합 태그
        else:
            # 단일 키워드
            candidates = (
                db.query(OnboardingCandidate, Movie)
                .join(Movie, OnboardingCandidate.movie_id == Movie.movie_id)
                .filter(OnboardingCandidate.mood_tag == keyword)
                .all()
            )
            mood_tag = keyword

        if not candidates:
            # 해당 키워드에 후보가 없으면 건너뛰기
            continue

        # 랜덤으로 1개 선택
        selected_candidate, selected_movie = random.choice(candidates)

        result_movies.append(
            SurveyMovieItem(
                movie_id=selected_movie.movie_id,
                mood_tag=mood_tag,
                title=selected_movie.title,
                poster_path=selected_movie.poster_path,
            )
        )

    return SurveyMoviesResponse(movies=result_movies)
