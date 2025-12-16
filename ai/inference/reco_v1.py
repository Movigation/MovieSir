import torch
import pickle
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.preprocessing import MinMaxScaler
from typing import List, Optional, Tuple
from itertools import combinations

"""

장르, ott, 시간, 성인요소 필터링
+ 시간 기반 단일/조합 추천
+ 영화 조합 추천시 영화 중복 제거

"""

class HybridRecommender:
    def __init__(
        self,
        sbert_embeddings_path: str,
        lightgcn_model_path: str,
        lightgcn_data_path: str,
        metadata_path: str,
        ott_path: str,
        sbert_weight: float = 0.7,
        lightgcn_weight: float = 0.3,
        device: str = None
    ):
        """
        Args:
            sbert_embeddings_path: SBERT 임베딩 pkl 파일 경로
            lightgcn_model_path: LightGCN best 모델 체크포인트 경로
            lightgcn_data_path: LightGCN 전처리 데이터 폴더 경로
            metadata_path: 영화 메타데이터 CSV 파일 경로
            ott_path: OTT 정보 CSV 파일 경로
            sbert_weight: SBERT 가중치 (default: 0.7)
            lightgcn_weight: LightGCN 가중치 (default: 0.3)
            device: 연산 디바이스
        """
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        self.sbert_weight = sbert_weight
        self.lightgcn_weight = lightgcn_weight
        
        # SBERT 데이터 로드
        self._load_sbert_data(sbert_embeddings_path)
        
        # LightGCN 데이터 및 모델 로드
        self._load_lightgcn_data(lightgcn_data_path)
        self._load_lightgcn_model(lightgcn_model_path)
        
        # 메타데이터 로드
        self._load_metadata(metadata_path)
        
        # OTT 데이터 로드
        self._load_ott_data(ott_path)
        
        # 스케일러 초기화
        self.scaler = MinMaxScaler()
    
    def _load_ott_data(self, path: str):
        """OTT 데이터 로드 및 매핑 생성"""
        print(f"Loading OTT data from {path}")
        try:
            df = pd.read_csv(path)
            
            # movie_id별로 provider_name 리스트 생성
            # {movie_id: ['Netflix', 'Watcha', ...]}
            self.ott_map = {}
            for _, row in df.iterrows():
                movie_id = int(row['movie_id'])
                provider = row['provider_name']
                
                if movie_id not in self.ott_map:
                    self.ott_map[movie_id] = []
                
                if provider not in self.ott_map[movie_id]:
                    self.ott_map[movie_id].append(provider)
            
            print(f"Loaded OTT info for {len(self.ott_map)} movies")
            
            # 전체 OTT 플랫폼 목록 추출 (정렬)
            all_providers = set()
            for providers in self.ott_map.values():
                all_providers.update(providers)
            self.all_ott_providers = sorted(list(all_providers))
            
        except Exception as e:
            print(f"Error loading OTT data: {e}")
            self.ott_map = {}
            self.all_ott_providers = []

    def _load_metadata(self, path: str):
        """CSV 메타데이터 로드 및 딕셔너리 변환"""
        print(f"Loading metadata from {path}")
        try:
            df = pd.read_csv(path)
            
            if 'movieId' in df.columns:
                df['movieId'] = df['movieId'].astype(int)
            
            self.metadata_map = df.set_index('movieId').to_dict('index')
            print(f"Loaded metadata for {len(self.metadata_map)} movies")
            
            # 전체 장르 목록 추출
            all_genres = set()
            for movie_data in self.metadata_map.values():
                genres = movie_data.get('genres', '')
                if isinstance(genres, str) and genres:
                    if '|' in genres:
                        genre_list = [g.strip() for g in genres.split('|')]
                    elif ',' in genres:
                        genre_list = [g.strip() for g in genres.split(',')]
                    else:
                        genre_list = [genres.strip()]
                    all_genres.update(genre_list)
            
            self.all_genres = sorted(list(all_genres))
            
        except Exception as e:
            print(f"Error loading metadata: {e}")
            self.metadata_map = {}
            self.all_genres = []
        
    def _load_sbert_data(self, embeddings_path: str):
        print(f"Loading SBERT embeddings from {embeddings_path}")
        with open(embeddings_path, 'rb') as f:
            data = pickle.load(f)
        
        self.sbert_movie_ids = data['movieId'].tolist()
        self.sbert_embeddings = data['embedding'].tolist()
        self.sbert_embeddings = np.array(self.sbert_embeddings).astype('float32')
        self.sbert_movie_to_idx = {mid: idx for idx, mid in enumerate(self.sbert_movie_ids)}
        
        print(f"Loaded {len(self.sbert_movie_ids)} SBERT embeddings")
        
    def _load_lightgcn_data(self, data_path: str):
        data_path = Path(data_path)
        mapping_path = data_path / 'id_mappings.pkl'
        print(f"Loading LightGCN mappings from {mapping_path}")
        with open(mapping_path, 'rb') as f:
            mappings = pickle.load(f)
        
        self.lightgcn_movie_to_idx = mappings['item2id']
        self.lightgcn_idx_to_movie = mappings['id2item']
        self.n_items = mappings['n_items']
        
        print(f"Loaded {len(self.lightgcn_movie_to_idx)} LightGCN movie mappings")
        
    def _load_lightgcn_model(self, model_path: str):
        print(f"Loading LightGCN model from {model_path}")
        checkpoint = torch.load(model_path, map_location=self.device)
        self.lightgcn_item_embeddings = checkpoint['model_state_dict']['item_embedding.weight'].cpu().numpy()
        
        print(f"Loaded LightGCN embeddings: {self.lightgcn_item_embeddings.shape}")
        
    def _compute_sbert_scores(self, user_movie_ids: list) -> np.ndarray:
        user_embeddings = []
        
        for movie_id in user_movie_ids:
            if movie_id in self.sbert_movie_to_idx:
                idx = self.sbert_movie_to_idx[movie_id]
                user_embeddings.append(self.sbert_embeddings[idx])
            else:
                print(f"Warning: Movie {movie_id} not found in SBERT embeddings")
        
        if len(user_embeddings) == 0:
            raise ValueError("No valid movies found in SBERT embeddings")
        
        user_embeddings = np.array(user_embeddings)
        
        user_embeddings_norm = user_embeddings / np.linalg.norm(
            user_embeddings, axis=1, keepdims=True
        )
        all_embeddings_norm = self.sbert_embeddings / np.linalg.norm(
            self.sbert_embeddings, axis=1, keepdims=True
        )
        
        similarities = user_embeddings_norm @ all_embeddings_norm.T
        avg_similarities = np.mean(similarities, axis=0)
        
        return avg_similarities
    
    def _compute_lightgcn_scores(self, user_movie_ids: list) -> np.ndarray:
        user_embeddings = []
        
        for movie_id in user_movie_ids:
            if movie_id in self.lightgcn_movie_to_idx:
                idx = self.lightgcn_movie_to_idx[movie_id]
                user_embeddings.append(self.lightgcn_item_embeddings[idx])
            else:
                print(f"Warning: Movie {movie_id} not found in LightGCN embeddings")
        
        if len(user_embeddings) == 0:
            raise ValueError("No valid movies found in LightGCN embeddings")
        
        user_embeddings = np.array(user_embeddings)
        avg_user_embedding = np.mean(user_embeddings, axis=0, keepdims=True)
        
        scores = avg_user_embedding @ self.lightgcn_item_embeddings.T
        scores = scores.squeeze()
        
        return scores
    
    def _align_scores(self, sbert_scores: np.ndarray, lightgcn_scores: np.ndarray) -> tuple:
        common_movie_ids = []
        aligned_sbert = []
        aligned_lightgcn = []
        
        for lightgcn_idx, movie_id in self.lightgcn_idx_to_movie.items():
            if movie_id in self.sbert_movie_to_idx:
                sbert_idx = self.sbert_movie_to_idx[movie_id]
                
                common_movie_ids.append(movie_id)
                aligned_sbert.append(sbert_scores[sbert_idx])
                aligned_lightgcn.append(lightgcn_scores[lightgcn_idx])
        
        aligned_sbert = np.array(aligned_sbert)
        aligned_lightgcn = np.array(aligned_lightgcn)
        
        print(f"Common movies between SBERT and LightGCN: {len(common_movie_ids)}")
        
        return aligned_sbert, aligned_lightgcn, common_movie_ids
    
    def _apply_filters(
        self,
        movie_ids: List[int],
        preferred_genres: Optional[List[str]] = None,
        preferred_ott: Optional[List[str]] = None,
        max_runtime: Optional[int] = None,
        allow_adult: bool = True
    ) -> List[int]:
        """
        영화 목록에 필터 적용
        
        Args:
            movie_ids: 필터링할 영화 ID 리스트
            preferred_genres: 선호 장르 리스트 (중복 가능)
            preferred_ott: 선호 OTT 플랫폼 리스트 (중복 가능)
            max_runtime: 최대 런타임(분)
            allow_adult: 성인 영화 허용 여부
        """
        filtered_ids = []
        
        for movie_id in movie_ids:
            meta = self.metadata_map.get(movie_id, {})
            
            if not meta:
                continue
            
            # 1. 성인물 필터링
            is_adult = meta.get('adult', False)
            if isinstance(is_adult, str):
                is_adult = is_adult.lower() == 'true'
            
            if is_adult and not allow_adult:
                continue
            
            # 2. 런타임 필터링
            if max_runtime is not None:
                runtime = meta.get('runtime', 0)
                try:
                    runtime = float(runtime) if runtime else 0
                except (ValueError, TypeError):
                    runtime = 0
                    
                if runtime <= 0 or runtime > max_runtime:
                    continue
            
            # 3. 장르 필터링
            if preferred_genres:
                movie_genres = meta.get('genres', '')
                
                if not isinstance(movie_genres, str) or not movie_genres:
                    continue
                
                if '|' in movie_genres:
                    movie_genres_list = [g.strip() for g in movie_genres.split('|')]
                elif ',' in movie_genres:
                    movie_genres_list = [g.strip() for g in movie_genres.split(',')]
                else:
                    movie_genres_list = [movie_genres.strip()]
                
                has_preferred_genre = any(
                    genre in movie_genres_list 
                    for genre in preferred_genres
                )
                
                if not has_preferred_genre:
                    continue
            
            # 4. OTT 필터링
            if preferred_ott:
                movie_ott_list = self.ott_map.get(movie_id, [])
                
                # OTT 정보가 없으면 제외
                if not movie_ott_list:
                    continue
                
                # 선호 OTT 중 하나라도 포함되어 있으면 통과
                has_preferred_ott = any(
                    ott in movie_ott_list
                    for ott in preferred_ott
                )
                
                if not has_preferred_ott:
                    continue
            
            filtered_ids.append(movie_id)
        
        return filtered_ids
    
    def _get_movie_runtime(self, movie_id: int) -> int:
        """영화의 런타임 반환"""
        meta = self.metadata_map.get(movie_id, {})
        runtime = meta.get('runtime', 0)
        try:
            return int(float(runtime)) if runtime else 0
        except (ValueError, TypeError):
            return 0
    
    def _find_movie_combinations(
        self,
        movie_ids: List[int],
        scores: np.ndarray,
        target_time: int,
        top_k: int = 20
    ) -> List[dict]:
        """
        [CPU 최적화] Knapsack 알고리즘으로 영화 조합 찾기
        전략: 후보군을 안전한 범위(50~60개)로 제한하여 itertools의 속도를 극대화
        """
        from math import comb
        
        # 1. 영화 데이터 준비
        movie_data = []
        for i, mid in enumerate(movie_ids):
            runtime = self._get_movie_runtime(mid)
            if runtime > 0 and runtime <= target_time:
                movie_data.append((mid, runtime, scores[i]))
        
        # 2. 점수 기준 정렬
        movie_data.sort(key=lambda x: x[2], reverse=True)
        
        # 3. [핵심] 동적 후보 수 결정 (CPU 연산 한계 고려)
        # 연산 횟수(조합 수)가 200만 회를 넘지 않도록 후보 수 제한
        # C(50, 5) = 2,118,760 -> Python에서 약 0.1~0.2초 소요
        max_combinations_limit = 2_000_000 
        max_candidates = min(len(movie_data), 60) # 기본 상한선
        
        for n in range(20, min(len(movie_data), 100)):
            if comb(n, 5) > max_combinations_limit:
                max_candidates = n - 1
                break
            max_candidates = n
            
        # 후보군 자르기
        movie_data = movie_data[:max_candidates]
        
        print(f"Finding combinations from {len(movie_data)} candidates (CPU Optimized)...")
        
        valid_combinations = []
        
        # 4. 조합 탐색 (2개 ~ 5개)
        # 후보가 50개 정도면 5개 조합까지 돌려도 충분히 빠름
        max_combo_size = min(6, len(movie_data) + 1)
        
        for combo_size in range(2, max_combo_size):
            for combo in combinations(movie_data, combo_size):
                total_runtime = sum(m[1] for m in combo)
                
                # 목표 시간의 80% ~ 100% 범위
                if target_time * 0.8 <= total_runtime <= target_time:
                    avg_score = np.mean([m[2] for m in combo])
                    movie_ids_in_combo = [m[0] for m in combo]
                    
                    valid_combinations.append({
                        'movies': movie_ids_in_combo,
                        'total_runtime': total_runtime,
                        'avg_score': avg_score,
                        'individual_scores': [m[2] for m in combo]
                    })
        
        # 5. 정렬 (평균 점수 내림차순)
        valid_combinations.sort(key=lambda x: x['avg_score'], reverse=True)
        
        print(f"Found {len(valid_combinations)} valid combinations. Deduplicating...")
        
        # 6. 중복 영화 제거 (Greedy Selection)
        final_combinations = []
        used_movies = set()
        
        for combo in valid_combinations:
            combo_movies = set(combo['movies'])
            
            # 교집합이 없으면(중복된 영화가 없으면) 추가
            if not (combo_movies & used_movies):
                final_combinations.append(combo)
                used_movies.update(combo_movies)
                
                if len(final_combinations) >= top_k:
                    break
        
        print(f"Selected {len(final_combinations)} unique combinations.")
        
        return final_combinations

    def recommend(
        self,
        user_movie_ids: list,
        available_time: int,  # 사용자 입력 시간(분)
        top_k: int = 20,
        exclude_seen: bool = True,
        preferred_genres: Optional[List[str]] = None,
        preferred_ott: Optional[List[str]] = None,
        allow_adult: bool = True
    ) -> Tuple[str, list]:
        """
        하이브리드 추천 실행
        
        Returns:
            (recommendation_type, recommendations)
            recommendation_type: 'single' or 'combination'
        """
        print(f"\nStarting hybrid recommendation for {len(user_movie_ids)} user movies")
        print(f"Available time: {available_time} minutes")
        print(f"Filters - Genres: {preferred_genres}, OTT: {preferred_ott}, Allow Adult: {allow_adult}")
        
        # 추천 타입 결정
        if available_time >= 240:
            recommendation_type = 'combination'
            max_runtime = None  # 조합 추천에서는 개별 영화 런타임 제한 없음
        else:
            recommendation_type = 'single'
            max_runtime = available_time
        
        print(f"Recommendation type: {recommendation_type}")
        
        # 1. SBERT 점수 계산
        print("Computing SBERT scores...")
        sbert_scores = self._compute_sbert_scores(user_movie_ids)
        
        # 2. LightGCN 점수 계산
        print("Computing LightGCN scores...")
        lightgcn_scores = self._compute_lightgcn_scores(user_movie_ids)
        
        # 3. 점수 정렬
        print("Aligning scores...")
        aligned_sbert, aligned_lightgcn, common_movie_ids = self._align_scores(
            sbert_scores, lightgcn_scores
        )
        
        # 4. 필터링 적용
        print("Applying filters...")
        filtered_movie_ids = self._apply_filters(
            common_movie_ids,
            preferred_genres=preferred_genres,
            preferred_ott=preferred_ott,
            max_runtime=max_runtime,
            allow_adult=allow_adult
        )
        
        print(f"Movies after filtering: {len(filtered_movie_ids)} / {len(common_movie_ids)}")
        
        if len(filtered_movie_ids) == 0:
            print("Warning: No movies match the filter criteria")
            return recommendation_type, []
        
        # 5. 필터링된 영화들의 인덱스 추출
        filtered_indices = [common_movie_ids.index(mid) for mid in filtered_movie_ids]
        filtered_sbert = aligned_sbert[filtered_indices]
        filtered_lightgcn = aligned_lightgcn[filtered_indices]
        
        # 6. 정규화
        print("Normalizing scores...")
        normalized_sbert = self.scaler.fit_transform(filtered_sbert.reshape(-1, 1)).squeeze()
        normalized_lightgcn = self.scaler.fit_transform(filtered_lightgcn.reshape(-1, 1)).squeeze()
        
        # 7. 가중 평균
        final_scores = (
            self.sbert_weight * normalized_sbert +
            self.lightgcn_weight * normalized_lightgcn
        )
        
        # 8. 사용자가 본 영화 제외
        if exclude_seen:
            for movie_id in user_movie_ids:
                if movie_id in filtered_movie_ids:
                    idx = filtered_movie_ids.index(movie_id)
                    final_scores[idx] = -np.inf
        
        # 9. 추천 타입에 따라 결과 생성
        if recommendation_type == 'single':
            # 단일 영화 추천
            top_indices = np.argsort(final_scores)[::-1][:top_k]
            
            recommendations = []
            for idx in top_indices:
                mid = filtered_movie_ids[idx]
                meta = self.metadata_map.get(mid, {})
                ott_list = self.ott_map.get(mid, [])
                
                recommendations.append({
                    'movie_id': mid,
                    'hybrid_score': final_scores[idx],
                    'sbert_score': normalized_sbert[idx],
                    'lightgcn_score': normalized_lightgcn[idx],
                    'title_ko': meta.get('title_ko', 'Unknown Title'),
                    'genres': meta.get('genres', ''),
                    'overview': meta.get('overview', ''),
                    'poster_path': meta.get('poster_path', ''),
                    'release_date': meta.get('release_date', ''),
                    'runtime': meta.get('runtime', 0),
                    'popularity': meta.get('popularity', 0),
                    'adult': meta.get('adult', False),
                    'ott_providers': ott_list
                })
        
        else:
            # 영화 조합 추천
            combinations = self._find_movie_combinations(
                filtered_movie_ids,
                final_scores,
                available_time,
                top_k
            )
            
            recommendations = []
            for combo in combinations:
                combo_movies = []
                for mid in combo['movies']:
                    meta = self.metadata_map.get(mid, {})
                    ott_list = self.ott_map.get(mid, [])
                    
                    combo_movies.append({
                        'movie_id': mid,
                        'title_ko': meta.get('title_ko', 'Unknown Title'),
                        'genres': meta.get('genres', ''),
                        'runtime': meta.get('runtime', 0),
                        'release_date': meta.get('release_date', ''),
                        'ott_providers': ott_list
                    })
                
                recommendations.append({
                    'combination_score': combo['avg_score'],
                    'total_runtime': combo['total_runtime'],
                    'movies': combo_movies
                })
        
        return recommendation_type, recommendations


def get_user_input_for_filters(recommender: HybridRecommender):
    """사용자로부터 필터 입력 받기"""
    
    print("\n" + "="*80)
    print("FILTER SELECTION")
    print("="*80)
    
    # 0. 시간 입력 (추가)
    print("\n[0] 이용 가능 시간 입력")
    print("-" * 80)
    print("영화를 볼 수 있는 시간을 분 단위로 입력하세요.")
    print("예) 120 (2시간), 240 (4시간), 480 (8시간)")
    print("※ 240분 이상 입력 시 영화 조합을 추천합니다.")
    
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
    
    # 1. 장르 선택
    print("\n[1] 선호 장르 선택 (중복 가능)")
    print("-" * 80)
    for i, genre in enumerate(recommender.all_genres, 1):
        print(f"{i:2d}. {genre}")
    
    genre_input = input("\n선택할 장르 번호들을 입력하세요 (쉼표로 구분, 엔터로 스킵): ").strip()
    
    selected_genres = []
    if genre_input:
        try:
            genre_indices = [int(x.strip()) for x in genre_input.split(',')]
            selected_genres = [recommender.all_genres[i-1] for i in genre_indices if 1 <= i <= len(recommender.all_genres)]
        except (ValueError, IndexError):
            print("잘못된 입력입니다. 장르 필터를 건너뜁니다.")
    
    # 2. OTT 선택
    print("\n[2] 선호 OTT 플랫폼 선택 (중복 가능)")
    print("-" * 80)
    for i, ott in enumerate(recommender.all_ott_providers, 1):
        print(f"{i:2d}. {ott}")
    
    ott_input = input("\n선택할 OTT 번호들을 입력하세요 (쉼표로 구분, 엔터로 스킵): ").strip()
    
    selected_ott = []
    if ott_input:
        try:
            ott_indices = [int(x.strip()) for x in ott_input.split(',')]
            selected_ott = [recommender.all_ott_providers[i-1] for i in ott_indices if 1 <= i <= len(recommender.all_ott_providers)]
        except (ValueError, IndexError):
            print("잘못된 입력입니다. OTT 필터를 건너뜁니다.")
    
    # 3. 성인물 허용
    print("\n[3] 성인물 허용 여부")
    print("-" * 80)
    adult_input = input("성인물을 포함하시겠습니까? (y/n, 기본: n): ").strip().lower()
    allow_adult = adult_input == 'y'
    
    print("\n" + "="*80)
    print("선택된 필터:")
    print(f"시간: {available_time}분 ({available_time//60}시간 {available_time%60}분)")
    print(f"장르: {selected_genres if selected_genres else '제한 없음'}")
    print(f"OTT: {selected_ott if selected_ott else '제한 없음'}")
    print(f"성인물 허용: {allow_adult}")
    print("="*80)
    
    return {
        'available_time': available_time,
        'preferred_genres': selected_genres if selected_genres else None,
        'preferred_ott': selected_ott if selected_ott else None,
        'allow_adult': allow_adult
    }


# 실행 예시
if __name__ == "__main__":
    # 경로 설정
    SBERT_EMBEDDINGS_PATH = "ai/training/sbert_data/movies_with_embeddings.pkl"
    LIGHTGCN_MODEL_PATH = "ai/training/lightgcn_data/best_model.pt"
    LIGHTGCN_DATA_PATH = "ai/training/lightgcn_data"
    METADATA_PATH = "ai/training/sbert_data/pre_final_movies_processed.csv"
    OTT_PATH = "ai/training/original_data/tmdb_ott_raw.csv"
    
    # 추천 시스템 초기화
    recommender = HybridRecommender(
        sbert_embeddings_path=SBERT_EMBEDDINGS_PATH,
        lightgcn_model_path=LIGHTGCN_MODEL_PATH,
        lightgcn_data_path=LIGHTGCN_DATA_PATH,
        metadata_path=METADATA_PATH,
        ott_path=OTT_PATH,
        sbert_weight=0.7,
        lightgcn_weight=0.3
    )
    
    # 더미 사용자 데이터
    user_preferred_movies = [1, 296, 356]
    
    print("\n" + "="*120)
    print("USER PREFERRED MOVIES (INPUT)")
    print("="*120)
    print(f"{'ID':<6} | {'Title (KR)':<30} | {'Genres'}")
    print("-" * 120)
    
    for mid in user_preferred_movies:
        info = recommender.metadata_map.get(mid, {})
        title = str(info.get('title_ko', 'Unknown Title'))
        genres = str(info.get('genres', 'Unknown'))
        
        if len(title) > 28: title = title[:25] + "..."
        if len(genres) > 50: genres = genres[:47] + "..."
            
        print(f"{mid:<6} | {title:<30} | {genres}")
    
    # 사용자 입력으로 필터 받기
    filters = get_user_input_for_filters(recommender)
    
    # 추천 실행
    rec_type, recommendations = recommender.recommend(
        user_movie_ids=user_preferred_movies,
        top_k=20,
        exclude_seen=True,
        **filters
    )
    
    # 결과 출력
    print("\n" + "="*160)
    print(f"RECOMMENDATION RESULTS ({'SINGLE MOVIE' if rec_type == 'single' else 'MOVIE COMBINATIONS'})")
    print("="*160)
    print(f"SBERT weight: {recommender.sbert_weight}, LightGCN weight: {recommender.lightgcn_weight}")
    print(f"\nTop {len(recommendations)} Recommendations:")
    print("-" * 160)
    
    if rec_type == 'single':
        # 단일 영화 출력
        print(f"{'Rank':<4} | {'ID':<6} | {'Score':<6} | {'Title (KR)':<25} | {'Year':<4} | {'Runtime':<7} | {'Adult':<5} | {'Pop':<8} | {'OTT':<20} | {'Genres'}")
        print("-" * 160)
        
        for i, rec in enumerate(recommendations, 1):
            title = str(rec['title_ko'])
            if len(title) > 23: title = title[:20] + "..."
                
            genres = str(rec['genres'])
            if len(genres) > 25: genres = genres[:22] + "..."
            
            runtime = str(rec['runtime'])
            adult = str(rec['adult'])
            popularity = float(rec['popularity'])
            
            release_date = str(rec.get('release_date', ''))
            year = release_date[:4] if len(release_date) >= 4 else "Unk"
            
            ott_list = rec.get('ott_providers', [])
            ott_str = ', '.join(ott_list[:2])
            if len(ott_list) > 2:
                ott_str += f" +{len(ott_list)-2}"
            if len(ott_str) > 18:
                ott_str = ott_str[:15] + "..."

            print(f"{i:<4} | {rec['movie_id']:<6} | {rec['hybrid_score']:.4f} | {title:<25} | {year:<4} | {runtime:<7} | {adult:<5} | {popularity:<8.2f} | {ott_str:<20} | {genres}")
    
    else:
        # 영화 조합 출력
        for i, combo in enumerate(recommendations, 1):
            print(f"\n[Combination {i}] Total Runtime: {combo['total_runtime']}분 | Avg Score: {combo['combination_score']:.4f}")
            print("-" * 160)
            
            for j, movie in enumerate(combo['movies'], 1):
                title = str(movie['title_ko'])
                if len(title) > 35: title = title[:32] + "..."
                
                genres = str(movie['genres'])
                if len(genres) > 30: genres = genres[:27] + "..."
                
                runtime = str(movie['runtime'])
                release_date = str(movie.get('release_date', ''))
                year = release_date[:4] if len(release_date) >= 4 else "Unk"
                
                ott_list = movie.get('ott_providers', [])
                ott_str = ', '.join(ott_list[:3])
                if len(ott_list) > 3:
                    ott_str += f" +{len(ott_list)-3}"
                
                print(f"  {j}. [{movie['movie_id']}] {title:<35} | {year} | {runtime}분 | {ott_str:<30} | {genres}")