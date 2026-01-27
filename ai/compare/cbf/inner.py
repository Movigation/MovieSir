#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
TF-IDF, Word2Vec, SBERT 내재적 평가 비교
PostgreSQL 로컬 환경용
"""

import os
import json
import warnings
from datetime import datetime
from dotenv import load_dotenv

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import psycopg2
from psycopg2.extras import RealDictCursor

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.metrics import silhouette_score, davies_bouldin_score
from sklearn.manifold import TSNE
from sklearn.preprocessing import LabelEncoder

from sentence_transformers import SentenceTransformer
from gensim.models import Word2Vec

import torch
from tqdm import tqdm

warnings.filterwarnings('ignore')

# 한글 폰트 설정 (macOS)
plt.rcParams['font.family'] = 'AppleGothic'
plt.rcParams['axes.unicode_minus'] = False

# ============================================================
# 설정
# ============================================================
# 프로젝트 루트에서 .env 파일 로드
from pathlib import Path
project_root = Path(__file__).parent.parent.parent.parent  # MovieSir/
env_file = project_root / '.env.local'
if not env_file.exists():
    env_file = project_root / '.env'
load_dotenv(env_file)

DB_CONFIG = {
    'host': 'localhost',
    'port': int(os.getenv('DATABASE_PORT')),
    'database': os.getenv('DATABASE_NAME'),
    'user': os.getenv('DATABASE_USER'),
    'password': os.getenv('DATABASE_PASSWORD')
}

# 스크립트 위치 기준으로 결과 폴더 생성
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
RESULTS_DIR = os.path.join(SCRIPT_DIR, 'inner_results')
os.makedirs(RESULTS_DIR, exist_ok=True)

DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'
SAMPLE_SIZE = 5000  # 샘플 영화 수
MODEL_NAME = 'intfloat/multilingual-e5-large'
BATCH_SIZE = 32

print("="*60)
print("설정 정보")
print("="*60)
print(f"Device: {DEVICE}")
print(f"Sample Size: {SAMPLE_SIZE:,}")
print(f"Results Directory: {RESULTS_DIR}")
print(f"시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print()

# ============================================================
# 1. 데이터 로드
# ============================================================
def load_data_from_db(sample_size=1000):
    """PostgreSQL에서 영화 데이터 로드"""
    print("="*60)
    print("데이터 로딩 중...")
    print("="*60)
    
    conn = psycopg2.connect(**DB_CONFIG)
    
    query = f"""
    SELECT 
        movie_id,
        tmdb_id,
        title,
        overview,
        runtime,
        genres,
        tag_genome,
        popularity,
        vote_average,
        vote_count
    FROM movies
    WHERE overview IS NOT NULL 
      AND LENGTH(overview) >= 50
      AND tag_genome IS NOT NULL
    ORDER BY popularity DESC, vote_count DESC
    LIMIT {sample_size}
    """
    
    df = pd.read_sql_query(query, conn)
    conn.close()
    
    print(f"✅ 로드된 영화 수: {len(df):,}")
    print(f"컬럼: {df.columns.tolist()}")
    
    return df


def preprocess_data(df):
    """데이터 전처리"""
    print("\n데이터 전처리 중...")
    
    # tag_genome JSON 파싱
    def safe_json_loads(x):
        try:
            if pd.isnull(x):
                return {}
            if isinstance(x, dict):
                return x
            return json.loads(x)
        except:
            return {}
    
    df['tag_genome'] = df['tag_genome'].apply(safe_json_loads)
    
    # 장르 파싱 (PostgreSQL에서 이미 list로 반환될 수 있음)
    def parse_genres(genres):
        """genres 처리 - 다양한 형태 지원"""
        # None 체크
        if genres is None:
            return []
        
        # 이미 리스트인 경우
        if isinstance(genres, list):
            return [str(g).strip() for g in genres if g]
        
        # numpy array인 경우
        if isinstance(genres, np.ndarray):
            return [str(g).strip() for g in genres.tolist() if g]
        
        # 문자열인 경우
        if isinstance(genres, str):
            # {} 제거 후 쉼표로 분리
            genres = genres.strip('{}')
            return [g.strip() for g in genres.split(',') if g.strip()]
        
        return []
    
    df['genres_list'] = df['genres'].apply(parse_genres)
    df['primary_genre'] = df['genres_list'].apply(lambda x: x[0] if x else 'Unknown')
    
    # Unknown 제거
    df = df[df['primary_genre'] != 'Unknown'].copy()
    
    print(f"전처리 후 영화 수: {len(df):,}")
    print("\n장르별 분포:")
    genre_counts = df['primary_genre'].value_counts()
    print(genre_counts)
    
    # 상위 6개 장르만 선택
    top_genres = genre_counts.head(6).index.tolist()
    df = df[df['primary_genre'].isin(top_genres)].copy()
    
    print(f"\n상위 6개 장르 선택 후: {len(df):,}")
    print(f"사용 장르: {top_genres}")
    
    # 각 장르당 최대 200개씩 균형 샘플링
    df_balanced = df.groupby('primary_genre').apply(
        lambda x: x.sample(min(len(x), 200), random_state=42)
    ).reset_index(drop=True)
    
    print(f"\n균형 샘플링 후: {len(df_balanced):,}")
    print("\n최종 장르별 분포:")
    print(df_balanced['primary_genre'].value_counts())
    
    return df_balanced


# ============================================================
# 2. 임베딩 생성
# ============================================================
def create_tfidf_embeddings(df):
    """TF-IDF 임베딩 생성"""
    print("\n" + "="*60)
    print("TF-IDF 임베딩 생성")
    print("="*60)
    
    texts = df['overview'].fillna('').tolist()
    
    vectorizer = TfidfVectorizer(
        max_features=5000,
        ngram_range=(1, 2),
        min_df=2,
        max_df=0.85,
        sublinear_tf=True
    )
    
    tfidf_matrix = vectorizer.fit_transform(texts)
    embeddings = tfidf_matrix.toarray()
    
    print(f"Shape: {embeddings.shape}")
    print(f"Sparsity: {(embeddings == 0).sum() / embeddings.size:.2%}")
    
    return embeddings


def create_word2vec_embeddings(df):
    """Word2Vec 임베딩 생성 (자체 학습)"""
    print("\n" + "="*60)
    print("Word2Vec 임베딩 생성")
    print("="*60)
    
    texts = df['overview'].fillna('').tolist()
    tokenized = [text.lower().split() for text in texts]
    
    print("Word2Vec 모델 학습 중...")
    model = Word2Vec(
        sentences=tokenized,
        vector_size=300,
        window=5,
        min_count=2,
        workers=4,
        sg=1,
        epochs=20,
        seed=42
    )
    
    print(f"Vocabulary Size: {len(model.wv)}")
    
    def get_doc_embedding(tokens):
        vectors = [model.wv[word] for word in tokens if word in model.wv]
        return np.mean(vectors, axis=0) if vectors else np.zeros(300)
    
    embeddings = np.array([
        get_doc_embedding(tokens) 
        for tokens in tqdm(tokenized, desc="Word2Vec")
    ])
    
    print(f"Shape: {embeddings.shape}")
    
    return embeddings


def create_sbert_embeddings(df):
    """SBERT 임베딩 생성"""
    print("\n" + "="*60)
    print("SBERT 임베딩 생성")
    print("="*60)
    
    def create_text(row):
        overview = str(row['overview']).strip()
        title = str(row['title']).strip()
        tag_genome = row['tag_genome']
        
        tags_str = ""
        if tag_genome:
            valid_tags = [(tag, score) for tag, score in tag_genome.items() 
                         if score >= 0.8]
            valid_tags = sorted(valid_tags, key=lambda x: x[1], reverse=True)[:10]
            if valid_tags:
                tags_str = ', '.join([tag for tag, _ in valid_tags])
        
        parts = []
        if len(overview) < 10 and title:
            parts.append(f"title: {title}")
        if tags_str:
            parts.append(f"tags: {tags_str}")
        if overview:
            parts.append(overview)
        
        return ". ".join(parts) if parts else "empty"
    
    texts = df.apply(create_text, axis=1).tolist()
    texts_with_prefix = ["passage: " + text for text in texts]
    
    model = SentenceTransformer(MODEL_NAME, device=DEVICE)
    
    if DEVICE == 'cuda':
        model.half()
        print("✅ FP16 적용")
    
    embeddings = model.encode(
        texts_with_prefix,
        batch_size=BATCH_SIZE,
        show_progress_bar=True,
        convert_to_numpy=True,
        normalize_embeddings=True
    )
    
    print(f"Shape: {embeddings.shape}")
    
    return embeddings


# ============================================================
# 3. 유사도 분석
# ============================================================
def calculate_similarities(embeddings, df):
    """코사인 유사도 분포 계산"""
    print("\n영화 쌍 샘플링 및 유사도 계산 중...")
    
    np.random.seed(42)
    
    same_pairs = []
    diff_pairs = []
    
    genres = df['primary_genre'].unique()
    
    for genre in genres:
        genre_indices = df[df['primary_genre'] == genre].index.tolist()
        if len(genre_indices) < 2:
            continue
        
        n_pairs = min(100, len(genre_indices) * (len(genre_indices) - 1) // 2)
        for _ in range(n_pairs):
            i, j = np.random.choice(genre_indices, size=2, replace=False)
            same_pairs.append((i, j))
    
    for _ in range(len(same_pairs)):
        g1, g2 = np.random.choice(genres, size=2, replace=False)
        indices1 = df[df['primary_genre'] == g1].index.tolist()
        indices2 = df[df['primary_genre'] == g2].index.tolist()
        
        if indices1 and indices2:
            i = np.random.choice(indices1)
            j = np.random.choice(indices2)
            diff_pairs.append((i, j))
    
    def calc_sim(pairs):
        sims = []
        for i, j in tqdm(pairs, desc="유사도"):
            arr_i = df.index.get_loc(i)
            arr_j = df.index.get_loc(j)
            emb_i = embeddings[arr_i]
            emb_j = embeddings[arr_j]
            sim = np.dot(emb_i, emb_j) / (np.linalg.norm(emb_i) * np.linalg.norm(emb_j) + 1e-8)
            sims.append(sim)
        return np.array(sims)
    
    same_sim = calc_sim(same_pairs)
    diff_sim = calc_sim(diff_pairs)
    
    return same_sim, diff_sim


def analyze_all_models(tfidf_emb, w2v_emb, sbert_emb, df):
    """3개 모델 유사도 분석"""
    print("\n" + "="*60)
    print("유사도 분석")
    print("="*60)
    
    results = {}
    
    for name, emb in [('TF-IDF', tfidf_emb), ('Word2Vec', w2v_emb), ('SBERT', sbert_emb)]:
        print(f"\n{name}:")
        same_sim, diff_sim = calculate_similarities(emb, df)
        
        results[name] = {
            'same_mean': float(same_sim.mean()),
            'same_std': float(same_sim.std()),
            'same_median': float(np.median(same_sim)),
            'diff_mean': float(diff_sim.mean()),
            'diff_std': float(diff_sim.std()),
            'diff_median': float(np.median(diff_sim)),
            'separability': float(same_sim.mean() - diff_sim.mean()),
            'same_data': same_sim,
            'diff_data': diff_sim
        }
        
        print(f"  Same-Genre: {results[name]['same_mean']:.4f} ± {results[name]['same_std']:.4f}")
        print(f"  Diff-Genre: {results[name]['diff_mean']:.4f} ± {results[name]['diff_std']:.4f}")
        print(f"  분리도: {results[name]['separability']:.4f}")
    
    results_json = {
        k: {kk: vv for kk, vv in v.items() if not isinstance(vv, np.ndarray)}
        for k, v in results.items()
    }
    
    with open(f"{RESULTS_DIR}/similarity_statistics.json", 'w') as f:
        json.dump(results_json, f, indent=2)
    
    print(f"\n✅ 통계 저장: {RESULTS_DIR}/similarity_statistics.json")
    
    return results


# ============================================================
# 4. 클러스터링 평가
# ============================================================
def evaluate_clustering(tfidf_emb, w2v_emb, sbert_emb, df):
    """클러스터링 품질 평가"""
    print("\n" + "="*60)
    print("클러스터링 품질 평가")
    print("="*60)
    
    le = LabelEncoder()
    labels = le.fit_transform(df['primary_genre'])
    
    results = {}
    
    for name, emb in [('TF-IDF', tfidf_emb), ('Word2Vec', w2v_emb), ('SBERT', sbert_emb)]:
        silhouette = silhouette_score(emb, labels, metric='cosine')
        db_index = davies_bouldin_score(emb, labels)
        
        results[name] = {
            'silhouette': silhouette,
            'davies_bouldin': db_index
        }
        
        print(f"\n{name}:")
        print(f"  Silhouette: {silhouette:.4f}")
        print(f"  Davies-Bouldin: {db_index:.4f}")
    
    return results


# ============================================================
# 5. T-SNE 시각화
# ============================================================
def visualize_tsne(tfidf_emb, w2v_emb, sbert_emb, df):
    """T-SNE 시각화"""
    print("\n" + "="*60)
    print("T-SNE 시각화 중...")
    print("="*60)
    
    tsne = TSNE(n_components=2, perplexity=30, random_state=42, n_jobs=-1)
    
    print("TF-IDF...")
    tfidf_tsne = tsne.fit_transform(tfidf_emb)
    
    print("Word2Vec...")
    tsne = TSNE(n_components=2, perplexity=30, random_state=42, n_jobs=-1)
    w2v_tsne = tsne.fit_transform(w2v_emb)
    
    print("SBERT...")
    tsne = TSNE(n_components=2, perplexity=30, random_state=42, n_jobs=-1)
    sbert_tsne = tsne.fit_transform(sbert_emb)
    
    fig, axes = plt.subplots(1, 3, figsize=(20, 6))
    
    genres = df['primary_genre'].unique()
    colors = plt.cm.Set3(np.linspace(0, 1, len(genres)))
    genre_color_map = dict(zip(genres, colors))
    
    for ax, tsne_result, title in zip(
        axes,
        [tfidf_tsne, w2v_tsne, sbert_tsne],
        ['TF-IDF', 'Word2Vec', 'SBERT']
    ):
        for genre in genres:
            mask = df['primary_genre'] == genre
            ax.scatter(
                tsne_result[mask, 0],
                tsne_result[mask, 1],
                c=[genre_color_map[genre]],
                label=genre,
                alpha=0.6,
                s=30
            )
        ax.set_title(title, fontsize=16, fontweight='bold')
        ax.axis('off')
    
    handles, labels = axes[2].get_legend_handles_labels()
    fig.legend(handles, labels, loc='lower center', ncol=len(genres),
              bbox_to_anchor=(0.5, -0.05), fontsize=12)
    
    plt.tight_layout()
    plt.savefig(f'{RESULTS_DIR}/tsne_comparison.png', dpi=300, bbox_inches='tight')
    print(f"✅ 저장: {RESULTS_DIR}/tsne_comparison.png")
    
    np.savez_compressed(
        f"{RESULTS_DIR}/tsne_results.npz",
        tfidf=tfidf_tsne,
        word2vec=w2v_tsne,
        sbert=sbert_tsne
    )


# ============================================================
# 6. Box Plot 시각화
# ============================================================
def plot_similarity_distribution(sim_results):
    """유사도 분포 Box Plot"""
    print("\n유사도 분포 시각화 중...")
    
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    
    same_data = [
        sim_results['TF-IDF']['same_data'],
        sim_results['Word2Vec']['same_data'],
        sim_results['SBERT']['same_data']
    ]
    
    diff_data = [
        sim_results['TF-IDF']['diff_data'],
        sim_results['Word2Vec']['diff_data'],
        sim_results['SBERT']['diff_data']
    ]
    
    labels = ['TF-IDF', 'Word2Vec', 'SBERT']
    
    bp1 = axes[0].boxplot(same_data, labels=labels, patch_artist=True)
    for patch in bp1['boxes']:
        patch.set_facecolor('lightgreen')
    axes[0].set_title('Same-Genre 유사도 분포', fontsize=14, fontweight='bold')
    axes[0].set_ylabel('Cosine Similarity', fontsize=12)
    axes[0].grid(axis='y', alpha=0.3)
    axes[0].set_ylim(-0.1, 1.0)
    
    for i, data in enumerate(same_data):
        axes[0].text(i+1, data.mean(), f'{data.mean():.3f}',
                    ha='center', va='bottom', fontweight='bold')
    
    bp2 = axes[1].boxplot(diff_data, labels=labels, patch_artist=True)
    for patch in bp2['boxes']:
        patch.set_facecolor('lightcoral')
    axes[1].set_title('Different-Genre 유사도 분포', fontsize=14, fontweight='bold')
    axes[1].set_ylabel('Cosine Similarity', fontsize=12)
    axes[1].grid(axis='y', alpha=0.3)
    axes[1].set_ylim(-0.1, 1.0)
    
    for i, data in enumerate(diff_data):
        axes[1].text(i+1, data.mean(), f'{data.mean():.3f}',
                    ha='center', va='bottom', fontweight='bold')
    
    plt.tight_layout()
    plt.savefig(f'{RESULTS_DIR}/similarity_distribution.png', dpi=300, bbox_inches='tight')
    print(f"✅ 저장: {RESULTS_DIR}/similarity_distribution.png")


# ============================================================
# 7. 종합 비교표
# ============================================================
def create_comparison_table(sim_results, cluster_results):
    """종합 비교표 생성"""
    print("\n종합 비교표 생성 중...")
    
    df_comparison = pd.DataFrame({
        '모델': ['TF-IDF', 'Word2Vec', 'SBERT'],
        'Same-Genre 유사도': [
            sim_results['TF-IDF']['same_mean'],
            sim_results['Word2Vec']['same_mean'],
            sim_results['SBERT']['same_mean']
        ],
        'Different-Genre 유사도': [
            sim_results['TF-IDF']['diff_mean'],
            sim_results['Word2Vec']['diff_mean'],
            sim_results['SBERT']['diff_mean']
        ],
        '분리도': [
            sim_results['TF-IDF']['separability'],
            sim_results['Word2Vec']['separability'],
            sim_results['SBERT']['separability']
        ],
        'Silhouette Score': [
            cluster_results['TF-IDF']['silhouette'],
            cluster_results['Word2Vec']['silhouette'],
            cluster_results['SBERT']['silhouette']
        ],
        'Davies-Bouldin Index': [
            cluster_results['TF-IDF']['davies_bouldin'],
            cluster_results['Word2Vec']['davies_bouldin'],
            cluster_results['SBERT']['davies_bouldin']
        ]
    })
    
    print("\n" + "="*60)
    print("최종 비교표")
    print("="*60)
    print(df_comparison.to_string(index=False))
    
    df_comparison.to_csv(f'{RESULTS_DIR}/model_comparison.csv', index=False, encoding='utf-8-sig')
    print(f"\n✅ 저장: {RESULTS_DIR}/model_comparison.csv")


# ============================================================
# 메인 실행
# ============================================================
def main():
    start_time = datetime.now()
    
    df = load_data_from_db(SAMPLE_SIZE)
    df = preprocess_data(df)
    
    # 임베딩 생성
    tfidf_emb = create_tfidf_embeddings(df)
    w2v_scratch_emb = create_word2vec_embeddings(df)
    sbert_emb = create_sbert_embeddings(df)
    
    # ✅ 영화 목록 저장
    print("\n영화 목록 저장 중...")
    movies_list = df[['movie_id', 'tmdb_id', 'title', 'primary_genre', 'popularity']].copy()
    movies_list['tmdb_id'] = movies_list['tmdb_id'].astype(int)
    movies_list.to_csv(f"{RESULTS_DIR}/movies_list.csv", index=False, encoding='utf-8-sig')
    print(f"✅ 영화 목록 저장: {RESULTS_DIR}/movies_list.csv")
    print(f"   영화 수: {len(movies_list)}")
    
    # 임베딩 저장
    np.savez_compressed(
        f"{RESULTS_DIR}/embeddings.npz",
        tfidf=tfidf_emb,
        word2vec=w2v_scratch_emb,
        sbert=sbert_emb
    )
    print(f"✅ 임베딩 저장: {RESULTS_DIR}/embeddings.npz")
    
    # ✅ 함수명 수정 (3 제거)
    sim_results = analyze_all_models(tfidf_emb, w2v_scratch_emb, sbert_emb, df)
    cluster_results = evaluate_clustering(tfidf_emb, w2v_scratch_emb, sbert_emb, df)
    
    # 시각화
    plot_similarity_distribution(sim_results)
    visualize_tsne(tfidf_emb, w2v_scratch_emb, sbert_emb, df)
    
    # 비교표
    create_comparison_table(sim_results, cluster_results)
    
    end_time = datetime.now()
    elapsed = end_time - start_time
    
    print("\n" + "="*60)
    print("실험 완료")
    print("="*60)
    print(f"종료 시간: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"소요 시간: {elapsed}")
    print(f"\n생성된 파일:")
    print(f"  - {RESULTS_DIR}/embeddings.npz")
    print(f"  - {RESULTS_DIR}/movies_list.csv")
    print(f"  - {RESULTS_DIR}/similarity_statistics.json")
    print(f"  - {RESULTS_DIR}/similarity_distribution.png")
    print(f"  - {RESULTS_DIR}/model_comparison.csv")
    print(f"  - {RESULTS_DIR}/tsne_results.npz")
    print(f"  - {RESULTS_DIR}/tsne_comparison.png")


if __name__ == "__main__":
    main()