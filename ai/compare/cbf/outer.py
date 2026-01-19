#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
외재적 평가: Precision@10, Recall@10, NDCG@10
User Profile (Mean Embedding) 방식
"""

import os
import sys
import numpy as np
import pandas as pd
from datetime import datetime
from tqdm import tqdm
from dotenv import load_dotenv

# 경고 무시
import warnings
warnings.filterwarnings('ignore')

# ============================================================
# 설정
# ============================================================
from pathlib import Path

# 경로 설정 (스크립트 위치 기준)
SCRIPT_DIR = Path(__file__).parent  # ai/compare/cbf/
PROJECT_ROOT = SCRIPT_DIR.parent.parent  # ai/

RATINGS_PATH = PROJECT_ROOT / 'training' / 'original_data' / 'ratings_tmdb.csv'
EMBEDDINGS_DIR = SCRIPT_DIR / 'inner_results'  # inner.py의 출력 폴더
RESULTS_DIR = SCRIPT_DIR / 'outer_results'     # 외재적 평가 결과 폴더

os.makedirs(RESULTS_DIR, exist_ok=True)

# 파라미터
K = 10  # Top-K
N_USERS = 100  # 평가할 사용자 수 (샘플링)
MIN_RATINGS_PER_USER = 10  # (필터링 후) 최소 평점 수
POSITIVE_THRESHOLD = 4.0   # 긍정 평점 기준 (4점 이상)

print("="*60)
print("외재적 평가: User Profile 기반")
print("="*60)
print(f"K: {K}")
print(f"대상 사용자 수: {N_USERS}")
print(f"긍정 기준: {POSITIVE_THRESHOLD}점 이상")
print(f"시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

# ============================================================
# 1. 영화 목록 및 임베딩 로드 (기준 데이터)
# ============================================================
def load_ground_truth():
    print("\nStep 1: 기준 영화 목록 및 임베딩 로드")

    # 1-1. 영화 목록 로드 (movies_list.csv)
    movies_path = EMBEDDINGS_DIR / 'movies_list.csv'
    if not movies_path.exists():
        print(f"❌ 파일 없음: {movies_path}")
        sys.exit(1)

    movies_df = pd.read_csv(str(movies_path))
    # ID를 int로 강제 변환 (매칭 오류 방지)
    movies_df['tmdb_id'] = movies_df['tmdb_id'].fillna(0).astype(int)
    
    # 유효한 TMDB ID 집합 (Ground Truth)
    valid_tmdb_ids = set(movies_df['tmdb_id'].unique())
    
    # TMDB ID -> 임베딩 인덱스 매핑 (매우 중요)
    tmdb_to_idx = {tid: i for i, tid in enumerate(movies_df['tmdb_id'])}
    
    print(f"✅ 기준 영화 수 (Movies List): {len(movies_df):,}")

    # 1-2. 임베딩 로드
    emb_path = EMBEDDINGS_DIR / 'embeddings.npz'
    if not emb_path.exists():
        print(f"❌ 파일 없음: {emb_path}")
        sys.exit(1)

    data = np.load(str(emb_path))
    embeddings = {
        'TF-IDF': data['tfidf'],
        'Word2Vec': data['word2vec'], # 키 이름 확인 필요 (word2vec_scratch 등일 수 있음)
        'SBERT': data['sbert']
    }
    
    # 임베딩 개수 검증
    for name, emb in embeddings.items():
        if len(emb) != len(movies_df):
            print(f"⚠️ 경고: {name} 임베딩 수({len(emb)})와 영화 수({len(movies_df)}) 불일치!")
    
    return movies_df, valid_tmdb_ids, tmdb_to_idx, embeddings

# ============================================================
# 2. 평점 데이터 로드 및 엄격 필터링
# ============================================================
def prepare_ratings(valid_tmdb_ids):
    print("\nStep 2: 평점 데이터 로드 및 필터링")

    if not RATINGS_PATH.exists():
        print(f"❌ 파일 없음: {RATINGS_PATH}")
        sys.exit(1)

    # 로드 시 타입 지정 (메모리 절약 및 오류 방지)
    ratings = pd.read_csv(str(RATINGS_PATH), dtype={'userId': int, 'tmdbId': float, 'rating': float})
    
    # NaN 제거 및 int 변환
    ratings = ratings.dropna(subset=['tmdbId'])
    ratings['tmdbId'] = ratings['tmdbId'].astype(int)
    
    print(f"원본 평점 수: {len(ratings):,}")
    print(f"원본 영화 수: {ratings['tmdbId'].nunique():,}")
    
    # 🌟 핵심: 임베딩이 있는 영화(valid_tmdb_ids)만 남기고 다 버림
    ratings = ratings[ratings['tmdbId'].isin(valid_tmdb_ids)].copy()
    
    print(f"필터링 후 평점 수: {len(ratings):,}")
    print(f"필터링 후 영화 수: {ratings['tmdbId'].nunique():,}")
    
    if len(ratings) == 0:
        print("❌ 필터링 결과 남은 평점이 없습니다. ID 매칭을 확인하세요.")
        sys.exit(1)

    # 사용자 필터링 (최소 N개 이상 평가한 사람만)
    user_counts = ratings.groupby('userId').size()
    active_users = user_counts[user_counts >= MIN_RATINGS_PER_USER].index
    ratings = ratings[ratings['userId'].isin(active_users)].copy()
    
    print(f"최종 활성 사용자 수: {len(active_users):,}")
    print(f"최종 데이터 크기: {len(ratings):,}")
    
    return ratings

# ============================================================
# 3. 데이터 분할 (Train/Test)
# ============================================================
def split_train_test(ratings):
    print("\nStep 3: 시간순 Train/Test 분할 (8:2)")
    
    # 사용자별 시간순 정렬
    ratings = ratings.sort_values(['userId', 'timestamp'])
    
    train_list = []
    test_list = []
    
    # groupby 속도 최적화
    for _, group in tqdm(ratings.groupby('userId'), desc="Splitting"):
        test_size = int(len(group) * 0.2)
        if test_size < 1: test_size = 1 # 최소 1개는 테스트로
        
        train_list.append(group.iloc[:-test_size])
        test_list.append(group.iloc[-test_size:])
        
    train = pd.concat(train_list)
    test = pd.concat(test_list)
    
    print(f"Train: {len(train):,}, Test: {len(test):,}")
    return train, test

# ============================================================
# 4. 평가 메트릭 함수
# ============================================================
def get_metrics(recommended_indices, true_indices, k=10):
    # Intersection
    recommended_set = set(recommended_indices)
    true_set = set(true_indices)
    intersection = recommended_set.intersection(true_set)
    
    # Precision
    precision = len(intersection) / k
    
    # Recall
    recall = len(intersection) / len(true_set) if len(true_set) > 0 else 0
    
    # NDCG
    dcg = 0.0
    idcg = 0.0
    
    # DCG calc
    for i, idx in enumerate(recommended_indices):
        if idx in true_set:
            dcg += 1.0 / np.log2(i + 2)
            
    # IDCG calc
    num_relevant = min(len(true_set), k)
    for i in range(num_relevant):
        idcg += 1.0 / np.log2(i + 2)
        
    ndcg = dcg / idcg if idcg > 0 else 0
    
    return precision, recall, ndcg

# ============================================================
# 5. 모델 평가 (User Profile 방식)
# ============================================================
def evaluate(embeddings, train, test, tmdb_to_idx, users):
    
    # 정규화 (Cosine Similarity를 위해)
    # Norm이 0인 경우 방지
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    norms[norms == 0] = 1e-10
    emb_norm = embeddings / norms
    
    metrics = {'precision': [], 'recall': [], 'ndcg': []}
    
    for user in tqdm(users, desc="Evaluating"):
        # 1. User Profile 생성 (Train에서 좋게 본 영화들의 평균 벡터)
        user_train = train[(train['userId'] == user) & (train['rating'] >= POSITIVE_THRESHOLD)]
        if len(user_train) == 0: continue
            
        train_movie_ids = user_train['tmdbId'].values
        train_indices = [tmdb_to_idx[mid] for mid in train_movie_ids]
        
        # 사용자가 본 영화 벡터들의 평균
        user_vector = np.mean(emb_norm[train_indices], axis=0)
        
        # 2. 전체 영화와의 유사도 계산 (Dot Product)
        # (1, D) @ (N, D).T -> (1, N)
        scores = np.dot(user_vector, emb_norm.T)
        
        # 3. 이미 본 영화(Train) 제외 마스킹
        scores[train_indices] = -np.inf
        
        # 4. Top-K 추천
        top_k_indices = np.argsort(scores)[::-1][:K]
        
        # 5. 정답 확인 (Test Set)
        user_test = test[(test['userId'] == user) & (test['rating'] >= POSITIVE_THRESHOLD)]
        if len(user_test) == 0: continue
            
        test_movie_ids = user_test['tmdbId'].values
        true_indices = [tmdb_to_idx[mid] for mid in test_movie_ids if mid in tmdb_to_idx]
        
        if not true_indices: continue
            
        p, r, n = get_metrics(top_k_indices, true_indices, k=K)
        metrics['precision'].append(p)
        metrics['recall'].append(r)
        metrics['ndcg'].append(n)
        
    return {k: np.mean(v) for k, v in metrics.items()}

# ============================================================
# Main Loop
# ============================================================
def main():
    # 1. 데이터 준비
    movies_df, valid_ids, tmdb_to_idx, embeddings_dict = load_ground_truth()
    ratings = prepare_ratings(valid_ids)
    train, test = split_train_test(ratings)
    
    # 2. 평가 대상 사용자 샘플링
    test_users = test['userId'].unique()
    if len(test_users) > N_USERS:
        np.random.seed(42)
        target_users = np.random.choice(test_users, N_USERS, replace=False)
    else:
        target_users = test_users
        
    print(f"\n최종 평가 대상 사용자 수: {len(target_users)}")
    
    # 3. 모델별 평가 실행
    final_results = []
    
    for model_name, emb_matrix in embeddings_dict.items():
        print(f"\nEvaluating {model_name}...")
        res = evaluate(emb_matrix, train, test, tmdb_to_idx, target_users)
        res['model'] = model_name
        final_results.append(res)
        
        print(f"Result ({model_name}):")
        print(f"  Precision@{K}: {res['precision']:.4f}")
        print(f"  Recall@{K}:    {res['recall']:.4f}")
        print(f"  NDCG@{K}:      {res['ndcg']:.4f}")

    # 4. 결과 저장
    result_df = pd.DataFrame(final_results)
    save_path = RESULTS_DIR / 'final_evaluation_metrics.csv'
    result_df.to_csv(str(save_path), index=False)
    print(f"\n✅ 최종 결과 저장 완료: {save_path}")
    print(result_df)

if __name__ == "__main__":
    main()