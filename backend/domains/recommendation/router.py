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


# ==================== ai 코드가 최종적으로 나왔기 때문에 v2 -> v1 변경 ====================

@router.post("/api/v1/recommend", response_model=schema.RecommendationResponseV2)
def recommend_movies_v2(
    req: schema.RecommendationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    영화 추천 v2 - 시간 맞춤 조합 추천

    - Track A: 선호 장르 + OTT 필터 (같은 장르일 때만 이전 기록 제외)
    - Track B: 장르 확장 (장르 상관없이 이전 기록 제외)
    - 총 런타임이 입력 시간의 90%~100% 범위
    """
    user_id = str(current_user.user_id)

    # 사용자 OTT 조회
    user_otts = service.get_user_ott_names(db, user_id)

    # Track A: 같은 장르일 때만 이전 기록 제외 (최근 20개 세션)
    recent_a = service.get_recent_recommended_ids_by_genre(db, user_id, req.genres, limit=20)
    
    # Track B: 장르 상관없이 이전 기록 제외 (최근 20개 세션)
    recent_b = service.get_recent_recommended_ids_all(db, user_id, limit=20)

    excluded_a = list(set((req.excluded_ids or []) + recent_a))
    excluded_b = list(set((req.excluded_ids or []) + recent_b))

    print(f"[Recommend] User: {user_id[:8]}..., Genres: {req.genres}")
    print(f"[Recommend] Track A 제외: DB={len(recent_a)}개, 요청={len(req.excluded_ids or [])}개, 최종={len(excluded_a)}개")
    print(f"[Recommend] Track B 제외: DB={len(recent_b)}개, 요청={len(req.excluded_ids or [])}개, 최종={len(excluded_b)}개")
    if len(excluded_a) > 0:
        print(f"[Recommend] Track A excluded IDs (first 10): {excluded_a[:10]}")
    if len(excluded_b) > 0:
        print(f"[Recommend] Track B excluded IDs (first 10): {excluded_b[:10]}")

    # AI 추천 호출 (Track A, B 별도 제외 목록)
    result = ai_model.recommend(
        user_id=user_id,
        available_time=req.runtime_limit or 180,
        preferred_genres=req.genres or None,
        preferred_otts=user_otts,
        allow_adult=not req.exclude_adult,
        excluded_ids_a=excluded_a,
        excluded_ids_b=excluded_b
    )

    # 추천 결과 저장 (Track A, B 분리) - session_id 반환
    track_a_ids = [m['movie_id'] for m in result.get('track_a', {}).get('movies', [])]
    track_b_ids = [m['movie_id'] for m in result.get('track_b', {}).get('movies', [])]

    session_id = None
    if track_a_ids or track_b_ids:
        session_id = service.save_recommendation_session(
            db, user_id, req.genres, req.runtime_limit or 180, track_a_ids, track_b_ids
        )

    # session_id를 응답에 추가
    result['session_id'] = session_id
    return result


@router.post("/api/v1/recommend/single", response_model=schema.ReRecommendResponse)
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

@router.get("/api/movies/{movie_id}", response_model=schema.MovieDetailResponse)
def get_movie_detail(
    movie_id: int,
    db: Session = Depends(get_db),
):
    """영화 상세 정보 조회 (로그인 불필요) - movie_id로 조회"""
    from backend.domains.movie.models import Movie

    movie = db.query(Movie).filter(Movie.movie_id == movie_id).first()

    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    # OTT 정보 조회 (내부 movie_id 사용)
    ott_rows = db.execute(
        text("""
            SELECT
                p.provider_id,
                p.provider_name,
                m.link_url,
                m.payment_type
            FROM movie_ott_map m
            JOIN ott_providers p ON m.provider_id = p.provider_id
            WHERE m.movie_id = :mid
        """),
        {"mid": movie.movie_id}
    ).fetchall()

    return {
        "info": movie,
        "otts": [
            {
                "provider_id": row.provider_id,
                "provider_name": row.provider_name,
                "url": row.link_url,
                "payment_type": row.payment_type,
            }
            for row in ott_rows
        ],
        "tag_genome": movie.tag_genome,
    }
