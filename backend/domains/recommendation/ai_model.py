# backend/domains/recommendation/ai_model.py
"""
AI 추천 모델 어댑터 v3 - B2B External API 호출
B2C 무비서도 B2B API Key를 사용하여 추천 서비스 호출 (Dog Fooding)
"""

import os
import httpx
from typing import List, Optional, Dict, Any


class AIModelAdapter:
    """
    B2B External API를 통해 AI 추천 서비스를 호출하는 어댑터 (v3)
    B2C 무비서가 B2B API의 고객으로서 동작
    """

    def __init__(self):
        # B2B External API URL
        self.api_base_url = os.getenv("B2B_API_URL", "http://localhost:8000")
        # B2C용 API Key (B2B Console에서 발급받은 키)
        self.api_key = os.getenv("B2C_API_KEY", "")
        self.is_loaded = True

        # 캐싱 변수
        self._popular_movies_cache = None  # 인기 영화 목록 (24시간 TTL)
        self._cache_timestamp = None  # 캐시 생성 시각
        self._user_profile_cache = {}  # user_id → (movie_ids, timestamp) - 세션 캐싱 (5분 TTL)
        self._all_ott_names = None  # 전체 OTT 목록 (영구 캐시)


    def _get_user_watched_movies(self, user_id: str) -> List[int]:
        """사용자의 시청 기록에서 movie_id 리스트 반환"""
        try:
            from sqlalchemy import text
            from backend.core.db import SessionLocal

            db = SessionLocal()
            try:
                # movie_logs에서 조회
                result = db.execute(
                    text("SELECT movie_id FROM movie_logs WHERE user_id = :uid ORDER BY watched_at DESC LIMIT 50"),
                    {"uid": user_id}
                ).fetchall()

                if result:
                    return [row[0] for row in result]

                # 온보딩 응답에서 조회
                result = db.execute(
                    text("SELECT movie_id FROM user_onboarding_answers WHERE user_id = :uid"),
                    {"uid": user_id}
                ).fetchall()

                if result:
                    return [row[0] for row in result]

            finally:
                db.close()

        except Exception as e:
            print(f"[AI Model] DB query error: {e}")

        return []

    def _get_recent_recommended_movies(self, user_id: str, session_limit: int = 3) -> List[int]:
        """
        최근 N개 추천 세션에서 추천된 영화 ID 조회
        
        Args:
            user_id: 사용자 ID
            session_limit: 조회할 최근 세션 개수 (기본값 3)
        
        Returns:
            최근 추천된 영화 ID 리스트
        """
        try:
            from sqlalchemy import text
            from backend.core.db import SessionLocal

            db = SessionLocal()
            try:
                # 최근 N개 세션의 recommended_movie_ids 조회
                result = db.execute(
                    text("""
                        SELECT recommended_movie_ids 
                        FROM recommendation_sessions 
                        WHERE user_id = :uid 
                        ORDER BY created_at DESC 
                        LIMIT :limit
                    """),
                    {"uid": user_id, "limit": session_limit}
                ).fetchall()

                if result:
                    # 모든 세션의 영화 ID를 하나의 리스트로 합침
                    all_movie_ids = []
                    for row in result:
                        movie_ids = row[0]  # recommended_movie_ids 배열
                        if movie_ids:
                            all_movie_ids.extend(movie_ids)
                    
                    # 중복 제거
                    return list(set(all_movie_ids))

            finally:
                db.close()

        except Exception as e:
            print(f"[AI Model] Error fetching recent recommendations: {e}")

        return []

    def _get_popular_movies(self, limit: int = 5) -> List[int]:
        """
        인기 영화 ID 리스트 반환 (24시간 캐싱 + 랜덤 샘플링)
        
        Args:
            limit: 반환할 영화 개수 (기본값 5개)
        
        Returns:
            인기 영화 movie_id 리스트
        """
        import time
        import random
        
        # 캐시 확인 (24시간)
        if self._popular_movies_cache and self._cache_timestamp:
            if time.time() - self._cache_timestamp < 86400:  # 24시간
                # 캐시된 목록에서 랜덤 샘플링
                if len(self._popular_movies_cache) > limit:
                    return random.sample(self._popular_movies_cache, limit)
                return self._popular_movies_cache
        
        # DB 조회
        try:
            from sqlalchemy import text
            from backend.core.db import SessionLocal
            
            db = SessionLocal()
            try:
                # 상위 50개 조회 (랜덤 샘플링용)
                result = db.execute(
                    text("""
                        SELECT movie_id 
                        FROM movies 
                        WHERE vote_count >= 5000 
                          AND vote_average >= 7.0 
                          AND EXTRACT(YEAR FROM release_date) >= 2000
                          AND adult = false
                        ORDER BY popularity DESC NULLS LAST
                        LIMIT 50
                    """)
                ).fetchall()
                
                if result:
                    movies = [row[0] for row in result]
                    # 캐시 저장
                    self._popular_movies_cache = movies
                    self._cache_timestamp = time.time()
                    
                    # 랜덤 샘플링
                    if len(movies) > limit:
                        return random.sample(movies, limit)
                    return movies
            finally:
                db.close()
        except Exception as e:
            print(f"[AI Model] Error fetching popular movies: {e}")
            # 에러 시 캐시가 있으면 사용
            if self._popular_movies_cache:
                if len(self._popular_movies_cache) > limit:
                    return random.sample(self._popular_movies_cache, limit)
                return self._popular_movies_cache
        
        return []

    def _get_all_ott_names(self) -> List[str]:
        """전체 OTT provider_name 목록 조회 (영구 캐싱)"""
        if self._all_ott_names:
            return self._all_ott_names
        
        try:
            from sqlalchemy import text
            from backend.core.db import SessionLocal
            
            db = SessionLocal()
            try:
                result = db.execute(
                    text("SELECT provider_name FROM ott_providers ORDER BY provider_id")
                ).fetchall()
                
                if result:
                    self._all_ott_names = [row[0] for row in result]
                    return self._all_ott_names
            finally:
                db.close()
        except Exception as e:
            print(f"[AI Model] Error fetching all OTTs: {e}")
        
        return []

    def _get_positive_feedback_movies(self, user_id: str) -> List[int]:
        """긍정 피드백 영화 조회"""
        try:
            from sqlalchemy import text
            from backend.core.db import SessionLocal

            db = SessionLocal()
            try:
                result = db.execute(
                    text("""
                        SELECT movie_id 
                        FROM b2c.user_movie_feedback 
                        WHERE user_id = :uid 
                          AND feedback_type = 'satisfaction_positive'
                        ORDER BY created_at DESC
                        LIMIT 20
                    """),
                    {"uid": user_id}
                ).fetchall()

                return [row[0] for row in result] if result else []

            finally:
                db.close()

        except Exception as e:
            print(f"[AI Model] Error fetching positive feedback: {e}")

        return []

    def _get_negative_feedback_movies(self, user_id: str) -> List[int]:
        """부정 피드백 영화 조회"""
        try:
            from sqlalchemy import text
            from backend.core.db import SessionLocal

            db = SessionLocal()
            try:
                result = db.execute(
                    text("""
                        SELECT movie_id 
                        FROM b2c.user_movie_feedback 
                        WHERE user_id = :uid 
                          AND feedback_type = 'satisfaction_negative'
                        ORDER BY created_at DESC
                        LIMIT 20
                    """),
                    {"uid": user_id}
                ).fetchall()

                return [row[0] for row in result] if result else []

            finally:
                db.close()

        except Exception as e:
            print(f"[AI Model] Error fetching negative feedback: {e}")

        return []

    def _get_all_feedback_movies(self, user_id: str) -> List[int]:
        """모든 피드백 영화 조회 (긍정 + 부정)"""
        try:
            from sqlalchemy import text
            from backend.core.db import SessionLocal

            db = SessionLocal()
            try:
                result = db.execute(
                    text("""
                        SELECT DISTINCT movie_id 
                        FROM b2c.user_movie_feedback 
                        WHERE user_id = :uid
                    """),
                    {"uid": user_id}
                ).fetchall()

                return [row[0] for row in result] if result else []

            finally:
                db.close()

        except Exception as e:
            print(f"[AI Model] Error fetching all feedback: {e}")

        return []

    def _get_onboarding_movies(self, user_id: str) -> List[int]:
        """온보딩 영화 조회"""
        try:
            from sqlalchemy import text
            from backend.core.db import SessionLocal

            db = SessionLocal()
            try:
                result = db.execute(
                    text("""
                        SELECT movie_id 
                        FROM b2c.user_onboarding_answers 
                        WHERE user_id = :uid
                        ORDER BY created_at
                    """),
                    {"uid": user_id}
                ).fetchall()

                return [row[0] for row in result] if result else []

            finally:
                db.close()

        except Exception as e:
            print(f"[AI Model] Error fetching onboarding movies: {e}")

        return []

    def _get_user_movie_ids(self, user_id: str, force_refresh: bool = False) -> List[int]:
        """
        사용자 영화 ID 조회 (피드백 + 온보딩 + 시청 기록)
        
        Args:
            user_id: 사용자 ID
            force_refresh: True면 캐시 무시하고 새로 조회 (전체 추천용)
                          False면 캐시 사용 (재추천용)
        
        Returns:
            사용자 선호 영화 ID 리스트 (긍정 피드백 > 온보딩 > 시청 기록)
        """
        import time
        
        # 캐시 확인 (force_refresh=False일 때만)
        if not force_refresh and user_id in self._user_profile_cache:
            cached_ids, cached_time = self._user_profile_cache[user_id]
            if time.time() - cached_time < 300:  # 5분
                print(f"[AI Model] Using cached profile for {user_id[:8]}...")
                return cached_ids
        
        user_movie_ids = []
        
        # 1. 긍정 피드백 영화 조회
        positive_feedback = self._get_positive_feedback_movies(user_id)
        user_movie_ids.extend(positive_feedback)
        
        # 2. 온보딩 영화 조회
        onboarding_movies = self._get_onboarding_movies(user_id)
        user_movie_ids.extend(onboarding_movies)
        
        # 3. 시청 기록 조회 (선택적)
        watch_history = self._get_user_watched_movies(user_id)
        user_movie_ids.extend(watch_history)
        
        # 중복 제거 (순서 유지)
        user_movie_ids = list(dict.fromkeys(user_movie_ids))
        
        if user_movie_ids:
            # 캐시 저장
            self._user_profile_cache[user_id] = (user_movie_ids, time.time())
            print(f"[AI Model] User profile: {len(positive_feedback)} feedback + {len(onboarding_movies)} onboarding + {len(watch_history)} watch history")
            return user_movie_ids
        
        # 4. Fallback: 인기 영화
        print(f"[AI Model] No user data for {user_id[:8]}... - using popular movies")
        popular_movies = self._get_popular_movies(limit=5)
        self._user_profile_cache[user_id] = (popular_movies, time.time())
        return popular_movies


    def recommend(
        self,
        user_id: str,
        available_time: int = 180,
        preferred_genres: Optional[List[str]] = None,
        preferred_otts: Optional[List[str]] = None,
        allow_adult: bool = False,
        excluded_ids_a: Optional[List[int]] = None,
        excluded_ids_b: Optional[List[int]] = None
    ) -> Dict[str, Any]:
        """
        초기 추천 - 영화 조합 반환 (v3 - 피드백 반영)

        Returns:
            {
                'track_a': { 'label': '...', 'movies': [...], 'total_runtime': int },
                'track_b': { 'label': '...', 'movies': [...], 'total_runtime': int },
                'elapsed_time': float
            }
        """
        try:
            # 사용자 영화 ID 조회 (force_refresh=True → 항상 새 프로필 생성)
            user_movie_ids = self._get_user_movie_ids(user_id, force_refresh=True)
            
            # 최근 3개 세션에서 추천된 영화 조회
            recent_recommended = self._get_recent_recommended_movies(user_id, session_limit=3)
            print(f"[AI Model] Recent recommendations to exclude: {len(recent_recommended)} movies from last 3 sessions")
            
            # 피드백 데이터 조회
            all_feedback = self._get_all_feedback_movies(user_id)  # 긍정 + 부정 모두
            negative_feedback = self._get_negative_feedback_movies(user_id)  # 부정만
            print(f"[AI Model] Feedback: {len(all_feedback)} total ({len(negative_feedback)} negative)")
            
            # excluded_ids에 최근 추천 영화 + 모든 피드백 영화 추가
            excluded_ids_a = excluded_ids_a or []
            excluded_ids_a = list(set(excluded_ids_a + recent_recommended + all_feedback))
            
            excluded_ids_b = excluded_ids_b or []
            excluded_ids_b = list(set(excluded_ids_b + recent_recommended + all_feedback))
            
            # OTT 구독 정보 없으면 전체 OTT 사용
            if not preferred_otts:
                preferred_otts = self._get_all_ott_names()
                if preferred_otts:
                    print(f"[AI Model] No OTT subscription - using all OTTs ({len(preferred_otts)})")

            payload = {
                "user_movie_ids": user_movie_ids,
                "available_time": available_time,
                "preferred_genres": preferred_genres,
                "preferred_otts": preferred_otts,
                "allow_adult": allow_adult,
                "excluded_ids_a": excluded_ids_a,
                "excluded_ids_b": excluded_ids_b,
                "negative_movie_ids": negative_feedback  # NEW: 부정 피드백 전달
            }

            print(f"[AI Model] Calling B2B API: {self.api_base_url}/v1/recommend")
            print(f"[AI Model] Payload: time={available_time}, genres={preferred_genres}, excluded_a={len(excluded_ids_a)}, excluded_b={len(excluded_ids_b)}, negative={len(negative_feedback)}")

            headers = {"X-API-Key": self.api_key} if self.api_key else {}

            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    f"{self.api_base_url}/v1/recommend",
                    json=payload,
                    headers=headers
                )
                response.raise_for_status()
                api_result = response.json()

            # External API 응답에서 data 추출
            if api_result.get("success") and "data" in api_result:
                result = api_result["data"]
            else:
                result = api_result

            print(f"[AI Model] Response received from B2B API")
            return result

        except httpx.HTTPError as e:
            print(f"[AI Model] HTTP error: {e}")
            return self._empty_response()
        except Exception as e:
            print(f"[AI Model] Error: {e}")
            import traceback
            traceback.print_exc()
            return self._empty_response()

    def recommend_single(
        self,
        user_id: str,
        target_runtime: int,
        excluded_ids: List[int],
        track: str = "a",
        preferred_genres: Optional[List[str]] = None,
        preferred_otts: Optional[List[str]] = None,
        allow_adult: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        개별 영화 재추천 - 단일 영화 반환

        Returns:
            { 'tmdb_id': int, 'title': str, 'runtime': int, ... } 또는 None
        """
        try:
            # 사용자 영화 ID 조회 (force_refresh=False → 캐시 사용, 5분 이내)
            user_movie_ids = self._get_user_movie_ids(user_id, force_refresh=False)
            
            # 최근 3개 세션에서 추천된 영화 조회
            recent_recommended = self._get_recent_recommended_movies(user_id, session_limit=3)
            print(f"[AI Model] Recent recommendations to exclude: {len(recent_recommended)} movies from last 3 sessions")
            
            # 피드백 데이터 조회
            all_feedback = self._get_all_feedback_movies(user_id)
            negative_feedback = self._get_negative_feedback_movies(user_id)
            print(f"[AI Model] Feedback: {len(all_feedback)} total ({len(negative_feedback)} negative)")
            
            # excluded_ids에 최근 추천 영화 + 모든 피드백 영화 추가
            excluded_ids = list(set(excluded_ids + recent_recommended + all_feedback))
            
            # OTT 구독 정보 없으면 전체 OTT 사용
            if not preferred_otts:
                preferred_otts = self._get_all_ott_names()
                if preferred_otts:
                    print(f"[AI Model] No OTT subscription - using all OTTs ({len(preferred_otts)})")

            payload = {
                "user_movie_ids": user_movie_ids,
                "target_runtime": target_runtime,
                "excluded_ids": excluded_ids,
                "track": track,
                "preferred_genres": preferred_genres,
                "preferred_otts": preferred_otts,
                "allow_adult": allow_adult,
                "negative_movie_ids": negative_feedback  # NEW
            }

            print(f"[AI Model] Calling B2B API: {self.api_base_url}/v1/recommend_single")
            print(f"[AI Model] Payload: runtime={target_runtime}, track={track}, excluded={len(excluded_ids)}, negative={len(negative_feedback)}")

            headers = {"X-API-Key": self.api_key} if self.api_key else {}

            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    f"{self.api_base_url}/v1/recommend_single",
                    json=payload,
                    headers=headers
                )
                response.raise_for_status()
                api_result = response.json()

            # External API 응답에서 data 추출
            if api_result.get("success") and "data" in api_result:
                result = api_result["data"]
            else:
                result = api_result

            if result:
                print(f"[AI Model] Single movie: {result.get('title')} ({result.get('runtime')}min)")
            return result

        except httpx.HTTPError as e:
            print(f"[AI Model] HTTP error: {e}")
            return None
        except Exception as e:
            print(f"[AI Model] Error: {e}")
            import traceback
            traceback.print_exc()
            return None

    def _empty_response(self) -> Dict[str, Any]:
        """빈 응답 반환"""
        return {
            'track_a': {'label': '선호 장르 맞춤 추천', 'movies': [], 'total_runtime': 0},
            'track_b': {'label': '장르 확장 추천', 'movies': [], 'total_runtime': 0},
            'elapsed_time': 0
        }

    # ==================== Legacy 메서드 (하위 호환) ====================

    def predict(
        self,
        user_id: str,
        top_k: int = 20,
        available_time: int = 180,
        preferred_genres: Optional[List[str]] = None,
        preferred_otts: Optional[List[str]] = None,
        user_movie_ids: Optional[List[int]] = None,
        allow_adult: bool = False
    ) -> List[int]:
        """
        Legacy 메서드 - 영화 ID 리스트 반환 (하위 호환용)
        """
        result = self.recommend(
            user_id=user_id,
            available_time=available_time,
            preferred_genres=preferred_genres,
            preferred_otts=preferred_otts,
            allow_adult=allow_adult
        )

        movie_ids = []

        # Track A에서 영화 추출
        track_a = result.get('track_a', {})
        for movie in track_a.get('movies', []):
            if isinstance(movie, dict) and 'movie_id' in movie:
                movie_ids.append(movie['movie_id'])

        # Track B에서 영화 추출
        track_b = result.get('track_b', {})
        for movie in track_b.get('movies', []):
            if isinstance(movie, dict) and 'movie_id' in movie:
                if movie['movie_id'] not in movie_ids:
                    movie_ids.append(movie['movie_id'])

        return movie_ids[:top_k]

    def close(self):
        """리소스 정리"""
        pass


# 싱글톤 인스턴스
_ai_model_instance: Optional[AIModelAdapter] = None


def get_ai_model() -> AIModelAdapter:
    """AI 모델 싱글톤 인스턴스 반환"""
    global _ai_model_instance
    if _ai_model_instance is None:
        _ai_model_instance = AIModelAdapter()
    return _ai_model_instance
