# backend/domains/recommendation/schema.py

from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class RecommendationRequest(BaseModel):
    runtime_limit: int = 120
    genres: List[str] = []
    exclude_adult: bool = True

class ClickLogRequest(BaseModel):
    provider_id: int

class MovieInfo(BaseModel):
    movie_id: int
    tmdb_id: int
    title: str
    overview: Optional[str] = None
    poster_path: Optional[str] = None
    vote_average: Optional[float] = None
    runtime: Optional[int] = None
    genres: Optional[List[str]] = None
    adult: bool
    popularity: Optional[float] = None
    release_date: Optional[date] = None

    class Config:
        from_attributes = True

class OttInfo(BaseModel):
    provider_id: int
    provider_name: str
    url: Optional[str] = None

class MovieDetailResponse(BaseModel):
    info: MovieInfo
    otts: List[OttInfo]
    tag_genome: Optional[dict] = None

class RecommendationResponse(BaseModel):
    results: List[MovieInfo]