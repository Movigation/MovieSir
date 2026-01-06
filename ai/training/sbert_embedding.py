import pandas as pd
import torch
from sentence_transformers import SentenceTransformer
import numpy as np
import json
import os

"""
multilingual-e5-large 모델을 사용한 영화 임베딩 생성

입력 형식:
- 태그 있음: "tags: {태그}. {overview}"
- 태그 없음: "overview}"
- overview가 10자 미만이면 + Title

편향 제거 X -> run_whitening.py 파일 실행 X

나오는 결과 :
기존 데이터 + 임베딩된 결과
"""

"""
multilingual-e5-large 임베딩 생성 (안전장치 강화)
"""

# ============================================================
# 설정
# ============================================================
input_csv = 'ai/training/sbert_data/pre_final_movies_processed.csv'
output_pkl = ''

MODEL_NAME = 'intfloat/multilingual-e5-large'
BATCH_SIZE = 128
DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'
TAG_SCORE_THRESHOLD = 0.3
MAX_TAGS = 10

print("="*60)
print("GPU 상태 확인")
print("="*60)
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
print(f"Device: {DEVICE}")
print(f"Batch Size: {BATCH_SIZE}\n")

# ============================================================
# 데이터 로드
# ============================================================
print("데이터 로딩 중...")
df = pd.read_csv(input_csv)

def safe_json_loads(x):
    try:
        if pd.isnull(x) or x == '':
            return {}
        if isinstance(x, dict):
            return x
        return json.loads(x)
    except:
        return {}

df['tag_genome'] = df['tag_genome'].apply(safe_json_loads)
print(f"전체 영화 수: {len(df):,}\n")

# ============================================================
# 텍스트 생성
# ============================================================
def create_text_input_safe(row):
    overview = str(row['overview']).strip() if pd.notnull(row['overview']) else ""
    title = str(row['title_ko']).strip() if pd.notnull(row['title_ko']) else ""
    tag_genome = row['tag_genome'] if isinstance(row['tag_genome'], dict) else {}
    
    is_overview_valid = len(overview) >= 10
    
    # 태그 처리 (유지)
    tags_str = ""
    if tag_genome:
        valid_tags = [(tag, score) for tag, score in tag_genome.items() 
                     if score >= TAG_SCORE_THRESHOLD]
        valid_tags = sorted(valid_tags, key=lambda x: x[1], reverse=True)[:MAX_TAGS]
        if valid_tags:
            tags_str = ', '.join([tag for tag, _ in valid_tags])
    
    parts = []
    
    # 제목 (overview 짧을 때만)
    if not is_overview_valid and title:
        parts.append(f"title: {title}")
    
    # 태그 (있으면 추가)
    if tags_str:
        parts.append(f"tags: {tags_str}")
    
    # 줄거리 (항상)
    if overview:
        parts.append(overview)
    
    return ". ".join(parts) if parts else "empty"

print("텍스트 입력 생성 중...")
df['text_for_embedding'] = df.apply(create_text_input_safe, axis=1)

has_tags = df['tag_genome'].apply(lambda x: len(x) > 0)
print(f"태그 있는 영화: {has_tags.sum():,}")
print(f"태그 없는 영화: {(~has_tags).sum():,}\n")

# ============================================================
# 모델 로드 및 FP16 최적화 (핵심!)
# ============================================================
print("="*60)
print("모델 로딩 및 FP16 최적화...")
print("="*60)

model = SentenceTransformer(MODEL_NAME, device=DEVICE)

# [중요] FP16 적용 - 이게 없으면 느림!
if DEVICE == 'cuda':
    model.half()
    print("✅ FP16 (Half Precision) 적용 완료")
else:
    print("⚠️  CPU 모드 (FP16 불가)")

model.eval()
print(f"임베딩 차원: {model.get_sentence_embedding_dimension()}\n")

# ============================================================
# 임베딩 생성
# ============================================================
print("="*60)
print("임베딩 생성 중...")
print("="*60)

texts_with_prefix = ["passage: " + text for text in df['text_for_embedding'].tolist()]

embeddings = model.encode(
    texts_with_prefix,
    batch_size=BATCH_SIZE,
    show_progress_bar=True,
    convert_to_numpy=True,
    normalize_embeddings=True
)

print(f"\n임베딩 Shape: {embeddings.shape}")
print(f"dtype: {embeddings.dtype}\n")

# ============================================================
# 저장
# ============================================================
df['embedding'] = [emb for emb in embeddings]
df = df.drop(columns=['text_for_embedding'])

print("파일 저장 중...")
df.to_pickle(output_pkl)

print(f"\n✅ 저장 완료: {output_pkl}")
print(f"파일 크기: {os.path.getsize(output_pkl) / (1024**2):.2f} MB")