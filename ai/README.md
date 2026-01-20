# MovieSir AI Recommendation Engine

> Hybrid movie recommendation system combining SBERT content similarity with LightGCN collaborative filtering

## Overview

MovieSir는 사용자의 시청 가능 시간에 맞춰 **개인화된 영화 조합**을 추천하는 AI 엔진입니다. 콘텐츠 기반 필터링(SBERT)과 협업 필터링(LightGCN)을 결합한 하이브리드 접근 방식으로, 정확성과 다양성의 균형을 추구합니다.

### Key Features

- **Hybrid Scoring**: SBERT(1024-dim) + LightGCN(256-dim) 임베딩 결합
- **Dual Track System**: 선호 장르 맞춤(Track A) + 장르 확장 탐색(Track B)
- **Time-Matching**: 사용자 시청 시간의 90~100%를 채우는 최적 영화 조합 생성
- **Noise-based Diversity**: 30회 시도를 통한 재추천 다양성 보장
- **Intelligent Profiling**: 4단계 폴백 시스템으로 Cold-start 문제 해결

---

## System Architecture

### Overall Flow

```
┌─────────────┐
│   Frontend  │ ← React (B2C 서비스)
└──────┬──────┘
       │ REST API
       ↓
┌─────────────────────────────────────────────┐
│              Backend (FastAPI)              │
│  ┌─────────────────────────────────────┐    │
│  │  AIModelAdapter                     │    │
│  │  • 사용자 프로필 생성 (4단계 폴백)         │    │
│  │  • 피드백 수집 (긍정/부정)               │    │
│  │  • 세션 기반 중복 제거                   │   │
│  │  • 캐싱 (5분 TTL)                     │   │
│  └──────────────┬──────────────────────┘   │
└─────────────────┼──────────────────────────┘
                  │ HTTP (B2B API 또는 내부)
                  ↓
┌─────────────────────────────────────────────┐
│         AI Service (FastAPI + PyTorch)      │
│  ┌─────────────────────────────────────┐    │
│  │  HybridRecommender                  │    │
│  │  • SBERT 유사도 (1024-dim)            │    │
│  │  • LightGCN CF (256-dim)            │    │
│  │  • Dual Track 추천                   │    │
│  │  • Time-Matching + Diversity        │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
                  ↓ ↑
          ┌─────────────┐
          │ PostgreSQL  │
          │ (10.0.35.28)│
          └─────────────┘
```

**B2B External API**: MovieSir 자체 B2C 서비스도 B2B API를 사용하는 Dog Fooding 전략 채택

---

## User Profile Generation

### 4-Step Fallback System

사용자 선호를 파악하기 위한 우선순위 기반 데이터 수집:

| 순위      | 데이터 소스 | 설명                                             | 최대 개수 |
| --------- | ----------- | ------------------------------------------------ | --------- |
| **1순위** | 긍정 피드백 | 사용자가 직접 "좋아요" 표시한 영화 (명시적 선호) | 20개      |
| **2순위** | 온보딩 응답 | 회원가입 시 선택한 선호 영화 (Cold-start 해결)   | 3~10개    |
| **3순위** | 시청 기록   | OTT 링크 클릭 기록 (암묵적 선호)                 | 50개      |
| **4순위** | 인기 영화   | 평점 높은 영화 (Fallback, 24시간 캐싱)           | 5개       |

**결과 예시**: `3개 피드백 + 5개 온보딩 + 12개 시청 기록 = 20개 영화 프로필`

### Why This Works

- **명시적 선호 우선**: 사용자가 직접 표시한 선호가 가장 신뢰도 높음
- **Cold-start 해결**: 신규 사용자도 온보딩으로 즉시 개인화 가능
- **취향 변화 반영**: 최근 데이터 우선, 오래된 기록은 제한
- **완전 Fallback**: 데이터 없어도 보편적으로 좋은 영화 추천

---

## Recommendation Algorithm

### Hybrid Model

**SBERT (Sentence-BERT)** - Content-based Filtering

- 차원: 1024-dim
- 용도: 영화 줄거리, 장르, 태그 기반 유사도
- 장점: Cold-start 문제 없음, 모든 영화 적용 가능

**LightGCN (Light Graph Convolution Network)** - Collaborative Filtering

- 차원: 256-dim
- 용도: 사용자-영화 상호작용 그래프 기반
- 장점: 비슷한 취향의 사용자가 본 영화 추천

### Scoring Formula

```
1. SBERT Similarity
   user_profile = [movie1_vec, movie2_vec, ..., movieN_vec]  # (N, 1024)
   similarity = candidate_vectors @ user_profile.T            # (M, N)
   sbert_score = mean(similarity, axis=1)                     # (M,) 평균 유사도

2. LightGCN Similarity
   user_profile = [movie1_vec, movie2_vec, ..., movieN_vec]  # (N, 256)
   similarity = candidate_vectors @ user_profile.T            # (M, N)
   lightgcn_score = mean(similarity, axis=1)                  # (M,) 평균 유사도

3. Hybrid Score
   if LightGCN embedding exists:
       model_score = (sbert_weight × norm_sbert) + (lightgcn_weight × norm_lightgcn)
   else:
       model_score = norm_sbert  # SBERT only

4. Rating Boost
   rating_score = log(vote_count + 1) × (vote_average / 10)

5. Final Score
   final_score = (model_score × 0.7) + (norm_rating × 0.3)

6. Genre Boost (Track A only)
   if movie has preferred genres:
       overlap_ratio = matching_genres / total_preferred_genres
       genre_boost = overlap_ratio × 0.15  # 최대 15% 가산
       final_score = final_score × (1 + genre_boost)
```

**가중치 설정 이유**:

- 모델 70% + 평점 30%: 개인화된 추천이 우선, 품질도 고려
- Track A (SBERT 0.7 + LightGCN 0.3): 콘텐츠 유사도 중심
- Track B (SBERT 0.4 + LightGCN 0.6): 협업 필터링 중심

---

## Track A vs Track B

### Dual Track Strategy

**탐색(Exploration)과 활용(Exploitation)의 균형**

|                 | Track A: 선호 장르 맞춤  | Track B: 장르 확장                 |
| --------------- | ------------------------ | ---------------------------------- |
| **목적**        | 사용자 선호 정확히 반영  | 새로운 장르 발견                   |
| **필터**        | 장르 + OTT + 2000년 이후 | OTT + 2000년 이후 (장르 제한 없음) |
| **가중치**      | SBERT 0.7 + LightGCN 0.3 | SBERT 0.4 + LightGCN 0.6           |
| **장르 부스트** | 최대 15%                 | 없음                               |
| **전략**        | Content similarity 우선  | Collaborative filtering 우선       |
| **결과**        | 안전한 선택, 높은 만족도 | 취향 확장, 세렌디피티              |

**Example**:

```
사용자 선호: 액션, SF
시청 가능 시간: 180분

Track A → [인터스텔라(SF), 매드맥스(액션)] = 275분
Track B → [포레스트 검프(드라마), 쇼생크(드라마)] = 290분
```

---

## Time-Matching Algorithm

### Goal

사용자의 시청 가능 시간(분)에 맞는 영화 조합 생성:

- 목표 범위: `available_time × 0.9 ~ available_time`
- 최대 영화: 4편
- 최적화: 시간 활용률 + 추천 점수 동시 최대화

### Noise-based Greedy Fill

**30번 시도를 통한 최적화**:

```
for attempt in 1..30:
    1. 각 영화 점수에 랜덤 노이즈 곱하기 (0.4~1.6x)
    2. 노이즈 점수 기준 내림차순 정렬
    3. Greedy: 시간 초과 안 되게 최대한 많이 선택
    4. 목표 범위 내면 점수 비교, 최고점 저장

return 가장 높은 점수의 조합
```

**Why Noise?**

- 같은 사용자, 같은 조건에서도 다양한 조합 생성
- 30가지 다른 순서 → 30가지 다른 결과
- 재추천 시 이전과 다른 영화 제공

**Example**:

```
시도 1: 노이즈 [0.8, 1.5, 0.6] → [영화B, 영화A] = 260분 ✓ (score: 1.85)
시도 2: 노이즈 [1.4, 0.7, 1.1] → [영화A, 영화C] = 255분 ✓ (score: 1.92) ← 선택!
...
시도 30: 노이즈 [1.1, 0.9, 1.3] → [영화C, 영화B] = 270분 ✓ (score: 1.78)

최종: 시도 2 (255분, score 1.92)
```

---

## Additional Features

### Negative Feedback Penalty

사용자가 싫어한 영화와 SBERT 유사도 높은 영화의 점수를 감소:

```
penalty_factor = 1 - (similarity × penalty_strength)
penalty_factor = max(penalty_factor, 0.1)  # 최소 10% 보존
penalized_score = original_score × penalty_factor
```

**Example**: "인셉션" 싫어요

- 다크나이트 (유사도 0.78) → 39% 점수 감소
- 인터스텔라 (유사도 0.82) → 41% 점수 감소
- 캐스트어웨이 (유사도 0.15) → 7% 점수 감소

### Session Deduplication

**중복 방지 전략**:

- Track A: 같은 장르 요청 시에만 이전 추천 제외 (다른 장르면 OK)
- Track B: 최근 모든 세션의 추천 제외 (장르 무관)
- 피드백 영화: 긍정+부정 모두 제외
- 최근 3개 세션 추적

### Caching

| Cache          | TTL    | Purpose                |
| -------------- | ------ | ---------------------- |
| User Profile   | 5분    | 재추천 시 DB 조회 생략 |
| Popular Movies | 24시간 | Fallback 데이터        |
| SBERT/LightGCN | 영구   | 모델 임베딩 (370MB)    |

---

## Performance

### Initialization (Cold Start)

- **시간**: 5.3초 (DB 연결 + 모델 로드 + 인덱싱)
- **메모리**: 370MB (SBERT 250MB + LightGCN 40MB + 인덱스 50MB + 메타데이터 30MB)

### Inference (Per Request)

- **전체 시간**: ~850ms (Track A + Track B)
  - User Profile: 50ms (캐시 시 0ms)
  - Filtering: 50ms (인덱스 기반 set 연산)
  - SBERT Similarity: 100ms
  - LightGCN Similarity: 80ms
  - Score Calculation: 20ms
  - Time-Matching: 150ms (30회 시도)
  - Negative Penalty: 20ms (optional)

### Scalability

- 동시 사용자: 100명 (최대 500명, GPU 메모리 제한)
- 처리량: 1.2 req/sec (단일 GPU)
- P99 응답 시간: 1.2초

---

## API Reference

### POST /recommend

**초기 추천 - Track A + Track B 조합 반환**

```json
// Request
{
  "user_movie_ids": [550, 680, 155],
  "available_time": 180,
  "preferred_genres": ["액션", "SF"],
  "preferred_otts": ["Netflix"],
  "allow_adult": false,
  "excluded_ids_a": [],
  "excluded_ids_b": [],
  "negative_movie_ids": [27205]
}

// Response
{
  "track_a": {
    "label": "선호 장르 맞춤 추천",
    "movies": [{...}, {...}],
    "total_runtime": 275
  },
  "track_b": {
    "label": "장르 확장 추천",
    "movies": [{...}, {...}],
    "total_runtime": 290
  },
  "elapsed_time": 0.856
}
```

### POST /recommend_single

**개별 영화 재추천 - 단일 영화 교체**

```json
// Request
{
  "user_movie_ids": [550, 680],
  "target_runtime": 120,
  "excluded_ids": [550, 680, 27205],
  "track": "a",
  "preferred_genres": ["액션"],
  "preferred_otts": ["Netflix"],
  "negative_movie_ids": [27205]
}

// Response
{
  "movie_id": 13,
  "title": "Forrest Gump",
  "runtime": 142,
  "genres": ["Comedy", "Drama"],
  "score": 0.88,
  ...
}
```

### B2B External API

**POST /v1/recommend** - API Key 인증 필요

```bash
curl -X POST https://api.moviesir.com/v1/recommend \
  -H "X-API-Key: sk-moviesir-your-api-key" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**Features**:

- Rate Limiting (일일 할당량)
- Usage Logging
- 표준화된 응답 (success, data, meta)

---

## Database Schema

### Core Tables

**movies**: 영화 메타데이터 (62,000개)
**movie_vectors**: SBERT 임베딩 (1024-dim, pgvector)
**b2c.user_movie_feedback**: 사용자 피드백 (긍정/부정/클릭)
**recommendation_sessions**: 추천 기록 (중복 방지용, JSONB로 Track A/B 분리 저장)

---

## Version History

### Current: Hybrid Recommender (2026-01-15)

**Features**:

- ✅ SBERT + LightGCN 하이브리드 (1024-dim + 256-dim)
- ✅ 4단계 폴백 사용자 프로필
- ✅ Dual Track (A/B) 시스템
- ✅ Noise-based diversity (30회 시도)
- ✅ 인덱스 기반 필터링 (10배 성능 향상)
- ✅ Negative feedback penalty
- ✅ 세션 기반 중복 제거
- ✅ 다층 캐싱

---

## References

- **SBERT**: [Sentence-BERT (arxiv.org/abs/1908.10084)](https://arxiv.org/abs/1908.10084)
- **LightGCN**: [LightGCN (arxiv.org/abs/2002.02126)](https://arxiv.org/abs/2002.02126)
- **Dataset**: [MovieLens 25M](https://grouplens.org/datasets/movielens/)
- **pgvector**: [PostgreSQL vector search](https://github.com/pgvector/pgvector)

---

**Last Updated**: 2026-01-15
**Version**: 1.0
