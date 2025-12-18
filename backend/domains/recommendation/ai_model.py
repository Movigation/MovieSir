# backend/domains/recommendation/ai_model.py
"""
AI 추천 모델 어댑터
- HybridRecommender를 Backend Service와 호환되도록 래핑
"""

import os
import sys
from pathlib import Path
from typing import List, Optional

# AI 모델 경로 추가
AI_PATH = Path(__file__).parent.parent.parent.parent / "ai" / "inference"
sys.path.insert(0, str(AI_PATH))


class AIModelAdapter:
    """
    HybridRecommender를 Backend와 호환되도록 래핑하는 어댑터

    사용법:
        model = AIModelAdapter()
        movie_ids = model.predict(user_id="123", top_k=20)
    """

    def __init__(self):
        self.recommender = None
        self.is_loaded = False
        self._load_model()

    def _load_model(self):
        """AI 모델 로드 (싱글톤 패턴)"""
        try:
            from db_conn_movie_reco_v1 import HybridRecommender

            # 환경변수에서 DB 설정 읽기
            db_config = {
                'host': os.getenv("DATABASE_HOST", "localhost"),
                'port': int(os.getenv("DATABASE_PORT", 5432)),
                'database': os.getenv("DATABASE_NAME", "moviesir"),
                'user': os.getenv("DATABASE_USER", "postgres"),
                'password': os.getenv("DATABASE_PASSWORD", "password")
            }

            # LightGCN 모델 경로
            base_path = Path(__file__).parent.parent.parent.parent
            lightgcn_model_path = str(base_path / "ai" / "training" / "lightgcn_model" / "best_model.pt")
            lightgcn_data_path = str(base_path / "ai" / "training" / "lightgcn_data")

            print(f"[AI Model] Loading HybridRecommender...")
            print(f"[AI Model] DB Config: {db_config['host']}:{db_config['port']}/{db_config['database']}")
            print(f"[AI Model] LightGCN Model: {lightgcn_model_path}")

            self.recommender = HybridRecommender(
                db_config=db_config,
                lightgcn_model_path=lightgcn_model_path,
                lightgcn_data_path=lightgcn_data_path,
                sbert_weight=0.7,
                lightgcn_weight=0.3
            )

            self.is_loaded = True
            print("[AI Model] Successfully loaded!")

        except FileNotFoundError as e:
            print(f"[AI Model] Model file not found: {e}")
            self.is_loaded = False
        except Exception as e:
            print(f"[AI Model] Failed to load: {e}")
            self.is_loaded = False

    def predict(
        self,
        user_id: str,
        top_k: int = 20,
        available_time: int = 180,
        preferred_genres: Optional[List[str]] = None,
        preferred_otts: Optional[List[str]] = None
    ) -> List[int]:
        """
        영화 추천 실행

        Args:
            user_id: 사용자 ID (UUID 문자열)
            top_k: 추천할 영화 개수
            available_time: 이용 가능한 시간 (분)
            preferred_genres: 선호 장르 리스트
            preferred_otts: 구독 중인 OTT 리스트

        Returns:
            추천된 movie_id 리스트
        """
        if not self.is_loaded or self.recommender is None:
            print("[AI Model] Model not loaded, returning empty list")
            return []

        try:
            # 사용자의 시청 기록 조회 (DB에서)
            # TODO: 실제 user_id로 시청 기록 조회 필요
            # 현재는 기본 영화 ID 사용
            user_movie_ids = self._get_user_watched_movies(user_id)

            if not user_movie_ids:
                # 시청 기록이 없으면 인기 영화 반환
                print(f"[AI Model] No watch history for user {user_id}, returning popular movies")
                return self._get_popular_movies(top_k)

            # 랜덤 시드 초기화 (매 요청마다 다른 결과)
            import numpy as np
            import time
            np.random.seed(int(time.time() * 1000) % (2**32))

            # 추천 실행
            rec_type, result = self.recommender.recommend(
                user_movie_ids=user_movie_ids,
                available_time=available_time,
                top_k=top_k,
                exclude_seen=True,
                preferred_genres=preferred_genres,
                preferred_otts=preferred_otts
            )

            # 결과에서 movie_id 추출
            movie_ids = []

            if rec_type == 'single':
                # Track A + Track B 영화 합치기
                track_a = result.get('recommendations', {}).get('track_a', {})
                track_b = result.get('recommendations', {}).get('track_b', {})

                # track_a/track_b가 dict이면 'movies' 키에서, 아니면 빈 리스트 처리
                movies_a = track_a.get('movies', []) if isinstance(track_a, dict) else []
                movies_b = track_b.get('movies', []) if isinstance(track_b, dict) else []

                for movie in movies_a:
                    movie_ids.append(movie['tmdb_id'])
                for movie in movies_b:
                    movie_ids.append(movie['tmdb_id'])
            else:
                # combination 모드
                track_a = result.get('recommendations', {}).get('track_a', {})
                track_b = result.get('recommendations', {}).get('track_b', {})

                if isinstance(track_a, dict) and track_a.get('combination'):
                    for movie in track_a['combination'].get('movies', []):
                        movie_ids.append(movie['tmdb_id'])
                if isinstance(track_b, dict) and track_b.get('combination'):
                    for movie in track_b['combination'].get('movies', []):
                        movie_ids.append(movie['tmdb_id'])

            print(f"[AI Model] Recommended {len(movie_ids)} movies for user {user_id}")
            return movie_ids[:top_k]

        except Exception as e:
            print(f"[AI Model] Prediction error: {e}")
            import traceback
            traceback.print_exc()
            return []

    def _get_user_watched_movies(self, user_id: str) -> List[int]:
        """
        사용자의 시청 기록에서 movie_id 리스트 반환
        TODO: 실제 DB 연결 필요
        """
        # 임시: 기본 영화 ID 반환 (실제로는 DB에서 조회)
        # 온보딩에서 선택한 영화 또는 시청 기록
        try:
            from sqlalchemy import text
            from backend.core.db import SessionLocal

            db = SessionLocal()
            try:
                # movie_logs 테이블에서 사용자의 시청 기록 조회
                result = db.execute(
                    text("SELECT movie_id FROM movie_logs WHERE user_id = :uid ORDER BY watched_at DESC LIMIT 50"),
                    {"uid": user_id}
                ).fetchall()

                if result:
                    return [row[0] for row in result]

                # 시청 기록이 없으면 온보딩 응답 조회
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

        # 기본값: 인기 영화 ID
        return [550, 27205, 157336]  # Fight Club, Inception, Interstellar

    def _get_popular_movies(self, top_k: int) -> List[int]:
        """인기 영화 ID 반환 (시청 기록 없을 때 대체용)"""
        try:
            from sqlalchemy import text
            from backend.core.db import SessionLocal

            db = SessionLocal()
            try:
                result = db.execute(
                    text("SELECT movie_id FROM movies ORDER BY popularity DESC LIMIT :limit"),
                    {"limit": top_k}
                ).fetchall()

                return [row[0] for row in result]
            finally:
                db.close()
        except Exception as e:
            print(f"[AI Model] Popular movies query error: {e}")
            return []

    def close(self):
        """리소스 정리"""
        if self.recommender:
            self.recommender.close()


# 싱글톤 인스턴스
_ai_model_instance: Optional[AIModelAdapter] = None


def get_ai_model() -> AIModelAdapter:
    """AI 모델 싱글톤 인스턴스 반환"""
    global _ai_model_instance
    if _ai_model_instance is None:
        _ai_model_instance = AIModelAdapter()
    return _ai_model_instance
