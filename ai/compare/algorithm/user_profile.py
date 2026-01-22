"""
추천 알고리즘 평가 및 비교 스크립트

ai/training/original_data/ 폴더에 rating.csv 파일이 있어야 함

평균 임베딩 방식 vs 최대 유사도 방식 비교:
- 평균 방식: 사용자 영화 임베딩의 평균을 사용자 프로필로 사용
- 최대 유사도 방식: 사용자 영화들과의 유사도 중 최대값 사용

평가 지표:
1. Precision@10: 상위 10개 추천 중 정답 비율
2. NDCG@10: 순위를 고려한 정확도
3. Diversity: 장르 다양성
4. 추천 소요 시간
"""

import os
import sys
import time
import numpy as np
from pathlib import Path
from typing import List, Dict, Tuple, Any, Optional
from dotenv import load_dotenv
from sklearn.metrics import ndcg_score
from sklearn.preprocessing import MinMaxScaler
from scipy import stats

# 상위 디렉토리 임포트를 위한 경로 추가 (ai/ 폴더)
sys.path.append(str(Path(__file__).parent.parent.parent))

from inference.recommendation_model import HybridRecommender


def set_seed(seed=42):
    """재현성을 위한 시드 고정"""
    import random
    random.seed(seed)
    np.random.seed(seed)
    print(f"🔒 Random seed fixed: {seed}")


class MaxSimilarityRecommender(HybridRecommender):
    """최대 유사도 방식 추천 시스템 (현재 버전 상속)

    개별 영화 임베딩 유지 → 각 후보 영화와 개별 유사도 계산 → 최대값
    """

    def __init__(self, db_config: dict = None, als_model_path: str = None,
                 als_data_path: str = None, device: str = None, base_recommender: HybridRecommender = None):
        """
        현재 버전과 동일하지만 명시적으로 최대 유사도 방식 사용

        Args:
            base_recommender: 기존 HybridRecommender 인스턴스 (데이터 재사용)
            db_config, als_model_path, als_data_path: base_recommender 없을 때 사용
        """
        if base_recommender is not None:
            # 기존 인스턴스의 데이터 재사용
            print("  → Reusing data from existing HybridRecommender instance")
            self._copy_from_base(base_recommender)
        else:
            # 새로 초기화
            super().__init__(db_config, als_model_path, als_data_path, device)

        print("  → Using MAXIMUM SIMILARITY method")

    def _copy_from_base(self, base: HybridRecommender):
        """기존 인스턴스로부터 모든 데이터 복사"""
        self.db = base.db
        self.device = base.device
        self.metadata_map = base.metadata_map
        self.sbert_movie_ids = base.sbert_movie_ids
        self.sbert_embeddings = base.sbert_embeddings
        self.sbert_movie_to_idx = base.sbert_movie_to_idx
        self.als_movie_to_idx = base.als_movie_to_idx
        self.als_item_factors = base.als_item_factors
        self.common_movie_ids = base.common_movie_ids
        self.movie_id_to_idx = base.movie_id_to_idx
        self.target_sbert_matrix = base.target_sbert_matrix
        self.target_als_matrix = base.target_als_matrix
        self.target_sbert_norm = base.target_sbert_norm
        self.rating_scores = base.rating_scores
        self.movies_by_year = base.movies_by_year
        self.movies_by_genre = base.movies_by_genre
        self.movies_by_ott = base.movies_by_ott
        self.adult_movies = base.adult_movies
        self.non_adult_movies = base.non_adult_movies
        self.movie_ott_map = base.movie_ott_map

    # _get_user_profile은 부모 클래스의 것을 그대로 사용
    # 현재 버전: 개별 임베딩 행렬 반환 (N, dim) - 최대 유사도 방식

    def _get_top_movies(
        self,
        user_sbert_profile: np.ndarray,
        user_als_profile: np.ndarray,
        filtered_ids: List[int],
        sbert_weight: float,
        als_weight: float,
        top_k: int = 300,
        exclude_ids: Optional[List[int]] = None,
        preferred_genres: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """상위 영화 선정 - 최대 유사도 계산"""
        exclude_ids = exclude_ids or []
        exclude_set = set(exclude_ids)

        # 필터된 영화들의 인덱스
        filtered_indices = []
        for mid in filtered_ids:
            idx = self.movie_id_to_idx.get(mid)
            if idx is not None:
                filtered_indices.append((mid, idx))

        if not filtered_indices:
            return []

        # 최대 유사도 계산: (M, dim) @ (dim, N) = (M, N) → max(axis=1)
        indices = [idx for _, idx in filtered_indices]

        # SBERT 유사도: 각 후보 영화와 사용자 영화들 중 최대 유사도
        sbert_similarities = self.target_sbert_norm[indices] @ user_sbert_profile.T  # (M, N)
        sbert_scores = np.max(sbert_similarities, axis=1)  # (M,) - 최대값 사용

        # ALS 유사도: 각 후보 영화와 사용자 영화들 중 최대 유사도
        als_similarities = self.target_als_matrix[indices] @ user_als_profile.T  # (M, N)
        als_scores = np.max(als_similarities, axis=1)  # (M,) - 최대값 사용

        # 나머지는 부모 클래스와 동일 (MinMax 정규화, 최종 점수 계산)
        scaler = MinMaxScaler()

        # 평점 점수 조회
        filtered_rating = np.array([self.rating_scores.get(mid, 0.0) for mid, _ in filtered_indices])

        if len(sbert_scores) > 1:
            norm_sbert = scaler.fit_transform(sbert_scores.reshape(-1, 1)).squeeze()
            norm_als = scaler.fit_transform(als_scores.reshape(-1, 1)).squeeze()
            norm_rating = scaler.fit_transform(filtered_rating.reshape(-1, 1)).squeeze()
        else:
            norm_sbert = sbert_scores
            norm_als = als_scores
            norm_rating = filtered_rating

        # ALS 있는 영화 ID 집합
        als_ids = set(self.als_movie_to_idx.keys())

        # 최종 점수 계산
        movie_scores = []
        for i, (mid, _) in enumerate(filtered_indices):
            if mid in exclude_set:
                continue

            # 가중치 재조정
            if mid in als_ids:
                model_score = sbert_weight * norm_sbert[i] + als_weight * norm_als[i]
                rec_type = "hybrid"
            else:
                model_score = norm_sbert[i]
                rec_type = "sbert_only"

            rating_score = norm_rating[i] if isinstance(norm_rating, np.ndarray) else norm_rating
            final_score = model_score * 0.7 + rating_score * 0.3

            # 장르 부스트 (Track A only)
            meta = self.metadata_map.get(mid, {})
            if preferred_genres and len(preferred_genres) > 1:
                movie_genres = set(meta.get('genres', []))
                overlap = len(movie_genres & set(preferred_genres))
                if overlap > 0:
                    genre_weight = overlap / len(preferred_genres)
                    genre_boost = genre_weight * 0.15  # 최대 15% 부스트
                    final_score = final_score * (1 + genre_boost)

            movie_scores.append({
                'movie_id': mid,
                'tmdb_id': meta.get('tmdb_id'),
                'title': meta.get('title', 'Unknown'),
                'runtime': meta.get('runtime', 0),
                'genres': meta.get('genres', []),
                'vote_average': meta.get('vote_average', 0),
                'vote_count': meta.get('vote_count', 0),
                'overview': meta.get('overview', ''),
                'release_date': meta.get('release_date', ''),
                'poster_path': meta.get('poster_path', ''),
                'score': final_score,
                'recommendation_type': rec_type
            })

        # 점수순 정렬 후 상위 top_k
        movie_scores.sort(key=lambda x: x['score'], reverse=True)
        return movie_scores[:top_k]



class AveragedRecommender(HybridRecommender):
    """평균 임베딩 방식 추천 시스템 (현재 버전 상속)"""

    def __init__(self, db_config: dict = None, als_model_path: str = None,
                 als_data_path: str = None, device: str = None, base_recommender: HybridRecommender = None):
        """
        현재 버전과 동일하지만 평균 임베딩 방식 사용

        Args:
            base_recommender: 기존 HybridRecommender 인스턴스 (데이터 재사용)
            db_config, als_model_path, als_data_path: base_recommender 없을 때 사용
        """
        if base_recommender is not None:
            # 기존 인스턴스의 데이터 재사용 (초기화 스킵)
            print("  → Reusing data from existing HybridRecommender instance")
            self._copy_from_base(base_recommender)
        else:
            # 새로 초기화
            super().__init__(db_config, als_model_path, als_data_path, device)

        print("  → Using AVERAGED EMBEDDING method")

    def _copy_from_base(self, base: HybridRecommender):
        """기존 인스턴스로부터 모든 데이터 복사"""
        # DB 연결
        self.db = base.db
        self.device = base.device

        # 메타데이터
        self.metadata_map = base.metadata_map

        # SBERT 관련
        self.sbert_movie_ids = base.sbert_movie_ids
        self.sbert_embeddings = base.sbert_embeddings
        self.sbert_movie_to_idx = base.sbert_movie_to_idx

        # ALS 관련
        self.als_movie_to_idx = base.als_movie_to_idx
        self.als_item_factors = base.als_item_factors

        # 공통 영화 및 인덱스 매핑 (pre-aligned)
        self.common_movie_ids = base.common_movie_ids
        self.movie_id_to_idx = base.movie_id_to_idx
        self.target_sbert_matrix = base.target_sbert_matrix
        self.target_als_matrix = base.target_als_matrix
        self.target_sbert_norm = base.target_sbert_norm

        # 평점 데이터
        self.rating_scores = base.rating_scores

        # 필터링용 데이터
        self.movies_by_year = base.movies_by_year
        self.movies_by_genre = base.movies_by_genre
        self.movies_by_ott = base.movies_by_ott
        self.adult_movies = base.adult_movies
        self.non_adult_movies = base.non_adult_movies

        # OTT 매핑
        self.movie_ott_map = base.movie_ott_map

    def _get_user_profile(self, user_movie_ids: List[int]):
        """사용자 프로필 벡터 생성 - 평균 임베딩 방식"""
        # SBERT 프로필
        user_sbert_vecs = []
        for mid in user_movie_ids:
            if mid in self.sbert_movie_to_idx:
                user_sbert_vecs.append(self.sbert_embeddings[self.sbert_movie_to_idx[mid]])

        if not user_sbert_vecs:
            random_ids = list(self.sbert_movie_to_idx.keys())[:5]
            for mid in random_ids:
                user_sbert_vecs.append(self.sbert_embeddings[self.sbert_movie_to_idx[mid]])

        # 평균 벡터 계산 및 정규화
        user_sbert_profile = np.mean(user_sbert_vecs, axis=0)
        user_sbert_profile = user_sbert_profile / (np.linalg.norm(user_sbert_profile) + 1e-10)

        # ALS 프로필
        user_als_vecs = []
        for mid in user_movie_ids:
            if mid in self.als_movie_to_idx:
                user_als_vecs.append(self.als_item_factors[self.als_movie_to_idx[mid]])

        if not user_als_vecs:
            random_ids = list(self.als_movie_to_idx.keys())[:5]
            for mid in random_ids:
                user_als_vecs.append(self.als_item_factors[self.als_movie_to_idx[mid]])

        # 평균 벡터 계산 및 정규화 (🔧 수정: 정규화 추가)
        user_als_profile = np.mean(user_als_vecs, axis=0)
        user_als_profile = user_als_profile / (np.linalg.norm(user_als_profile) + 1e-10)

        return user_sbert_profile, user_als_profile

    def _get_top_movies(
        self,
        user_sbert_profile,
        user_als_profile,
        filtered_ids: List[int],
        sbert_weight: float,
        als_weight: float,
        top_k: int = 300,
        exclude_ids: Optional[List[int]] = None,
        preferred_genres: Optional[List[str]] = None
    ):
        """상위 영화 선정 - 평균 임베딩 유사도 계산"""
        exclude_ids = exclude_ids or []
        exclude_set = set(exclude_ids)

        # 필터된 영화들의 인덱스
        filtered_indices = []
        for mid in filtered_ids:
            idx = self.movie_id_to_idx.get(mid)
            if idx is not None:
                filtered_indices.append((mid, idx))

        if not filtered_indices:
            return []

        # 평균 벡터 유사도 계산: (M, dim) @ (dim,) = (M,)
        indices = [idx for _, idx in filtered_indices]

        sbert_scores = self.target_sbert_norm[indices] @ user_sbert_profile
        als_scores = self.target_als_matrix[indices] @ user_als_profile

        # MinMax 정규화
        scaler = MinMaxScaler()

        # 평점 점수 조회
        filtered_rating = np.array([self.rating_scores.get(mid, 0.0) for mid, _ in filtered_indices])

        if len(sbert_scores) > 1:
            norm_sbert = scaler.fit_transform(sbert_scores.reshape(-1, 1)).squeeze()
            norm_als = scaler.fit_transform(als_scores.reshape(-1, 1)).squeeze()
            norm_rating = scaler.fit_transform(filtered_rating.reshape(-1, 1)).squeeze()
        else:
            norm_sbert = sbert_scores
            norm_als = als_scores
            norm_rating = filtered_rating

        # ALS 있는 영화 ID 집합
        als_ids = set(self.als_movie_to_idx.keys())

        # 최종 점수 계산
        movie_scores = []
        for i, (mid, _) in enumerate(filtered_indices):
            if mid in exclude_set:
                continue

            # 가중치 재조정
            if mid in als_ids:
                model_score = sbert_weight * norm_sbert[i] + als_weight * norm_als[i]
                rec_type = "hybrid"
            else:
                model_score = norm_sbert[i]
                rec_type = "sbert_only"

            rating_score = norm_rating[i] if isinstance(norm_rating, np.ndarray) else norm_rating
            final_score = model_score * 0.7 + rating_score * 0.3

            meta = self.metadata_map.get(mid, {})
            movie_scores.append({
                'movie_id': mid,
                'tmdb_id': meta.get('tmdb_id'),
                'title': meta.get('title', 'Unknown'),
                'runtime': meta.get('runtime', 0),
                'genres': meta.get('genres', []),
                'vote_average': meta.get('vote_average', 0),
                'vote_count': meta.get('vote_count', 0),
                'overview': meta.get('overview', ''),
                'release_date': meta.get('release_date', ''),
                'poster_path': meta.get('poster_path', ''),
                'score': final_score,
                'recommendation_type': rec_type
            })

        # 점수순 정렬 후 상위 top_k
        movie_scores.sort(key=lambda x: x['score'], reverse=True)
        return movie_scores[:top_k]


class MeanSimilarityRecommender(HybridRecommender):
    """평균 유사도 방식 추천 시스템 (현재 버전 상속) = 현재 프로덕션 버전!

    개별 영화 임베딩 유지 → 각 후보 영화와 개별 유사도 계산 → 평균
    """

    def __init__(self, db_config: dict = None, als_model_path: str = None,
                 als_data_path: str = None, device: str = None, base_recommender: HybridRecommender = None):
        """
        현재 버전과 동일 (평균 유사도 방식)

        Args:
            base_recommender: 기존 HybridRecommender 인스턴스 (데이터 재사용)
            db_config, als_model_path, als_data_path: base_recommender 없을 때 사용
        """
        if base_recommender is not None:
            # 기존 인스턴스의 데이터 재사용
            print("  → Reusing data from existing HybridRecommender instance")
            self._copy_from_base(base_recommender)
        else:
            # 새로 초기화
            super().__init__(db_config, als_model_path, als_data_path, device)

        print("  → Using MEAN SIMILARITY method (현재 프로덕션 버전)")

    def _copy_from_base(self, base: HybridRecommender):
        """기존 인스턴스로부터 모든 데이터 복사"""
        # AveragedRecommender와 동일
        self.db = base.db
        self.device = base.device
        self.metadata_map = base.metadata_map
        self.sbert_movie_ids = base.sbert_movie_ids
        self.sbert_embeddings = base.sbert_embeddings
        self.sbert_movie_to_idx = base.sbert_movie_to_idx
        self.als_movie_to_idx = base.als_movie_to_idx
        self.als_item_factors = base.als_item_factors
        self.common_movie_ids = base.common_movie_ids
        self.movie_id_to_idx = base.movie_id_to_idx
        self.target_sbert_matrix = base.target_sbert_matrix
        self.target_als_matrix = base.target_als_matrix
        self.target_sbert_norm = base.target_sbert_norm
        self.rating_scores = base.rating_scores
        self.movies_by_year = base.movies_by_year
        self.movies_by_genre = base.movies_by_genre
        self.movies_by_ott = base.movies_by_ott
        self.adult_movies = base.adult_movies
        self.non_adult_movies = base.non_adult_movies
        self.movie_ott_map = base.movie_ott_map

    # _get_user_profile과 _get_top_movies는 부모 클래스의 것을 그대로 사용
    # 현재 버전: 개별 임베딩 행렬 반환 (N, dim) + 평균 유사도 계산

    def _get_user_profile(self, user_movie_ids: List[int]):
        """사용자 프로필 벡터 생성 - 개별 임베딩 행렬 반환 (평균 유사도 계산용)"""
        # SBERT 프로필 (개별 임베딩 유지)
        user_sbert_vecs = []
        for mid in user_movie_ids:
            if mid in self.sbert_movie_to_idx:
                user_sbert_vecs.append(self.sbert_embeddings[self.sbert_movie_to_idx[mid]])

        if not user_sbert_vecs:
            random_ids = list(self.sbert_movie_to_idx.keys())[:5]
            for mid in random_ids:
                user_sbert_vecs.append(self.sbert_embeddings[self.sbert_movie_to_idx[mid]])

        # 행렬로 변환 및 정규화 (N, SBERT_dim)
        user_sbert_matrix = np.array(user_sbert_vecs)
        user_sbert_matrix = user_sbert_matrix / (
            np.linalg.norm(user_sbert_matrix, axis=1, keepdims=True) + 1e-10
        )

        # ALS 프로필 (개별 임베딩 유지)
        user_als_vecs = []
        for mid in user_movie_ids:
            if mid in self.als_movie_to_idx:
                user_als_vecs.append(self.als_item_factors[self.als_movie_to_idx[mid]])

        if not user_als_vecs:
            random_ids = list(self.als_movie_to_idx.keys())[:5]
            for mid in random_ids:
                user_als_vecs.append(self.als_item_factors[self.als_movie_to_idx[mid]])

        # 행렬로 변환 및 정규화 (N, ALS_dim)
        user_als_matrix = np.array(user_als_vecs)
        user_als_matrix = user_als_matrix / (
            np.linalg.norm(user_als_matrix, axis=1, keepdims=True) + 1e-10
        )

        return user_sbert_matrix, user_als_matrix

    def _get_top_movies(
        self,
        user_sbert_profile,
        user_als_profile,
        filtered_ids: List[int],
        sbert_weight: float,
        als_weight: float,
        top_k: int = 300,
        exclude_ids: Optional[List[int]] = None,
        preferred_genres: Optional[List[str]] = None
    ):
        """상위 영화 선정 - 평균 유사도 계산"""
        exclude_ids = exclude_ids or []
        exclude_set = set(exclude_ids)

        # 필터된 영화들의 인덱스
        filtered_indices = []
        for mid in filtered_ids:
            idx = self.movie_id_to_idx.get(mid)
            if idx is not None:
                filtered_indices.append((mid, idx))

        if not filtered_indices:
            return []

        # 평균 유사도 계산: (M, dim) @ (dim, N) = (M, N) → mean(axis=1)
        indices = [idx for _, idx in filtered_indices]

        # SBERT 유사도: 각 후보 영화와 사용자 영화들의 유사도 평균
        sbert_similarities = self.target_sbert_norm[indices] @ user_sbert_profile.T  # (M, N)
        sbert_scores = np.mean(sbert_similarities, axis=1)  # (M,)

        # ALS 유사도: 각 후보 영화와 사용자 영화들의 유사도 평균
        als_similarities = self.target_als_matrix[indices] @ user_als_profile.T  # (M, N)
        als_scores = np.mean(als_similarities, axis=1)  # (M,)

        # 나머지는 현재 버전과 동일 (MinMax 정규화, 최종 점수 계산)
        scaler = MinMaxScaler()

        # 평점 점수 조회
        filtered_rating = np.array([self.rating_scores.get(mid, 0.0) for mid, _ in filtered_indices])

        if len(sbert_scores) > 1:
            norm_sbert = scaler.fit_transform(sbert_scores.reshape(-1, 1)).squeeze()
            norm_als = scaler.fit_transform(als_scores.reshape(-1, 1)).squeeze()
            norm_rating = scaler.fit_transform(filtered_rating.reshape(-1, 1)).squeeze()
        else:
            norm_sbert = sbert_scores
            norm_als = als_scores
            norm_rating = filtered_rating

        # ALS 있는 영화 ID 집합
        als_ids = set(self.als_movie_to_idx.keys())

        # 최종 점수 계산
        movie_scores = []
        for i, (mid, _) in enumerate(filtered_indices):
            if mid in exclude_set:
                continue

            # 가중치 재조정
            if mid in als_ids:
                model_score = sbert_weight * norm_sbert[i] + als_weight * norm_als[i]
                rec_type = "hybrid"
            else:
                model_score = norm_sbert[i]
                rec_type = "sbert_only"

            rating_score = norm_rating[i] if isinstance(norm_rating, np.ndarray) else norm_rating
            final_score = model_score * 0.7 + rating_score * 0.3

            meta = self.metadata_map.get(mid, {})
            movie_scores.append({
                'movie_id': mid,
                'tmdb_id': meta.get('tmdb_id'),
                'title': meta.get('title', 'Unknown'),
                'runtime': meta.get('runtime', 0),
                'genres': meta.get('genres', []),
                'vote_average': meta.get('vote_average', 0),
                'vote_count': meta.get('vote_count', 0),
                'overview': meta.get('overview', ''),
                'release_date': meta.get('release_date', ''),
                'poster_path': meta.get('poster_path', ''),
                'score': final_score,
                'recommendation_type': rec_type
            })

        # 점수순 정렬 후 상위 top_k
        movie_scores.sort(key=lambda x: x['score'], reverse=True)
        return movie_scores[:top_k]



class RecommenderEvaluator:
    """추천 알고리즘 평가 클래스"""

    def __init__(self, db_config: Dict):
        self.db_config = db_config
        # 현재 버전에서는 DB 연결을 HybridRecommender가 직접 관리

    def get_test_users_from_ratings_csv(
        self,
        ratings_csv_path: str,
        recommender: HybridRecommender,
        min_ratings: int = 20,
        num_users: int = 100
    ) -> List[Tuple[int, List[int], List[int]]]:
        """
        ratings.csv 파일에서 테스트 사용자 데이터 추출

        Args:
            ratings_csv_path: ratings.csv 파일 경로
            recommender: 추천 시스템 인스턴스 (DB 확인용)
            min_ratings: 최소 평점 개수 (DB 존재 영화 기준)
            num_users: 최대 사용자 수

        Returns:
            [(user_id, train_movies, test_movies), ...]
        """
        import pandas as pd

        print(f"\n📊 ratings.csv에서 테스트 사용자 추출 중...")
        print(f"  파일: {ratings_csv_path}")
        print(f"  조건: 최소 {min_ratings}개 평가 (DB 존재 영화 기준), 최대 {num_users}명")

        try:
            # ratings.csv 로드
            df = pd.read_csv(ratings_csv_path)
            print(f"  전체 평점 데이터: {len(df):,}개")
            print(f"  전체 사용자: {df['userId'].nunique():,}명")
            print(f"  전체 영화: {df['movieId'].nunique():,}개")

            # 🔧 개선 1: DB에 존재하는 영화만 필터링
            valid_movie_ids = set(recommender.metadata_map.keys())
            df_valid = df[df['movieId'].isin(valid_movie_ids)].copy()

            print(f"  DB에 존재하는 평점: {len(df_valid):,}개 ({len(df_valid)/len(df)*100:.1f}%)")
            print(f"  DB에 존재하는 영화: {df_valid['movieId'].nunique():,}개")

            # 🔧 개선 2: 2000년 이상, 비성인물만 필터링
            valid_filtered_ids = set()
            for mid in df_valid['movieId'].unique():
                meta = recommender.metadata_map.get(mid, {})

                # 2000년 이상 체크
                release_date = meta.get('release_date', '')
                if release_date:
                    try:
                        year = int(release_date[:4])
                        if year < 2000:
                            continue
                    except:
                        continue

                # 비성인물 체크
                if meta.get('adult', False):
                    continue

                valid_filtered_ids.add(mid)

            df_filtered = df_valid[df_valid['movieId'].isin(valid_filtered_ids)].copy()
            print(f"  필터링 후 평점: {len(df_filtered):,}개 ({len(df_filtered)/len(df)*100:.1f}%)")
            print(f"  필터링 후 영화: {df_filtered['movieId'].nunique():,}개")

            # 🔧 개선 3: 필터링된 데이터로 사용자 개수 계산
            user_counts = df_filtered.groupby('userId').size()
            valid_users = user_counts[user_counts >= min_ratings].index.tolist()
            print(f"  {min_ratings}개 이상 평가한 사용자 (필터링 후): {len(valid_users):,}명")

            # 상위 num_users 명 선택 (필터링된 평점 많은 순)
            top_users = user_counts.nlargest(num_users).index.tolist()

            test_users = []
            skipped_stats = {
                'insufficient_train': 0,
                'insufficient_test': 0
            }

            for user_id in top_users:
                # 사용자의 필터링된 평점 가져오기 (시간순 정렬)
                user_ratings = df_filtered[df_filtered['userId'] == user_id].sort_values('timestamp')

                # 영화 ID 리스트 (이미 필터링됨)
                movies = user_ratings['movieId'].tolist()

                # 80% train, 20% test 분할
                split_idx = int(len(movies) * 0.8)
                train = movies[:split_idx]
                test = movies[split_idx:]

                # 최소 조건: train >= 15개, test >= 5개 (여유 있게)
                if len(train) < 15:
                    skipped_stats['insufficient_train'] += 1
                    continue

                if len(test) < 5:
                    skipped_stats['insufficient_test'] += 1
                    continue

                test_users.append((user_id, train, test))

            print(f"✅ {len(test_users)}명의 테스트 사용자 추출 완료")

            if skipped_stats['insufficient_train'] > 0 or skipped_stats['insufficient_test'] > 0:
                print(f"  스킵된 사용자:")
                print(f"    - Train 부족: {skipped_stats['insufficient_train']}명")
                print(f"    - Test 부족: {skipped_stats['insufficient_test']}명")

            if len(test_users) > 0:
                avg_train = sum(len(t) for _, t, _ in test_users) / len(test_users)
                avg_test = sum(len(t) for _, _, t in test_users) / len(test_users)
                print(f"  평균 train 영화 수: {avg_train:.1f}개")
                print(f"  평균 test 영화 수: {avg_test:.1f}개")

            return test_users

        except Exception as e:
            print(f"❌ ratings.csv 로드 실패: {e}")
            import traceback
            traceback.print_exc()
            return []

    def filter_valid_movies(
        self,
        movie_ids: List[int],
        recommender: HybridRecommender
    ) -> Tuple[List[int], Dict[str, int]]:
        """
        DB에 존재하고 추천 가능한 영화만 필터링

        Args:
            movie_ids: 원본 영화 ID 리스트
            recommender: 추천 시스템 인스턴스

        Returns:
            (valid_movies, stats)
            - valid_movies: 유효한 영화 ID 리스트
            - stats: {'total': 원본 개수, 'not_in_db': DB에 없는 개수, 'filtered': 필터링된 개수, 'valid': 유효한 개수}
        """
        stats = {
            'total': len(movie_ids),
            'not_in_db': 0,
            'filtered': 0,
            'valid': 0
        }

        valid_movies = []

        for mid in movie_ids:
            # DB에 존재하는지 확인
            if mid not in recommender.metadata_map:
                stats['not_in_db'] += 1
                continue

            meta = recommender.metadata_map[mid]

            # 추천 가능 조건 체크 (2000년 이상, 비성인물)
            release_date = meta.get('release_date', '')
            if release_date:
                try:
                    year = int(release_date[:4])
                    if year < 2000:
                        stats['filtered'] += 1
                        continue
                except:
                    stats['filtered'] += 1
                    continue

            if meta.get('adult', False):
                stats['filtered'] += 1
                continue

            valid_movies.append(mid)
            stats['valid'] += 1

        return valid_movies, stats

    def calculate_precision_at_k(
        self,
        recommendations: List[int],
        ground_truth: List[int],
        k: int = 10
    ) -> float:
        """Precision@K 계산"""
        top_k = recommendations[:k]
        relevant = set(ground_truth)
        hits = len(set(top_k) & relevant)
        return hits / k if k > 0 else 0.0

    def calculate_ndcg_at_k(
        self,
        recommendations: List[int],
        ground_truth: List[int],
        k: int = 10
    ) -> float:
        """NDCG@K 계산
        
        NDCG = DCG / IDCG
        - DCG: 추천 순서대로의 누적 이득
        - IDCG: 이상적인 순서(정렬)의 누적 이득
        """
        top_k = recommendations[:k]
        relevant = set(ground_truth)

        # 추천 순서대로의 관련도 (0 or 1)
        relevance = np.array([1.0 if movie_id in relevant else 0.0 for movie_id in top_k])
        
        # 관련 영화가 없으면 0 반환
        if relevance.sum() == 0:
            return 0.0

        # DCG 계산 (Discounted Cumulative Gain)
        # DCG = sum(rel_i / log2(i + 1)) for i in 1..k
        dcg = 0.0
        for i, rel in enumerate(relevance):
            dcg += rel / np.log2(i + 2)  # i+2 because i starts at 0
        
        # IDCG 계산 (Ideal DCG - 관련도 순으로 정렬)
        ideal_relevance = np.sort(relevance)[::-1]  # 내림차순 정렬
        idcg = 0.0
        for i, rel in enumerate(ideal_relevance):
            idcg += rel / np.log2(i + 2)
        
        # NDCG = DCG / IDCG
        return dcg / idcg if idcg > 0 else 0.0

    def calculate_recall_at_k(
        self,
        recommendations: List[int],
        ground_truth: List[int],
        k: int = 10
    ) -> float:
        """Recall@K 계산

        추천한 K개 중 실제로 사용자가 본 영화의 비율 (전체 테스트 영화 대비)
        """
        top_k = recommendations[:k]
        relevant = set(ground_truth)
        hits = len(set(top_k) & relevant)
        return hits / len(relevant) if len(relevant) > 0 else 0.0

    def calculate_diversity(
        self,
        recommendations: List[Dict[str, Any]]
    ) -> float:
        """장르 다양성 계산"""
        all_genres = []
        for movie in recommendations:
            genres = movie.get('genres', [])
            all_genres.extend(genres)

        if len(all_genres) == 0:
            return 0.0

        unique_genres = len(set(all_genres))
        total_genres = len(all_genres)

        return unique_genres / total_genres

    def evaluate_recommender(
        self,
        recommender: HybridRecommender,
        test_users: List[Tuple[str, List[int], List[int]]],
        method_name: str,
        k: int = 10
    ) -> Dict[str, Any]:
        """
        추천 시스템 평가 (Top-K 직접 평가 방식)

        Args:
            recommender: 추천 시스템 인스턴스
            test_users: 테스트 사용자 리스트
            method_name: 방법 이름
            k: 평가할 상위 K개

        Returns:
            평가 결과 딕셔너리
        """
        precision_scores = []
        recall_scores = []
        ndcg_scores = []
        diversity_scores = []
        elapsed_times = []

        # 통계 추적
        total_stats = {
            'users_evaluated': 0,
            'users_skipped': 0,
            'train_not_in_db': 0,
            'train_filtered': 0,
            'test_not_in_db': 0,
            'test_filtered': 0
        }

        print(f"\n{'='*60}")
        print(f"평가 시작: {method_name}")
        print(f"{'='*60}")

        for idx, (user_id, train_movies, test_movies) in enumerate(test_users):
            # 추천 시간 측정
            start_time = time.time()

            try:
                # 1. 유저 프로필 생성
                user_sbert_profile, user_als_profile = recommender._get_user_profile(train_movies)

                # 2. 모든 영화 ID 가져오기 (필터링 없음)
                all_movie_ids = list(recommender.metadata_map.keys())
                
                # 3. Train 영화만 제외 (이미 본 영화)
                candidate_ids = [mid for mid in all_movie_ids if mid not in train_movies]
                
                # 4. 순수 임베딩 유사도 계산
                top_movies = self._get_top_movies_pure(
                    recommender=recommender,
                    user_sbert_profile=user_sbert_profile,
                    user_als_profile=user_als_profile,
                    candidate_ids=candidate_ids,
                    sbert_weight=0.7,
                    als_weight=0.3,
                    top_k=k
                )

                elapsed = time.time() - start_time
                elapsed_times.append(elapsed)

                # 상위 K개 영화 ID 추출
                top_k_ids = [m['movie_id'] for m in top_movies[:k]]

                # Precision@K 계산
                precision = self.calculate_precision_at_k(top_k_ids, test_movies, k)
                precision_scores.append(precision)

                # Recall@K 계산
                recall = self.calculate_recall_at_k(top_k_ids, test_movies, k)
                recall_scores.append(recall)

                # NDCG@K 계산
                ndcg = self.calculate_ndcg_at_k(top_k_ids, test_movies, k)
                ndcg_scores.append(ndcg)

                # Diversity 계산
                diversity = self.calculate_diversity(top_movies[:k])
                diversity_scores.append(diversity)

                total_stats['users_evaluated'] += 1

                # 진행 상황 출력 (매 10명마다)
                if (idx + 1) % 10 == 0:
                    print(f"  진행: {idx + 1}/{len(test_users)} users (평가 완료: {total_stats['users_evaluated']}명)", flush=True)

            except Exception as e:
                total_stats['users_skipped'] += 1
                print(f"  ⚠️ User {user_id} 평가 실패: {e}", flush=True)
                import traceback
                traceback.print_exc()
                continue

        # 결과 집계
        results = {
            'precision@10': np.mean(precision_scores) if precision_scores else 0.0,
            'recall@10': np.mean(recall_scores) if recall_scores else 0.0,
            'ndcg@10': np.mean(ndcg_scores) if ndcg_scores else 0.0,
            'diversity': np.mean(diversity_scores) if diversity_scores else 0.0,
            'avg_time': np.mean(elapsed_times) if elapsed_times else 0.0,
            'std_time': np.std(elapsed_times) if elapsed_times else 0.0,
            'num_users': len(precision_scores),
            # 원본 점수 저장 (통계 검증용)
            'precision_scores': precision_scores,
            'recall_scores': recall_scores,
            'ndcg_scores': ndcg_scores,
            'diversity_scores': diversity_scores,
            'elapsed_times': elapsed_times,
            # 통계 정보
            'stats': total_stats
        }

        print(f"\n📊 평가 결과 ({method_name}):", flush=True)
        print(f"  Precision@{k}: {results['precision@10']:.4f}", flush=True)
        print(f"  Recall@{k}: {results['recall@10']:.4f}", flush=True)
        print(f"  NDCG@{k}: {results['ndcg@10']:.4f}", flush=True)
        print(f"  Diversity: {results['diversity']:.4f}", flush=True)
        print(f"  평균 추천 시간: {results['avg_time']:.3f}s (±{results['std_time']:.3f}s)", flush=True)
        print(f"  평가 사용자 수: {results['num_users']}명", flush=True)

        # 평가 통계 출력
        print(f"\n📈 평가 통계:", flush=True)
        print(f"  평가 완료: {total_stats['users_evaluated']}명", flush=True)
        print(f"  스킵: {total_stats['users_skipped']}명", flush=True)

        return results
    
    def _get_top_movies_pure(
        self,
        recommender: HybridRecommender,
        user_sbert_profile: np.ndarray,
        user_als_profile: np.ndarray,
        candidate_ids: List[int],
        sbert_weight: float,
        als_weight: float,
        top_k: int
    ) -> List[Dict[str, Any]]:
        """순수 임베딩 유사도만으로 상위 영화 선정
        
        - 필터링 없음
        - 장르 부스트 없음
        - 평점 점수 없음
        - 정규화만 사용 (SBERT + ALS 공정 결합)
        """
        # 후보 영화들의 인덱스
        candidate_indices = []
        for mid in candidate_ids:
            idx = recommender.movie_id_to_idx.get(mid)
            if idx is not None:
                candidate_indices.append((mid, idx))
        
        if not candidate_indices:
            return []
        
        indices = [idx for _, idx in candidate_indices]

        # ALS 타겟 행렬 정규화 (SBERT와 동일한 스케일로)
        target_als_norm = recommender.target_als_matrix / (
            np.linalg.norm(recommender.target_als_matrix, axis=1, keepdims=True) + 1e-10
        )

        # 유사도 계산 (프로필 방식에 따라 다름)
        if isinstance(recommender, AveragedRecommender):
            # 평균 임베딩 방식: (M, dim) @ (dim,) = (M,)
            sbert_scores = recommender.target_sbert_norm[indices] @ user_sbert_profile
            als_scores = target_als_norm[indices] @ user_als_profile
        else:
            # 최대/평균 유사도 방식: (M, dim) @ (dim, N) = (M, N)
            sbert_similarities = recommender.target_sbert_norm[indices] @ user_sbert_profile.T
            als_similarities = target_als_norm[indices] @ user_als_profile.T

            # 최대 또는 평균 (먼저 계산)
            if isinstance(recommender, MaxSimilarityRecommender):
                sbert_scores = np.max(sbert_similarities, axis=1)
                als_scores = np.max(als_similarities, axis=1)
            elif isinstance(recommender, MeanSimilarityRecommender):
                sbert_scores = np.mean(sbert_similarities, axis=1)
                als_scores = np.mean(als_similarities, axis=1)
            else:
                raise ValueError(f"Unknown recommender type: {type(recommender)}")

            # 프로덕션과 동일: SBERT와 ALS 따로 정규화 후 결합
            scaler = MinMaxScaler()

            if len(sbert_scores) > 1:
                norm_sbert = scaler.fit_transform(sbert_scores.reshape(-1, 1)).squeeze()
                norm_als = scaler.fit_transform(als_scores.reshape(-1, 1)).squeeze()
            else:
                norm_sbert = sbert_scores
                norm_als = als_scores

            # ALS 있는 영화 ID 집합
            als_ids = set(recommender.als_movie_to_idx.keys())

            # 최종 점수 계산 (프로덕션과 동일 로직)
            final_scores = np.zeros(len(candidate_indices))
            for i, (mid, _) in enumerate(candidate_indices):
                if mid in als_ids:
                    final_scores[i] = sbert_weight * norm_sbert[i] + als_weight * norm_als[i]
                else:
                    final_scores[i] = norm_sbert[i]

            # 평가용이므로 sbert_scores를 None으로 (평균 임베딩 분기와 구분)
            sbert_scores = None
            als_scores = None
        
        # 최종 점수 계산
        movie_scores = []
        
        # 평균 임베딩 방식: SBERT와 ALS 따로 정규화 후 결합
        if sbert_scores is not None:
            # MinMax 정규화 (SBERT + ALS 공정 결합)
            scaler = MinMaxScaler()
            
            if len(sbert_scores) > 1:
                norm_sbert = scaler.fit_transform(sbert_scores.reshape(-1, 1)).squeeze()
                norm_als = scaler.fit_transform(als_scores.reshape(-1, 1)).squeeze()
            else:
                norm_sbert = sbert_scores
                norm_als = als_scores
            
            # ALS 있는 영화 ID 집합
            als_ids = set(recommender.als_movie_to_idx.keys())
            
            # 최종 점수 계산 (순수 임베딩만)
            for i, (mid, _) in enumerate(candidate_indices):
                # ALS 있으면 하이브리드, 없으면 SBERT만
                if mid in als_ids:
                    final_score = sbert_weight * norm_sbert[i] + als_weight * norm_als[i]
                else:
                    final_score = norm_sbert[i]
                
                meta = recommender.metadata_map.get(mid, {})
                movie_scores.append({
                    'movie_id': mid,
                    'title': meta.get('title', 'Unknown'),
                    'genres': meta.get('genres', []),
                    'score': final_score
                })
        
        # 최대/평균 유사도 방식: 이미 final_scores 계산됨
        else:
            for i, (mid, _) in enumerate(candidate_indices):
                meta = recommender.metadata_map.get(mid, {})
                movie_scores.append({
                    'movie_id': mid,
                    'title': meta.get('title', 'Unknown'),
                    'genres': meta.get('genres', []),
                    'score': final_scores[i]
                })
        
        # 점수순 정렬 후 상위 top_k
        movie_scores.sort(key=lambda x: x['score'], reverse=True)
        return movie_scores[:top_k]


def interpret_effect_size(d):
    """Cohen's d 효과 크기 해석"""
    abs_d = abs(d)
    if abs_d < 0.2:
        return "매우 작음"
    elif abs_d < 0.5:
        return "작음"
    elif abs_d < 0.8:
        return "중간"
    else:
        return "큼"


def main():
    """메인 평가 함수"""

    # 재현성을 위한 시드 고정
    set_seed(42)

    load_dotenv()

    # DB 설정
    DB_CONFIG = {
        'host': os.getenv("DATABASE_HOST", "localhost"),
        'port': int(os.getenv("DATABASE_PORT", 5432)),
        'database': os.getenv("DATABASE_NAME", "moviesir"),
        'user': os.getenv("DATABASE_USER", "movigation"),
        'password': os.getenv("DATABASE_PASSWORD", "moviesir123")
    }

    # 모델 경로 (ai/ 폴더 기준)
    current_dir = Path(__file__).parent.parent.parent  # ai/ 폴더
    ALS_MODEL_PATH = str(current_dir / "training/als_data")
    ALS_DATA_PATH = str(current_dir / "training/als_data")
    RATINGS_CSV_PATH = str(current_dir / "training/original_data/ratings.csv")

    print("\n" + "="*60)
    print("추천 알고리즘 평가 및 비교")
    print("평균 임베딩 vs 최대 유사도")
    print("="*60)

    # 1. 기본 추천 시스템 초기화 (데이터 로딩 및 필터링용)
    print("\n" + "="*60)
    print("📦 추천 시스템 데이터 초기화 중...")
    print("="*60)

    base_recommender = HybridRecommender(
        db_config=DB_CONFIG,
        als_model_path=ALS_MODEL_PATH,
        als_data_path=ALS_DATA_PATH
    )
    print("✅ 초기화 완료 (이 데이터를 3가지 방식 모두에서 재사용)\n")

    # 2. 테스트 데이터 준비 (ratings.csv 사용, 필터링 포함)
    evaluator = RecommenderEvaluator(DB_CONFIG)
    test_users = evaluator.get_test_users_from_ratings_csv(
        ratings_csv_path=RATINGS_CSV_PATH,
        recommender=base_recommender,  # 필터링에 사용
        min_ratings=20,
        num_users=100
    )

    if len(test_users) == 0:
        print("⚠️ 테스트 사용자가 없습니다.")
        print("\n💡 해결 방법:")
        print("   1. ratings.csv 파일이 존재하는지 확인")
        print(f"   2. 경로 확인: {RATINGS_CSV_PATH}")
        base_recommender.close()
        return

    print(f"\n✅ 총 {len(test_users)}명의 테스트 사용자로 평가 진행")

    # 3. 최대 유사도 방식 평가
    print("\n" + "="*60)
    print("1️⃣ 최대 유사도 방식 평가 시작...")
    print("="*60)

    recommender_max = MaxSimilarityRecommender(base_recommender=base_recommender)

    results_max = evaluator.evaluate_recommender(
        recommender=recommender_max,
        test_users=test_users,
        method_name="최대 유사도 방식 (Max Similarity)",
        k=10
    )

    # 4. 평균 임베딩 방식 평가
    print("\n" + "="*60)
    print("2️⃣ 평균 임베딩 방식 평가 시작...")
    print("="*60)

    recommender_avg = AveragedRecommender(base_recommender=base_recommender)

    results_avg = evaluator.evaluate_recommender(
        recommender=recommender_avg,
        test_users=test_users,
        method_name="평균 임베딩 방식 (Averaged Embedding)",
        k=10
    )

    # 5. 평균 유사도 방식 평가 (현재 프로덕션 버전)
    print("\n" + "="*60)
    print("3️⃣ 평균 유사도 방식 평가 시작 (현재 프로덕션 버전)...")
    print("="*60)

    recommender_mean = MeanSimilarityRecommender(base_recommender=base_recommender)

    results_mean = evaluator.evaluate_recommender(
        recommender=recommender_mean,
        test_users=test_users,
        method_name="평균 유사도 방식 (Mean Similarity - 현재)",
        k=10
    )

    # 6. 정리 (DB 연결은 base_recommender가 관리하므로 한 번만 close)
    base_recommender.close()

    # 7. 통계적 유의성 검증
    print("\n" + "="*60)
    print("📈 통계적 유의성 검증")
    print("="*60)

    # 평가된 사용자 수가 다를 수 있으므로 최소 길이로 맞춤
    min_len = min(len(results_max['precision_scores']), len(results_avg['precision_scores']))

    if min_len < 2:
        print("⚠️ 통계 검증 불가: 평가된 사용자 수 부족")
    else:
        # Precision 비교
        t_stat_prec, p_value_prec = stats.ttest_rel(
            results_max['precision_scores'][:min_len],
            results_avg['precision_scores'][:min_len]
        )

        # NDCG 비교
        t_stat_ndcg, p_value_ndcg = stats.ttest_rel(
            results_max['ndcg_scores'][:min_len],
            results_avg['ndcg_scores'][:min_len]
        )

        # 효과 크기 (Cohen's d)
        def cohens_d(x, y):
            nx, ny = len(x), len(y)
            dof = nx + ny - 2
            return (np.mean(x) - np.mean(y)) / np.sqrt(((nx-1)*np.std(x, ddof=1)**2 + (ny-1)*np.std(y, ddof=1)**2) / dof)

        effect_prec = cohens_d(results_max['precision_scores'][:min_len], results_avg['precision_scores'][:min_len])
        effect_ndcg = cohens_d(results_max['ndcg_scores'][:min_len], results_avg['ndcg_scores'][:min_len])

        print(f"\nPrecision@10:")
        print(f"  t-statistic: {t_stat_prec:.4f}")
        print(f"  p-value: {p_value_prec:.4f} {'✅ 유의함' if p_value_prec < 0.05 else '❌ 유의하지 않음'}")
        print(f"  Cohen's d: {effect_prec:.4f} ({interpret_effect_size(effect_prec)})")

        print(f"\nNDCG@10:")
        print(f"  t-statistic: {t_stat_ndcg:.4f}")
        print(f"  p-value: {p_value_ndcg:.4f} {'✅ 유의함' if p_value_ndcg < 0.05 else '❌ 유의하지 않음'}")
        print(f"  Cohen's d: {effect_ndcg:.4f} ({interpret_effect_size(effect_ndcg)})")

    # 7. 결과 비교 출력
    print("\n" + "="*60)
    print("📊 최종 평가 결과")
    print("="*60)

    print(f"\n🔵 최대 유사도 방식:")
    print(f"  Precision@10: {results_max['precision@10']:.4f}")
    print(f"  Recall@10: {results_max['recall@10']:.4f}")
    print(f"  NDCG@10: {results_max['ndcg@10']:.4f}")
    print(f"  Diversity: {results_max['diversity']:.4f}")
    print(f"  평균 추천 시간: {results_max['avg_time']:.3f}s (±{results_max['std_time']:.3f}s)")

    print(f"\n🔴 평균 임베딩 방식:")
    print(f"  Precision@10: {results_avg['precision@10']:.4f}")
    print(f"  Recall@10: {results_avg['recall@10']:.4f}")
    print(f"  NDCG@10: {results_avg['ndcg@10']:.4f}")
    print(f"  Diversity: {results_avg['diversity']:.4f}")
    print(f"  평균 추천 시간: {results_avg['avg_time']:.3f}s (±{results_avg['std_time']:.3f}s)")

    print(f"\n🟢 평균 유사도 방식:")
    print(f"  Precision@10: {results_mean['precision@10']:.4f}")
    print(f"  Recall@10: {results_mean['recall@10']:.4f}")
    print(f"  NDCG@10: {results_mean['ndcg@10']:.4f}")
    print(f"  Diversity: {results_mean['diversity']:.4f}")
    print(f"  평균 추천 시간: {results_mean['avg_time']:.3f}s (±{results_mean['std_time']:.3f}s)")

    # 개선율 계산 (평균 임베딩 기준)
    if results_avg['precision@10'] > 0:
        print(f"\n📈 개선율 (평균 임베딩 기준):")
        
        # 최대 유사도 vs 평균 임베딩
        max_prec_improvement = (results_max['precision@10'] - results_avg['precision@10']) / results_avg['precision@10'] * 100
        max_recall_improvement = (results_max['recall@10'] - results_avg['recall@10']) / results_avg['recall@10'] * 100 if results_avg['recall@10'] > 0 else 0
        max_ndcg_improvement = (results_max['ndcg@10'] - results_avg['ndcg@10']) / results_avg['ndcg@10'] * 100
        max_div_improvement = (results_max['diversity'] - results_avg['diversity']) / results_avg['diversity'] * 100 if results_avg['diversity'] > 0 else 0
        max_time_change = (results_max['avg_time'] - results_avg['avg_time']) / results_avg['avg_time'] * 100 if results_avg['avg_time'] > 0 else 0

        # 평균 유사도 vs 평균 임베딩
        mean_prec_improvement = (results_mean['precision@10'] - results_avg['precision@10']) / results_avg['precision@10'] * 100
        mean_recall_improvement = (results_mean['recall@10'] - results_avg['recall@10']) / results_avg['recall@10'] * 100 if results_avg['recall@10'] > 0 else 0
        mean_ndcg_improvement = (results_mean['ndcg@10'] - results_avg['ndcg@10']) / results_avg['ndcg@10'] * 100
        mean_div_improvement = (results_mean['diversity'] - results_avg['diversity']) / results_avg['diversity'] * 100 if results_avg['diversity'] > 0 else 0
        mean_time_change = (results_mean['avg_time'] - results_avg['avg_time']) / results_avg['avg_time'] * 100 if results_avg['avg_time'] > 0 else 0

        print(f"\n  🔵 최대 유사도 vs 평균 임베딩:")
        print(f"    Precision@10: {max_prec_improvement:+.2f}%")
        print(f"    Recall@10: {max_recall_improvement:+.2f}%")
        print(f"    NDCG@10: {max_ndcg_improvement:+.2f}%")
        print(f"    Diversity: {max_div_improvement:+.2f}%")
        print(f"    추천 시간: {max_time_change:+.2f}%")

        print(f"\n  🟢 평균 유사도 vs 평균 임베딩:")
        print(f"    Precision@10: {mean_prec_improvement:+.2f}%")
        print(f"    Recall@10: {mean_recall_improvement:+.2f}%")
        print(f"    NDCG@10: {mean_ndcg_improvement:+.2f}%")
        print(f"    Diversity: {mean_div_improvement:+.2f}%")
        print(f"    추천 시간: {mean_time_change:+.2f}%")

        # 8. 의사결정 가이드
        print(f"\n" + "="*60)
        print("💡 의사결정 가이드")
        print("="*60)

        # 품질 개선 여부 (평균 임베딩 대비)
        if min_len >= 2:
            max_quality_improved = (max_prec_improvement > 10 and max_ndcg_improvement > 10 and
                                   p_value_prec < 0.05 and p_value_ndcg < 0.05)
            mean_quality_improved = (mean_prec_improvement > 10 and mean_ndcg_improvement > 10)
        else:
            max_quality_improved = (max_prec_improvement > 10 and max_ndcg_improvement > 10)
            mean_quality_improved = (mean_prec_improvement > 10 and mean_ndcg_improvement > 10)

        # 속도 허용 여부
        max_speed_acceptable = results_max['avg_time'] < 5.0
        mean_speed_acceptable = results_mean['avg_time'] < 5.0

        # 최대 유사도 평가
        if max_quality_improved and max_speed_acceptable:
            print("\n✅ 최대 유사도 방식 채택 권장")
            print("  이유:")
            print(f"  - Precision 개선: {max_prec_improvement:+.2f}% (목표: >10%)")
            print(f"  - NDCG 개선: {max_ndcg_improvement:+.2f}% (목표: >10%)")
            if min_len >= 2:
                print(f"  - 통계적 유의성: p < 0.05")
            print(f"  - 추천 시간: {results_max['avg_time']:.2f}s (목표: <5s)")
        elif max_quality_improved and not max_speed_acceptable:
            print("\n⚠️ 최대 유사도 방식 - 조건부 채택")
            print("  장점: 품질 개선 유의미")
            print("  단점: 추천 시간 증가")
            print("  제안: 성능 최적화 후 재평가")

        # 평균 유사도 평가
        if mean_quality_improved and mean_speed_acceptable:
            print("\n✅ 평균 유사도 방식 채택 권장")
            print("  이유:")
            print(f"  - Precision 개선: {mean_prec_improvement:+.2f}% (목표: >10%)")
            print(f"  - NDCG 개선: {mean_ndcg_improvement:+.2f}% (목표: >10%)")
            print(f"  - 추천 시간: {results_mean['avg_time']:.2f}s (목표: <5s)")
        elif mean_quality_improved and not mean_speed_acceptable:
            print("\n⚠️ 평균 유사도 방식 - 조건부 채택")
            print("  장점: 품질 개선 유의미")
            print("  단점: 추천 시간 증가")
            print("  제안: 성능 최적화 후 재평가")

        # 둘 다 개선이 없는 경우
        if not max_quality_improved and not mean_quality_improved:
            print("\n❌ 평균 임베딩 방식 유지 권장")
            print("  이유:")
            print("  - 최대/평균 유사도 모두 품질 개선 미미")
            print("  - 또는 통계적 유의성 부족")

    print(f"\n" + "="*60)
    print("✅ 평가 완료")
    print("="*60)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
