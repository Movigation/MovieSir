# backend/domains/recommendation/router.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.core.db import get_db
from backend.domains.auth.utils import get_current_user
from backend.domains.user.models import User
from . import service, schema
from .ai_model import get_ai_model

# AI 모델 로딩 (싱글톤)
ai_model = get_ai_model()

router = APIRouter(tags=["recommendation"])


# ==================== 새로운 API (v2) ====================

@router.post("/api/v2/recommend", response_model=schema.RecommendationResponseV2)
def recommend_movies_v2(
    req: schema.RecommendationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    영화 추천 v2 - 시간 맞춤 조합 추천

    - Track A: 선호 장르 + OTT 필터
    - Track B: 장르 확장 (다양성)
    - 총 런타임이 입력 시간의 90%~100% 범위
    """
    user_id = str(current_user.user_id)

    # 사용자 OTT 조회
    user_otts = service.get_user_ott_names(db, user_id)

    # AI 추천 호출
    result = ai_model.recommend(
        user_id=user_id,
        available_time=req.runtime_limit or 180,
        preferred_genres=req.genres or None,
        preferred_otts=user_otts,
        allow_adult=not req.exclude_adult,
        excluded_ids=req.excluded_ids or []
    )

    return result


@router.post("/api/v2/recommend/single", response_model=schema.ReRecommendResponse)
def recommend_single_movie(
    req: schema.ReRecommendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    개별 영화 재추천 - 단일 영화 교체

    - 기존 추천 영화를 새 영화로 교체
    - 런타임이 대상 영화의 90%~100% 범위
    """
    user_id = str(current_user.user_id)

    # 사용자 OTT 조회
    user_otts = service.get_user_ott_names(db, user_id)

    # AI 단일 추천 호출
    movie = ai_model.recommend_single(
        user_id=user_id,
        target_runtime=req.target_runtime,
        excluded_ids=req.excluded_ids,
        track=req.track,
        preferred_genres=req.genres or None,
        preferred_otts=user_otts,
        allow_adult=not req.exclude_adult
    )

    if movie:
        return {
            "movie": movie,
            "success": True,
            "message": "재추천 성공"
        }
    else:
        return {
            "movie": None,
            "success": False,
            "message": "조건에 맞는 영화를 찾지 못했습니다"
        }


# ==================== 기존 API (하위 호환) ====================

@router.post("/api/recommend", response_model=schema.RecommendationResponse)
def recommend_movies(
    req: schema.RecommendationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    영화 추천 (Legacy) - 하위 호환용
    """
    results = service.get_hybrid_recommendations(db, str(current_user.user_id), req, ai_model)
    return {"results": results}


# ==================== 공통 API ====================

@router.post("/api/movies/{movie_id}/play")
def click_ott(
    movie_id: int,
    req: schema.ClickLogRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """OTT 링크 클릭 로깅"""
    service.log_click(db, str(current_user.user_id), movie_id, req.provider_id)

    url_row = db.execute(
        text("SELECT link_url FROM movie_ott_map WHERE movie_id=:mid AND provider_id=:pid"),
        {"mid": movie_id, "pid": req.provider_id}
    ).fetchone()

    if not url_row:
        raise HTTPException(status_code=404, detail="Link not found")

    return {"redirect_url": url_row[0]}


@router.post("/api/movies/{movie_id}/watched")
def mark_watched(
    movie_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """영화 시청 완료 표시"""
    service.mark_watched(db, str(current_user.user_id), movie_id)
    return {"status": "success"}


@router.get("/api/movies/{movie_id}", response_model=schema.MovieDetailResponse)
def get_movie_detail(
    movie_id: int,
    db: Session = Depends(get_db),
):
    """영화 상세 정보 조회 (로그인 불필요)"""
    from backend.domains.movie.models import Movie

    movie = db.query(Movie).filter(Movie.movie_id == movie_id).first()

    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    # OTT 정보 조회
    ott_rows = db.execute(
        text("""
            SELECT
                p.provider_id,
                p.provider_name,
                m.link_url
            FROM movie_ott_map m
            JOIN ott_providers p ON m.provider_id = p.provider_id
            WHERE m.movie_id = :mid
        """),
        {"mid": movie_id}
    ).fetchall()

    return {
        "info": movie,
        "otts": [
            {
                "provider_id": row.provider_id,
                "provider_name": row.provider_name,
                "url": row.link_url,
            }
            for row in ott_rows
        ],
        "tag_genome": movie.tag_genome,
    }
