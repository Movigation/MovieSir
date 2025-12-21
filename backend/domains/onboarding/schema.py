from typing import List, Union
from pydantic import BaseModel, Field


# =========================
# OB-01-01 OTT 선택
# =========================
class OnboardingOTTRequest(BaseModel):
    provider_ids: List[int]


# =========================
# OB-02-01 초기 취향 조사
# =========================
class SurveyMovieItem(BaseModel):
    movie_id: int
    mood_tag: str
    title: str
    poster_path: Union[str, None] = None


class SurveyMoviesResponse(BaseModel):
    movies: List[SurveyMovieItem]


class OnboardingSurveyRequest(BaseModel):
    movie_ids: List[int] = Field(min_length=1)


# =========================
# OB-03-01 / 02-02 온보딩 완료 / 스킵
# =========================
class OnboardingCompleteResponse(BaseModel):
    user_id: str
    onboarding_completed: bool
