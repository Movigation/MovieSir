# MovieSir AI - 하이브리드 영화 추천 시스템 (DB 연동)

SBERT + LightGCN 하이브리드 모델 기반, PostgreSQL 연동 영화 추천 시스템

---

## 📋 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [시스템 아키텍처](#시스템-아키텍처)
3. [필수 데이터 다운로드](#필수-데이터-다운로드)
4. [디렉토리 구조](#디렉토리-구조)
5. [추천 로직 상세](#추천-로직-상세)

---

## 프로젝트 개요

MovieSir는 **하이브리드 추천 시스템**으로 사용자에게 개인화된 영화 추천을 제공합니다.

### 사용 모델

| 모델                                | 용도                                          | 가중치                        |
| ----------------------------------- | --------------------------------------------- | ----------------------------- |
| **SBERT** (`multilingual-e5-large`) | 콘텐츠 기반 필터링 (줄거리, 태그 기반 유사도) | 70% (Track A) / 40% (Track B) |
| **LightGCN**                        | 협업 필터링 (사용자-영화 상호작용 그래프)     | 30% (Track A) / 60% (Track B) |

### 주요 기능

- ✅ **듀얼 트랙 추천**: Track A (선호 장르 맞춤) + Track B (장르 확장)
- ✅ **장르, OTT, 런타임, 연도 필터링**
- ✅ **단일 영화 추천** (< 240분): 각 트랙별 3개씩 추천
- ✅ **영화 조합 추천** (≥ 240분): 시간에 맞는 영화 조합 제안
- ✅ **추천 중복 제거**: 이전 9개 추천 영화 제외
- ✅ **PostgreSQL 연동**: 실시간 DB 기반 메타데이터 로드

---

## 시스템 아키텍처

```
┌─────────────────────────────────────────────────┐
│         사용자 입력 (선호 영화 + 필터)          │
└────────────────────┬────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
   ┌────▼─────┐            ┌─────▼──────┐
   │  SBERT   │            │  LightGCN  │
   │ (70/40%) │            │  (30/60%)  │
   └────┬─────┘            └─────┬──────┘
        │                         │
        └────────────┬────────────┘
                     │
            ┌────────▼────────┐
            │  Hybrid Scoring │
            │  (Min-Max 정규화)│
            └────────┬────────┘
                     │
        ┌────────────┴─────────────┐
        │                          │
   ┌────▼──────┐          ┌────────▼─────┐
   │  Track A  │          │   Track B    │
   │(선호 장르) │           │ (장르 확장)     │
   └────┬──────┘          └────────┬─────┘
        │                          │
        └────────────┬─────────────┘
                     │
            ┌────────▼────────┐
            │  필터링 & 추출    │
            │ (장르/OTT/시간)   │
            └────────┬────────┘
                     │
            ┌────────▼────────┐
            │  최종 추천 결과    │
            └─────────────────┘
```

---

## 필수 데이터 다운로드

**Google Drive 링크**: [https://drive.google.com/drive/folders/1RIEx7ExMuJ3Vx-yg_8mJnUgY1HazYETj](https://drive.google.com/drive/folders/1RIEx7ExMuJ3Vx-yg_8mJnUgY1HazYETj)

다운로드한 데이터를 다음과 같이 배치하세요:

```
ai/training/
├── original_data/ (original-data의 전체 파일)
│   ├── extracted_movies.csv
│   ├── ratings_tmdb.csv
│   └── tmdb_ott_raw.csv
│
├── sbert_data/ (sbert-data의 전체 파일 및 sbert-index 폴더)
│   ├── pre_final_movies_processed.csv
│   ├── pre_final_movies_processed.pkl
│   ├── movies_with_embeddings.pkl
│   └── index/
│       ├── movies.faiss
│       └── movie_ids.pkl
│
├── lightgcn_data/ (lightgcn-data의 전체 파일)
│   ├── *.csv, *.npz, *.pt, *.pkl
│
└── lightgcn_model/ (lightgcn-model의 best-model.pt 파일)
    └── best_model.pt
```

---

## 디렉토리 구조

```
ai/
│
├── README_DB.md                       # 이 문서 (DB 연동 버전)
│
├── training/                          # 모델 학습 및 데이터
│   │
│   ├── original_data/                 # 원본 데이터 (필수)
│   │   ├── extracted_movies.csv       # 영화 메타데이터 (TMDB)
│   │   ├── ratings_tmdb.csv           # 사용자 평점 데이터
│   │   └── tmdb_ott_raw.csv           # OTT 플랫폼 정보
│   │
│   ├── sbert_data/                    # SBERT 관련 데이터
│   │   ├── pre_final_movies_processed.csv   # 전처리된 영화 데이터
│   │   ├── pre_final_movies_processed.pkl   # 전처리된 영화 데이터 (PKL)
│   │   ├── movies_with_embeddings.pkl       # 임베딩 포함 최종 데이터
│   │   └── index/                           # FAISS 인덱스
│   │       ├── movies.faiss                 # FAISS 벡터 인덱스
│   │       └── movie_ids.pkl                # 영화 ID 매핑
│   │
│   ├── lightgcn_data/                 # LightGCN 전처리 데이터
│   │   ├── train_ratings.csv          # Train 평점 데이터
│   │   ├── test_ratings.csv           # Test 평점 데이터
│   │   ├── train_implicit.csv         # Implicit Feedback (Train)
│   │   ├── test_implicit.csv          # Implicit Feedback (Test)
│   │   ├── train_remapped.csv         # ID 재매핑 (Train)
│   │   ├── test_remapped.csv          # ID 재매핑 (Test)
│   │   ├── train_matrix.npz           # Sparse Interaction Matrix (Train)
│   │   ├── test_matrix.npz            # Sparse Interaction Matrix (Test)
│   │   ├── edge_index.pt              # Graph Edge Index
│   │   ├── id_mappings.pkl            # User/Item ID 매핑
│   │   └── metadata.pkl               # 전처리 메타데이터
│   │
│   ├── lightgcn_model/                # LightGCN 학습된 모델
│   │   └── best_model.pt              # 최적 모델 체크포인트
│   │
│   ├── sbert_embedding.py             # SBERT 임베딩 생성 스크립트 (실행 X)
│   ├── sbert_indexing.py              # FAISS 인덱싱 스크립트 (실행 X)
│   ├── lightgcn_train.py              # LightGCN 학습 스크립트 (실행 X)
│   └── lightgcn_evaluate.py           # LightGCN 평가 스크립트 (실행 X)
│
└── inference/                         # 추천 시스템 실행
    ├── reco_v1.py                     # 하이브리드 추천 시스템 (메인)
    └── db_conn_movie_reco_v1.py       # DB 연동 추천 시스템
```

---

## 추천 로직 상세

### 1. 듀얼 트랙 시스템

#### Track A: 선호 장르 맞춤 추천

- **필터**: 선호 장르 + 2000년 이후 + 선택 OTT
- **가중치**: SBERT 70% + LightGCN 30%
- **목적**: 사용자 선호도에 정확히 맞춤

#### Track B: 장르 확장 추천

- **필터**: 장르 무시 + 2000년 이후 + 선택 OTT
- **가중치**: SBERT 40% + LightGCN 60%
- **장르 다양성 부스트**: Track A와 다른 장르에 1.3배 가중치

### 2. 추천 타입

| 이용 가능 시간 | 추천 타입 | 결과                          |
| -------------- | --------- | ----------------------------- |
| < 240분        | 단일 영화 | Track A 3개 + Track B 3개     |
| ≥ 240분        | 영화 조합 | Track A 1조합 + Track B 1조합 |

### 3. 추천 중복 제거

- 이전 9개 추천 영화 제외
- Track A/B 간 중복 제거
- 사용자 입력 영화 제외

---

## 추천 결과 예시

### 단일 영화 추천

```python
{
    'recommendations': {
        'track_a': {
            'label': '선호 장르 맞춤 추천',
            'movies': [
                {
                    'tmdb_id': 603,
                    'hybrid_score': 0.8542,
                    'title': 'The Matrix',
                    'runtime': 136,
                    'genres': ['액션', 'SF'],
                    'release_date': '1999-03-31'
                },
                # ... 2개 더
            ]
        },
        'track_b': {
            'label': '장르 확장 추천',
            'movies': [...]
        }
    },
    'elapsed_time': 0.15
}
```

---

**Google Drive 데이터**: [https://drive.google.com/drive/folders/1RIEx7ExMuJ3Vx-yg_8mJnUgY1HazYETj](https://drive.google.com/drive/folders/1RIEx7ExMuJ3Vx-yg_8mJnUgY1HazYETj)
