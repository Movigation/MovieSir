"""
Production 추천 시스템 성능 평가 스크립트

ai/inference/recommendation_model.py의 최대 유사도 기반 추천 성능을 평가합니다.

평가 지표:
1. Precision@10: 상위 10개 추천 중 정답 비율
2. Recall@10: 테스트 영화 중 추천된 비율
3. NDCG@10: 순위를 고려한 정확도
4. Diversity: 장르 다양성
5. 추천 소요 시간
"""

import os
import sys
import time
import numpy as np
from pathlib import Path
from typing import List, Dict, Tuple, Any
from dotenv import load_dotenv
from sklearn.preprocessing import MinMaxScaler

# 상위 디렉토리 임포트를 위한 경로 추가 (ai/ 폴더)
sys.path.append(str(Path(__file__).parent.parent.parent))

from inference.recommendation_model import HybridRecommender


def set_seed(seed=42):
    """재현성을 위한 시드 고정"""
    import random
    random.seed(seed)
    np.random.seed(seed)
    print(f"Random seed fixed: {seed}")


class ProductionEvaluator:
    """Production 추천 시스템 평가 클래스"""

    def __init__(self, db_config: Dict):
        self.db_config = db_config

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

        print(f"\nratings.csv에서 테스트 사용자 추출 중...")
        print(f"  파일: {ratings_csv_path}")
        print(f"  조건: 최소 {min_ratings}개 평가 (DB 존재 영화 기준), 최대 {num_users}명")

        try:
            # ratings.csv 로드
            df = pd.read_csv(ratings_csv_path)
            print(f"  전체 평점 데이터: {len(df):,}개")
            print(f"  전체 사용자: {df['userId'].nunique():,}명")
            print(f"  전체 영화: {df['movieId'].nunique():,}개")

            # DB에 존재하는 영화만 필터링
            valid_movie_ids = set(recommender.metadata_map.keys())
            df_valid = df[df['movieId'].isin(valid_movie_ids)].copy()

            print(f"  DB에 존재하는 평점: {len(df_valid):,}개 ({len(df_valid)/len(df)*100:.1f}%)")

            # 2000년 이상, 비성인물만 필터링
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
            print(f"  필터링 후 평점: {len(df_filtered):,}개")
            print(f"  필터링 후 영화: {df_filtered['movieId'].nunique():,}개")

            # 필터링된 데이터로 사용자 개수 계산
            user_counts = df_filtered.groupby('userId').size()
            valid_users = user_counts[user_counts >= min_ratings].index.tolist()
            print(f"  {min_ratings}개 이상 평가한 사용자: {len(valid_users):,}명")

            # 상위 num_users 명 선택
            top_users = user_counts.nlargest(num_users).index.tolist()

            test_users = []
            skipped_stats = {'insufficient_train': 0, 'insufficient_test': 0}

            for user_id in top_users:
                # 사용자의 필터링된 평점 가져오기 (시간순 정렬)
                user_ratings = df_filtered[df_filtered['userId'] == user_id].sort_values('timestamp')

                # 영화 ID 리스트
                movies = user_ratings['movieId'].tolist()

                # 80% train, 20% test 분할
                split_idx = int(len(movies) * 0.8)
                train = movies[:split_idx]
                test = movies[split_idx:]

                # 최소 조건: train >= 15개, test >= 5개
                if len(train) < 15:
                    skipped_stats['insufficient_train'] += 1
                    continue

                if len(test) < 5:
                    skipped_stats['insufficient_test'] += 1
                    continue

                test_users.append((user_id, train, test))

            print(f"{len(test_users)}명의 테스트 사용자 추출 완료")

            if test_users:
                avg_train = sum(len(t) for _, t, _ in test_users) / len(test_users)
                avg_test = sum(len(t) for _, _, t in test_users) / len(test_users)
                print(f"  평균 train 영화 수: {avg_train:.1f}개")
                print(f"  평균 test 영화 수: {avg_test:.1f}개")

            return test_users

        except Exception as e:
            print(f"ratings.csv 로드 실패: {e}")
            import traceback
            traceback.print_exc()
            return []

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

    def calculate_recall_at_k(
        self,
        recommendations: List[int],
        ground_truth: List[int],
        k: int = 10
    ) -> float:
        """Recall@K 계산"""
        top_k = recommendations[:k]
        relevant = set(ground_truth)
        hits = len(set(top_k) & relevant)
        return hits / len(relevant) if len(relevant) > 0 else 0.0

    def calculate_ndcg_at_k(
        self,
        recommendations: List[int],
        ground_truth: List[int],
        k: int = 10
    ) -> float:
        """NDCG@K 계산"""
        top_k = recommendations[:k]
        relevant = set(ground_truth)

        # 추천 순서대로의 관련도 (0 or 1)
        relevance = np.array([1.0 if movie_id in relevant else 0.0 for movie_id in top_k])

        if relevance.sum() == 0:
            return 0.0

        # DCG 계산
        dcg = 0.0
        for i, rel in enumerate(relevance):
            dcg += rel / np.log2(i + 2)

        # IDCG 계산
        ideal_relevance = np.sort(relevance)[::-1]
        idcg = 0.0
        for i, rel in enumerate(ideal_relevance):
            idcg += rel / np.log2(i + 2)

        return dcg / idcg if idcg > 0 else 0.0

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
        """순수 임베딩 유사도만으로 상위 영화 선정 (Production 로직과 동일)

        - 필터링 없음 (공정한 평가)
        - 장르 부스트 없음
        - 평점 점수 없음
        - Production과 동일한 최대 유사도 방식 사용
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

        # 최대 유사도 방식: (M, dim) @ (dim, N) = (M, N)
        sbert_similarities = recommender.target_sbert_norm[indices] @ user_sbert_profile.T
        als_similarities = target_als_norm[indices] @ user_als_profile.T

        # 각 후보 영화의 최대 유사도
        sbert_scores = np.max(sbert_similarities, axis=1)
        als_scores = np.max(als_similarities, axis=1)

        # MinMax 정규화
        scaler = MinMaxScaler()

        if len(sbert_scores) > 1:
            norm_sbert = scaler.fit_transform(sbert_scores.reshape(-1, 1)).squeeze()
            norm_als = scaler.fit_transform(als_scores.reshape(-1, 1)).squeeze()
        else:
            norm_sbert = sbert_scores
            norm_als = als_scores

        # ALS 있는 영화 ID 집합
        als_ids = set(recommender.als_movie_to_idx.keys())

        # 최종 점수 계산 (Production과 동일 로직)
        movie_scores = []
        for i, (mid, _) in enumerate(candidate_indices):
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

        # 점수순 정렬 후 상위 top_k
        movie_scores.sort(key=lambda x: x['score'], reverse=True)
        return movie_scores[:top_k]

    def evaluate(
        self,
        recommender: HybridRecommender,
        test_users: List[Tuple[int, List[int], List[int]]],
        k: int = 10
    ) -> Dict[str, Any]:
        """
        Production 추천 시스템 평가

        Args:
            recommender: HybridRecommender 인스턴스
            test_users: 테스트 사용자 리스트
            k: 평가할 상위 K개

        Returns:
            평가 결과 딕셔너리
        """
        precision_scores = []
        recall_scores = []
        ndcg_scores = []
        diversity_scores = []
        elapsed_times = []

        total_stats = {
            'users_evaluated': 0,
            'users_skipped': 0
        }

        print(f"\n{'='*60}")
        print(f"Production 추천 시스템 평가 (최대 유사도 방식)")
        print(f"{'='*60}")

        for idx, (user_id, train_movies, test_movies) in enumerate(test_users):
            start_time = time.time()

            try:
                # 1. 유저 프로필 생성
                user_sbert_profile, user_als_profile = recommender._get_user_profile(train_movies)

                # 2. 모든 영화 ID 가져오기
                all_movie_ids = list(recommender.metadata_map.keys())

                # 3. Train 영화만 제외
                candidate_ids = [mid for mid in all_movie_ids if mid not in train_movies]

                # 4. 순수 임베딩 유사도 계산 (최대 유사도 방식)
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

                # 메트릭 계산
                precision = self.calculate_precision_at_k(top_k_ids, test_movies, k)
                precision_scores.append(precision)

                recall = self.calculate_recall_at_k(top_k_ids, test_movies, k)
                recall_scores.append(recall)

                ndcg = self.calculate_ndcg_at_k(top_k_ids, test_movies, k)
                ndcg_scores.append(ndcg)

                diversity = self.calculate_diversity(top_movies[:k])
                diversity_scores.append(diversity)

                total_stats['users_evaluated'] += 1

                # 진행 상황 출력 (매 10명마다)
                if (idx + 1) % 10 == 0:
                    print(f"  진행: {idx + 1}/{len(test_users)} users", flush=True)

            except Exception as e:
                total_stats['users_skipped'] += 1
                print(f"  User {user_id} 평가 실패: {e}", flush=True)
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
            'stats': total_stats
        }

        print(f"\n{'='*60}")
        print(f"평가 결과")
        print(f"{'='*60}")
        print(f"  Precision@{k}: {results['precision@10']:.4f}")
        print(f"  Recall@{k}: {results['recall@10']:.4f}")
        print(f"  NDCG@{k}: {results['ndcg@10']:.4f}")
        print(f"  Diversity: {results['diversity']:.4f}")
        print(f"  평균 추천 시간: {results['avg_time']:.3f}s (±{results['std_time']:.3f}s)")
        print(f"  평가 사용자 수: {results['num_users']}명")

        return results


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
    print("Production 추천 시스템 성능 평가")
    print("최대 유사도 기반 Hybrid (SBERT 0.7 + ALS 0.3)")
    print("="*60)

    # 1. 추천 시스템 초기화
    print("\n" + "="*60)
    print("추천 시스템 초기화 중...")
    print("="*60)

    recommender = HybridRecommender(
        db_config=DB_CONFIG,
        als_model_path=ALS_MODEL_PATH,
        als_data_path=ALS_DATA_PATH
    )
    print("초기화 완료\n")

    # 2. 평가자 초기화
    evaluator = ProductionEvaluator(db_config=DB_CONFIG)

    # 3. 테스트 사용자 추출
    test_users = evaluator.get_test_users_from_ratings_csv(
        ratings_csv_path=RATINGS_CSV_PATH,
        recommender=recommender,
        min_ratings=20,
        num_users=100
    )

    if not test_users:
        print("테스트 사용자를 추출하지 못했습니다.")
        return

    # 4. 평가 실행
    results = evaluator.evaluate(
        recommender=recommender,
        test_users=test_users,
        k=10
    )

    # 5. 최종 결과 요약
    print("\n" + "="*60)
    print("최종 결과 요약")
    print("="*60)
    print(f"  Precision@10: {results['precision@10']:.4f}")
    print(f"  Recall@10:    {results['recall@10']:.4f}")
    print(f"  NDCG@10:      {results['ndcg@10']:.4f}")
    print(f"  Diversity:    {results['diversity']:.4f}")
    print(f"  평가 사용자:   {results['num_users']}명")
    print("="*60)


if __name__ == "__main__":
    main()
