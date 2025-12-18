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

"""
Hybrid Recommender with PostgreSQL Database
- SBERT (70%) + LightGCN (30%)
- 장르, 런타임, OTT 필터링 지원
- 240분 미만: 단일 영화 추천 (Track A, B)
- 240분 이상: 영화 조합 추천 (Track A, B 모두 조합)

DB 테이블:
- movies: 영화 메타데이터
- movie_vectors: SBERT 임베딩
- ott_providers: OTT 마스터
- movie_ott_map: 영화-OTT 연결
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


class HybridRecommender:
    def __init__(
        self,
        db_config: dict,
        lightgcn_model_path: str,
        lightgcn_data_path: str,
        sbert_weight: float = 0.7,
        lightgcn_weight: float = 0.3,
        device: str = None
    ):
        """
        Args:
            db_config: PostgreSQL 연결 설정
                {
                    'host': 'localhost',
                    'port': 5432,
                    'database': 'moviesir',
                    'user': 'postgres',
                    'password': 'password'
                }
            lightgcn_model_path: LightGCN 모델 경로
            lightgcn_data_path: LightGCN 데이터 경로
            sbert_weight: SBERT 가중치 (기본 0.7)
            lightgcn_weight: LightGCN 가중치 (기본 0.3)
            device: 연산 장치 (cuda/cpu)
        """
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        self.sbert_weight = sbert_weight
        self.lightgcn_weight = lightgcn_weight
        
        # DB 연결
        self.db = DatabaseConnection(**db_config)
        
        print("Initializing Hybrid Recommender (DB Mode)...")
        
        # 1. 데이터 로드 (DB에서)
        self._load_metadata_from_db()
        self._load_sbert_data_from_db()
        self._load_ott_data_from_db()
        
        # 2. LightGCN 로드 (파일에서 - 학습된 모델)
        self._load_lightgcn_data(lightgcn_data_path)
        self._load_lightgcn_model(lightgcn_model_path)
        
        # 3. Pre-alignment
        print("Pre-aligning models for fast inference...")
        
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
        
        print(f"Pre-alignment complete. Target movies: {len(self.common_movie_ids)}")
        
        self.scaler = MinMaxScaler()
        self.recommendation_history = []

    def _load_metadata_from_db(self):
        """DB에서 영화 메타데이터 로드"""
        print("Loading metadata from database...")
        
        query = """
            SELECT 
                movie_id,
                tmdb_id,
                title,
                runtime,
                genres,
                overview,
                poster_path,
                release_date,
                vote_average,
                popularity
            FROM movies
        """
        
        rows = self.db.execute_query(query)
        
        # metadata_map 구성 (tmdb_id를 키로)
        self.metadata_map = {}
        for row in rows:
            tmdb_id = row['tmdb_id']
            self.metadata_map[tmdb_id] = {
                'movie_id': row['movie_id'],
                'tmdb_id': tmdb_id,
                'title': row['title'],
                'runtime': row['runtime'] or 0,
                'genres': row['genres'] or [],  # VARCHAR[] → Python list
                'overview': row['overview'] or '',
                'poster_path': row['poster_path'],
                'release_date': str(row['release_date']) if row['release_date'] else '',
                'vote_average': row['vote_average'] or 0,
                'popularity': row['popularity'] or 0
            }
        
        # 장르 리스트 추출
        all_genres = set()
        for movie_data in self.metadata_map.values():
            genres = movie_data.get('genres', [])
            if genres:
                all_genres.update(genres)
        
        self.all_genres = sorted(list(all_genres))
        
        print(f"  Metadata loaded: {len(self.metadata_map):,} movies")
        print(f"  Available genres: {len(self.all_genres)}")

    def _load_sbert_data_from_db(self):
        """DB에서 SBERT 임베딩 로드"""
        print("Loading SBERT embeddings from database...")
        
        query = """
            SELECT 
                mv.movie_id,
                m.tmdb_id,
                mv.embedding
            FROM movie_vectors mv
            JOIN movies m ON mv.movie_id = m.movie_id
            ORDER BY mv.movie_id
        """
        
        rows = self.db.execute_query(query)
        
        self.sbert_movie_ids = []
        embeddings = []
        
        for row in rows:
            tmdb_id = row['tmdb_id']
            # pgvector는 문자열로 반환될 수 있음 → numpy 배열로 변환
            embedding = row['embedding']
            if isinstance(embedding, str):
                # '[0.1, 0.2, ...]' 형태 파싱
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
        
        # OTT 제공자 목록
        ott_query = """
            SELECT provider_id, provider_name
            FROM ott_providers
            ORDER BY display_priority, provider_name
        """
        ott_rows = self.db.execute_query(ott_query)
        
        self.ott_id_to_name = {row['provider_id']: row['provider_name'] for row in ott_rows}
        self.all_otts = [row['provider_name'] for row in ott_rows]
        
        # 영화-OTT 매핑
        map_query = """
            SELECT 
                m.tmdb_id,
                op.provider_name
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
        print(f"  Available OTTs: {self.all_otts}")

    def _load_lightgcn_data(self, data_path: str):
        """LightGCN 매핑 데이터 로드 (파일)"""
        data_path = Path(data_path)
        with open(data_path / 'id_mappings.pkl', 'rb') as f:
            mappings = pickle.load(f)
        
        self.lightgcn_movie_to_idx = mappings['tmdb2id']
        self.lightgcn_idx_to_movie = mappings['id2tmdb']
        
        print(f"  LightGCN movies: {len(self.lightgcn_movie_to_idx):,}")

    def _load_lightgcn_model(self, model_path: str):
        """LightGCN 모델 로드 (파일)"""
        print(f"Loading LightGCN model from {model_path}")
        checkpoint = torch.load(model_path, map_location=self.device)
        
        if isinstance(checkpoint, dict):
            if 'model_state_dict' in checkpoint:
                self.lightgcn_item_embeddings = checkpoint['model_state_dict']['item_embedding.weight'].cpu().numpy()
            elif 'item_embeddings' in checkpoint:
                self.lightgcn_item_embeddings = checkpoint['item_embeddings'].cpu().numpy()
            else:
                self.lightgcn_item_embeddings = checkpoint['item_embedding.weight'].cpu().numpy()

    def _get_movie_runtime(self, movie_id: int) -> int:
        """영화 런타임 반환 (분)"""
        meta = self.metadata_map.get(movie_id, {})
        runtime = meta.get('runtime', 0)
        try:
            return int(float(runtime)) if runtime else 0
        except:
            return 0

    def _apply_filters(
        self,
        movie_ids: List[int],
        preferred_genres: Optional[List[str]] = None,
        max_runtime: Optional[int] = None,
        min_year: Optional[int] = None,
        preferred_otts: Optional[List[str]] = None
    ) -> Tuple[List[int], List[int]]:
        """
        필터링 적용 (장르, 런타임, 연도, OTT)
        
        Returns:
            (filtered_ids, filtered_indices)
        """
        filtered_indices = []
        filtered_ids = []
        
        for i, movie_id in enumerate(movie_ids):
            meta = self.metadata_map.get(movie_id, {})
            if not meta:
                continue
            
            # 1. 런타임 필터링
            if max_runtime is not None:
                runtime = meta.get('runtime', 0)
                try:
                    runtime = float(runtime) if runtime else 0
                except:
                    runtime = 0
                
                if runtime <= 0 or runtime > max_runtime:
                    continue
            
            # 2. 연도 필터링
            if min_year is not None:
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
            
            # 3. 장르 필터링 (DB는 이미 배열)
            if preferred_genres:
                genres = meta.get('genres', [])
                if not genres:
                    continue
                
                # 선호 장르와 교집합 확인
                if not any(g in genres for g in preferred_genres):
                    continue
            
            # 4. OTT 필터링
            if preferred_otts:
                movie_otts = self.movie_ott_map.get(movie_id, [])
                if not any(ott in movie_otts for ott in preferred_otts):
                    continue
            
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
        """시간에 맞는 영화 조합 찾기"""
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
        
        movie_data.sort(key=lambda x: x['score'], reverse=True)
        
        max_combinations_limit = 1_000_000
        max_candidates = min(len(movie_data), 60)
        
        for n in range(20, min(len(movie_data), 100)):
            max_combo_size = min(5, n // 3)
            total_combos = sum(comb(n, k) for k in range(2, max_combo_size + 1))
            if total_combos > max_combinations_limit:
                max_candidates = n - 1
                break
        
        movie_data = movie_data[:max_candidates]
        print(f"  Using top {len(movie_data)} candidates")
        
        valid_combinations = []
        time_tolerance = 30
        
        for combo_size in range(2, min(6, len(movie_data) + 1)):
            for combo in combinations(movie_data, combo_size):
                total_runtime = sum(m['runtime'] for m in combo)
                
                if available_time - time_tolerance <= total_runtime <= available_time + time_tolerance:
                    avg_score = np.mean([m['score'] for m in combo])
                    valid_combinations.append({
                        'movies': [m['id'] for m in combo],
                        'total_runtime': total_runtime,
                        'avg_score': avg_score
                    })
                    
                    if len(valid_combinations) >= 1:
                        break
            
            if len(valid_combinations) >= 1:
                break
        
        print(f"  Found {len(valid_combinations)} valid combination(s)")
        
        if not valid_combinations:
            return []
        
        valid_combinations.sort(key=lambda x: x['avg_score'], reverse=True)
        return valid_combinations[:top_k]

    def recommend(
        self,
        user_movie_ids: List[int],
        available_time: int,
        top_k: int = 20,
        exclude_seen: bool = True,
        preferred_genres: Optional[List[str]] = None,
        preferred_otts: Optional[List[str]] = None
    ) -> Tuple[str, dict]:
        """하이브리드 추천"""
        print(f"\nStarting hybrid recommendation...")
        print(f"Available time: {available_time} min")
        
        start_time = time.time()
        
        # 1. 사용자 프로필 생성
        user_sbert_vecs = []
        for mid in user_movie_ids:
            if mid in self.sbert_movie_to_idx:
                user_sbert_vecs.append(self.sbert_embeddings[self.sbert_movie_to_idx[mid]])
        
        if not user_sbert_vecs:
            return 'single', {'recommendations': {'track_a': [], 'track_b': []}}
        
        user_sbert_profile = np.mean(user_sbert_vecs, axis=0)
        user_sbert_profile = user_sbert_profile / (np.linalg.norm(user_sbert_profile) + 1e-10)
        
        user_gcn_vecs = []
        for mid in user_movie_ids:
            if mid in self.lightgcn_movie_to_idx:
                user_gcn_vecs.append(self.lightgcn_item_embeddings[self.lightgcn_movie_to_idx[mid]])
        
        if not user_gcn_vecs:
            return 'single', {'recommendations': {'track_a': [], 'track_b': []}}
        
        user_gcn_profile = np.mean(user_gcn_vecs, axis=0)
        
        # 2. 전체 점수 계산
        sbert_scores = self.target_sbert_norm @ user_sbert_profile
        lightgcn_scores = self.target_lightgcn_matrix @ user_gcn_profile
        
        # 3. 추천 타입 결정
        recommendation_type = 'combination' if available_time >= 240 else 'single'
        max_runtime = None if recommendation_type == 'combination' else available_time
        
        # 4. Track A 필터링 (장르 + 연도 + OTT 적용)
        filtered_ids_a, filtered_indices_a = self._apply_filters(
            self.common_movie_ids, preferred_genres, max_runtime,
            min_year=2000, preferred_otts=preferred_otts
        )
        
        # 5. Track B 필터링 (장르 무시, 연도 + OTT 적용)
        filtered_ids_b, filtered_indices_b = self._apply_filters(
            self.common_movie_ids, None, max_runtime,
            min_year=2000, preferred_otts=preferred_otts
        )
        
        if recommendation_type == 'single':
            # === 단일 영화 추천 ===
            
            # Track A
            if filtered_ids_a:
                filtered_sbert_a = sbert_scores[filtered_indices_a]
                filtered_lightgcn_a = lightgcn_scores[filtered_indices_a]
                
                norm_sbert_a = self.scaler.fit_transform(filtered_sbert_a.reshape(-1, 1)).squeeze()
                norm_lightgcn_a = self.scaler.fit_transform(filtered_lightgcn_a.reshape(-1, 1)).squeeze()
                
                final_scores_a = self.sbert_weight * norm_sbert_a + self.lightgcn_weight * norm_lightgcn_a
                
                if exclude_seen:
                    for i, mid in enumerate(filtered_ids_a):
                        if mid in user_movie_ids:
                            final_scores_a[i] = -np.inf
                
                for i, mid in enumerate(filtered_ids_a):
                    if mid in self.recommendation_history[-9:]:
                        final_scores_a[i] = -np.inf
                
                valid_indices_a = [i for i, score in enumerate(final_scores_a) if score != -np.inf]
                if len(valid_indices_a) >= 10:
                    top_10_indices_a = sorted(valid_indices_a, key=lambda i: final_scores_a[i], reverse=True)[:10]
                    selected_indices_a = np.random.choice(top_10_indices_a, size=min(3, len(top_10_indices_a)), replace=False)
                elif len(valid_indices_a) >= 3:
                    top_indices_a = sorted(valid_indices_a, key=lambda i: final_scores_a[i], reverse=True)[:3]
                    selected_indices_a = top_indices_a
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
                filtered_lightgcn_b = lightgcn_scores[filtered_indices_b]
                
                norm_sbert_b = self.scaler.fit_transform(filtered_sbert_b.reshape(-1, 1)).squeeze()
                norm_lightgcn_b = self.scaler.fit_transform(filtered_lightgcn_b.reshape(-1, 1)).squeeze()
                
                final_scores_b = 0.4 * norm_sbert_b + 0.6 * norm_lightgcn_b
                
                if exclude_seen:
                    for i, mid in enumerate(filtered_ids_b):
                        if mid in user_movie_ids:
                            final_scores_b[i] = -np.inf
                
                track_a_ids = [m['tmdb_id'] for m in track_a]
                for i, mid in enumerate(filtered_ids_b):
                    if mid in track_a_ids:
                        final_scores_b[i] = -np.inf
                
                for i, mid in enumerate(filtered_ids_b):
                    if mid in self.recommendation_history[-9:]:
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
                if len(valid_indices) >= 10:
                    top_10_indices = sorted(valid_indices, key=lambda i: final_scores_b[i], reverse=True)[:10]
                    selected_indices = np.random.choice(top_10_indices, size=min(3, len(top_10_indices)), replace=False)
                elif len(valid_indices) >= 3:
                    top_indices = sorted(valid_indices, key=lambda i: final_scores_b[i], reverse=True)[:3]
                    selected_indices = top_indices
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
            
            # Track A
            if filtered_ids_a:
                filtered_sbert_a = sbert_scores[filtered_indices_a]
                filtered_lightgcn_a = lightgcn_scores[filtered_indices_a]
                
                norm_sbert_a = self.scaler.fit_transform(filtered_sbert_a.reshape(-1, 1)).squeeze()
                norm_lightgcn_a = self.scaler.fit_transform(filtered_lightgcn_a.reshape(-1, 1)).squeeze()
                
                final_scores_a = self.sbert_weight * norm_sbert_a + self.lightgcn_weight * norm_lightgcn_a
                
                if exclude_seen:
                    for i, mid in enumerate(filtered_ids_a):
                        if mid in user_movie_ids:
                            final_scores_a[i] = -np.inf
                
                combination_a = self._find_movie_combinations(
                    filtered_ids_a, final_scores_a, available_time, top_k=1
                )
                
                if combination_a:
                    combo = combination_a[0]
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
                    
                    track_a_combo = {
                        'combination_score': combo['avg_score'],
                        'total_runtime': combo['total_runtime'],
                        'movies': combo_movies
                    }
                else:
                    track_a_combo = None
            else:
                track_a_combo = None
            
            # Track B
            if filtered_ids_b:
                filtered_sbert_b = sbert_scores[filtered_indices_b]
                filtered_lightgcn_b = lightgcn_scores[filtered_indices_b]
                
                norm_sbert_b = self.scaler.fit_transform(filtered_sbert_b.reshape(-1, 1)).squeeze()
                norm_lightgcn_b = self.scaler.fit_transform(filtered_lightgcn_b.reshape(-1, 1)).squeeze()
                
                final_scores_b = 0.4 * norm_sbert_b + 0.6 * norm_lightgcn_b
                
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
                    if mid in self.recommendation_history[-9:]:
                        final_scores_b[i] = -np.inf
                
                combination_b = self._find_movie_combinations(
                    filtered_ids_b, final_scores_b, available_time, top_k=1
                )
                
                if combination_b:
                    combo = combination_b[0]
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
                    
                    track_b_combo = {
                        'combination_score': combo['avg_score'],
                        'total_runtime': combo['total_runtime'],
                        'movies': combo_movies
                    }
                    
                    for movie in combo_movies:
                        self.recommendation_history.append(movie['tmdb_id'])
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
        """리소스 정리"""
        self.db.close()


# ============================================================
# 사용자 입력 함수
# ============================================================
def get_user_input(recommender: HybridRecommender):
    """사용자 필터 입력"""
    
    print("\n" + "="*80)
    print("FILTER SELECTION")
    print("="*80)
    
    # 1. 시간 입력
    print("\n[1] 이용 가능 시간 입력")
    print("-" * 80)
    print("영화를 볼 수 있는 시간을 분 단위로 입력하세요.")
    print("※ 240분 이상: 영화 조합 추천")
    
    while True:
        time_input = input("\n시간(분): ").strip()
        try:
            available_time = int(time_input)
            if available_time > 0:
                break
            else:
                print("양수를 입력해주세요.")
        except ValueError:
            print("올바른 숫자를 입력해주세요.")
    
    # 2. 장르 선택
    print("\n[2] 선호 장르 선택")
    print("-" * 80)
    for i, genre in enumerate(recommender.all_genres, 1):
        print(f"{i:2d}. {genre}")
    
    genre_input = input("\n장르 번호 입력 (쉼표로 구분, 엔터로 스킵): ").strip()
    
    selected_genres = []
    if genre_input:
        try:
            genre_indices = [int(x.strip()) for x in genre_input.split(',')]
            selected_genres = [
                recommender.all_genres[i-1]
                for i in genre_indices
                if 1 <= i <= len(recommender.all_genres)
            ]
        except (ValueError, IndexError):
            print("잘못된 입력입니다. 장르 필터를 건너뜁니다.")
    
    # 3. OTT 선택
    print("\n[3] 구독 중인 OTT 선택")
    print("-" * 80)
    for i, ott in enumerate(recommender.all_otts, 1):
        print(f"{i:2d}. {ott}")
    
    ott_input = input("\nOTT 번호 입력 (쉼표로 구분, 엔터로 스킵): ").strip()
    
    selected_otts = []
    if ott_input:
        try:
            ott_indices = [int(x.strip()) for x in ott_input.split(',')]
            selected_otts = [
                recommender.all_otts[i-1]
                for i in ott_indices
                if 1 <= i <= len(recommender.all_otts)
            ]
        except (ValueError, IndexError):
            print("잘못된 입력입니다. OTT 필터를 건너뜁니다.")
    
    print("\n" + "="*80)
    print("선택된 필터:")
    print(f"시간: {available_time}분")
    print(f"장르: {selected_genres if selected_genres else '전체'}")
    print(f"OTT: {selected_otts if selected_otts else '전체'}")
    print("="*80)
    
    return {
        'available_time': available_time,
        'preferred_genres': selected_genres if selected_genres else None,
        'preferred_otts': selected_otts if selected_otts else None
    }


def print_results(rec_type: str, result: dict):
    """결과 출력"""
    print("\n" + "="*160)
    print(f"RECOMMENDATIONS ({'SINGLE' if rec_type == 'single' else 'COMBINATION'})")
    print(f"Elapsed: {result['elapsed_time']:.2f}s")
    print("="*160)
    
    if rec_type == 'single':
        # Track A
        track_a = result['recommendations']['track_a']
        print(f"\n[{track_a['label']}]")
        print("-" * 160)
        print(f"{'Rank':<4} | {'ID':<8} | {'Score':<6} | {'Year':<4} | {'Title':<28} | {'Runtime':<7} | {'Genres'}")
        print("-" * 160)
        
        for i, rec in enumerate(track_a['movies'], 1):
            title = rec['title']
            if len(title) > 26:
                title = title[:23] + "..."
            
            release_date = rec.get('release_date', '')
            year = release_date[:4] if release_date else 'N/A'
            
            runtime = rec.get('runtime', 0)
            runtime_str = f"{runtime}분" if runtime else "N/A"
            
            genres = rec.get('genres', [])
            if isinstance(genres, list):
                genres_str = ', '.join(genres[:3])
                if len(genres) > 3:
                    genres_str += f" +{len(genres)-3}"
            else:
                genres_str = str(genres)[:30]
            
            if len(genres_str) > 30:
                genres_str = genres_str[:27] + "..."
            
            print(f"{i:<4} | {rec['tmdb_id']:<8} | {rec['hybrid_score']:.4f} | {year:<4} | {title:<28} | {runtime_str:<7} | {genres_str}")
            
            overview = rec['overview']
            if len(overview) > 120:
                overview = overview[:117] + "..."
            print(f"       → {overview}")
            print()
        
        # Track B
        track_b = result['recommendations']['track_b']
        print(f"\n[{track_b['label']}]")
        print("-" * 160)
        print(f"{'Rank':<4} | {'ID':<8} | {'Score':<6} | {'Year':<4} | {'Title':<28} | {'Runtime':<7} | {'Genres'}")
        print("-" * 160)
        
        for i, rec in enumerate(track_b['movies'], 1):
            title = rec['title']
            if len(title) > 26:
                title = title[:23] + "..."
            
            release_date = rec.get('release_date', '')
            year = release_date[:4] if release_date else 'N/A'
            
            runtime = rec.get('runtime', 0)
            runtime_str = f"{runtime}분" if runtime else "N/A"
            
            genres = rec.get('genres', [])
            if isinstance(genres, list):
                genres_str = ', '.join(genres[:3])
                if len(genres) > 3:
                    genres_str += f" +{len(genres)-3}"
            else:
                genres_str = str(genres)[:30]
            
            if len(genres_str) > 30:
                genres_str = genres_str[:27] + "..."
            
            print(f"{i:<4} | {rec['tmdb_id']:<8} | {rec['hybrid_score']:.4f} | {year:<4} | {title:<28} | {runtime_str:<7} | {genres_str}")
            
            overview = rec['overview']
            if len(overview) > 120:
                overview = overview[:117] + "..."
            print(f"       → {overview}")
            print()
    
    else:
        # Track A: 조합
        track_a = result['recommendations']['track_a']
        print(f"\n[{track_a['label']}]")
        print("-" * 160)
        
        if track_a['combination']:
            combo = track_a['combination']
            print(f"Total Runtime: {combo['total_runtime']}분 | Score: {combo['combination_score']:.4f}")
            print("-" * 160)
            print(f"{'#':<2} | {'ID':<8} | {'Year':<4} | {'Title':<33} | {'Runtime':<7} | {'Genres'}")
            print("-" * 160)
            
            for j, movie in enumerate(combo['movies'], 1):
                title = movie['title']
                if len(title) > 31:
                    title = title[:28] + "..."
                
                release_date = movie.get('release_date', '')
                year = release_date[:4] if release_date else 'N/A'
                
                runtime = movie.get('runtime', 0)
                runtime_str = f"{runtime}분"
                
                genres = movie.get('genres', [])
                if isinstance(genres, list):
                    genres_str = ', '.join(genres[:3])
                    if len(genres) > 3:
                        genres_str += f" +{len(genres)-3}"
                else:
                    genres_str = str(genres)[:40]
                
                if len(genres_str) > 40:
                    genres_str = genres_str[:37] + "..."
                
                print(f"{j:<2} | {movie['tmdb_id']:<8} | {year:<4} | {title:<33} | {runtime_str:<7} | {genres_str}")
                
                overview = movie.get('overview', '')
                if len(overview) > 100:
                    overview = overview[:97] + "..."
                if overview:
                    print(f"     → {overview}")
                print()
        else:
            print("조건에 맞는 조합을 찾지 못했습니다.")
        
        # Track B: 조합
        track_b = result['recommendations']['track_b']
        print(f"\n[{track_b['label']}]")
        print("-" * 160)
        
        if track_b['combination']:
            combo = track_b['combination']
            print(f"Total Runtime: {combo['total_runtime']}분 | Score: {combo['combination_score']:.4f}")
            print("-" * 160)
            print(f"{'#':<2} | {'ID':<8} | {'Year':<4} | {'Title':<33} | {'Runtime':<7} | {'Genres'}")
            print("-" * 160)
            
            for j, movie in enumerate(combo['movies'], 1):
                title = movie['title']
                if len(title) > 31:
                    title = title[:28] + "..."
                
                release_date = movie.get('release_date', '')
                year = release_date[:4] if release_date else 'N/A'
                
                runtime = movie.get('runtime', 0)
                runtime_str = f"{runtime}분"
                
                genres = movie.get('genres', [])
                if isinstance(genres, list):
                    genres_str = ', '.join(genres[:3])
                    if len(genres) > 3:
                        genres_str += f" +{len(genres)-3}"
                else:
                    genres_str = str(genres)[:40]
                
                if len(genres_str) > 40:
                    genres_str = genres_str[:37] + "..."
                
                print(f"{j:<2} | {movie['tmdb_id']:<8} | {year:<4} | {title:<33} | {runtime_str:<7} | {genres_str}")
                
                overview = movie.get('overview', '')
                if len(overview) > 100:
                    overview = overview[:97] + "..."
                if overview:
                    print(f"     → {overview}")
                print()
        else:
            print("조건에 맞는 조합을 찾지 못했습니다.")


# ============================================================
# 실행
# ============================================================
if __name__ == "__main__":

    db_host = os.getenv("DATABASE_HOST")
    db_port = os.getenv("DATABASE_PORT")
    db_name = os.getenv("DATABASE_NAME")
    db_user = os.getenv("DATABASE_USER")
    db_password = os.getenv("DATABASE_PASSWORD")

    

    DB_CONFIG = {
        'host': db_host,
        'port': db_port,
        'database': db_name,
        'user': db_user,
        'password': db_password  # 실제 비밀번호로 변경
    }
    
    # LightGCN 모델 경로 (파일 기반 유지)
    # LIGHTGCN_MODEL_PATH = "/home/ubuntu/ai-model/models/light_gcn/checkpoints/best_model.pt"
    LIGHTGCN_MODEL_PATH = "ai/training/lightgcn_model/best_model.pt"
    # LIGHTGCN_DATA_PATH = "/home/ubuntu/ai-model/models/light_gcn/data"
    LIGHTGCN_DATA_PATH = "ai/training/lightgcn_data"
    
    print("\n" + "="*80)
    print("INITIALIZING HYBRID RECOMMENDER (DB MODE)")
    print("="*80)
    
    try:
        recommender = HybridRecommender(
            db_config=DB_CONFIG,
            lightgcn_model_path=LIGHTGCN_MODEL_PATH,
            lightgcn_data_path=LIGHTGCN_DATA_PATH,
            sbert_weight=0.7,
            lightgcn_weight=0.3
        )
        
        print("\n" + "="*80)
        print("INITIALIZATION COMPLETE")
        print("="*80)

        # 테스트 사용자
        # user_movies = [854, 138843]
        user_movies = [75656, 9502, 955]
        
        while True:
            print("\n" + "="*80)
            print("USER INPUT MOVIES")
            print("="*80)
            for mid in user_movies:
                meta = recommender.metadata_map.get(mid, {})
                print(f"  {mid}: {meta.get('title', 'Unknown')}")
            
            if hasattr(recommender, '_last_filters'):
                print("\n1. 새로운 조건으로 추천받기")
                print("2. 같은 조건으로 다른 영화 추천받기")
                mode_choice = input("선택 (1/2): ").strip()
                
                if mode_choice == "2":
                    filters = recommender._last_filters
                    print("\n이전 조건으로 추천합니다.")
                    print(f"시간: {filters['available_time']}분")
                    print(f"장르: {filters['preferred_genres'] if filters['preferred_genres'] else '전체'}")
                    print(f"OTT: {filters['preferred_otts'] if filters['preferred_otts'] else '전체'}")
                else:
                    filters = get_user_input(recommender)
                    recommender._last_filters = filters
            else:
                filters = get_user_input(recommender)
                recommender._last_filters = filters
            
            rec_type, result = recommender.recommend(
                user_movie_ids=user_movies,
                top_k=20,
                exclude_seen=True,
                **filters
            )
            
            print_results(rec_type, result)
            
            continue_input = input("\n다시 추천받으시겠습니까? (y/n): ").strip().lower()
            if continue_input == 'n':
                print("\n프로그램을 종료합니다.")
                break
        
        recommender.close()
        
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc
