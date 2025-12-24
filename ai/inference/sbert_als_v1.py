import torch
import pickle
import numpy as np
import psycopg2
from psycopg2.extras import RealDictCursor
from pathlib import Path
from sklearn.preprocessing import MinMaxScaler
from typing import List, Optional, Tuple
from itertools import combinations
from math import comb
import time
from dotenv import load_dotenv
import os
import implicit  # ★ ALS 모델 로드를 위해 필수

"""
[V2] Hybrid Recommender with PostgreSQL
- Content-based: SBERT (Sentence-BERT)
- Collaborative Filtering: ALS (Alternating Least Squares)
- Feature: ALS 'Fold-in' 기법을 사용하여 실시간 유저 벡터 역산
"""

class DatabaseConnection:
    """PostgreSQL 연결 관리"""
    def __init__(self, host, port, database, user, password):
        self.connection_params = {
            'host': host, 'port': port, 'database': database, 'user': user, 'password': password
        }
        self.conn = None
    
    def connect(self):
        if self.conn is None or self.conn.closed:
            self.conn = psycopg2.connect(**self.connection_params)
        return self.conn
    
    def close(self):
        if self.conn and not self.conn.closed:
            self.conn.close()
    
    def execute_query(self, query, params=None):
        conn = self.connect()
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, params)
            return cursor.fetchall()


class HybridRecommenderV2:
    def __init__(
        self,
        db_config: dict,
        als_model_path: str,
        als_data_path: str,
        sbert_weight: float = 0.7,
        als_weight: float = 0.3,
        device: str = None
    ):
        """
        Args:
            als_model_path: .pkl 모델 파일 경로
            als_data_path: .pkl 매핑 파일 경로
        """
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        self.sbert_weight = sbert_weight
        self.als_weight = als_weight
        
        # DB 연결
        self.db = DatabaseConnection(**db_config)
        
        print("\n" + "="*60)
        print("Initializing Hybrid Recommender V2 (SBERT + ALS)")
        print("="*60)
        
        # 1. DB 데이터 로드
        self._load_metadata_from_db()
        self._load_sbert_data_from_db()
        self._load_ott_data_from_db()
        
        # 2. ALS 모델 및 매핑 로드
        self._load_als_data(als_data_path)
        self._load_als_model(als_model_path)
        
        # 3. 모델 정렬 (Alignment)
        print("Pre-aligning models...")
        
        # SBERT와 ALS 양쪽에 모두 존재하는 영화만 사용 (교집합)
        common_ids = set(self.sbert_movie_to_idx.keys()) & set(self.als_tmdb_to_idx.keys())
        self.common_movie_ids = sorted(list(common_ids))
        
        self.target_sbert_matrix = []
        self.target_als_matrix = []
        
        for mid in self.common_movie_ids:
            # SBERT Vector
            s_idx = self.sbert_movie_to_idx[mid]
            self.target_sbert_matrix.append(self.sbert_embeddings[s_idx])
            
            # ALS Vector
            a_idx = self.als_tmdb_to_idx[mid]
            self.target_als_matrix.append(self.als_item_factors[a_idx])
        
        self.target_sbert_matrix = np.array(self.target_sbert_matrix)
        self.target_als_matrix = np.array(self.target_als_matrix)
        
        # SBERT Normalization (Cosine Similarity용)
        self.target_sbert_norm = self.target_sbert_matrix / (
            np.linalg.norm(self.target_sbert_matrix, axis=1, keepdims=True) + 1e-10
        )
        
        print(f"Alignment complete. Target movies: {len(self.common_movie_ids):,}")
        
        self.scaler = MinMaxScaler()
        self.recommendation_history = []

    # =========================================================================
    # Data Loading Methods
    # =========================================================================
    
    def _load_metadata_from_db(self):
        print("Loading metadata from DB...")
        query = """
            SELECT movie_id, tmdb_id, title, runtime, genres, overview, 
                   poster_path, release_date, vote_average, popularity, adult
            FROM movies
        """
        rows = self.db.execute_query(query)
        
        self.metadata_map = {}
        all_genres = set()
        for row in rows:
            tmdb_id = row['tmdb_id']
            self.metadata_map[tmdb_id] = {
                'movie_id': row['movie_id'], 'tmdb_id': tmdb_id, 'title': row['title'],
                'runtime': int(float(row['runtime'])) if row['runtime'] else 0,
                'genres': row['genres'] or [], 'overview': row['overview'] or '',
                'poster_path': row['poster_path'], 
                'release_date': str(row['release_date']) if row['release_date'] else '',
                'vote_average': row['vote_average'] or 0, 'popularity': row['popularity'] or 0,
                'adult': row.get('adult', False)
            }
            if row['genres']: all_genres.update(row['genres'])
        
        self.all_genres = sorted(list(all_genres))
        print(f"  - Metadata: {len(self.metadata_map):,} movies")

    def _load_sbert_data_from_db(self):
        print("Loading SBERT embeddings...")
        query = """
            SELECT m.tmdb_id, mv.embedding 
            FROM movie_vectors mv JOIN movies m ON mv.movie_id = m.movie_id 
            ORDER BY mv.movie_id
        """
        rows = self.db.execute_query(query)
        
        self.sbert_movie_ids = []
        embeddings = []
        for row in rows:
            embedding = row['embedding']
            if isinstance(embedding, str): 
                embedding = np.fromstring(embedding.strip('[]'), sep=',', dtype='float32')
            elif isinstance(embedding, list): 
                embedding = np.array(embedding, dtype='float32')
            
            self.sbert_movie_ids.append(row['tmdb_id'])
            embeddings.append(embedding)
        
        self.sbert_embeddings = np.array(embeddings, dtype='float32')
        self.sbert_movie_to_idx = {mid: idx for idx, mid in enumerate(self.sbert_movie_ids)}
        print(f"  - SBERT: {len(self.sbert_movie_ids):,} vectors")

    def _load_ott_data_from_db(self):
        print("Loading OTT data...")
        ott_rows = self.db.execute_query("SELECT provider_id, provider_name FROM ott_providers ORDER BY display_priority")
        self.all_otts = [row['provider_name'] for row in ott_rows]
        
        map_rows = self.db.execute_query("""
            SELECT m.tmdb_id, op.provider_name 
            FROM movie_ott_map mom 
            JOIN movies m ON mom.movie_id = m.movie_id 
            JOIN ott_providers op ON mom.provider_id = op.provider_id
        """)
        self.movie_ott_map = {}
        for row in map_rows:
            tmdb_id = row['tmdb_id']
            if tmdb_id not in self.movie_ott_map: self.movie_ott_map[tmdb_id] = []
            self.movie_ott_map[tmdb_id].append(row['provider_name'])
        print(f"  - OTT Mappings loaded")

    def _load_als_data(self, data_path: str):
        """ALS 매핑 파일 로드"""
        print(f"Loading ALS mappings from {data_path}...")
        with open(data_path, 'rb') as f:
            mappings = pickle.load(f)
        
        self.als_tmdb_to_idx = mappings['tmdb_to_idx']
        self.als_idx_to_tmdb = mappings['idx_to_tmdb']
        print(f"  - ALS Map: {len(self.als_tmdb_to_idx):,} movies")

    def _load_als_model(self, model_path: str):
        """ALS 모델 파일 로드"""
        print(f"Loading ALS model from {model_path}...")
        model = pickle.load(open(model_path, 'rb'))
        
        # item_factors 추출
        if hasattr(model, 'item_factors'):
            self.als_item_factors = model.item_factors
            if hasattr(self.als_item_factors, 'to_numpy'):
                self.als_item_factors = self.als_item_factors.to_numpy()
        else:
            raise ValueError("Invalid ALS model format")
        print(f"  - ALS Factors shape: {self.als_item_factors.shape}")

    # =========================================================================
    # Core Logic
    # =========================================================================

    def _calculate_user_vector_als(self, user_movie_ids: List[int], regularization: float = 0.1) -> np.ndarray:
        """
        [핵심] Fold-in 알고리즘
        유저가 본 영화 벡터들을 이용해 유저의 잠재 벡터(Latent Vector)를 수학적으로 역산
        """
        valid_indices = [self.als_tmdb_to_idx[mid] for mid in user_movie_ids if mid in self.als_tmdb_to_idx]
        
        if not valid_indices:
            return np.zeros(self.als_item_factors.shape[1])

        # Y_subset: 유저가 본 영화들의 벡터들
        Y_subset = self.als_item_factors[valid_indices]
        
        # 선형 방정식 풀이: (Y^T Y + lambda*I) * xu = Y^T * p
        # Implicit Feedback이므로 Preference(p)는 모두 1로 가정 -> b는 벡터의 합
        YtY = np.dot(Y_subset.T, Y_subset)
        lambda_I = regularization * np.eye(YtY.shape[0])
        A = YtY + lambda_I
        b = np.sum(Y_subset, axis=0)
        
        # Solve
        user_vector = np.linalg.solve(A, b)
        return user_vector

    def _get_movie_runtime(self, movie_id: int) -> int:
        meta = self.metadata_map.get(movie_id, {})
        return meta.get('runtime', 0)

    def _apply_filters(self, movie_ids, preferred_genres=None, max_runtime=None, min_year=None, preferred_otts=None, allow_adult=False):
        filtered_indices = []
        filtered_ids = []
        
        for i, movie_id in enumerate(movie_ids):
            meta = self.metadata_map.get(movie_id, {})
            if not meta: continue
            
            # Adult content filter
            if not allow_adult and meta.get('adult', False):
                continue
            
            # Runtime
            if max_runtime is not None:
                rt = self._get_movie_runtime(movie_id)
                if rt <= 0 or rt > max_runtime: continue
            
            # Year
            if min_year is not None:
                rd = meta.get('release_date', '')
                if not rd or int(rd[:4]) < min_year: continue
            
            # Genre
            if preferred_genres:
                genres = meta.get('genres', [])
                if not any(g in genres for g in preferred_genres): continue
            
            # OTT
            if preferred_otts:
                otts = self.movie_ott_map.get(movie_id, [])
                if not any(ott in otts for ott in preferred_otts): continue
            
            filtered_indices.append(i)
            filtered_ids.append(movie_id)
            
        return filtered_ids, filtered_indices

    def _find_movie_combinations(
        self,
        movie_ids: List[int],
        scores: np.ndarray,
        available_time: int,
        top_k: int = 1
    ) -> List[dict]:
        """시간에 맞는 영화 조합 찾기 (장르 필터링 + 랜덤성)"""
        print(f"\nFinding movie combinations...")
        print(f"  Available time: {available_time} min")
        print(f"  Candidate movies: {len(movie_ids)}")

        movie_data = []
        for i, mid in enumerate(movie_ids):
            runtime = self._get_movie_runtime(mid)
            if runtime > 0 and runtime <= available_time:
                movie_data.append({
                    'id': mid,
                    'runtime': runtime,
                    'score': scores[i]
                })

        if not movie_data:
            print("  No valid movies for combination")
            return []

        print(f"  Valid movies after runtime filter: {len(movie_data)}")

        # 점수순 정렬
        movie_data.sort(key=lambda x: x['score'], reverse=True)

        # 긴 시간일수록 더 많은 후보 필요
        base_pool = 80 if available_time < 360 else 120
        base_select = 50 if available_time < 360 else 70

        top_pool_size = min(len(movie_data), base_pool)
        random_select_size = min(top_pool_size, base_select)

        if top_pool_size > random_select_size:
            top_pool = movie_data[:top_pool_size]
            selected_indices = np.random.choice(top_pool_size, size=random_select_size, replace=False)
            movie_data = [top_pool[i] for i in selected_indices]
            print(f"  Randomly selected {len(movie_data)} from top {top_pool_size}")

        max_combinations_limit = 1_000_000
        max_candidates = min(len(movie_data), 60 if available_time < 360 else 70)

        # 긴 시간일수록 더 많은 영화 조합 허용
        estimated_combo_size = min(8, max(3, available_time // 90))

        for n in range(20, min(len(movie_data), 100)):
            total_combos = sum(comb(n, k) for k in range(2, estimated_combo_size + 1))
            if total_combos > max_combinations_limit:
                max_candidates = n - 1
                break

        movie_data = movie_data[:max_candidates]
        print(f"  Using top {len(movie_data)} candidates")

        valid_combinations = []
        # 시간에 비례한 허용 범위 (5% ~ 최소 30분)
        time_tolerance = max(30, int(available_time * 0.05))
        max_combinations = top_k * 10  # 더 많은 조합을 찾아서 랜덤 선택

        # 긴 시간일수록 더 많은 영화 조합 허용 (최대 8편)
        max_combo_size = min(8, max(3, available_time // 90))

        for combo_size in range(2, min(max_combo_size + 1, len(movie_data) + 1)):
            for combo in combinations(movie_data, combo_size):
                total_runtime = sum(m['runtime'] for m in combo)

                if available_time - time_tolerance <= total_runtime <= available_time + time_tolerance:
                    avg_score = np.mean([m['score'] for m in combo])
                    valid_combinations.append({
                        'movies': [m['id'] for m in combo],
                        'total_runtime': total_runtime,
                        'avg_score': avg_score
                    })

                    if len(valid_combinations) >= max_combinations:
                        break

            if len(valid_combinations) >= max_combinations:
                break

        print(f"  Found {len(valid_combinations)} valid combination(s)")

        if not valid_combinations:
            return []

        # 점수 기준 정렬 후 상위 조합 중에서 랜덤 선택
        valid_combinations.sort(key=lambda x: x['avg_score'], reverse=True)

        # 상위 조합들 중에서 랜덤하게 top_k개 선택
        top_combo_pool = min(len(valid_combinations), top_k * 3)
        if top_combo_pool > top_k:
            selected_indices = np.random.choice(top_combo_pool, size=top_k, replace=False)
            result = [valid_combinations[i] for i in sorted(selected_indices)]
            print(f"  Randomly selected {len(result)} combinations from top {top_combo_pool}")
            return result

        return valid_combinations[:top_k]


    def recommend(
        self,
        user_movie_ids: List[int],
        available_time: int,
        top_k: int = 20,
        exclude_seen: bool = True,
        preferred_genres: Optional[List[str]] = None,
        preferred_otts: Optional[List[str]] = None,
        allow_adult: bool = False
    ) -> Tuple[str, dict]:
        """하이브리드 추천"""
        print(f"\nStarting hybrid recommendation...")
        print(f"Available time: {available_time} min")
        print(f"Requested genres: {preferred_genres}")
        print(f"Allow adult: {allow_adult}")

        start_time = time.time()

        # 1. 사용자 프로필 생성
        user_sbert_vecs = []
        for mid in user_movie_ids:
            if mid in self.sbert_movie_to_idx:
                user_sbert_vecs.append(self.sbert_embeddings[self.sbert_movie_to_idx[mid]])

        if not user_sbert_vecs:
            # 사용자 영화가 인덱스에 없으면 인덱스 내 영화 사용
            random_ids = list(self.sbert_movie_to_idx.keys())[:100]
            for mid in random_ids[:5]:
                if mid in self.sbert_movie_to_idx:
                    user_sbert_vecs.append(self.sbert_embeddings[self.sbert_movie_to_idx[mid]])
        
        user_sbert_profile = np.mean(user_sbert_vecs, axis=0)
        user_sbert_profile = user_sbert_profile / (np.linalg.norm(user_sbert_profile) + 1e-10)
        
        # ALS Fold-in
        user_als_profile = self._calculate_user_vector_als(user_movie_ids)
        
        # 2. 전체 점수 계산
        sbert_scores = self.target_sbert_norm @ user_sbert_profile
        als_scores = self.target_als_matrix @ user_als_profile
        
        # 3. 추천 타입 결정
        recommendation_type = 'combination' if available_time >= 240 else 'single'
        max_runtime = None if recommendation_type == 'combination' else available_time
        
        # 4. Track A 필터링 (장르 + OTT + 시간 + 성인)
        filtered_ids_a, filtered_indices_a = self._apply_filters(
            self.common_movie_ids, preferred_genres, max_runtime,
            min_year=2000, preferred_otts=preferred_otts, allow_adult=allow_adult
        )

        # 5. Track B 필터링 (시간만 → 다양성, 장르/OTT 무시, 성인 필터는 적용)
        filtered_ids_b, filtered_indices_b = self._apply_filters(
            self.common_movie_ids, None, max_runtime,
            min_year=2000, preferred_otts=None, allow_adult=allow_adult
        )
        
        if recommendation_type == 'single':
            # === 단일 영화 추천 ===
            
            # Track A
            if filtered_ids_a:
                filtered_sbert_a = sbert_scores[filtered_indices_a]
                filtered_als_a = als_scores[filtered_indices_a]
                
                norm_sbert_a = self.scaler.fit_transform(filtered_sbert_a.reshape(-1, 1)).squeeze()
                norm_als_a = self.scaler.fit_transform(filtered_als_a.reshape(-1, 1)).squeeze()
                
                final_scores_a = self.sbert_weight * norm_sbert_a + self.als_weight * norm_als_a
                
                if exclude_seen:
                    for i, mid in enumerate(filtered_ids_a):
                        if mid in user_movie_ids:
                            final_scores_a[i] = -np.inf
                
                for i, mid in enumerate(filtered_ids_a):
                    if mid in self.recommendation_history[-50:]:
                        final_scores_a[i] = -np.inf
                
                valid_indices_a = [i for i, score in enumerate(final_scores_a) if score != -np.inf]
                if len(valid_indices_a) >= 50:
                    top_50_indices_a = sorted(valid_indices_a, key=lambda i: final_scores_a[i], reverse=True)[:50]
                    selected_indices_a = np.random.choice(top_50_indices_a, size=min(25, len(top_50_indices_a)), replace=False)
                elif len(valid_indices_a) >= 30:
                    top_30_indices_a = sorted(valid_indices_a, key=lambda i: final_scores_a[i], reverse=True)[:30]
                    selected_indices_a = np.random.choice(top_30_indices_a, size=min(20, len(top_30_indices_a)), replace=False)
                elif len(valid_indices_a) >= 20:
                    top_20_indices_a = sorted(valid_indices_a, key=lambda i: final_scores_a[i], reverse=True)[:20]
                    selected_indices_a = np.random.choice(top_20_indices_a, size=min(15, len(top_20_indices_a)), replace=False)
                else:
                    selected_indices_a = valid_indices_a
                
                track_a = self._build_recommendations(filtered_ids_a, final_scores_a, selected_indices_a)
                
                for rec in track_a:
                    self.recommendation_history.append(rec['tmdb_id'])
            else:
                track_a = []
            
            # Track B
            if filtered_ids_b:
                filtered_sbert_b = sbert_scores[filtered_indices_b]
                filtered_als_b = als_scores[filtered_indices_b]
                
                norm_sbert_b = self.scaler.fit_transform(filtered_sbert_b.reshape(-1, 1)).squeeze()
                norm_als_b = self.scaler.fit_transform(filtered_als_b.reshape(-1, 1)).squeeze()
                
                final_scores_b = 0.4 * norm_sbert_b + 0.6 * norm_als_b
                
                if exclude_seen:
                    for i, mid in enumerate(filtered_ids_b):
                        if mid in user_movie_ids:
                            final_scores_b[i] = -np.inf
                
                track_a_ids = [m['tmdb_id'] for m in track_a]
                for i, mid in enumerate(filtered_ids_b):
                    if mid in track_a_ids:
                        final_scores_b[i] = -np.inf
                
                for i, mid in enumerate(filtered_ids_b):
                    if mid in self.recommendation_history[-50:]:
                        final_scores_b[i] = -np.inf

                track_a_genres = set()
                if preferred_genres:
                    track_a_genres.update(preferred_genres)
                
                for i, mid in enumerate(filtered_ids_b):
                    if final_scores_b[i] == -np.inf:
                        continue
                    
                    meta = self.metadata_map.get(mid, {})
                    genres = meta.get('genres', [])
                    
                    if track_a_genres and genres and not any(g in track_a_genres for g in genres):
                        final_scores_b[i] *= 1.3
                
                valid_indices = [i for i, score in enumerate(final_scores_b) if score != -np.inf]
                if len(valid_indices) >= 50:
                    top_50_indices = sorted(valid_indices, key=lambda i: final_scores_b[i], reverse=True)[:50]
                    selected_indices = np.random.choice(top_50_indices, size=min(25, len(top_50_indices)), replace=False)
                elif len(valid_indices) >= 30:
                    top_30_indices = sorted(valid_indices, key=lambda i: final_scores_b[i], reverse=True)[:30]
                    selected_indices = np.random.choice(top_30_indices, size=min(20, len(top_30_indices)), replace=False)
                elif len(valid_indices) >= 20:
                    top_20_indices = sorted(valid_indices, key=lambda i: final_scores_b[i], reverse=True)[:20]
                    selected_indices = np.random.choice(top_20_indices, size=min(15, len(top_20_indices)), replace=False)
                else:
                    selected_indices = valid_indices
                
                track_b = self._build_recommendations(filtered_ids_b, final_scores_b, selected_indices)
                
                for rec in track_b:
                    self.recommendation_history.append(rec['tmdb_id'])
            else:
                track_b = []
            
            result = {
                'recommendations': {
                    'track_a': {
                        'label': '선호 장르 맞춤 추천',
                        'movies': track_a
                    },
                    'track_b': {
                        'label': '장르 확장 추천',
                        'movies': track_b
                    }
                },
                'elapsed_time': time.time() - start_time
            }
            
            return recommendation_type, result
        
        else:
            # === 조합 추천 ===

            # Track A (장르 + OTT + 시간 필터링됨)
            if filtered_ids_a:
                filtered_sbert_a = sbert_scores[filtered_indices_a]
                filtered_als_a = als_scores[filtered_indices_a]

                norm_sbert_a = self.scaler.fit_transform(filtered_sbert_a.reshape(-1, 1)).squeeze()
                norm_als_a = self.scaler.fit_transform(filtered_als_a.reshape(-1, 1)).squeeze()

                final_scores_a = self.sbert_weight * norm_sbert_a + self.als_weight * norm_als_a

                if exclude_seen:
                    for i, mid in enumerate(filtered_ids_a):
                        if mid in user_movie_ids:
                            final_scores_a[i] = -np.inf

                combination_a = self._find_movie_combinations(
                    filtered_ids_a, final_scores_a, available_time, top_k=10
                )

                if combination_a:
                    # 여러 조합을 리스트로 반환
                    track_a_combos = []
                    for combo in combination_a:
                        combo_movies = []
                        for mid in combo['movies']:
                            meta = self.metadata_map.get(mid, {})
                            combo_movies.append({
                                'tmdb_id': mid,
                                'title': meta.get('title', 'Unknown'),
                                'runtime': meta.get('runtime', 0),
                                'genres': meta.get('genres', []),
                                'overview': meta.get('overview', ''),
                                'release_date': meta.get('release_date', '')
                            })
                        track_a_combos.append({
                            'combination_score': combo['avg_score'],
                            'total_runtime': combo['total_runtime'],
                            'movies': combo_movies
                        })
                    # 첫 번째 조합 + 전체 조합 리스트 (순환 참조 방지)
                    if track_a_combos:
                        first = track_a_combos[0]
                        track_a_combo = {
                            'combination_score': first['combination_score'],
                            'total_runtime': first['total_runtime'],
                            'movies': first['movies'],
                            'combinations': track_a_combos
                        }
                    else:
                        track_a_combo = None
                else:
                    track_a_combo = None
            else:
                track_a_combo = None
            
            # Track B (시간만 필터링, 장르 무시 → 다양성)
            if filtered_ids_b:
                filtered_sbert_b = sbert_scores[filtered_indices_b]
                filtered_als_b = als_scores[filtered_indices_b]

                norm_sbert_b = self.scaler.fit_transform(filtered_sbert_b.reshape(-1, 1)).squeeze()
                norm_als_b = self.scaler.fit_transform(filtered_als_b.reshape(-1, 1)).squeeze()

                final_scores_b = 0.4 * norm_sbert_b + 0.6 * norm_als_b

                if exclude_seen:
                    for i, mid in enumerate(filtered_ids_b):
                        if mid in user_movie_ids:
                            final_scores_b[i] = -np.inf

                exclude_ids = []
                if track_a_combo:
                    exclude_ids = [m['tmdb_id'] for m in track_a_combo['movies']]

                for i, mid in enumerate(filtered_ids_b):
                    if mid in exclude_ids:
                        final_scores_b[i] = -np.inf

                for i, mid in enumerate(filtered_ids_b):
                    if mid in self.recommendation_history[-50:]:
                        final_scores_b[i] = -np.inf

                combination_b = self._find_movie_combinations(
                    filtered_ids_b, final_scores_b, available_time, top_k=10
                )

                if combination_b:
                    # 여러 조합을 리스트로 반환
                    track_b_combos = []
                    for combo in combination_b:
                        combo_movies = []
                        for mid in combo['movies']:
                            meta = self.metadata_map.get(mid, {})
                            combo_movies.append({
                                'tmdb_id': mid,
                                'title': meta.get('title', 'Unknown'),
                                'runtime': meta.get('runtime', 0),
                                'genres': meta.get('genres', []),
                                'overview': meta.get('overview', ''),
                                'release_date': meta.get('release_date', '')
                            })
                        track_b_combos.append({
                            'combination_score': combo['avg_score'],
                            'total_runtime': combo['total_runtime'],
                            'movies': combo_movies
                        })
                    # 첫 번째 조합 + 전체 조합 리스트 (순환 참조 방지)
                    if track_b_combos:
                        first = track_b_combos[0]
                        track_b_combo = {
                            'combination_score': first['combination_score'],
                            'total_runtime': first['total_runtime'],
                            'movies': first['movies'],
                            'combinations': track_b_combos
                        }
                        # 모든 조합의 영화를 히스토리에 추가
                        for combo_item in track_b_combos:
                            for movie in combo_item['movies']:
                                self.recommendation_history.append(movie['tmdb_id'])
                    else:
                        track_b_combo = None
                else:
                    track_b_combo = None
            else:
                track_b_combo = None
            
            result = {
                'recommendations': {
                    'track_a': {
                        'label': '선호 장르 영화 조합',
                        'combination': track_a_combo
                    },
                    'track_b': {
                        'label': '장르 확장 영화 조합',
                        'combination': track_b_combo
                    }
                },
                'elapsed_time': time.time() - start_time
            }
            
            return recommendation_type, result

    def _build_recommendations(self, movie_ids, scores, indices):
        """추천 결과 생성"""
        recommendations = []
        for idx in indices:
            mid = movie_ids[idx]
            meta = self.metadata_map.get(mid, {})
            
            # genres는 이미 리스트
            genres = meta.get('genres', [])
            
            recommendations.append({
                'tmdb_id': mid,
                'hybrid_score': float(scores[idx]),
                'title': meta.get('title', 'Unknown'),
                'overview': meta.get('overview', ''),
                'runtime': meta.get('runtime', 0),
                'genres': genres,
                'release_date': meta.get('release_date', '')
            })
        return recommendations
        
    def close(self):
        self.db.close()

# =========================================================================
# Execution (Simple Test Example)
# =========================================================================
if __name__ == "__main__":
    """
    간단한 테스트 예제
    실제 사용 시에는 FastAPI 등에서 HybridRecommenderV2 인스턴스를 생성하여 사용
    """
    
    # 환경변수 로드
    load_dotenv()
    
    # DB 설정
    db_config = {
        'host': os.getenv("DATABASE_HOST", "localhost"),
        'port': int(os.getenv("DATABASE_PORT", 5432)),
        'database': os.getenv("DATABASE_NAME", "moviesir"),
        'user': os.getenv("DATABASE_USER", "postgres"),
        'password': os.getenv("DATABASE_PASSWORD", "password")
    }
    
    # 모델 파일 경로
    ALS_MODEL_PATH = "ai/training/als_model/als_model_final.pkl"
    ALS_DATA_PATH = "ai/training/als_model/als_id_mappings.pkl"
    
    try:
        print("\n" + "="*60)
        print("ALS-based Hybrid Recommender Test")
        print("="*60)
        
        # 추천 시스템 초기화
        recommender = HybridRecommenderV2(
            db_config=db_config,
            als_model_path=ALS_MODEL_PATH,
            als_data_path=ALS_DATA_PATH,
            sbert_weight=0.7,
            als_weight=0.3
        )
        
        # 테스트 사용자 영화 (Interstellar, Dark Knight, Inception)
        test_user_movies = [157336, 155, 27205]
        
        print("\n" + "-"*60)
        print("Test Parameters:")
        print(f"  User watched: {test_user_movies}")
        print(f"  Available time: 120 min")
        print(f"  Preferred genres: ['Science Fiction', 'Adventure']")
        print(f"  Preferred OTTs: ['Netflix']")
        print(f"  Allow adult: False")
        print("-"*60)
        
        # 추천 실행
        rec_type, result = recommender.recommend(
            user_movie_ids=test_user_movies,
            available_time=120,
            preferred_genres=['Science Fiction', 'Adventure'],
            preferred_otts=['Netflix'],
            allow_adult=False
        )
        
        # 결과 출력
        print("\n" + "="*60)
        print(f"Recommendation Type: {rec_type.upper()}")
        print(f"Elapsed Time: {result['elapsed_time']:.2f}s")
        print("="*60)
        
        # Track A 출력
        track_a = result['recommendations']['track_a']
        if track_a:
            print(f"\n[Track A - Genre Match] {len(track_a)} movies")
            print("-"*60)
            for i, m in enumerate(track_a[:5], 1):
                genres_str = ', '.join(m['genres'][:2])
                print(f"{i}. {m['title']} ({m['runtime']}min)")
                print(f"   Score: {m['hybrid_score']:.4f} | Genres: {genres_str}")
        else:
            print("\n[Track A] No recommendations")
        
        # Track B 출력
        track_b = result['recommendations']['track_b']
        if track_b:
            print(f"\n[Track B - Diverse] {len(track_b)} movies")
            print("-"*60)
            for i, m in enumerate(track_b[:5], 1):
                genres_str = ', '.join(m['genres'][:2])
                print(f"{i}. {m['title']} ({m['runtime']}min)")
                print(f"   Score: {m['hybrid_score']:.4f} | Genres: {genres_str}")
        else:
            print("\n[Track B] No recommendations")
        
        print("\n" + "="*60)
        print("Test completed successfully!")
        print("="*60)
        
        recommender.close()
        
    except Exception as e:
        print(f"\n❌ Error occurred: {e}")
        import traceback
        traceback.print_exc()