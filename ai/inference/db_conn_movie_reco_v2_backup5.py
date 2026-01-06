import torch
import pickle
import numpy as np
import psycopg2
from psycopg2.extras import RealDictCursor
from pathlib import Path
from sklearn.preprocessing import MinMaxScaler
from typing import List, Optional, Dict, Any
from itertools import combinations
from math import log
import random
import time
from dotenv import load_dotenv
import os

"""
Hybrid Recommender v2 with PostgreSQL Database
- SBERT + LightGCN 하이브리드 추천
- vote_average만 반영 (vote_count 편향 제거)
- 모델 90% + 평점 10% (블록버스터 편향 감소)
- 후보군 확대 (300~500개) + 랜덤 샘플링
- 런타임 정렬 제거 (긴 영화 편향 방지)
- 시간 조건: 90% ~ 100% (초과 금지, 10% 미만까지 허용)

Track A: 장르 + OTT + 2000년 이상 필터, SBERT 0.7 + LightGCN 0.3, top 300
Track B: 2000년 이상만 필터, SBERT 0.7 + LightGCN 0.3, top 500 → random 300
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


class HybridRecommenderV2:
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

        print("Initializing Hybrid Recommender V2...")

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
            tmdb_id = row['tmdb_id']
            self.metadata_map[tmdb_id] = {
                'movie_id': row['movie_id'],
                'tmdb_id': tmdb_id,
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

        # 장르 목록
        all_genres = set()
        for movie_data in self.metadata_map.values():
            genres = movie_data.get('genres', [])
            if genres:
                all_genres.update(genres)
        self.all_genres = sorted(list(all_genres))

        print(f"  Metadata loaded: {len(self.metadata_map):,} movies")

    def _load_sbert_data_from_db(self):
        """DB에서 SBERT 임베딩 로드"""
        print("Loading SBERT embeddings from database...")

        query = """
            SELECT mv.movie_id, m.tmdb_id, mv.embedding
            FROM movie_vectors mv
            JOIN movies m ON mv.movie_id = m.movie_id
            ORDER BY mv.movie_id
        """
        rows = self.db.execute_query(query)

        self.sbert_movie_ids = []
        embeddings = []

        for row in rows:
            tmdb_id = row['tmdb_id']
            embedding = row['embedding']
            if isinstance(embedding, str):
                embedding = np.fromstring(embedding.strip('[]'), sep=',', dtype='float32')
            elif isinstance(embedding, list):
                embedding = np.array(embedding, dtype='float32')
            else:
                embedding = np.array(embedding, dtype='float32')

            self.sbert_movie_ids.append(tmdb_id)
            embeddings.append(embedding)

        self.sbert_embeddings = np.array(embeddings, dtype='float32')
        self.sbert_movie_to_idx = {mid: idx for idx, mid in enumerate(self.sbert_movie_ids)}

        print(f"  SBERT movies: {len(self.sbert_movie_ids):,}")

    def _load_ott_data_from_db(self):
        """DB에서 OTT 데이터 로드"""
        print("Loading OTT data from database...")

        ott_query = """
            SELECT provider_id, provider_name
            FROM ott_providers
            ORDER BY display_priority, provider_name
        """
        ott_rows = self.db.execute_query(ott_query)

        self.ott_id_to_name = {row['provider_id']: row['provider_name'] for row in ott_rows}
        self.all_otts = [row['provider_name'] for row in ott_rows]

        map_query = """
            SELECT m.tmdb_id, op.provider_name
            FROM movie_ott_map mom
            JOIN movies m ON mom.movie_id = m.movie_id
            JOIN ott_providers op ON mom.provider_id = op.provider_id
        """
        map_rows = self.db.execute_query(map_query)

        self.movie_ott_map = {}
        for row in map_rows:
            tmdb_id = row['tmdb_id']
            provider_name = row['provider_name']
            if tmdb_id not in self.movie_ott_map:
                self.movie_ott_map[tmdb_id] = []
            self.movie_ott_map[tmdb_id].append(provider_name)

        print(f"  OTT data loaded: {len(self.movie_ott_map):,} movies")

    def _load_lightgcn_data(self, data_path: str):
        """LightGCN 매핑 데이터 로드"""
        data_path = Path(data_path)
        with open(data_path / 'id_mappings.pkl', 'rb') as f:
            mappings = pickle.load(f)

        self.lightgcn_movie_to_idx = mappings['tmdb2id']
        self.lightgcn_idx_to_movie = mappings['id2tmdb']

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
        """SBERT와 LightGCN 모델 정렬"""
        common_ids = set(self.sbert_movie_to_idx.keys()) & set(self.lightgcn_movie_to_idx.keys())
        self.common_movie_ids = sorted(list(common_ids))

        self.target_sbert_matrix = []
        self.target_lightgcn_matrix = []

        for mid in self.common_movie_ids:
            s_idx = self.sbert_movie_to_idx[mid]
            self.target_sbert_matrix.append(self.sbert_embeddings[s_idx])

            l_idx = self.lightgcn_movie_to_idx[mid]
            self.target_lightgcn_matrix.append(self.lightgcn_item_embeddings[l_idx])

        self.target_sbert_matrix = np.array(self.target_sbert_matrix)
        self.target_lightgcn_matrix = np.array(self.target_lightgcn_matrix)

        self.target_sbert_norm = self.target_sbert_matrix / (
            np.linalg.norm(self.target_sbert_matrix, axis=1, keepdims=True) + 1e-10
        )

    def _get_user_profile(self, user_movie_ids: List[int]):
        """사용자 프로필 벡터 생성"""
        # SBERT 프로필
        user_sbert_vecs = []
        for mid in user_movie_ids:
            if mid in self.sbert_movie_to_idx:
                user_sbert_vecs.append(self.sbert_embeddings[self.sbert_movie_to_idx[mid]])

        if not user_sbert_vecs:
            random_ids = list(self.sbert_movie_to_idx.keys())[:5]
            for mid in random_ids:
                user_sbert_vecs.append(self.sbert_embeddings[self.sbert_movie_to_idx[mid]])

        user_sbert_profile = np.mean(user_sbert_vecs, axis=0)
        user_sbert_profile = user_sbert_profile / (np.linalg.norm(user_sbert_profile) + 1e-10)

        # LightGCN 프로필
        user_gcn_vecs = []
        for mid in user_movie_ids:
            if mid in self.lightgcn_movie_to_idx:
                user_gcn_vecs.append(self.lightgcn_item_embeddings[self.lightgcn_movie_to_idx[mid]])

        if not user_gcn_vecs:
            random_ids = list(self.lightgcn_movie_to_idx.keys())[:5]
            for mid in random_ids:
                user_gcn_vecs.append(self.lightgcn_item_embeddings[self.lightgcn_movie_to_idx[mid]])

        user_gcn_profile = np.mean(user_gcn_vecs, axis=0)

        return user_sbert_profile, user_gcn_profile

    def _calculate_rating_score(self, movie_id: int) -> float:
        """평점 점수 계산: vote_average만 사용 (vote_count 편향 제거)"""
        meta = self.metadata_map.get(movie_id, {})
        vote_average = meta.get('vote_average', 0)
        vote_count = meta.get('vote_count', 0)

        # 최소 투표수 필터 (너무 적은 투표는 신뢰도 낮음)
        if vote_count < 100:
            return 0.0

        # vote_average만 사용 (0~1 범위로 정규화)
        return vote_average / 10.0

    def _apply_filters(
        self,
        movie_ids: List[int],
        preferred_genres: Optional[List[str]] = None,
        preferred_otts: Optional[List[str]] = None,
        min_year: int = 2000,
        allow_adult: bool = False
    ) -> List[int]:
        """필터링 적용 (장르, OTT, 연도, 성인물)"""
        filtered_ids = []

        for movie_id in movie_ids:
            meta = self.metadata_map.get(movie_id, {})
            if not meta:
                continue

            # 성인물 필터
            if not allow_adult and meta.get('adult', False):
                continue

            # 연도 필터
            release_date = meta.get('release_date', '')
            if release_date:
                try:
                    year = int(release_date[:4])
                    if year < min_year:
                        continue
                except:
                    continue
            else:
                continue

            # 장르 필터 (Track A만)
            if preferred_genres:
                genres = meta.get('genres', [])
                if not genres or not any(g in genres for g in preferred_genres):
                    continue

            # OTT 필터 (Track A만)
            if preferred_otts:
                movie_otts = self.movie_ott_map.get(movie_id, [])
                if not any(ott in movie_otts for ott in preferred_otts):
                    continue

            filtered_ids.append(movie_id)

        return filtered_ids

    def _get_top_movies(
        self,
        user_sbert_profile: np.ndarray,
        user_gcn_profile: np.ndarray,
        filtered_ids: List[int],
        sbert_weight: float,
        lightgcn_weight: float,
        top_k: int = 100,
        exclude_ids: Optional[List[int]] = None
    ) -> List[Dict[str, Any]]:
        """상위 영화 선정 (모델 점수 + 평점 점수)"""
        exclude_ids = exclude_ids or []

        # 필터된 영화들의 인덱스
        filtered_indices = []
        for mid in filtered_ids:
            if mid in self.common_movie_ids:
                idx = self.common_movie_ids.index(mid)
                filtered_indices.append((mid, idx))

        if not filtered_indices:
            return []

        # 모델 점수 계산
        sbert_scores = self.target_sbert_norm @ user_sbert_profile
        lightgcn_scores = self.target_lightgcn_matrix @ user_gcn_profile

        # MinMax 정규화
        scaler = MinMaxScaler()

        filtered_sbert = np.array([sbert_scores[idx] for _, idx in filtered_indices])
        filtered_lightgcn = np.array([lightgcn_scores[idx] for _, idx in filtered_indices])

        if len(filtered_sbert) > 1:
            norm_sbert = scaler.fit_transform(filtered_sbert.reshape(-1, 1)).squeeze()
            norm_lightgcn = scaler.fit_transform(filtered_lightgcn.reshape(-1, 1)).squeeze()
        else:
            norm_sbert = filtered_sbert
            norm_lightgcn = filtered_lightgcn

        # 최종 점수 계산
        movie_scores = []
        for i, (mid, _) in enumerate(filtered_indices):
            if mid in exclude_ids:
                continue

            # 모델 점수 (가중 합)
            model_score = sbert_weight * norm_sbert[i] + lightgcn_weight * norm_lightgcn[i]

            # 평점 점수
            rating_score = self._calculate_rating_score(mid)

            # 최종 점수: 모델 90% + 평점 10% (블록버스터 편향 감소)
            final_score = model_score * 0.9 + rating_score * 0.1

            meta = self.metadata_map.get(mid, {})
            movie_scores.append({
                'tmdb_id': mid,
                'title': meta.get('title', 'Unknown'),
                'runtime': meta.get('runtime', 0),
                'genres': meta.get('genres', []),
                'vote_average': meta.get('vote_average', 0),
                'vote_count': meta.get('vote_count', 0),
                'overview': meta.get('overview', ''),
                'release_date': meta.get('release_date', ''),
                'poster_path': meta.get('poster_path', ''),
                'score': final_score
            })

        # 점수순 정렬 후 상위 top_k
        movie_scores.sort(key=lambda x: x['score'], reverse=True)
        return movie_scores[:top_k]

    def _find_combination(
        self,
        candidates: List[Dict[str, Any]],
        available_time: int,
        max_movies: int = None
    ) -> Optional[Dict[str, Any]]:
        """
        시간에 맞는 영화 조합 찾기
        - 총 런타임 <= available_time (초과 금지)
        - 총 런타임 >= available_time * 0.9 (10% 미만까지 허용)
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

        print(f"  Finding combination: {available_time}min, max_movies={max_movies}, candidates={len(valid_movies)}")

        best_combo = None
        best_runtime = 0

        # 방법 1: 점수순으로 채우기 (런타임 정렬 제거 - 블록버스터 편향 방지)
        sorted_by_score = sorted(valid_movies, key=lambda x: x.get('score', 0), reverse=True)
        combo1, runtime1 = self._greedy_fill(sorted_by_score, max_time, max_movies)
        if min_time <= runtime1 <= max_time:
            print(f"  Found (score): {len(combo1)} movies, {runtime1}min")
            return {'movies': combo1, 'total_runtime': runtime1}
        if runtime1 > best_runtime:
            best_combo, best_runtime = combo1, runtime1

        # 방법 2: 여러 번 랜덤 시도 + 갭 채우기
        for attempt in range(30):
            random.shuffle(valid_movies)
            combo, runtime = self._greedy_fill(valid_movies, max_time, max_movies)

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
                print(f"  Found (random+fill): {len(combo)} movies, {runtime}min")
                return {'movies': combo, 'total_runtime': runtime}
            if runtime > best_runtime and runtime <= max_time:
                best_combo, best_runtime = list(combo), runtime

        # 90% 미만이라도 최선의 조합 반환
        if best_combo and best_runtime > 0:
            print(f"  Best effort: {len(best_combo)} movies, {best_runtime}min ({best_runtime*100//available_time}%)")
            return {'movies': best_combo, 'total_runtime': best_runtime}

        return None

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
            movie_id = movie.get('tmdb_id')
            if movie_id in used_ids:
                continue
            if runtime + movie['runtime'] <= max_time:
                combo.append(movie)
                runtime += movie['runtime']
                used_ids.add(movie_id)

        return combo, runtime

    def recommend(
        self,
        user_movie_ids: List[int],
        available_time: int,
        preferred_genres: Optional[List[str]] = None,
        preferred_otts: Optional[List[str]] = None,
        allow_adult: bool = False,
        excluded_ids: Optional[List[int]] = None
    ) -> Dict[str, Any]:
        """
        초기 추천 - 영화 조합 반환

        Args:
            user_movie_ids: 사용자가 본 영화 ID 리스트
            available_time: 가용 시간 (분)
            preferred_genres: 선호 장르
            preferred_otts: 구독 OTT
            allow_adult: 성인물 허용 여부
            excluded_ids: 제외할 영화 ID 리스트 (이전 추천 영화 등)

        Returns:
            {
                'track_a': { 'label': '...', 'movies': [...], 'total_runtime': int },
                'track_b': { 'label': '...', 'movies': [...], 'total_runtime': int },
                'elapsed_time': float
            }
        """
        excluded_ids = excluded_ids or []

        print(f"\n=== Recommend ===")
        print(f"Available time: {available_time} min")
        print(f"Genres: {preferred_genres}")
        print(f"OTTs: {preferred_otts}")
        print(f"Excluded: {len(excluded_ids)} movies")

        start_time = time.time()

        # 사용자 프로필 생성
        user_sbert_profile, user_gcn_profile = self._get_user_profile(user_movie_ids)

        # ===== Track A: 장르 + OTT + 2000년 이상 =====
        filtered_a = self._apply_filters(
            self.common_movie_ids,
            preferred_genres=preferred_genres,
            preferred_otts=preferred_otts,
            min_year=2000,
            allow_adult=allow_adult
        )
        print(f"Track A filtered: {len(filtered_a)} movies")

        # excluded_ids와 user_movie_ids 합치기
        all_exclude_a = list(set(user_movie_ids + excluded_ids))

        top_300_a = self._get_top_movies(
            user_sbert_profile, user_gcn_profile,
            filtered_a,
            sbert_weight=0.7,
            lightgcn_weight=0.3,
            top_k=300,
            exclude_ids=all_exclude_a
        )
        print(f"Track A top candidates: {len(top_300_a)} movies")

        combo_a = self._find_combination(top_300_a, available_time)

        # 조합이 부족하면 필터 완화해서 재시도
        if not combo_a or (combo_a and combo_a['total_runtime'] < available_time * 0.7):
            print("Track A: Relaxing filters (removing OTT filter)...")
            filtered_a_relaxed = self._apply_filters(
                self.common_movie_ids,
                preferred_genres=preferred_genres,
                preferred_otts=None,  # OTT 필터 제거
                min_year=2000,
                allow_adult=allow_adult
            )
            print(f"Track A relaxed: {len(filtered_a_relaxed)} movies")

            top_300_a_relaxed = self._get_top_movies(
                user_sbert_profile, user_gcn_profile,
                filtered_a_relaxed,
                sbert_weight=0.7,
                lightgcn_weight=0.3,
                top_k=300,
                exclude_ids=all_exclude_a
            )

            combo_a_relaxed = self._find_combination(top_300_a_relaxed, available_time)

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

        # ===== Track B: 2000년 이상만 (장르/OTT 무시) =====
        filtered_b = self._apply_filters(
            self.common_movie_ids,
            preferred_genres=None,
            preferred_otts=None,
            min_year=2000,
            allow_adult=allow_adult
        )

        # Track A에서 추천된 영화 + excluded_ids 제외
        exclude_b = list(set(
            user_movie_ids +
            excluded_ids +
            [m['tmdb_id'] for m in track_a_result['movies']]
        ))

        # 상위 500개 추출 후 랜덤 300개 샘플링 (다양성 확보)
        # SBERT 70% + LightGCN 30% (LightGCN 편향 감소)
        top_500_b = self._get_top_movies(
            user_sbert_profile, user_gcn_profile,
            filtered_b,
            sbert_weight=0.7,
            lightgcn_weight=0.3,
            top_k=500,
            exclude_ids=exclude_b
        )

        # 500개 중 랜덤 300개 선택 (다양성 확보)
        if len(top_500_b) > 300:
            random.shuffle(top_500_b)
            candidates_b = top_500_b[:300]
        else:
            candidates_b = top_500_b
        print(f"Track B: top {len(top_500_b)} → random {len(candidates_b)} selected")

        combo_b = self._find_combination(candidates_b, available_time)

        track_b_result = {
            'label': '장르 확장 추천',
            'movies': combo_b['movies'] if combo_b else [],
            'total_runtime': combo_b['total_runtime'] if combo_b else 0
        }

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

        min_runtime = int(target_runtime * 0.9)
        max_runtime = target_runtime

        # 사용자 프로필
        user_sbert_profile, user_gcn_profile = self._get_user_profile(user_movie_ids)

        # 필터링
        if track.lower() == 'a':
            filtered = self._apply_filters(
                self.common_movie_ids,
                preferred_genres=preferred_genres,
                preferred_otts=preferred_otts,
                min_year=2000,
                allow_adult=allow_adult
            )
            sbert_w, lgcn_w = 0.7, 0.3
        else:
            filtered = self._apply_filters(
                self.common_movie_ids,
                preferred_genres=None,
                preferred_otts=None,
                min_year=2000,
                allow_adult=allow_adult
            )
            sbert_w, lgcn_w = 0.7, 0.3  # Track B도 SBERT 중심으로 변경

        # 상위 300개
        all_exclude = list(set(user_movie_ids + excluded_ids))
        top_300 = self._get_top_movies(
            user_sbert_profile, user_gcn_profile,
            filtered,
            sbert_weight=sbert_w,
            lightgcn_weight=lgcn_w,
            top_k=300,
            exclude_ids=all_exclude
        )

        # 런타임 조건에 맞는 영화 찾기
        candidates = [
            m for m in top_300
            if min_runtime <= m['runtime'] <= max_runtime
        ]

        if candidates:
            # 랜덤 선택
            selected = random.choice(candidates)
            return selected

        # 조건에 맞는 영화 없으면 런타임 이하 중 가장 가까운 영화
        under_time = [m for m in top_300 if 0 < m['runtime'] <= max_runtime]
        if under_time:
            closest = max(under_time, key=lambda m: m['runtime'])
            return closest

        return None

    def close(self):
        """리소스 정리"""
        self.db.close()


# ============================================================
# 테스트 실행
# ============================================================
if __name__ == "__main__":
    load_dotenv()

    DB_CONFIG = {
        'host': os.getenv("DATABASE_HOST", "localhost"),
        'port': int(os.getenv("DATABASE_PORT", 5432)),
        'database': os.getenv("DATABASE_NAME", "moviesir"),
        'user': os.getenv("DATABASE_USER", "postgres"),
        'password': os.getenv("DATABASE_PASSWORD", "")
    }

    LIGHTGCN_MODEL_PATH = "ai/training/lightgcn_model/best_model.pt"
    LIGHTGCN_DATA_PATH = "ai/training/lightgcn_data"

    print("\n" + "="*60)
    print("HYBRID RECOMMENDER V2 TEST")
    print("="*60)

    try:
        recommender = HybridRecommenderV2(
            db_config=DB_CONFIG,
            lightgcn_model_path=LIGHTGCN_MODEL_PATH,
            lightgcn_data_path=LIGHTGCN_DATA_PATH
        )

        # 테스트 사용자
        user_movies = [75656, 9502, 955]

        # 초기 추천 테스트
        print("\n--- Initial Recommendation ---")
        result = recommender.recommend(
            user_movie_ids=user_movies,
            available_time=180,
            preferred_genres=['액션', 'SF'],
            preferred_otts=['Netflix'],
            allow_adult=False
        )

        print(f"\nTrack A: {result['track_a']['label']}")
        print(f"  Total runtime: {result['track_a']['total_runtime']} min")
        for m in result['track_a']['movies']:
            print(f"  - {m['title']} ({m['runtime']}min) - {m['genres']}")

        print(f"\nTrack B: {result['track_b']['label']}")
        print(f"  Total runtime: {result['track_b']['total_runtime']} min")
        for m in result['track_b']['movies']:
            print(f"  - {m['title']} ({m['runtime']}min) - {m['genres']}")

        # 개별 재추천 테스트
        print("\n--- Single Re-recommendation ---")
        if result['track_a']['movies']:
            first_movie = result['track_a']['movies'][0]
            excluded = [m['tmdb_id'] for m in result['track_a']['movies']]

            single = recommender.recommend_single(
                user_movie_ids=user_movies,
                target_runtime=first_movie['runtime'],
                excluded_ids=excluded,
                track='a',
                preferred_genres=['액션', 'SF'],
                preferred_otts=['Netflix']
            )

            if single:
                print(f"Replacement for {first_movie['title']} ({first_movie['runtime']}min):")
                print(f"  → {single['title']} ({single['runtime']}min)")

        recommender.close()

    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
