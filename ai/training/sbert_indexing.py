import pandas as pd
import numpy as np
import faiss
import pickle
import os

input_pkl = 'ai/training/sbert_data/movies_with_embeddings.pkl'
index_dir = 'ai/training/sbert_data/index'
index_path = os.path.join(index_dir, 'movies.faiss')
mapping_path = os.path.join(index_dir, 'movie_ids.pkl')

os.makedirs(index_dir, exist_ok=True)

print("데이터 로딩...")
df = pd.read_pickle(input_pkl)
df = df.reset_index(drop=True)

# movieId 컬럼 존재 확인
if 'movieId' not in df.columns:
    raise ValueError("❌ movieId 컬럼이 없습니다. 전처리 데이터를 확인하세요.")

print(f"전체 영화 수: {len(df):,}")
print(f"movieId 범위: {df['movieId'].min()} ~ {df['movieId'].max()}")

print("\n임베딩 추출...")
embeddings = np.stack(df['embedding'].values).astype('float32')

print("FAISS 인덱스 생성...")
dimension = embeddings.shape[1]

if faiss.get_num_gpus() > 0:
    res = faiss.StandardGpuResources()
    index_flat = faiss.IndexFlatIP(dimension)
    gpu_index = faiss.index_cpu_to_gpu(res, 0, index_flat)
    gpu_index.add(embeddings)
    index = faiss.index_gpu_to_cpu(gpu_index)
    print("✅ GPU 인덱스 생성")
else:
    index = faiss.IndexFlatIP(dimension)
    index.add(embeddings)
    print("✅ CPU 인덱스 생성")

print("저장 중...")
faiss.write_index(index, index_path)

# movieId로 매핑 저장
with open(mapping_path, 'wb') as f:
    pickle.dump(df['movieId'].tolist(), f)

print(f"\n✅ 완료: {index.ntotal}개 벡터 인덱싱")
print(f"매핑 ID 타입: movieId")
print(f"파일 위치:")
print(f"  - FAISS: {index_path}")
print(f"  - 매핑: {mapping_path}")