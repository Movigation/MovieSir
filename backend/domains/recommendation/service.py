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
    """OTT 클릭을 user_movie_feedback 테이블에 저장 (provider_id 포함)"""
    try:
        # feedback_type에 provider_id를 포함시켜 저장 (예: 'ott_click:8')
        feedback_type = f'ott_click:{provider_id}' if provider_id else 'ott_click'
        new_feedback = MovieClick(
            user_id=user_id,
            movie_id=movie_id,
            feedback_type=feedback_type,
            session_id=None
        )
        db.add(new_feedback)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[WARN] OTT 클릭 로깅 실패: {e}")

def mark_watched(db: Session, user_id: str, movie_id: int):
    stmt = text("""
        INSERT INTO movie_logs (user_id, movie_id, watched_at)
        VALUES (:uid, :mid, NOW())
        ON CONFLICT (user_id, movie_id) DO UPDATE SET watched_at = NOW()
    """)
    db.execute(stmt, {"uid": user_id, "mid": movie_id})
    db.commit()


def get_recent_recommended_ids_by_genre(
    db: Session,
    user_id: str,
    genres: Optional[List[str]],
    limit: int = 5
) -> List[int]:
    """
    Track A용: 같은 장르일 때만 이전 기록 제외
    장르가 같은 최근 N회 추천된 Track A 영화 ID 조회
    """
    if not genres:
        print(f"[DEBUG Track A] No genres provided, returning empty list")
        return []

    print(f"[DEBUG Track A] Genres: {genres}, User: {user_id[:8]}..., Limit: {limit}")

    # 장르가 일치하는 세션에서 track_a_ids 조회
    result = db.execute(
        text("""
            SELECT feedback_details->>'track_a_ids' as track_a_ids
            FROM recommendation_sessions
            WHERE user_id = :uid
              AND req_genres IS NOT NULL
              AND req_genres && CAST(:genres AS varchar[])
            ORDER BY created_at DESC
            LIMIT :lim
        """),
        {"uid": user_id, "genres": genres, "lim": limit}
    ).fetchall()

    print(f"[DEBUG Track A] Query returned {len(result)} sessions")

    all_ids = set()
    for row in result:
        if row[0]:
            try:
                import json
                ids = json.loads(row[0])
                print(f"[DEBUG Track A] Found {len(ids)} IDs in session: {ids[:5]}..." if len(ids) > 5 else f"[DEBUG Track A] Found {len(ids)} IDs: {ids}")
                all_ids.update(ids)
            except:
                pass

    print(f"[DEBUG Track A] Total unique IDs to exclude: {len(all_ids)}")
    return list(all_ids)


def get_recent_recommended_ids_all(db: Session, user_id: str, limit: int = 5) -> List[int]:
    """
    Track B용: 장르 상관없이 최근 N회 추천된 전체 영화 ID 조회
    Track A + Track B 모두 제외 (어떤 트랙에서든 추천된 영화는 제외)
    """
    result = db.execute(
        text("""
            SELECT
                feedback_details->>'track_a_ids' as track_a_ids,
                feedback_details->>'track_b_ids' as track_b_ids
            FROM recommendation_sessions
            WHERE user_id = :uid
            ORDER BY created_at DESC
            LIMIT :lim
        """),
        {"uid": user_id, "lim": limit}
    ).fetchall()

    all_ids = set()
    import json
    for row in result:
        # Track A IDs
        if row[0]:
            try:
                ids = json.loads(row[0])
                all_ids.update(ids)
            except:
                pass
        # Track B IDs
        if row[1]:
            try:
                ids = json.loads(row[1])
                all_ids.update(ids)
            except:
                pass

    return list(all_ids)


def save_recommendation_session(
    db: Session,
    user_id: str,
    genres: Optional[List[str]],
    runtime_max: int,
    track_a_ids: List[int],
    track_b_ids: List[int]
) -> int:
    """추천 세션 저장 (Track A, B 분리 저장) - session_id 반환"""
    import json

    feedback_details = {
        "track_a_ids": track_a_ids,
        "track_b_ids": track_b_ids
    }

    result = db.execute(
        text("""
            INSERT INTO recommendation_sessions
            (user_id, req_genres, req_runtime_max, recommended_movie_ids, feedback_details, created_at)
            VALUES (:uid, :genres, :runtime, :movie_ids, :feedback, NOW())
            RETURNING session_id
        """),
        {
            "uid": user_id,
            "genres": genres,
            "runtime": runtime_max,
            "movie_ids": track_a_ids + track_b_ids,
            "feedback": json.dumps(feedback_details)
        }
    )
    session_id = result.fetchone()[0]
    db.commit()
    return session_id


def log_re_recommendation(
    db: Session,
    user_id: str,
    source_movie_id: Optional[int],
    result_movie_id: Optional[int],
    session_id: Optional[int] = None
):
    """
    재추천 활동 로깅 (user_movie_feedback 테이블)
    - result_movie_id: 새로 추천된 영화 (movie_id 필드에 저장)
    - session_id: 추천 세션 ID (FK 제약조건 준수)

    Note: source_movie_id는 FK 제약조건으로 인해 저장 불가,
          session_id를 통해 원본 세션 추적 가능
    """
    if result_movie_id is None:
        return  # 추천 실패 시 로깅 안함

    db.execute(
        text("""
            INSERT INTO user_movie_feedback
            (user_id, movie_id, session_id, feedback_type, created_at)
            VALUES (:uid, :mid, :sid, 're_recommendation', NOW())
        """),
        {
            "uid": user_id,
            "mid": result_movie_id,  # 새로 추천된 영화 ID
            "sid": session_id        # 실제 추천 세션 ID (FK 준수)
        }
    )
    db.commit()