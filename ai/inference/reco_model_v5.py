import torch
import pickle
import numpy as np
import psycopg2
from psycopg2.extras import RealDictCursor
from pathlib import Path
from sklearn.preprocessing import MinMaxScaler
from typing import List, Optional, Dict, Any
from math import log
from datetime import datetime
import random
import time
from dotenv import load_dotenv
import os

"""
Noise 방식
"""


class DatabaseConnection:
    """PostgreSQL 연결 관리"""

    def __init__(self, host: str, port: int, database: str, user: str, password: str):
        self.connection_params = {
            'host': host,
            'port': port,
            'database': database,
            'user': user,
            'password': password
        }
        self.conn = None

    def connect(self):
        """DB 연결"""
        if self.conn is None or self.conn.closed:
            self.conn = psycopg2.connect(**self.connection_params)
        return self.conn

    def close(self):
        """DB 연결 종료"""
        if self.conn and not self.conn.closed:
            self.conn.close()

    def execute_query(self, query: str, params: tuple = None) -> List[dict]:
        """쿼리 실행 및 결과 반환"""
        conn = self.connect()
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, params)
            return cursor.fetchall()


class HybridRecommenderV5:
    def __init__(
        self,
        db_config: dict,
        lightgcn_model_path: str,
        lightgcn_data_path: str,
        device: str = None
    ):
        """
        Args:
            db_config: PostgreSQL 연결 설정
            lightgcn_model_path: LightGCN 모델 경로
            lightgcn_data_path: LightGCN 데이터 경로
            device: 연산 장치 (cuda/cpu)
        """
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')

        # DB 연결
        self.db = DatabaseConnection(**db_config)

        print("Initializing Hybrid Recommender V5 (Noise-based Diversity)...")

        # 1. 데이터 로드 (DB에서)
        self._load_metadata_from_db()
        self._load_sbert_data_from_db()
        self._load_ott_data_from_db()

        # 2. LightGCN 로드 (파일에서)
        self._load_lightgcn_data(lightgcn_data_path)
        self._load_lightgcn_model(lightgcn_model_path)

        # 3. Pre-alignment
        print("Pre-aligning models...")
        self._align_models()

        print(f"Initialization complete. Target movies: {len(self.common_movie_ids)}")

    def _load_metadata_from_db(self):
        """DB에서 영화 메타데이터 로드"""
        print("Loading metadata from database...")

        query = """
            SELECT
                movie_id, tmdb_id, title, runtime, genres,
                overview, poster_path, release_date,
                vote_average, vote_count, popularity, adult
            FROM movies
        """
        rows = self.db.execute_query(query)

        self.metadata_map = {}
        for row in rows:
            movie_id = row['movie_id']
            self.metadata_map[movie_id] = {
                'movie_id': movie_id,
                'tmdb_id': row['tmdb_id'],
                'title': row['title'],
                'runtime': row['runtime'] or 0,
                'genres': row['genres'] or [],
                'overview': row['overview'] or '',
                'poster_path': row['poster_path'],
                'release_date': str(row['release_date']) if row['release_date'] else '',
                'vote_average': float(row['vote_average']) if row['vote_average'] else 0.0,
                'vote_count': int(row['vote_count']) if row['vote_count'] else 0,
                'popularity': row['popularity'] or 0,
                'adult': row['adult'] or False
            }

        print(f"  Metadata loaded: {len(self.metadata_map):,} movies")

    def _load_sbert_data_from_db(self):
        """DB에서 SBERT 임베딩 로드"""
        print("Loading SBERT embeddings from database...")

        query = """
            SELECT mv.movie_id, mv.embedding
            FROM movie_vectors mv
            ORDER BY mv.movie_id
        """
        rows = self.db.execute_query(query)

        self.sbert_movie_ids = []
        embeddings = []

        for row in rows:
            movie_id = row['movie_id']
            embedding = row['embedding']
            if isinstance(embedding, str):
                embedding = np.fromstring(embedding.strip('[]'), sep=',', dtype='float32')
            elif isinstance(embedding, list):
                embedding = np.array(embedding, dtype='float32')
            else:
                embedding = np.array(embedding, dtype='float32')

            self.sbert_movie_ids.append(movie_id)
            embeddings.append(embedding)

        self.sbert_embeddings = np.array(embeddings, dtype='float32')
        self.sbert_movie_to_idx = {mid: idx for idx, mid in enumerate(self.sbert_movie_ids)}

        print(f"  SBERT movies: {len(self.sbert_movie_ids):,}")

    def _load_ott_data_from_db(self):
        """DB에서 OTT 데이터 로드"""
        print("Loading OTT data from database...")

        map_query = """
            SELECT mom.movie_id, op.provider_name
            FROM movie_ott_map mom
            JOIN ott_providers op ON mom.provider_id = op.provider_id
        """
        map_rows = self.db.execute_query(map_query)

        self.movie_ott_map = {}
        for row in map_rows:
            movie_id = row['movie_id']
            provider_name = row['provider_name']
            if movie_id not in self.movie_ott_map:
                self.movie_ott_map[movie_id] = []
            self.movie_ott_map[movie_id].append(provider_name)

        print(f"  OTT data loaded: {len(self.movie_ott_map):,} movies")

    def _load_lightgcn_data(self, data_path: str):
        """LightGCN 매핑 데이터 로드 (tmdb_id → movie_id 변환)"""
        data_path = Path(data_path)
        with open(data_path / 'id_mappings.pkl', 'rb') as f:
            mappings = pickle.load(f)

        # LightGCN은 tmdb_id → index 매핑을 사용
        lightgcn_tmdb_to_idx = mappings['tmdb2id']

        # tmdb_id → movie_id 매핑 생성 (metadata_map 역방향)
        tmdb_to_movie_id = {}
        for movie_id, meta in self.metadata_map.items():
            tmdb_id = meta.get('tmdb_id')
            if tmdb_id is not None:
                tmdb_to_movie_id[tmdb_id] = movie_id

        # movie_id → LightGCN index 매핑으로 변환
        self.lightgcn_movie_to_idx = {}
        for tmdb_id, lgcn_idx in lightgcn_tmdb_to_idx.items():
            movie_id = tmdb_to_movie_id.get(tmdb_id)
            if movie_id is not None:
                self.lightgcn_movie_to_idx[movie_id] = lgcn_idx

        print(f"  LightGCN movies: {len(self.lightgcn_movie_to_idx):,}")

    def _load_lightgcn_model(self, model_path: str):
        """LightGCN 모델 로드"""
        print(f"Loading LightGCN model from {model_path}")
        checkpoint = torch.load(model_path, map_location=self.device)

        if isinstance(checkpoint, dict):
            if 'model_state_dict' in checkpoint:
                self.lightgcn_item_embeddings = checkpoint['model_state_dict']['item_embedding.weight'].cpu().numpy()
            elif 'item_embeddings' in checkpoint:
                self.lightgcn_item_embeddings = checkpoint['item_embeddings'].cpu().numpy()
            else:
                self.lightgcn_item_embeddings = checkpoint['item_embedding.weight'].cpu().numpy()

    def _align_models(self):
        """SBERT와 LightGCN 모델 정렬 (SBERT 전체 사용)"""
        # SBERT 임베딩이 있는 모든 영화 포함 (LightGCN 없어도 OK)
        self.common_movie_ids = sorted(list(self.sbert_movie_to_idx.keys()))

        # LightGCN 있는 영화 ID 집합
        lightgcn_ids = set(self.lightgcn_movie_to_idx.keys())

        # 역매핑 딕셔너리 생성 (O(1) 인덱스 조회용)
        self.movie_id_to_idx = {}
        self.target_sbert_matrix = []
        self.target_lightgcn_matrix = []

        # LightGCN 차원 확인
        lightgcn_dim = self.lightgcn_item_embeddings.shape[1]
        zero_lightgcn = np.zeros(lightgcn_dim)

        for idx, mid in enumerate(self.common_movie_ids):
            # 역매핑 저장
            self.movie_id_to_idx[mid] = idx

            # SBERT 임베딩 (필수)
            s_idx = self.sbert_movie_to_idx[mid]
            self.target_sbert_matrix.append(self.sbert_embeddings[s_idx])

            # LightGCN 임베딩 (선택: 없으면 0 벡터)
            if mid in lightgcn_ids:
                l_idx = self.lightgcn_movie_to_idx[mid]
                self.target_lightgcn_matrix.append(self.lightgcn_item_embeddings[l_idx])
            else:
                self.target_lightgcn_matrix.append(zero_lightgcn)

        self.target_sbert_matrix = np.array(self.target_sbert_matrix)
        self.target_lightgcn_matrix = np.array(self.target_lightgcn_matrix)

        self.target_sbert_norm = self.target_sbert_matrix / (
            np.linalg.norm(self.target_sbert_matrix, axis=1, keepdims=True) + 1e-10
        )

        # LightGCN 없는 영화 개수 확인
        sbert_only = len(self.common_movie_ids) - len(set(self.common_movie_ids) & lightgcn_ids)
        print(f"Created reverse mapping dictionary for {len(self.movie_id_to_idx):,} movies")
        if sbert_only > 0:
            print(f"  ⚠️  {sbert_only} movies have SBERT only (will use SBERT weight 1.0)")

        # 평점 점수 사전 계산 (Phase 1 최적화)
        print("Pre-calculating rating scores...")
        self.rating_scores = {}
        current_date = datetime.now()  # 한 번만 호출

        for mid in self.common_movie_ids:
            meta = self.metadata_map.get(mid, {})
            vote_average = meta.get('vote_average', 0)
            vote_count = meta.get('vote_count', 0)
            release_date = meta.get('release_date', '')

            # 최소 투표수 3000 이상만 (비인기 영화 제외)
            if vote_count < 3000 or not release_date:
                self.rating_scores[mid] = 0.0
                continue

            # 개봉일로부터 경과일 계산
            try:
                release = datetime.strptime(release_date[:10], '%Y-%m-%d')
                days_since_release = (current_date - release).days
                days_since_release = max(days_since_release, 30)  # 최소 30일
            except:
                days_since_release = 365  # 파싱 실패시 1년으로 가정

            # 일평균 투표수 계산
            votes_per_day = vote_count / days_since_release

            # 최종 점수: vote_average * log(votes_per_day + 1)
            self.rating_scores[mid] = (vote_average / 10.0) * log(votes_per_day + 1)

        print(f"Pre-calculated rating scores for {len(self.rating_scores):,} movies")

        # 필터링 인덱스 생성 (Phase 2 최적화)
        print("Building filtering indexes...")
        self.movies_by_year = {}
        self.movies_by_genre = {}
        self.movies_by_ott = {}
        self.adult_movies = set()
        self.non_adult_movies = set()

        for mid in self.common_movie_ids:
            meta = self.metadata_map.get(mid, {})

            # 연도 인덱스
            release_date = meta.get('release_date', '')
            if release_date:
                try:
                    year = int(release_date[:4])
                    if year not in self.movies_by_year:
                        self.movies_by_year[year] = []
                    self.movies_by_year[year].append(mid)
                except:
                    pass

            # 장르 인덱스
            genres = meta.get('genres', [])
            for genre in genres:
                if genre not in self.movies_by_genre:
                    self.movies_by_genre[genre] = []
                self.movies_by_genre[genre].append(mid)

            # OTT 인덱스
            otts = self.movie_ott_map.get(mid, [])
            for ott in otts:
                if ott not in self.movies_by_ott:
                    self.movies_by_ott[ott] = []
                self.movies_by_ott[ott].append(mid)

            # 성인물 인덱스
            if meta.get('adult', False):
                self.adult_movies.add(mid)
            else:
                self.non_adult_movies.add(mid)

        print(f"  Year index: {len(self.movies_by_year)} years")
        print(f"  Genre index: {len(self.movies_by_genre)} genres")
        print(f"  OTT index: {len(self.movies_by_ott)} providers")

    def _get_user_profile(self, user_movie_ids: List[int]):
        """사용자 프로필 벡터 생성 - 개별 임베딩 행렬 반환 (최대 유사도 계산용)"""
        # SBERT 프로필 (개별 임베딩 유지)
        user_sbert_vecs = []
        for mid in user_movie_ids:
            if mid in self.sbert_movie_to_idx:
                user_sbert_vecs.append(self.sbert_embeddings[self.sbert_movie_to_idx[mid]])

        if not user_sbert_vecs:
            random_ids = list(self.sbert_movie_to_idx.keys())[:5]
            for mid in random_ids:
                user_sbert_vecs.append(self.sbert_embeddings[self.sbert_movie_to_idx[mid]])

        # 배열로 변환 및 정규화 (N, SBERT_dim)
        user_sbert_matrix = np.array(user_sbert_vecs)
        user_sbert_matrix = user_sbert_matrix / (
            np.linalg.norm(user_sbert_matrix, axis=1, keepdims=True) + 1e-10
        )

        # LightGCN 프로필 (개별 임베딩 유지)
        user_gcn_vecs = []
        for mid in user_movie_ids:
            if mid in self.lightgcn_movie_to_idx:
                user_gcn_vecs.append(self.lightgcn_item_embeddings[self.lightgcn_movie_to_idx[mid]])

        if not user_gcn_vecs:
            random_ids = list(self.lightgcn_movie_to_idx.keys())[:5]
            for mid in random_ids:
                user_gcn_vecs.append(self.lightgcn_item_embeddings[self.lightgcn_movie_to_idx[mid]])

        # 배열로 변환 (N, LightGCN_dim)
        user_gcn_matrix = np.array(user_gcn_vecs)

        return user_sbert_matrix, user_gcn_matrix

    def _apply_filters(
        self,
        preferred_genres: Optional[List[str]] = None,
        preferred_otts: Optional[List[str]] = None,
        min_year: int = 2000,
        allow_adult: bool = False
    ) -> List[int]:
        """필터링 적용 (Phase 2 최적화: 인덱스 기반 set 연산)"""
        # 1. 연도 필터 (인덱스 사용)
        year_filtered = set()
        for year in range(min_year, 2026):
            year_filtered.update(self.movies_by_year.get(year, []))

        # 2. 성인물 필터
        if not allow_adult:
            year_filtered &= self.non_adult_movies

        # 3. 장르 필터 (있으면)
        if preferred_genres:
            genre_filtered = set()
            for genre in preferred_genres:
                genre_filtered.update(self.movies_by_genre.get(genre, []))
            year_filtered &= genre_filtered

        # 4. OTT 필터 (있으면)
        if preferred_otts:
            ott_filtered = set()
            for ott in preferred_otts:
                ott_filtered.update(self.movies_by_ott.get(ott, []))
            year_filtered &= ott_filtered

        return list(year_filtered)

    def _get_top_movies(
        self,
        user_sbert_profile: np.ndarray,
        user_gcn_profile: np.ndarray,
        filtered_ids: List[int],
        sbert_weight: float,
        lightgcn_weight: float,
        top_k: int = 300,
        exclude_ids: Optional[List[int]] = None,
        preferred_genres: Optional[List[str]] = None  # ← 추가
    ) -> List[Dict[str, Any]]:
        """상위 영화 선정 (모델 점수 + 평점 점수)"""
        exclude_ids = exclude_ids or []
        # 🔒 O(1) 중복 체크를 위해 set으로 변환
        exclude_set = set(exclude_ids)

        # 필터된 영화들의 인덱스 (O(1) 딕셔너리 조회)
        filtered_indices = []
        for mid in filtered_ids:
            idx = self.movie_id_to_idx.get(mid)
            if idx is not None:
                filtered_indices.append((mid, idx))

        if not filtered_indices:
            return []

        # 벡터화 유사도 계산 (평균 유사도 방식)
        indices = [idx for _, idx in filtered_indices]
        
        # SBERT 유사도: (M, SBERT_dim) @ (SBERT_dim, N) = (M, N)
        # M: 필터된 영화 수, N: 사용자 프로필 영화 수
        sbert_similarities = self.target_sbert_norm[indices] @ user_sbert_profile.T
        
        # LightGCN 유사도: (M, LightGCN_dim) @ (LightGCN_dim, N) = (M, N)
        lightgcn_similarities = self.target_lightgcn_matrix[indices] @ user_gcn_profile.T
        
        # 각 후보 영화의 평균 유사도 계산 (모든 사용자 영화와의 평균)
        sbert_scores = np.mean(sbert_similarities, axis=1)  # (M,)
        lightgcn_scores = np.mean(lightgcn_similarities, axis=1)  # (M,)

        # MinMax 정규화
        scaler = MinMaxScaler()

        # 평점 점수 조회 (Phase 1 최적화: 사전 계산된 값 사용)
        filtered_rating = np.array([self.rating_scores.get(mid, 0.0) for mid, _ in filtered_indices])

        if len(sbert_scores) > 1:
            norm_sbert = scaler.fit_transform(sbert_scores.reshape(-1, 1)).squeeze()
            norm_lightgcn = scaler.fit_transform(lightgcn_scores.reshape(-1, 1)).squeeze()
            # 평점 점수도 0~1 정규화 (블록버스터 편향 제거)
            norm_rating = scaler.fit_transform(filtered_rating.reshape(-1, 1)).squeeze()
        else:
            norm_sbert = sbert_scores
            norm_lightgcn = lightgcn_scores
            norm_rating = filtered_rating

        # LightGCN 있는 영화 ID 집합 (가중치 재조정용)
        lightgcn_ids = set(self.lightgcn_movie_to_idx.keys())

        # 최종 점수 계산
        movie_scores = []
        for i, (mid, _) in enumerate(filtered_indices):
            # 🔒 O(1) 중복 체크
            if mid in exclude_set:
                continue

            # 가중치 재조정: LightGCN 없으면 SBERT만 사용
            if mid in lightgcn_ids:
                # 하이브리드: SBERT + LightGCN
                model_score = sbert_weight * norm_sbert[i] + lightgcn_weight * norm_lightgcn[i]
                rec_type = "hybrid"
            else:
                # SBERT만: 가중치 1.0
                model_score = norm_sbert[i]
                rec_type = "sbert_only"

            # 정규화된 평점 점수 (0~1 범위)
            rating_score = norm_rating[i] if isinstance(norm_rating, np.ndarray) else norm_rating

            # 최종 점수: 모델 70% + 평점 30%
            final_score = model_score * 0.7 + rating_score * 0.3

            # 메타데이터 조회 (장르 부스트 계산에 필요)
            meta = self.metadata_map.get(mid, {})

            # 장르 가중치 부스트 (Track A만)
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
                'recommendation_type': rec_type  # 추가: 추천 타입
            })


        # 점수순 정렬 후 상위 top_k
        movie_scores.sort(key=lambda x: x['score'], reverse=True)
        return movie_scores[:top_k]

    def _greedy_fill(
        self,
        movies: List[Dict[str, Any]],
        max_time: int,
        max_movies: int
    ) -> tuple:
        """Greedy 방식으로 영화 채우기"""
        combo = []
        runtime = 0
        used_ids = set()

        for movie in movies:
            if len(combo) >= max_movies:
                break
            movie_id = movie.get('movie_id')
            if movie_id in used_ids:
                continue
            if runtime + movie['runtime'] <= max_time:
                combo.append(movie)
                runtime += movie['runtime']
                used_ids.add(movie_id)

        return combo, runtime

    def _find_combination(
        self,
        candidates: List[Dict[str, Any]],
        available_time: int,
        max_movies: int = None
    ) -> Optional[Dict[str, Any]]:
        """
        랜덤 노이즈 + Greedy Fill 방식으로 영화 조합 찾기

        여러 번 시도하여 점수에 랜덤 노이즈를 추가해 다양성 확보

        Args:
            candidates: 후보 영화 리스트
            available_time: 가용 시간 (분)
            max_movies: 최대 영화 수

        Returns:
            {'movies': [...], 'total_runtime': int} or None
        """
        min_time = int(available_time * 0.9)
        max_time = available_time

        # 런타임 유효한 영화만
        valid_movies = [m for m in candidates if 0 < m['runtime'] <= available_time]

        if not valid_movies:
            return None

        # max_movies 동적 계산 (평균 90분 기준)
        if max_movies is None:
            max_movies = max(5, (available_time // 90) + 2)
        max_movies = min(max_movies, 15)  # 최대 15편으로 제한

        print(f"  Finding combination (noisy greedy): {available_time}min, max_movies={max_movies}, candidates={len(valid_movies)}")

        best_combo = []
        best_runtime = 0

        # 여러 번 랜덤 시도하여 최적의 조합 찾기
        for attempt in range(30):
            # 점수에 랜덤 노이즈 추가하여 순위 자체를 변동시킴 (다양성 확보)
            # 노이즈 범위: 0.4~1.6 배율 (±60% 변동으로 다양성 극대화)
            noisy_movies = []
            for m in valid_movies:
                noisy_score = m.get('score', 0) * (0.4 + random.random() * 1.2)  # 0.4~1.6 배율
                noisy_movies.append((noisy_score, m))

            # 노이즈가 적용된 점수로 정렬
            noisy_movies.sort(key=lambda x: x[0], reverse=True)
            candidates_sorted = [m for _, m in noisy_movies]

            combo, runtime = self._greedy_fill(candidates_sorted, max_time, max_movies)

            # 갭 채우기 시도
            if runtime < max_time and len(combo) < max_movies:
                gap = max_time - runtime
                # 갭에 맞는 영화 찾기
                gap_fillers = [m for m in valid_movies if m not in combo and m['runtime'] <= gap]
                if gap_fillers:
                    # 갭에 가장 가까운 영화 선택
                    filler = min(gap_fillers, key=lambda m: abs(m['runtime'] - gap))
                    combo.append(filler)
                    runtime += filler['runtime']

            if min_time <= runtime <= max_time:
                print(f"  Found (noisy score): {len(combo)} movies, {runtime}min, attempt={attempt+1}")
                return {'movies': combo, 'total_runtime': runtime}
            if runtime > best_runtime and runtime <= max_time:
                best_combo, best_runtime = list(combo), runtime

        # 90% 미만이지만 최선의 결과 반환
        if best_combo and best_runtime > 0:
            print(f"  Best effort (noisy): {len(best_combo)} movies, {best_runtime}min ({best_runtime*100//available_time}%)")
            return {'movies': best_combo, 'total_runtime': best_runtime}

        return None


    def recommend(
        self,
        user_movie_ids: List[int],
        available_time: int,
        preferred_genres: Optional[List[str]] = None,
        preferred_otts: Optional[List[str]] = None,
        allow_adult: bool = False,
        excluded_ids_a: Optional[List[int]] = None,
        excluded_ids_b: Optional[List[int]] = None
    ) -> Dict[str, Any]:
        """
        초기 추천 - 영화 조합 반환

        Args:
            user_movie_ids: 사용자가 본 영화 ID 리스트
            available_time: 가용 시간 (분)
            preferred_genres: 선호 장르
            preferred_otts: 구독 OTT
            excluded_ids_a: Track A 제외할 영화 ID (같은 장르 이전 추천)
            excluded_ids_b: Track B 제외할 영화 ID (전체 이전 추천)
            allow_adult: 성인물 허용 여부

        Returns:
            {
                'track_a': { 'label': '...', 'movies': [...], 'total_runtime': int },
                'track_b': { 'label': '...', 'movies': [...], 'total_runtime': int },
                'elapsed_time': float
            }
        """
        excluded_ids_a = excluded_ids_a or []
        excluded_ids_b = excluded_ids_b or []

        print(f"\n=== Recommend ===")
        print(f"Available time: {available_time} min")
        print(f"Genres: {preferred_genres}")
        print(f"OTTs: {preferred_otts}")
        print(f"Excluded A: {len(excluded_ids_a)}, B: {len(excluded_ids_b)}")

        start_time = time.time()

        # 사용자 프로필 생성
        user_sbert_profile, user_gcn_profile = self._get_user_profile(user_movie_ids)
        
        # 사용자 프로필 구성 영화 출력 (영화 제목 포함)
        print(f"\n📊 User Profile Composition ({len(user_movie_ids)} movies):")
        for i, mid in enumerate(user_movie_ids[:10], 1):  # 최대 10개만 출력
            meta = self.metadata_map.get(mid, {})
            title = meta.get('title', 'Unknown')
            year = meta.get('release_date', '')[:4] if meta.get('release_date') else '?'
            print(f"  {i}. [{mid}] {title} ({year})")
        if len(user_movie_ids) > 10:
            print(f"  ... and {len(user_movie_ids) - 10} more movies")


        # Track A 제외할 ID (사용자 시청 기록 + 같은 장르 이전 추천)
        exclude_a = list(set(user_movie_ids + excluded_ids_a))

        # ===== Track A: 장르 + OTT + 2000년 이상 =====
        filtered_a = self._apply_filters(
            preferred_genres=preferred_genres,
            preferred_otts=preferred_otts,
            min_year=2000,
            allow_adult=allow_adult
        )
        print(f"Track A filtered: {len(filtered_a)} movies")

        top_candidates_a = self._get_top_movies(
            user_sbert_profile, user_gcn_profile,
            filtered_a,
            sbert_weight=0.7,
            lightgcn_weight=0.3,
            top_k=300,
            exclude_ids=exclude_a,
            preferred_genres=preferred_genres  # ← Track A는 장르 가중치 적용
        )
        print(f"Track A top candidates: {len(top_candidates_a)} movies")

        combo_a = self._find_combination(top_candidates_a, available_time)

        # 조합이 부족하면 필터 완화해서 재시도
        if not combo_a or (combo_a and combo_a['total_runtime'] < available_time * 0.7):
            print("Track A: Relaxing filters (removing OTT filter)...")
            filtered_a_relaxed = self._apply_filters(
                preferred_genres=preferred_genres,
                preferred_otts=None,  # OTT 필터 제거
                min_year=2000,
                allow_adult=allow_adult
            )
            print(f"Track A relaxed: {len(filtered_a_relaxed)} movies")

            top_candidates_a_relaxed = self._get_top_movies(
                user_sbert_profile, user_gcn_profile,
                filtered_a_relaxed,
                sbert_weight=0.7,
                lightgcn_weight=0.3,
                top_k=300,
                exclude_ids=exclude_a,
                preferred_genres=preferred_genres  # ← Track A는 장르 가중치 적용
            )

            combo_a_relaxed = self._find_combination(top_candidates_a_relaxed, available_time)

            # 완화된 결과가 더 나으면 사용
            if combo_a_relaxed:
                if not combo_a or combo_a_relaxed['total_runtime'] > combo_a['total_runtime']:
                    combo_a = combo_a_relaxed
                    print(f"Track A: Using relaxed result ({combo_a['total_runtime']}min)")

        track_a_result = {
            'label': '선호 장르 맞춤 추천',
            'movies': combo_a['movies'] if combo_a else [],
            'total_runtime': combo_a['total_runtime'] if combo_a else 0
        }

        # Track A 결과 출력 (recommendation_type 포함)
        if combo_a:
            print(f"\n📋 Track A 결과 ({len(combo_a['movies'])}편):")
            for i, movie in enumerate(combo_a['movies'], 1):
                rec_type = movie.get('recommendation_type', 'unknown')
                rec_type_label = '🔀 하이브리드' if rec_type == 'hybrid' else '📖 SBERT만'
                print(f"  {i}. [{rec_type_label}] {movie['title']} ({movie['runtime']}분, score={movie.get('score', 0):.3f})")

        # ===== Track B: 2000년 이상 + OTT 필터 (장르만 무시) =====
        filtered_b = self._apply_filters(
            preferred_genres=None,
            preferred_otts=preferred_otts,
            min_year=2000,
            allow_adult=allow_adult
        )

        # Track B 제외: 사용자 시청 기록 + 전체 이전 추천 + Track A 결과
        exclude_b = list(set(
            user_movie_ids +
            excluded_ids_b +
            [m['movie_id'] for m in track_a_result['movies']]
        ))

        top_candidates_b = self._get_top_movies(
            user_sbert_profile, user_gcn_profile,
            filtered_b,
            sbert_weight=0.4,
            lightgcn_weight=0.6,
            top_k=300,
            exclude_ids=exclude_b,
            preferred_genres=None  # ← Track B는 장르 가중치 없음
        )

        combo_b = self._find_combination(top_candidates_b, available_time)

        track_b_result = {
            'label': '장르 확장 추천',
            'movies': combo_b['movies'] if combo_b else [],
            'total_runtime': combo_b['total_runtime'] if combo_b else 0
        }

        # Track B 결과 출력 (recommendation_type 포함)
        if combo_b:
            print(f"\n📋 Track B 결과 ({len(combo_b['movies'])}편):")
            for i, movie in enumerate(combo_b['movies'], 1):
                rec_type = movie.get('recommendation_type', 'unknown')
                rec_type_label = '🔀 하이브리드' if rec_type == 'hybrid' else '📖 SBERT만'
                print(f"  {i}. [{rec_type_label}] {movie['title']} ({movie['runtime']}분, score={movie.get('score', 0):.3f})")

        elapsed = time.time() - start_time
        print(f"Elapsed: {elapsed:.2f}s")

        return {
            'track_a': track_a_result,
            'track_b': track_b_result,
            'elapsed_time': elapsed
        }

    def recommend_single(
        self,
        user_movie_ids: List[int],
        target_runtime: int,
        excluded_ids: List[int],
        track: str = 'a',
        preferred_genres: Optional[List[str]] = None,
        preferred_otts: Optional[List[str]] = None,
        allow_adult: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        개별 영화 재추천 - 단일 영화 반환

        Args:
            user_movie_ids: 사용자가 본 영화 ID 리스트
            target_runtime: 대체할 영화의 런타임 (분)
            excluded_ids: 이미 추천된 영화 ID (제외할 영화들)
            track: 'a' 또는 'b'
            preferred_genres: 선호 장르 (Track A용)
            preferred_otts: 구독 OTT (Track A용)
            allow_adult: 성인물 허용 여부

        Returns:
            { 'tmdb_id': int, 'title': str, 'runtime': int, ... } 또는 None
        """
        print(f"\n=== Recommend Single ===")
        print(f"Target runtime: {target_runtime} min")
        print(f"Track: {track}")
        print(f"Excluded: {len(excluded_ids)} movies")
        if excluded_ids:
            print(f"  First 5 excluded IDs: {excluded_ids[:5]}")

        # 🔒 제외 목록을 set으로 변환 (O(1) 중복 체크용)
        excluded_set = set(excluded_ids)
        print(f"  Excluded set size: {len(excluded_set)}")

        start_time = time.time()

        # 런타임 범위: 대체할 영화와 비슷한 길이
        # target_runtime의 100%를 초과하지 않으면 전체 시간도 초과 안 됨
        min_runtime = int(target_runtime * 0.9)  # 90% 이상
        max_runtime = target_runtime  # 100% (초과 불가)

        # 사용자 프로필
        user_sbert_profile, user_gcn_profile = self._get_user_profile(user_movie_ids)
        
        # 사용자 프로필 구성 영화 출력 (영화 제목 포함)
        print(f"\n📊 User Profile Composition ({len(user_movie_ids)} movies):")
        for i, mid in enumerate(user_movie_ids[:10], 1):  # 최대 10개만 출력
            meta = self.metadata_map.get(mid, {})
            title = meta.get('title', 'Unknown')
            year = meta.get('release_date', '')[:4] if meta.get('release_date') else '?'
            print(f"  {i}. [{mid}] {title} ({year})")
        if len(user_movie_ids) > 10:
            print(f"  ... and {len(user_movie_ids) - 10} more movies")


        # 필터링
        if track.lower() == 'a':
            filtered = self._apply_filters(
                preferred_genres=preferred_genres,
                preferred_otts=preferred_otts,
                min_year=2000,
                allow_adult=allow_adult
            )
            sbert_w, lgcn_w = 0.7, 0.3
            use_genre_weight = preferred_genres  # ← Track A는 장르 가중치 사용
        else:
            filtered = self._apply_filters(
                preferred_genres=None,
                preferred_otts=None,
                min_year=2000,
                allow_adult=allow_adult
            )
            sbert_w, lgcn_w = 0.4, 0.6
            use_genre_weight = None  # ← Track B는 장르 가중치 없음

        # 🚀 최적화: 3단계 런타임 Fallback (90-100 → 70-100 → 0-100)
        # max_runtime = 100% 이하로 제한되어 있어 시간 초과 절대 방지
        runtime_filtered = []
        fallback_level = 0

        # 1단계: 90~100% 시도
        for mid in filtered:
            meta = self.metadata_map.get(mid)
            if meta:
                runtime = meta.get('runtime', 0)
                if min_runtime <= runtime <= max_runtime:
                    runtime_filtered.append(mid)

        print(f"[Level 0] 90-100% range: {len(runtime_filtered)} movies (target: {min_runtime}-{max_runtime}min)")

        # 2단계: 70~100% 시도
        if not runtime_filtered:
            fallback_level = 1
            fallback_min_70 = int(target_runtime * 0.7)
            print(f"[Level 1] Expanding to 70-100% range ({fallback_min_70}-{max_runtime}min)...")
            for mid in filtered:
                meta = self.metadata_map.get(mid)
                if meta:
                    runtime = meta.get('runtime', 0)
                    if fallback_min_70 <= runtime <= max_runtime:
                        runtime_filtered.append(mid)
            print(f"[Level 1] 70-100% range: {len(runtime_filtered)} movies")

        # 3단계: 0~100% 시도 (최종)
        if not runtime_filtered:
            fallback_level = 2
            print(f"[Level 2] Expanding to 0-100% range (0-{max_runtime}min)...")
            for mid in filtered:
                meta = self.metadata_map.get(mid)
                if meta:
                    runtime = meta.get('runtime', 0)
                    if 0 < runtime <= max_runtime:
                        runtime_filtered.append(mid)
            print(f"[Level 2] 0-100% range: {len(runtime_filtered)} movies")

        if not runtime_filtered:
            print(f"❌ No valid movies found even with full range")
            return None

        # 상위 후보 계산 (런타임 필터링된 영화들만)
        all_exclude = list(set(user_movie_ids + excluded_ids))
        print(f"Excluding {len(all_exclude)} movies (user movies + already recommended)")

        top_candidates = self._get_top_movies(
            user_sbert_profile, user_gcn_profile,
            runtime_filtered,  # 런타임 필터링된 영화만
            sbert_weight=sbert_w,
            lightgcn_weight=lgcn_w,
            top_k=300,
            exclude_ids=all_exclude,
            preferred_genres=use_genre_weight  # ← Track A일 때만 장르 가중치
        )
        print(f"Top candidates after scoring: {len(top_candidates)} movies")

        # 🔍 중복 진단: top_candidates에 excluded 영화가 있는지 확인
        if top_candidates:
            duplicates_in_candidates = [m['movie_id'] for m in top_candidates if m['movie_id'] in excluded_set]
            if duplicates_in_candidates:
                print(f"⚠️ WARNING: {len(duplicates_in_candidates)} excluded movies in top_candidates!")
                print(f"   Duplicate IDs: {duplicates_in_candidates[:5]}")
                print(f"   This should not happen - _get_top_movies should filter them out")

        # 후보가 없으면 Fallback 시도
        if not top_candidates and fallback_level < 2:
            print(f"❌ No candidates after scoring")
            print(f"   - Runtime filtered: {len(runtime_filtered)}")
            print(f"   - Excluded: {len(all_exclude)}")
            print(f"   - Hint: All runtime-matching movies might be excluded already")
            print(f"   - Retrying with expanded runtime range...")
            
            # Level 1 시도
            if fallback_level == 0:
                fallback_level = 1
                fallback_min_70 = int(target_runtime * 0.7)
                runtime_filtered = []
                for mid in filtered:
                    meta = self.metadata_map.get(mid)
                    if meta:
                        runtime = meta.get('runtime', 0)
                        if fallback_min_70 <= runtime <= max_runtime:
                            runtime_filtered.append(mid)
                print(f"[Level 1 Retry] 70-100% range: {len(runtime_filtered)} movies")
                
                top_candidates = self._get_top_movies(
                    user_sbert_profile, user_gcn_profile,
                    runtime_filtered,
                    sbert_weight=sbert_w,
                    lightgcn_weight=lgcn_w,
                    top_k=300,
                    exclude_ids=all_exclude,
                    preferred_genres=use_genre_weight
                )
                print(f"Top candidates after Level 1: {len(top_candidates)} movies")
            
            # Level 2 시도
            if not top_candidates and fallback_level == 1:
                fallback_level = 2
                runtime_filtered = []
                for mid in filtered:
                    meta = self.metadata_map.get(mid)
                    if meta:
                        runtime = meta.get('runtime', 0)
                        if 0 < runtime <= max_runtime:
                            runtime_filtered.append(mid)
                print(f"[Level 2 Retry] 0-100% range: {len(runtime_filtered)} movies")
                
                top_candidates = self._get_top_movies(
                    user_sbert_profile, user_gcn_profile,
                    runtime_filtered,
                    sbert_weight=sbert_w,
                    lightgcn_weight=lgcn_w,
                    top_k=300,
                    exclude_ids=all_exclude,
                    preferred_genres=use_genre_weight
                )
                print(f"Top candidates after Level 2: {len(top_candidates)} movies")

        # 노이즈 기반 다양성 선택 (점수에 랜덤 노이즈 적용)
        if top_candidates:
            # 중복 제거된 후보만 선택
            valid_candidates = [m for m in top_candidates if m['movie_id'] not in excluded_set]

            if not valid_candidates:
                elapsed = time.time() - start_time
                print(f"❌ All candidates are already excluded (duplicates)")
                print(f"   - Top candidates: {len(top_candidates)}")
                print(f"   - Excluded IDs: {len(excluded_ids)}")
                print(f"Elapsed: {elapsed:.2f}s")
                return None

            # 점수에 랜덤 노이즈 적용 (다양성 확보)
            # 노이즈 범위: 0.7~1.3 배율 (재추천은 덜 극단적으로)
            noisy_candidates = []
            for movie in valid_candidates:
                noisy_score = movie.get('score', 0) * (0.7 + random.random() * 0.6)  # 0.7~1.3 배율
                noisy_candidates.append((noisy_score, movie))

            # 노이즈 적용된 점수로 정렬 후 최고점 선택
            noisy_candidates.sort(key=lambda x: x[0], reverse=True)
            _, selected = noisy_candidates[0]

            # 🔍 최종 중복 체크 (디버깅)
            if selected['movie_id'] in excluded_set:
                print(f"⚠️ WARNING: Selected movie {selected['movie_id']} is in excluded_ids!")
                print(f"   This should not happen after filtering")

            # Fallback 레벨 메타데이터 추가
            selected['fallback_level'] = fallback_level
            selected['fallback_info'] = {
                0: 'perfect (90-100%)',
                1: 'good (70-100%)',
                2: 'acceptable (0-100%)'
            }.get(fallback_level, 'unknown')

            rec_type = selected.get('recommendation_type', 'unknown')
            rec_type_label = '🔀 하이브리드' if rec_type == 'hybrid' else '📖 SBERT만'
            fallback_label = ['✅', '⚠️', '⚠️⚠️'][fallback_level]
            elapsed = time.time() - start_time

            # 🔍 시간 초과 검증
            if selected['runtime'] > target_runtime:
                print(f"⚠️ WARNING: Selected runtime {selected['runtime']}분 > target {target_runtime}분!")
                print(f"   This violates max_runtime constraint!")

            print(f"{fallback_label} [{rec_type_label}] {selected['title']} (ID:{selected['movie_id']}, {selected['runtime']}분, score={selected.get('score', 0):.3f}) [Fallback Level: {fallback_level}]")
            print(f"  Runtime check: {selected['runtime']} vs target {target_runtime} (max_runtime={max_runtime})")
            print(f"Elapsed: {elapsed:.2f}s")
            return selected

        else:
            # top_candidates가 비어있음
            elapsed = time.time() - start_time
            print(f"❌ No candidates after scoring")
            print(f"   - Runtime filtered: {len(runtime_filtered)}")
            print(f"   - Excluded: {len(all_exclude)}")
            print(f"   - Hint: All runtime-matching movies might be excluded already")
            print(f"Elapsed: {elapsed:.2f}s")
            return None

    def close(self):
        """리소스 정리"""
        self.db.close()
