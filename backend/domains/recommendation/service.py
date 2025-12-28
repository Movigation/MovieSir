# backend/domains/recommendation/service.py

from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional

# [중요] 타 도메인 모델 Import
from backend.domains.movie.models import Movie, MovieOttMap, OttProvider
from backend.domains.recommendation.models import MovieLog, MovieClick
from . import schema


def get_user_ott_names(db: Session, user_id: str) -> Optional[List[str]]:
    """사용자가 선택한 OTT provider_name 목록 조회"""
    result = db.execute(
        text("""
            SELECT p.provider_name
            FROM user_ott_map u
            JOIN ott_providers p ON u.provider_id = p.provider_id
            WHERE u.user_id = :uid
        """),
        {"uid": user_id}
    ).fetchall()

    if not result:
        return None

    return [row[0] for row in result]


def get_hybrid_recommendations(db: Session, user_id: str, req: schema.RecommendationRequest, model_instance):
    """
    1. AI 모델(LightGCN) -> ID 리스트 추출
    2. DB -> 영화 상세 정보 조회
    """
    # 사용자 OTT 선호 조회
    user_otts = get_user_ott_names(db, user_id)
    print(f"[DEBUG] User OTT preferences: {user_otts}")

    # 1. AI 모델 예측 (user_id를 int로 변환하거나 매핑 필요할 수 있음)
    # model_instance는 router에서 주입받거나 전역 변수로 로드된 것을 사용
    try:
        # 필터링 후에도 충분한 영화가 남도록 더 많이 요청
        # AI 모델에 시간/장르/OTT/성인필터 전달하여 적절한 영화 추천받기
        # exclude_adult=True면 allow_adult=False (성인물 제외)
        recommended_movie_ids = model_instance.predict(
            user_id,
            top_k=50,
            available_time=req.runtime_limit or 180,
            preferred_genres=req.genres or None,
            preferred_otts=user_otts,
            allow_adult=not req.exclude_adult
        )
    except Exception as e:
        print(f"AI Model Error: {e}")
        recommended_movie_ids = []

    if not recommended_movie_ids:
        return []

    # 2. DB 조회 (CRUD 역할)
    # AI 모델은 tmdb_id를 반환하므로 tmdb_id로 조회
    movies = db.query(Movie).filter(Movie.tmdb_id.in_(recommended_movie_ids)).all()

    # 순서 보정 (AI가 추천한 순서대로 정렬) - tmdb_id 기준
    movies_map = {m.tmdb_id: m for m in movies}
    results = []
    filtered_out = {"adult": 0, "runtime": 0, "genre": 0}
    
    for mid in recommended_movie_ids:
        if mid in movies_map:
            m = movies_map[mid]
            # 성인 필터링만 (장르/시간은 AI에서 이미 처리됨)
            if req.exclude_adult and m.adult:
                filtered_out["adult"] += 1
                continue
            results.append(m)

    print(f"[DEBUG] 필터링 결과: 성인={filtered_out['adult']}")
    print(f"[DEBUG] 최종 추천 영화: {len(results)}개")
            
    return results

def log_click(db: Session, user_id: str, movie_id: int, provider_id: int):
    new_log = MovieClick(user_id=user_id, movie_id=movie_id, provider_id=provider_id)
    db.add(new_log)
    db.commit()

def mark_watched(db: Session, user_id: str, movie_id: int):
    stmt = text("""
        INSERT INTO movie_logs (user_id, movie_id, watched_at)
        VALUES (:uid, :mid, NOW())
        ON CONFLICT (user_id, movie_id) DO UPDATE SET watched_at = NOW()
    """)
    db.execute(stmt, {"uid": user_id, "mid": movie_id})
    db.commit()