# backend/domains/recommendation/ai_model.py
"""
AI 추천 모델 어댑터 - GPU Server HTTP 호출
"""

import os
import httpx
from typing import List, Optional


class AIModelAdapter:
    """
    GPU Server의 AI Service를 HTTP로 호출하는 어댑터
    """

    def __init__(self):
        self.ai_service_url = os.getenv("AI_SERVICE_URL", "http://10.0.35.62:8001")
        self.is_loaded = True  # HTTP 호출이므로 항상 True

    def predict(
        self,
        user_id: str,
        top_k: int = 20,
        available_time: int = 180,
        preferred_genres: Optional[List[str]] = None,
        preferred_otts: Optional[List[str]] = None,
        user_movie_ids: Optional[List[int]] = None
    ) -> List[int]:
        """
        GPU Server AI Service 호출

        Args:
            user_id: 사용자 ID
            top_k: 추천할 영화 개수
            available_time: 이용 가능한 시간 (분)
            preferred_genres: 선호 장르 리스트
            preferred_otts: 구독 중인 OTT 리스트
            user_movie_ids: 사용자가 본 영화 ID 리스트

        Returns:
            추천된 movie_id 리스트
        """
        try:
            # 사용자 시청 기록 조회
            if user_movie_ids is None:
                user_movie_ids = self._get_user_watched_movies(user_id)

            if not user_movie_ids:
                print(f"[AI Model] No watch history for user {user_id}")
                user_movie_ids = [550, 27205, 157336]  # 기본값

            # AI Service 호출
            payload = {
                "user_movie_ids": user_movie_ids,
                "available_time": available_time,
                "top_k": top_k,
                "preferred_genres": preferred_genres,
                "preferred_otts": preferred_otts
            }

            print(f"[AI Model] Calling AI Service: {self.ai_service_url}/recommend")

            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    f"{self.ai_service_url}/recommend",
                    json=payload
                )
                response.raise_for_status()
                result = response.json()

            # 결과에서 movie_id 추출
            movie_ids = []

            track_a = result.get('track_a', {})
            track_b = result.get('track_b', {})

            # track_a에서 영화 추출
            if isinstance(track_a, dict):
                movies_a = track_a.get('movies', [])
                if isinstance(movies_a, list):
                    for movie in movies_a:
                        if isinstance(movie, dict) and 'tmdb_id' in movie:
                            movie_ids.append(movie['tmdb_id'])

            # track_b에서 영화 추출
            if isinstance(track_b, dict):
                movies_b = track_b.get('movies', [])
                if isinstance(movies_b, list):
                    for movie in movies_b:
                        if isinstance(movie, dict) and 'tmdb_id' in movie:
                            movie_ids.append(movie['tmdb_id'])

            print(f"[AI Model] Recommended {len(movie_ids)} movies")
            return movie_ids[:top_k]

        except httpx.HTTPError as e:
            print(f"[AI Model] HTTP error: {e}")
            return []
        except Exception as e:
            print(f"[AI Model] Error: {e}")
            import traceback
            traceback.print_exc()
            return []

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

    def close(self):
        """리소스 정리 (HTTP 클라이언트는 정리 불필요)"""
        pass


# 싱글톤 인스턴스
_ai_model_instance: Optional[AIModelAdapter] = None


def get_ai_model() -> AIModelAdapter:
    """AI 모델 싱글톤 인스턴스 반환"""
    global _ai_model_instance
    if _ai_model_instance is None:
        _ai_model_instance = AIModelAdapter()
    return _ai_model_instance
