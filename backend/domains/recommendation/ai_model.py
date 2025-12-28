# backend/domains/recommendation/ai_model.py
"""
AI 추천 모델 어댑터 v2 - GPU Server HTTP 호출
"""

import os
import httpx
from typing import List, Optional, Dict, Any


class AIModelAdapter:
    """
    GPU Server의 AI Service를 HTTP로 호출하는 어댑터 (v2)
    """

    def __init__(self):
        self.ai_service_url = os.getenv("AI_SERVICE_URL", "http://10.0.35.62:8001")
        self.is_loaded = True

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

    def recommend(
        self,
        user_id: str,
        available_time: int = 180,
        preferred_genres: Optional[List[str]] = None,
        preferred_otts: Optional[List[str]] = None,
        allow_adult: bool = False,
        excluded_ids: Optional[List[int]] = None
    ) -> Dict[str, Any]:
        """
        초기 추천 - 영화 조합 반환 (v2)

        Returns:
            {
                'track_a': { 'label': '...', 'movies': [...], 'total_runtime': int },
                'track_b': { 'label': '...', 'movies': [...], 'total_runtime': int },
                'elapsed_time': float
            }
        """
        try:
            # 사용자 시청 기록 조회
            user_movie_ids = self._get_user_watched_movies(user_id)

            if not user_movie_ids:
                print(f"[AI Model] No watch history for user {user_id}")
                user_movie_ids = [550, 27205, 157336]  # 기본값

            payload = {
                "user_movie_ids": user_movie_ids,
                "available_time": available_time,
                "preferred_genres": preferred_genres,
                "preferred_otts": preferred_otts,
                "allow_adult": allow_adult,
                "excluded_ids": excluded_ids or []
            }

            print(f"[AI Model] Calling recommend: {self.ai_service_url}/recommend")
            print(f"[AI Model] Payload: time={available_time}, genres={preferred_genres}, excluded={len(excluded_ids or [])}")

            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    f"{self.ai_service_url}/recommend",
                    json=payload
                )
                response.raise_for_status()
                result = response.json()

            print(f"[AI Model] Response received")
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
            user_movie_ids = self._get_user_watched_movies(user_id)

            if not user_movie_ids:
                user_movie_ids = [550, 27205, 157336]

            payload = {
                "user_movie_ids": user_movie_ids,
                "target_runtime": target_runtime,
                "excluded_ids": excluded_ids,
                "track": track,
                "preferred_genres": preferred_genres,
                "preferred_otts": preferred_otts,
                "allow_adult": allow_adult
            }

            print(f"[AI Model] Calling recommend_single: {self.ai_service_url}/recommend_single")
            print(f"[AI Model] Payload: runtime={target_runtime}, track={track}, excluded={len(excluded_ids)}")

            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    f"{self.ai_service_url}/recommend_single",
                    json=payload
                )
                response.raise_for_status()
                result = response.json()

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
            if isinstance(movie, dict) and 'tmdb_id' in movie:
                movie_ids.append(movie['tmdb_id'])

        # Track B에서 영화 추출
        track_b = result.get('track_b', {})
        for movie in track_b.get('movies', []):
            if isinstance(movie, dict) and 'tmdb_id' in movie:
                if movie['tmdb_id'] not in movie_ids:
                    movie_ids.append(movie['tmdb_id'])

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
