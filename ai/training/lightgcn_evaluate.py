# /home/ubuntu/ai-model/models/light_gcn/scripts/evaluate_lightgcn.py

"""

"Loss는 낮지만 실제 추천 성능은 떨어지는 문제"를 해결하기 위해, 
저장된 모든 체크포인트(.pt)를 하나씩 불러와 실제로 시험(Evaluation)을 치르는 구조

"""

import os
import glob
import pickle
import numpy as np
import torch
import torch.nn as nn
from scipy.sparse import load_npz
from tqdm import tqdm

# 경로 설정
DATA_DIR = 'ai/training/lightgcn_data'
MODEL_DIR = ''
RESULT_DIR = ''
os.makedirs(RESULT_DIR, exist_ok=True)

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Device: {device}\n")

# 메타데이터 로드
print("Loading metadata...")
with open(os.path.join(DATA_DIR, 'metadata.pkl'), 'rb') as f:
    metadata = pickle.load(f)

n_users = metadata['n_users']
n_items = metadata['n_items']

# Edge index 로드
print("Loading edge index...")
edge_index = torch.load(os.path.join(DATA_DIR, 'edge_index.pt'))

# Train/Test matrix 로드
print("Loading matrices...")
train_matrix = load_npz(os.path.join(DATA_DIR, 'train_matrix.npz')).tocsr()
test_matrix = load_npz(os.path.join(DATA_DIR, 'test_matrix.npz')).tocsr()
print(f"Train interactions: {train_matrix.nnz:,}")
print(f"Test interactions: {test_matrix.nnz:,}\n")


class LightGCN(nn.Module):
    def __init__(self, n_users, n_items, edge_index, embedding_dim=64, n_layers=3):
        super(LightGCN, self).__init__()
        
        self.n_users = n_users
        self.n_items = n_items
        self.embedding_dim = embedding_dim
        self.n_layers = n_layers
        
        self.user_embedding = nn.Embedding(n_users, embedding_dim)
        self.item_embedding = nn.Embedding(n_items, embedding_dim)
        
        nn.init.normal_(self.user_embedding.weight, std=0.1)
        nn.init.normal_(self.item_embedding.weight, std=0.1)
        
        self.graph = self._get_sparse_graph(edge_index)
    
    def _get_sparse_graph(self, edge_index):
        num_nodes = self.n_users + self.n_items
        device = self.user_embedding.weight.device
        edge_index = edge_index.to(device)
        
        vals = torch.ones(edge_index.size(1), device=device, dtype=torch.float32)
        adj = torch.sparse_coo_tensor(edge_index, vals, (num_nodes, num_nodes))
        
        row, col = edge_index
        deg = torch.sparse.sum(adj, dim=1).to_dense()
        deg_inv_sqrt = deg.pow(-0.5)
        deg_inv_sqrt[deg_inv_sqrt == float('inf')] = 0
        
        norm_vals = deg_inv_sqrt[row] * vals * deg_inv_sqrt[col]
        
        normalized_graph = torch.sparse_coo_tensor(
            edge_index, 
            norm_vals, 
            (num_nodes, num_nodes),
            device=device
        ).coalesce()
        
        return normalized_graph
    
    def forward(self):
        if self.graph.device != self.user_embedding.weight.device:
            self.graph = self.graph.to(self.user_embedding.weight.device)
        
        all_embeddings = torch.cat([
            self.user_embedding.weight,
            self.item_embedding.weight
        ])
        
        embeddings_list = [all_embeddings]
        
        for layer in range(self.n_layers):
            all_embeddings = torch.sparse.mm(self.graph, all_embeddings)
            embeddings_list.append(all_embeddings)
        
        final_embeddings = torch.stack(embeddings_list, dim=1)
        final_embeddings = torch.mean(final_embeddings, dim=1)
        
        user_embeddings = final_embeddings[:self.n_users]
        item_embeddings = final_embeddings[self.n_users:]
        
        return user_embeddings, item_embeddings


def evaluate(model, train_matrix, test_matrix, top_k=20, batch_size=1024):
    """
    GPU 가속을 적용한 Recall@K, NDCG@K 계산
    """
    model.eval()
    device = next(model.parameters()).device # 모델이 있는 장치(GPU) 확인
    
    recalls = []
    ndcgs = []
    
    # 학습 데이터(이미 본 영화)를 조회하기 편하게 변환
    # (CPU에서 조회하는 게 메모리 관리에 유리할 수 있음 - 여기선 CPU 유지)
    train_matrix = train_matrix
    
    # 평가 대상 유저 (Test set에 데이터가 있는 유저만)
    test_users_idx = np.where(test_matrix.getnnz(axis=1) > 0)[0]
    
    with torch.no_grad():
        # 1. 모든 임베딩 추출 (GPU 상태 유지)
        user_all_emb, item_all_emb = model()
        
        # 2. 배치 단위 평가
        for start_idx in tqdm(range(0, len(test_users_idx), batch_size), desc="Evaluating"):
            end_idx = min(start_idx + batch_size, len(test_users_idx))
            batch_users = test_users_idx[start_idx:end_idx]
            
            # 해당 배치의 유저 임베딩 가져오기
            batch_u_emb = user_all_emb[batch_users] # GPU Tensor
            
            # 3. GPU 행렬 곱셈 (점수 계산) - 순식간에 끝남
            # (Batch, Emb) x (Emb, Items) -> (Batch, Items)
            scores = torch.matmul(batch_u_emb, item_all_emb.t())
            
            # 4. 이미 본 영화 마스킹 (필터링)
            for i, user_id in enumerate(batch_users):
                # 유저가 본 아이템 인덱스 가져오기
                train_pos_items = train_matrix[user_id].indices
                # 해당 인덱스의 점수를 -무한대로 설정 (GPU 상에서)
                scores[i, train_pos_items] = -float('inf')
            
            # 5. GPU Top-K 추출 (정렬보다 훨씬 빠름)
            # argsort 대신 topk 사용
            _, top_k_items = torch.topk(scores, k=top_k)
            top_k_items = top_k_items.cpu().numpy() # 결과만 CPU로 가져옴
            
            # 6. 채점 (Metric 계산) - 여기는 CPU가 함 (연산량 적음)
            for i, user_id in enumerate(batch_users):
                ground_truth = set(test_matrix[user_id].indices)
                
                if len(ground_truth) == 0:
                    continue
                
                recommended = top_k_items[i]
                hits = [1 if item in ground_truth else 0 for item in recommended]
                
                # Recall
                recall = sum(hits) / min(len(ground_truth), top_k)
                recalls.append(recall)
                
                # NDCG
                dcg = sum([hit / np.log2(idx + 2) for idx, hit in enumerate(hits)])
                idcg = sum([1.0 / np.log2(idx + 2) for idx in range(min(len(ground_truth), top_k))])
                ndcg = dcg / idcg if idcg > 0 else 0
                ndcgs.append(ndcg)
                
    return np.mean(recalls), np.mean(ndcgs)

# 체크포인트 파일 찾기
checkpoint_files = sorted(glob.glob(os.path.join(MODEL_DIR, '*.pt')))

if len(checkpoint_files) == 0:
    print(f"No checkpoint files found in {MODEL_DIR}")
    exit(1)

print(f"Found {len(checkpoint_files)} checkpoint files:\n")
for ckpt in checkpoint_files:
    print(f"  - {os.path.basename(ckpt)}")
print()

# 평가 설정
TOP_K = 20

print(f"=== Evaluation Configuration ===")
print(f"Top-K: {TOP_K}")
print(f"Test users: {np.count_nonzero(test_matrix.getnnz(axis=1)):,}\n")

# 모든 체크포인트 평가
results = []

for ckpt_path in checkpoint_files:
    ckpt_name = os.path.basename(ckpt_path)
    print(f"\n{'='*60}")
    print(f"Evaluating: {ckpt_name}")
    print(f"{'='*60}")
    
    # 체크포인트 로드
    checkpoint = torch.load(ckpt_path, map_location='cpu')
    
    # 모델 초기화
    model = LightGCN(
        n_users=checkpoint['n_users'],
        n_items=checkpoint['n_items'],
        edge_index=edge_index.cpu(),
        embedding_dim=checkpoint['embedding_dim'],
        n_layers=checkpoint['n_layers']
    )
    
    # 가중치 로드
    model.load_state_dict(checkpoint['model_state_dict'])
    model = model.to(device)
    model.graph = model._get_sparse_graph(edge_index.to(device))
    
    # 평가
    recall, ndcg = evaluate(model, train_matrix, test_matrix, top_k=TOP_K)
    
    result = {
        'checkpoint': ckpt_name,
        'epoch': checkpoint.get('epoch', 'N/A'),
        'loss': checkpoint.get('loss', 'N/A'),
        f'recall@{TOP_K}': recall,
        f'ndcg@{TOP_K}': ndcg
    }
    
    results.append(result)
    
    print(f"\nResults:")
    print(f"  Epoch: {result['epoch']}")
    print(f"  Loss: {result['loss']:.4f}" if isinstance(result['loss'], float) else f"  Loss: {result['loss']}")
    print(f"  Recall@{TOP_K}: {recall:.4f}")
    print(f"  NDCG@{TOP_K}: {ndcg:.4f}")

# 결과 정리
print(f"\n\n{'='*80}")
print("FINAL RESULTS - ALL CHECKPOINTS")
print(f"{'='*80}\n")

print(f"{'Checkpoint':<30} {'Epoch':<8} {'Loss':<10} {'Recall@20':<12} {'NDCG@20':<12}")
print("-" * 80)

for result in results:
    loss_str = f"{result['loss']:.4f}" if isinstance(result['loss'], float) else str(result['loss'])
    print(f"{result['checkpoint']:<30} {str(result['epoch']):<8} {loss_str:<10} "
          f"{result[f'recall@{TOP_K}']:<12.4f} {result[f'ndcg@{TOP_K}']:<12.4f}")

# Best 모델 찾기
best_recall_idx = max(range(len(results)), key=lambda i: results[i][f'recall@{TOP_K}'])
best_ndcg_idx = max(range(len(results)), key=lambda i: results[i][f'ndcg@{TOP_K}'])

print(f"\n{'='*80}")
print("BEST MODELS")
print(f"{'='*80}")
print(f"\nBest Recall@{TOP_K}: {results[best_recall_idx]['checkpoint']} "
      f"(Epoch {results[best_recall_idx]['epoch']}, Recall: {results[best_recall_idx][f'recall@{TOP_K}']:.4f})")
print(f"Best NDCG@{TOP_K}: {results[best_ndcg_idx]['checkpoint']} "
      f"(Epoch {results[best_ndcg_idx]['epoch']}, NDCG: {results[best_ndcg_idx][f'ndcg@{TOP_K}']:.4f})")

# 결과 저장
with open(os.path.join(RESULT_DIR, 'evaluation_results.pkl'), 'wb') as f:
    pickle.dump(results, f)

print(f"\nResults saved to: {os.path.join(RESULT_DIR, 'evaluation_results.pkl')}")