"""
B2B External API Router
- /v1/recommend: 영화 추천 API
- API Key 인증 + Rate Limiting
- 사용량 로깅
"""
import time
import httpx
import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime

from backend.core.db import get_db
from backend.core.rate_limit import get_remaining_quota
from .dependencies import verify_api_key
from .models import ApiKey, ApiLog, ApiUsage
from sqlalchemy import and_

router = APIRouter(prefix="/v1", tags=["External API"])

# AI 서비스 URL
AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://localhost:8001")


# ==================== Request/Response Schemas ====================

class RecommendRequest(BaseModel):
    """영화 추천 요청"""
    user_movie_ids: List[int]  # 사용자가 좋아하는 영화 ID 목록
    available_time: int = 180  # 시청 가능 시간 (분)
    preferred_genres: Optional[List[str]] = None  # 선호 장르
    preferred_otts: Optional[List[str]] = None  # 선호 OTT
    allow_adult: bool = False  # 성인 영화 허용
    excluded_ids_a: List[int] = []  # 트랙 A 제외할 영화 ID
    excluded_ids_b: List[int] = []  # 트랙 B 제외할 영화 ID
    negative_movie_ids: Optional[List[int]] = None  # 부정 피드백 영화 ID (optional)
    client_user_id: Optional[str] = None  # 클라이언트측 사용자 ID (추적용)


class MovieResult(BaseModel):
    """영화 결과"""
    movie_id: int
    tmdb_id: Optional[int] = None
    title: str
    runtime: int
    genres: List[str] = []
    poster_path: Optional[str] = None
    vote_average: float = 0
    score: Optional[float] = None


class TrackResult(BaseModel):
    """트랙 결과"""
    label: str
    movies: List[dict]
    total_runtime: int


class RecommendResponse(BaseModel):
    """추천 응답"""
    success: bool = True
    data: dict
    meta: dict


class ErrorResponse(BaseModel):
    """에러 응답"""
    success: bool = False
    error: dict


# ==================== Endpoints ====================

@router.post("/recommend", response_model=RecommendResponse)
async def external_recommend(
    request: RecommendRequest,
    api_key: ApiKey = Depends(verify_api_key),
    db: Session = Depends(get_db)
):
    """
    영화 추천 API

    - X-API-Key 헤더 필수
    - 일일 호출 제한 적용
    - 사용량 로깅

    Returns:
        track_a: 장르 맞춤 추천
        track_b: 다양성 추천
    """
    start_time = time.time()
    status_code = 200
    error_detail = None

    try:
        # AI 서비스 호출
        async with httpx.AsyncClient(timeout=30.0) as client:
            ai_response = await client.post(
                f"{AI_SERVICE_URL}/recommend",
                json={
                    "user_movie_ids": request.user_movie_ids,
                    "available_time": request.available_time,
                    "preferred_genres": request.preferred_genres,
                    "preferred_otts": request.preferred_otts,
                    "allow_adult": request.allow_adult,
                    "excluded_ids_a": request.excluded_ids_a,
                    "excluded_ids_b": request.excluded_ids_b,
                    "negative_movie_ids": request.negative_movie_ids or []  # Optional
                }
            )

        if ai_response.status_code != 200:
            status_code = 503
            error_detail = "AI service unavailable"
            raise HTTPException(
                status_code=503,
                detail={
                    "code": "AI_SERVICE_UNAVAILABLE",
                    "message": "AI recommendation service is temporarily unavailable"
                }
            )

        ai_result = ai_response.json()
        response_time_ms = int((time.time() - start_time) * 1000)

        # 남은 할당량 조회
        remaining = await get_remaining_quota(str(api_key.key_id), api_key.daily_limit)

        return RecommendResponse(
            success=True,
            data={
                "track_a": ai_result.get("track_a"),
                "track_b": ai_result.get("track_b"),
                "algorithm": "hybrid-v5"
            },
            meta={
                "latency_ms": response_time_ms,
                "remaining_quota": remaining - 1,  # 현재 호출 반영
                "daily_limit": api_key.daily_limit
            }
        )

    except httpx.TimeoutException:
        status_code = 504
        error_detail = "AI service timeout"
        raise HTTPException(
            status_code=504,
            detail={
                "code": "AI_SERVICE_TIMEOUT",
                "message": "AI service request timed out"
            }
        )

    except httpx.RequestError as e:
        status_code = 503
        error_detail = str(e)
        raise HTTPException(
            status_code=503,
            detail={
                "code": "AI_SERVICE_ERROR",
                "message": "Failed to connect to AI service"
            }
        )

    finally:
        # 사용량 로깅 (개별 로그)
        response_time_ms = int((time.time() - start_time) * 1000)
        log = ApiLog(
            key_id=api_key.key_id,
            endpoint="/v1/recommend",
            status_code=status_code,
            process_time_ms=response_time_ms,
            created_at=datetime.utcnow()
        )
        db.add(log)

        # 일별 집계 업데이트 (Dashboard용)
        today = datetime.utcnow().date()
        usage = db.query(ApiUsage).filter(
            and_(ApiUsage.key_id == api_key.key_id, ApiUsage.usage_date == today)
        ).first()

        if usage:
            usage.request_count = (usage.request_count or 0) + 1
            if status_code >= 400:
                usage.error_count = (usage.error_count or 0) + 1
        else:
            usage = ApiUsage(
                key_id=api_key.key_id,
                usage_date=today,
                request_count=1,
                error_count=1 if status_code >= 400 else 0
            )
            db.add(usage)

        db.commit()


class RecommendSingleRequest(BaseModel):
    """개별 영화 재추천 요청"""
    user_movie_ids: List[int]  # 사용자가 좋아하는 영화 ID 목록
    target_runtime: int  # 목표 런타임 (분)
    excluded_ids: List[int] = []  # 제외할 영화 ID
    track: str = "a"  # 트랙 (a 또는 b)
    preferred_genres: Optional[List[str]] = None
    preferred_otts: Optional[List[str]] = None
    allow_adult: bool = False
    negative_movie_ids: Optional[List[int]] = None  # 부정 피드백 영화 ID (optional)
    client_user_id: Optional[str] = None


class RecommendSingleResponse(BaseModel):
    """개별 영화 추천 응답"""
    success: bool = True
    data: Optional[dict] = None
    meta: dict


@router.post("/recommend_single", response_model=RecommendSingleResponse)
async def external_recommend_single(
    request: RecommendSingleRequest,
    api_key: ApiKey = Depends(verify_api_key),
    db: Session = Depends(get_db)
):
    """
    개별 영화 재추천 API

    - X-API-Key 헤더 필수
    - 일일 호출 제한 적용
    - 사용량 로깅

    Returns:
        단일 영화 정보 (movie_id, title, runtime, ...)
    """
    start_time = time.time()
    status_code = 200
    error_detail = None

    try:
        # AI 서비스 호출
        async with httpx.AsyncClient(timeout=30.0) as client:
            ai_response = await client.post(
                f"{AI_SERVICE_URL}/recommend_single",
                json={
                    "user_movie_ids": request.user_movie_ids,
                    "target_runtime": request.target_runtime,
                    "excluded_ids": request.excluded_ids,
                    "track": request.track,
                    "preferred_genres": request.preferred_genres,
                    "preferred_otts": request.preferred_otts,
                    "allow_adult": request.allow_adult,
                    "negative_movie_ids": request.negative_movie_ids or []  # Optional
                }
            )

        if ai_response.status_code != 200:
            status_code = 503
            error_detail = "AI service unavailable"
            raise HTTPException(
                status_code=503,
                detail={
                    "code": "AI_SERVICE_UNAVAILABLE",
                    "message": "AI recommendation service is temporarily unavailable"
                }
            )

        ai_result = ai_response.json()
        response_time_ms = int((time.time() - start_time) * 1000)

        # 남은 할당량 조회
        remaining = await get_remaining_quota(str(api_key.key_id), api_key.daily_limit)

        return RecommendSingleResponse(
            success=True,
            data=ai_result,
            meta={
                "latency_ms": response_time_ms,
                "remaining_quota": remaining - 1,
                "daily_limit": api_key.daily_limit
            }
        )

    except httpx.TimeoutException:
        status_code = 504
        error_detail = "AI service timeout"
        raise HTTPException(
            status_code=504,
            detail={
                "code": "AI_SERVICE_TIMEOUT",
                "message": "AI service request timed out"
            }
        )

    except httpx.RequestError as e:
        status_code = 503
        error_detail = str(e)
        raise HTTPException(
            status_code=503,
            detail={
                "code": "AI_SERVICE_ERROR",
                "message": "Failed to connect to AI service"
            }
        )

    finally:
        # 사용량 로깅 (개별 로그)
        response_time_ms = int((time.time() - start_time) * 1000)
        log = ApiLog(
            key_id=api_key.key_id,
            endpoint="/v1/recommend_single",
            status_code=status_code,
            process_time_ms=response_time_ms,
            created_at=datetime.utcnow()
        )
        db.add(log)

        # 일별 집계 업데이트 (Dashboard용)
        today = datetime.utcnow().date()
        usage = db.query(ApiUsage).filter(
            and_(ApiUsage.key_id == api_key.key_id, ApiUsage.usage_date == today)
        ).first()

        if usage:
            usage.request_count = (usage.request_count or 0) + 1
            if status_code >= 400:
                usage.error_count = (usage.error_count or 0) + 1
        else:
            usage = ApiUsage(
                key_id=api_key.key_id,
                usage_date=today,
                request_count=1,
                error_count=1 if status_code >= 400 else 0
            )
            db.add(usage)

        db.commit()


@router.get("/health")
async def health_check():
    """External API 헬스 체크"""
    return {
        "status": "healthy",
        "service": "external-api",
        "version": "v1"
    }
