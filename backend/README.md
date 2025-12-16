# Movigation Backend

영화 추천 서비스 백엔드 API

## 기술 스택

- **Framework**: FastAPI
- **Database**: PostgreSQL + pgvector
- **Cache**: Redis
- **ORM**: SQLAlchemy 2.0

## 설치 및 실행

### 1. 의존성 설치
```bash
pip install -r requirements.txt
```

### 2. 환경변수 설정
`.env` 파일 생성:
```env
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/movigation
REDIS_URL=redis://127.0.0.1:6379/0
JWT_SECRET_KEY=your-secret-key
```

### 3. 서버 실행
```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. API 문서
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API 엔드포인트

### 회원가입 (Registration)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup/request` | 회원가입 요청 (인증 메일 발송) |
| POST | `/auth/signup/verify` | 이메일 인증 코드 검증 |
| POST | `/auth/signup/confirm` | 회원가입 확정 |

### 온보딩 (Onboarding)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/onboarding/ott` | OTT 플랫폼 선택 |
| POST | `/onboarding/survey` | 영화 취향 설문 |
| POST | `/onboarding/complete` | 온보딩 완료 |
| POST | `/onboarding/skip` | 온보딩 스킵 |

### 영화 추천 (Recommendation)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/recommend` | 영화 추천 목록 |
| GET | `/api/movies/{movie_id}` | 영화 상세 정보 |
| POST | `/api/movies/{movie_id}/play` | OTT 재생 링크 |
| POST | `/api/movies/{movie_id}/watched` | 시청 기록 저장 |

## 프로젝트 구조

```
backend/
├── main.py              # FastAPI 앱 진입점
├── core/
│   └── db.py            # 데이터베이스 설정
├── utils/
│   ├── password.py      # 비밀번호 해싱
│   └── redis.py         # Redis 클라이언트
└── domains/
    ├── auth/            # 인증 (JWT)
    ├── user/            # 사용자 모델
    ├── movie/           # 영화 모델
    ├── registration/    # 회원가입/온보딩
    └── recommendation/  # 영화 추천
```
