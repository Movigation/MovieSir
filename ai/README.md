# MovieSir AI Recommendation Engine

> 하이브리드 영화 추천 알고리즘: SBERT + ALS

## 개요

MovieSir AI 엔진은 사용자의 시청 가능 시간에 맞춰 **개인화된 영화 조합**을 추천합니다. 콘텐츠 기반 필터링(SBERT)과 협업 필터링(ALS)을 결합한 하이브리드 접근 방식으로, 정확성과 다양성의 균형을 추구합니다.

### 핵심 기능

- **하이브리드 스코어링**: SBERT(1024차원) + ALS(128차원) 임베딩 결합
- **최대 유사도 기반 추천**: 사용자 프로필 영화 중 가장 유사한 영화와 매칭
- **듀얼 트랙 시스템**: 선호 장르 맞춤(Track A) + 장르 확장 탐색(Track B)
- **시간 매칭**: 사용자 시청 시간의 90~100%를 채우는 최적 영화 조합 생성
- **노이즈 기반 다양성**: 30회 시도를 통한 재추천 다양성 보장

---

## 디렉토리 구조

```bash
ai/
├── api.py                        # FastAPI 엔드포인트 정의
├── inference/
│   └── recommendation_model.py   # 핵심 추천 알고리즘 (HybridRecommender)
├── training/
│   └── als_data/                 # ALS 모델 및 데이터
│       ├── als_item_factors.npy  #   └─ Item factor 행렬 (N × 128)
│       └── mappings.pkl          #   └─ movie_id ↔ index 매핑
├── compare/                      # 모델 비교 실험
│   └── cbf/                      # TF-IDF vs Word2Vec vs SBERT
└── requirements.txt              # Python 의존성
```

---

## 사용자 프로필 생성

### 3단계 폴백 시스템

사용자 선호를 파악하기 위한 우선순위 기반 데이터 수집:

| 순위      | 데이터 소스 | 설명                          | 최대 개수 |
| --------- | ----------- | ----------------------------- | --------- |
| **1순위** | 긍정 피드백 | 사용자가 "좋아요" 표시한 영화 | 20개      |
| **2순위** | 온보딩 응답 | 회원가입 시 선택한 선호 영화  | 10개      |
| **3순위** | 인기 영화   | 평점 높은 영화 (Fallback)     | 5개       |

**결과 예시**: `3개 피드백 + 5개 온보딩 = 8개 영화 프로필`

---

## 추천 알고리즘

### 하이브리드 모델

**SBERT (Sentence-BERT)** - 콘텐츠 기반 필터링

- 차원: 1024-dim
- 용도: 영화 줄거리, 태그 기반 유사도
- 장점: Cold-start 문제 없음, 모든 영화 적용 가능

**ALS (Alternating Least Squares)** - 협업 필터링

- 차원: 128-dim
- 용도: 사용자-영화 상호작용 행렬 분해 기반
- 장점: 비슷한 취향의 사용자가 본 영화 추천

### 스코어링 파이프라인

추천 점수는 6단계 파이프라인을 거쳐 계산됩니다.

#### 1단계: SBERT 유사도 (Max Similarity)

```python
user_profile = [movie1_vec, movie2_vec, ..., movieN_vec]  # (N, 1024)
similarity = candidate_vectors @ user_profile.T           # (M, N)
sbert_score = max(similarity, axis=1)                     # (M,) 최대 유사도
```

#### 2단계: ALS 유사도 (Max Similarity)

```python
user_profile = [movie1_vec, movie2_vec, ..., movieN_vec]  # (N, 128)
similarity = candidate_vectors @ user_profile.T           # (M, N)
als_score = max(similarity, axis=1)                       # (M,) 최대 유사도
```

#### 3단계: 하이브리드 점수

```python
# ALS 임베딩이 존재할 경우
if als_embedding_exists:
    # SBERT와 ALS 점수를 가중합하여 최종 모델 점수 계산
    model_score = (sbert_weight * norm_sbert) + (als_weight * norm_als)
# ALS 임베딩이 존재하지 않을 경우
else:
    # SBERT 점수만 사용
    model_score = norm_sbert
```

#### 4단계: 평점 점수

```python
# 일일 평점 기반 점수
rating_score = (vote_average / 10) * log(votes_per_day + 1)
```

#### 5단계: 최종 점수

```python
# 모델 점수와 평점 점수를 가중합하여 최종 점수 계산
final_score = (model_score * 0.7) + (norm_rating * 0.3)
```

#### 6단계: 장르 부스트 (Track A only)

```python
# 선호 장르가 포함된 경우 장르 부스트 적용 (Track A만)
if movie_has_preferred_genres:
    overlap_ratio = matching_genres / total_preferred_genres
    genre_boost = overlap_ratio * 0.15  # 최대 15% 가산
    final_score = final_score * (1 + genre_boost)
```

### Max Similarity vs Mean Similarity

**현재 적용: Max Similarity (최대 유사도)**

| 사용자 영화 | 후보 영화 X와의 유사도 |
| ----------- | ---------------------- |
| 영화 A      | 0.85                   |
| 영화 B      | 0.72                   |
| 영화 C      | **0.91** ← 최대값      |
| 영화 D      | 0.68                   |

```python
final_score = max([0.85, 0.72, 0.91, 0.68])  # = 0.91
```

**왜 Max Similarity인가?**

- 사용자 선호 영화 중 하나와 강하게 매칭되면 충분
- Mean보다 높은 정밀도 (Precision@10: 0.156 vs 0.047)

---

## Track A vs Track B

### 듀얼 트랙 전략

**탐색(Exploration)과 활용(Exploitation)의 균형**

|                 | Track A: 선호 장르 맞춤  | Track B: 장르 확장                 |
| --------------- | ------------------------ | ---------------------------------- |
| **목적**        | 사용자 선호 정확히 반영  | 새로운 장르 발견                   |
| **필터**        | 장르 + OTT + 2000년 이후 | OTT + 2000년 이후 (장르 제한 없음) |
| **가중치**      | SBERT 0.7 + ALS 0.3      | SBERT 0.4 + ALS 0.6                |
| **장르 부스트** | 최대 15%                 | 없음                               |
| **전략**        | Content similarity 우선  | Collaborative filtering 우선       |

**예시**:

```
사용자 선호: 액션, SF
시청 가능 시간: 180분 (목표 범위: 162~180분)

Track A → [매드맥스: 분노의 도로(120분), 엣지 오브 투모로우(53분)] = 173분 ✓
Track B → [쇼생크 탈출(142분), 빅 피쉬(30분)] = 172분 ✓
```

---

## 시간 매칭 알고리즘

### 목표

사용자의 시청 가능 시간(분)에 맞는 영화 조합 생성:

- 목표 범위: `available_time × 0.9 ~ available_time`
- 최적화: 시간 활용률 + 추천 점수 동시 최대화

### 노이즈 기반 Greedy Fill

**30번 시도를 통한 최적화**:

```python
best_combo = None

for attempt in range(30):
    # 1. 각 영화 점수에 랜덤 노이즈 곱하기 (0.4~1.6x)
    noisy_scores = [score * random.uniform(0.4, 1.6) for score in scores]

    # 2. 노이즈 점수 기준 내림차순 정렬
    sorted_movies = sort_by(noisy_scores, descending=True)

    # 3. Greedy: 시간 초과 안 되게 최대한 많이 선택
    combo = greedy_fill(sorted_movies, max_time=available_time)

    # 4. 목표 범위(90~100%) 내면 점수 비교, 최고점 저장
    if min_time <= combo.runtime <= max_time:
        if combo.score > best_combo.score:
            best_combo = combo

return best_combo
```

**왜 노이즈인가?**

- 같은 사용자, 같은 조건에서도 다양한 조합 생성
- 30가지 다른 순서 → 30가지 다른 결과
- 재추천 시 이전과 다른 영화 제공

---

## 부정 피드백 페널티

사용자가 "싫어요"를 누른 영화와 **콘텐츠가 유사한 영화**의 점수를 낮춥니다.

### 작동 원리

```python
# 1. 부정 피드백 영화들의 SBERT 벡터 수집
negative_vectors = [sbert_embedding[movie_id] for movie_id in negative_movie_ids]

# 2. 각 후보 영화와 부정 영화들의 유사도 계산
for candidate in candidates:
    max_similarity = max(dot_product(negative_vectors, candidate_vector))

    # 3. 유사도가 높을수록 페널티 증가
    penalty_factor = 1 - (max_similarity * 0.5)  # penalty_strength=0.5
    penalty_factor = max(penalty_factor, 0.1)    # 최소 10% 점수 보존

    # 4. 점수에 페널티 적용
    penalized_score = original_score * penalty_factor
```

### 계산 예시

**"인셉션" 싫어요** (penalty_strength=0.5)

| 후보 영화    | SBERT 유사도 | penalty_factor | 점수 변화    |
| ------------ | ------------ | -------------- | ------------ |
| 다크나이트   | 0.78         | 0.61           | **39% 감소** |
| 인터스텔라   | 0.82         | 0.59           | **41% 감소** |
| 캐스트어웨이 | 0.15         | 0.93           | **7% 감소**  |

---

## 재추천 알고리즘 (recommend_single)

### 목적

사용자가 추천된 영화 중 **하나만 교체**하고 싶을 때 사용합니다.

### 핵심 제약 조건

```
새 영화 런타임 ≤ target_runtime (남은 시청 가능 시간)
```

| 시나리오           | 값                                     |
| ------------------ | -------------------------------------- |
| 시청 가능 시간     | 180분                                  |
| 현재 조합          | Movie A(120분) + Movie B(55분) = 175분 |
| 교체 대상          | Movie A (120분)                        |
| **target_runtime** | **125분** (180 - 55)                   |

### 3단계 런타임 Fallback

```python
target_runtime = 125분

# Level 0: 90~100% (이상적) → 112.5~125분
# Level 1: 70~100% (차선책) → 87.5~125분
# Level 2: 0~100% (최후의 수단) → 1~125분
```

### recommend vs recommend_single 비교

| 항목            | recommend (초기 추천)  | recommend_single (재추천) |
| --------------- | ---------------------- | ------------------------- |
| **반환**        | Track A + Track B 조합 | 단일 영화 1개             |
| **노이즈 범위** | 0.4~1.6x (넓음)        | 0.7~1.3x (좁음)           |
| **시간 제약**   | 90~100% 채우기         | target_runtime 이하       |

---

## API 레퍼런스

### POST /recommend

**초기 추천 - Track A + Track B 조합 반환**

**Request**

```json
{
  "user_movie_ids": [550, 680, 155],
  "available_time": 180,
  "preferred_genres": ["액션", "SF"],
  "preferred_otts": ["Netflix"],
  "excluded_ids_a": [],
  "excluded_ids_b": [],
  "negative_movie_ids": [27205]
}
```

**Response**

```json
{
  "track_a": {
    "label": "선호 장르 맞춤 추천",
    "movies": [
      { "movie_id": 550, "title": "Fight Club", "runtime": 139, "score": 0.92 }
    ],
    "total_runtime": 173
  },
  "track_b": {
    "label": "장르 확장 추천",
    "movies": [
      { "movie_id": 278, "title": "쇼생크 탈출", "runtime": 142, "score": 0.85 }
    ],
    "total_runtime": 172
  },
  "elapsed_time": 0.856
}
```

### POST /recommend_single

**개별 영화 재추천 - 단일 영화 교체**

**Request**

```json
{
  "user_movie_ids": [550, 680],
  "target_runtime": 120,
  "excluded_ids": [550, 680, 27205],
  "track": "a",
  "preferred_genres": ["액션"],
  "preferred_otts": ["Netflix"],
  "negative_movie_ids": [27205]
}
```

**Response**

```json
{
  "movie_id": 155,
  "title": "다크 나이트",
  "runtime": 108,
  "genres": ["액션", "범죄", "드라마"],
  "score": 0.91
}
```

---

## 실행

```bash
# 의존성 설치
cd ai
pip install -r requirements.txt

# 서버 실행 (개발 모드)
uvicorn api:app --reload --port 8001

# 테스트
curl -X POST http://localhost:8001/recommend \
  -H "Content-Type: application/json" \
  -d '{"user_movie_ids": [550, 680], "available_time": 180}'
```

---

**Version**: final (SBERT + ALS + Max Similarity)
