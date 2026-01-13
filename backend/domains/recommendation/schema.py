# backend/domains/recommendation/schema.py

from pydantic import BaseModel
from typing import List, Optional
from datetime import date


# ==================== Request ====================

class RecommendationRequest(BaseModel):
    """초기 추천 요청"""
    runtime_limit: int = 120
    genres: List[str] = []
    exclude_adult: bool = True
    excluded_ids: List[int] = []  # 제외할 영화 ID (이전 추천 영화 등)


class ReRecommendRequest(BaseModel):
    """개별 영화 재추천 요청"""
    target_runtime: int  # 교체할 영화의 런타임
    excluded_ids: List[int]  # 이미 추천된 영화 ID 리스트
    track: str = "a"  # "a" 또는 "b"
    genres: List[str] = []
    exclude_adult: bool = True


class ClickLogRequest(BaseModel):
    provider_id: int


# ==================== Response - Movie Info ====================

class MovieInfo(BaseModel):
    """기본 영화 정보"""
    movie_id: int
    tmdb_id: int
    title: str
    overview: Optional[str] = None
    poster_path: Optional[str] = None
    vote_average: Optional[float] = None
    vote_count: Optional[int] = None
    runtime: Optional[int] = None
    genres: Optional[List[str]] = None
    adult: bool
    popularity: Optional[float] = None
    release_date: Optional[date] = None

    class Config:
        from_attributes = True


class RecommendedMovie(BaseModel):
    """추천된 영화 (AI 응답용)"""
    movie_id: int
    tmdb_id: Optional[int] = None
    title: str
    runtime: int
    genres: List[str] = []
    vote_average: float = 0
    vote_count: int = 0
    overview: str = ""
    release_date: str = ""
    poster_path: Optional[str] = None
    score: Optional[float] = None


# ==================== Response - Track ====================

class TrackResult(BaseModel):
    """트랙별 추천 결과"""
    label: str
    movies: List[RecommendedMovie]
    total_runtime: int


class RecommendationResponseV2(BaseModel):
    """새로운 추천 응답 (v2)"""
    track_a: TrackResult
    track_b: TrackResult
    elapsed_time: Optional[float] = None


class ReRecommendResponse(BaseModel):
    """개별 재추천 응답"""
    movie: Optional[RecommendedMovie] = None
    success: bool = True
    message: str = ""


# ==================== Response - Legacy (하위 호환) ====================

class RecommendationResponse(BaseModel):
    """기존 추천 응답 (하위 호환용)"""
    results: List[MovieInfo]


# ==================== Response - Movie Detail ====================

class OttInfo(BaseModel):
    provider_id: int
    provider_name: str
    url: Optional[str] = None
    payment_type: Optional[str] = "SUBSCRIPTION"


class MovieDetailResponse(BaseModel):
    info: MovieInfo
    otts: List[OttInfo]
    tag_genome: Optional[dict] = None
