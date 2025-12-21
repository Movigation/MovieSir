# backend/domains/recommendation/router.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.core.db import get_db
from backend.domains.auth.utils import get_current_user
from backend.domains.user.models import User
from . import service, schema

# [AI 모델 로딩 예시]
# 실제로는 main.py나 lifespan에서 로드해서 app.state에 넣는 게 좋지만,
# 간단하게 전역으로 로드하거나 싱글톤 클래스를 만들어 씁니다.
class MockAIModel:
    def predict(self, uid, top_k):
        # 1부터 top_k까지의 영화 ID 반환 (더 많은 영화 추천)
        return list(range(1, top_k + 1))
ai_model = MockAIModel() # 실제 모델 로드 코드로 교체 필요

router = APIRouter(tags=["recommendation"])

@router.post("/api/recommend", response_model=schema.RecommendationResponse)
def recommend_movies(
    req: schema.RecommendationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # service에 ai_model 인스턴스 전달
    results = service.get_hybrid_recommendations(db, str(current_user.user_id), req, ai_model)
    return {"results": results}

@router.post("/api/movies/{movie_id}/play")
def click_ott(
    movie_id: int,
    req: schema.ClickLogRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service.log_click(db, str(current_user.user_id), movie_id, req.provider_id)
    
    # URL 조회 (OttMap은 movie 도메인에 있음)
    # 직접 쿼리하거나 service 함수로 뺄 수 있음
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
        "info": movie, # SQLAlchemy 객체 그대로 반환 (Pydantic이 변환)
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