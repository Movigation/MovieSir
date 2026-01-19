# AI Service API v2 - GPU Server
# deploy trigger: 2026-01-13
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
import os
import numpy as np

from inference.recommendation_model import HybridRecommender


def convert_numpy_types(obj: Any) -> Any:
    """numpy 타입을 Python 네이티브 타입으로 변환"""
    if isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {k: convert_numpy_types(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    return obj


app = FastAPI(title="MovieSir AI Service")

# 모델 로드 (서버 시작 시 한 번만)
recommender = None


@app.on_event("startup")
async def load_model():
    global recommender
    import asyncio

    db_config = {
        'host': os.getenv("DATABASE_HOST", "localhost"),
        'port': int(os.getenv("DATABASE_PORT", 5432)),
        'database': os.getenv("DATABASE_NAME", "moviesir"),
        'user': os.getenv("DATABASE_USER", "movigation"),
        'password': os.getenv("DATABASE_PASSWORD", "")
    }

    # DB 연결 재시도 (최대 30초 대기)
    max_retries = 10
    retry_delay = 3  # 초

    for attempt in range(1, max_retries + 1):
        try:
            recommender = HybridRecommender(
                db_config=db_config,
                lightgcn_model_path="training/lightgcn_model/best_model.pt",
                lightgcn_data_path="training/lightgcn_data"
            )
            print("✅ AI Model loaded successfully")
            return
        except Exception as e:
            if attempt < max_retries:
                print(f"⏳ DB connection failed (attempt {attempt}/{max_retries}), retrying in {retry_delay}s...")
                await asyncio.sleep(retry_delay)
            else:
                print(f"❌ Failed to load AI model after {max_retries} attempts: {e}")
                import traceback
                traceback.print_exc()
                raise e


@app.get("/")
def health():
    return {"message": "ok", "service": "ai", "version": "final"}


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "model_loaded": recommender is not None,
        "version": "final"
    }


# ==================== Request/Response Models ====================

class RecommendRequest(BaseModel):
    user_movie_ids: List[int]
    available_time: int = 180
    preferred_genres: Optional[List[str]] = None
    preferred_otts: Optional[List[str]] = None
    allow_adult: bool = False
    excluded_ids_a: Optional[List[int]] = None  # Track A 제외 (같은 장르 이전 추천)
    excluded_ids_b: Optional[List[int]] = None  # Track B 제외 (전체 이전 추천)
    negative_movie_ids: Optional[List[int]] = None  # 부정 피드백 영화 (유사도 페널티)


class RecommendSingleRequest(BaseModel):
    user_movie_ids: List[int]
    target_runtime: int
    excluded_ids: List[int]
    track: str = "a"
    preferred_genres: Optional[List[str]] = None
    preferred_otts: Optional[List[str]] = None
    allow_adult: bool = False
    negative_movie_ids: Optional[List[int]] = None  # NEW


class MovieInfo(BaseModel):
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


class TrackResult(BaseModel):
    label: str
    movies: List[Dict[str, Any]]
    total_runtime: int


class RecommendResponse(BaseModel):
    track_a: TrackResult
    track_b: TrackResult
    elapsed_time: float


# ==================== Endpoints ====================

@app.post("/recommend", response_model=RecommendResponse)
def recommend(request: RecommendRequest):
    """
    영화 추천 - 시간 맞춤 조합 반환

    - Track A: 장르 + OTT 필터, SBERT 0.7 + LightGCN 0.3
    - Track B: 장르 확장, SBERT 0.4 + LightGCN 0.6
    - 총 런타임: 입력 시간의 90%~100%
    """
    if recommender is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        result = recommender.recommend(
            user_movie_ids=request.user_movie_ids,
            available_time=request.available_time,
            preferred_genres=request.preferred_genres,
            preferred_otts=request.preferred_otts,
            allow_adult=request.allow_adult,
            excluded_ids_a=request.excluded_ids_a or [],
            excluded_ids_b=request.excluded_ids_b or [],
            negative_movie_ids=request.negative_movie_ids or []  # NEW
        )

        # numpy 타입 변환
        result = convert_numpy_types(result)

        return RecommendResponse(
            track_a=TrackResult(
                label=result['track_a']['label'],
                movies=result['track_a']['movies'],
                total_runtime=result['track_a']['total_runtime']
            ),
            track_b=TrackResult(
                label=result['track_b']['label'],
                movies=result['track_b']['movies'],
                total_runtime=result['track_b']['total_runtime']
            ),
            elapsed_time=result.get('elapsed_time', 0)
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/recommend_single")
def recommend_single(request: RecommendSingleRequest):
    """
    개별 영화 재추천 - 단일 영화 반환

    - 기존 영화 교체용
    - 런타임: 대상 영화의 90%~100%
    """
    if recommender is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        result = recommender.recommend_single(
            user_movie_ids=request.user_movie_ids,
            target_runtime=request.target_runtime,
            excluded_ids=request.excluded_ids,
            track=request.track,
            preferred_genres=request.preferred_genres,
            preferred_otts=request.preferred_otts,
            allow_adult=request.allow_adult,
            negative_movie_ids=request.negative_movie_ids or []  # NEW
        )

        if result:
            return convert_numpy_types(result)
        else:
            return None

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
