<div align="center">
<img src="./docs/moviesir_header.png" alt="MovieSir Header" width="100%" />

[무비서 소개](https://moviesir.cloud) | [무비서 B2C](https://demo.moviesir.cloud) | [무비서 B2B API](https://api.moviesir.cloud) | [무비서 Console](https://console.moviesir.cloud)

</div>

---

## 프로젝트 소개

### 배경

전 세계 소비자는 시청할 콘텐츠를 검색하는 데 **평균 14분**을 소비합니다.

| 지표                             | 수치 |
| -------------------------------- | ---- |
| 콘텐츠 검색 실패 시 시청 포기율  | 19%  |
| 18~24세 시청 포기율              | 29%  |
| 검색 어려움으로 서비스 취소 의향 | 49%  |

<br/>

### 무비서의 해결책

**무비서(MovieSir)** 는 이 문제를 해결합니다.

| 기존 문제                   | 무비서 솔루션                            |
| --------------------------- | ---------------------------------------- |
| "이 영화 어때요?" 단순 추천 | 이동 시간 입력 → **최적 영화 조합** 추천 |
| 내 시간에 맞는지 알 수 없음 | AI 기반 개인화 + 다양성 동시 제공        |
| 여러 영화 조합이 불편함     | OTT 플랫폼별 필터링 지원                 |

<br/>

### 타겟 사용자

| 대상           | 상황                               |
| -------------- | ---------------------------------- |
| 비행기 탑승객  | 장거리 국제선 비행 중 영화 감상    |
| KTX/SRT 이용자 | 2-3시간 이동 시간 활용             |
| 버스 여행자    | 장거리 버스 이동 중 콘텐츠 소비    |
| 일반 사용자    | 제한된 시간 내 최적 영화 조합 탐색 |

<table>
  <tr>
    <td width="50%" align="center" valign="bottom">
      <img src="./docs/landing_screenshot.png" alt="MovieSir Landing" width="100%"/>
      <br/><sub><b>무비서 소개</b></sub>
    </td>
    <td width="50%" align="center" valign="bottom">
      <img src="./docs/demo_screenshot.png" alt="MovieSir Demo" width="100%"/>
      <br/><sub><b>무비서 B2C</b></sub>
    </td>
  </tr>
</table>

<br/>

---

## 주요 기능

| 기능                   | 설명                                                        |
| ---------------------- | ----------------------------------------------------------- |
| **시간 맞춤 추천**     | 이동 시간을 입력하면 러닝타임 합이 딱 맞는 영화 조합을 추천 |
| **AI 하이브리드 추천** | SBERT + ALS 2-Track 추천 시스템으로 정확도와 다양성 확보    |
| **OTT 필터링**         | 구독 중인 OTT 플랫폼에서 바로 볼 수 있는 영화만 추천        |
| **온보딩 시스템**      | 초기 영화 취향 설문으로 개인화된 추천 제공                  |

<br/>

### 2-Track 추천 시스템

|    Track    |    목적     |    알고리즘 비율    | 설명                       |
| :---------: | :---------: | :-----------------: | -------------------------- |
| **Track A** |  맞춤 추천  | SBERT 70% + ALS 30% | 선호 장르 기반 개인화 추천 |
| **Track B** | 다양성 추천 | SBERT 40% + ALS 60% | 새로운 장르 탐색 유도      |

<br/>

---

## 무비서 B2B API

<div align="center">
  <img src="./docs/moviesir_api_header.png" alt="MovieSir API" width="100%"/>
</div>

<br/>

> **개인 서비스(B2C)를 넘어 항공사 솔루션(B2B)으로**

출발부터 도착까지, 낭비 없는 완벽한 이동 경험을 제공합니다.<br />
항공사, OTT 플랫폼 등 기업 고객을 위한 AI 영화 추천 API입니다.

### API 엔드포인트

| 메서드 | 경로                   | 설명             |
| ------ | ---------------------- | ---------------- |
| POST   | `/v1/recommend`        | 영화 조합 추천   |
| POST   | `/v1/recommend_single` | 개별 영화 재추천 |

**인증 방식**: `X-API-Key` 헤더

<br/>

### 사용 예시

```bash
curl -X POST "https://api.moviesir.cloud/v1/recommend" \
  -H "X-API-Key: sk-moviesir-your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"genres": ["액션"], "runtime_limit": 180}'
```

<table>
  <tr>
    <td width="50%" align="center" valign="bottom">
      <img src="./docs/api_screenshot.png" alt="MovieSir API Page" width="100%"/>
      <br/><sub><b>API 소개</b></sub>
    </td>
    <td width="50%" align="center" valign="bottom">
      <img src="./docs/api_docs_screenshot.png" alt="MovieSir API Docs" width="100%"/>
      <br/><sub><b>API 문서</b></sub>
    </td>
  </tr>
</table>

<br/>

---

## 무비서 Console

<div align="center">
  <img src="./docs/moviesir_console_header.png" alt="MovieSir Console" width="100%"/>
</div>

<br/>

> **한눈에 볼 수 있는 API 사용량**

API 키 관리 및 사용량 모니터링 대시보드입니다.<br/>
기업 고객이 API 사용 현황을 실시간으로 확인하고 관리할 수 있습니다.

### 주요 기능

| 기능            | 설명                        |
| --------------- | --------------------------- |
| **대시보드**    | 일별/월별 API 호출량 시각화 |
| **API 키 관리** | 키 발급, 비활성화, 삭제     |
| **사용량 분석** | 실시간 로그, 응답 시간 통계 |
| **Playground**  | API 테스트 환경             |

<table>
  <tr>
    <td width="75%" align="center" valign="bottom">
      <img src="./docs/console-dashboard.png" alt="MovieSir Console Dashboard" width="100%"/>
      <br/><sub><b>대시보드</b> - API 사용량 및 통계 시각화</sub>
    </td>
    <td width="25%" align="center" valign="bottom">
      <img src="./docs/pwa-mobile.png" alt="MovieSir PWA Mobile" width="100%"/>
      <br/><sub><b>PWA</b> - 모바일 앱 지원</sub>
    </td>
  </tr>
</table>

<br/>

---

## 시스템 아키텍처

<div align="center">
  <img src="./docs/moviesir_infra.png" alt="MovieSir Infrastructure" width="100%"/>
</div>

<br/>

### 인프라 구성

| 서버           | 스펙                     | 구성                    | 역할                         |
| -------------- | ------------------------ | ----------------------- | ---------------------------- |
| **App Server** | t1i.xlarge (4vCPU, 16GB) | Nginx + FastAPI + Redis | 웹 서버, API 처리, 세션 관리 |
| **GPU Server** | gn1i.xlarge (Tesla T4)   | PostgreSQL + AI Service | 데이터베이스, 추천 엔진      |

<br/>

### 네트워크 구성

| 구분               | 대역         | 용도                   |
| ------------------ | ------------ | ---------------------- |
| **VPC**            | 10.0.0.0/16  | 전체 네트워크          |
| **Public Subnet**  | 10.0.0.0/20  | App Server (외부 접근) |
| **Private Subnet** | 10.0.32.0/20 | GPU Server (내부 전용) |

<br/>

### 보안 구성

| 항목           | 설정                                               |
| -------------- | -------------------------------------------------- |
| **SSH 접근**   | App Server를 Bastion Host로 사용, 비표준 포트 적용 |
| **GPU Server** | Private Subnet 배치, Public IP 미부여              |
| **보안그룹**   | 서비스별 최소 포트만 허용 (443, 8000, 8001)        |
| **CI/CD**      | GitHub Actions + SSH 키 기반 자동 배포             |

**클라우드**: Kakao Cloud VPC 환경에서 운영

<br/>

---

## 시작하기

### 사전 요구사항

| 항목                    | 버전       |
| ----------------------- | ---------- |
| Node.js                 | 18+        |
| Python                  | 3.11+      |
| Docker & Docker Compose | Latest     |
| PostgreSQL              | 16         |
| GPU (AI Server)         | CUDA 11.8+ |

<br/>

### 1. 레포지토리 클론

```bash
git clone https://github.com/Movigation/MovieSir.git
cd MovieSir
```

### 2. 환경변수 설정

```bash
cp .env.example .env.local
# .env.local 파일을 열어 필요한 값 수정
```

### 3. 데이터베이스 설정

[Google Drive](https://drive.google.com/drive/folders/1VSZ0MTOxFel2ynp-Gm57pEpDkZxwucPK)에서 다운로드

| 환경       | 파일                                         |
| ---------- | -------------------------------------------- |
| Production | `mvdb.sql`, `mvdb_b2b.sql`                   |
| Local      | `00_mvdb_local.sql`, `zz_local_testdata.sql` |

```bash
mv *.sql database/init/
```

### 4. AI 모델 설정

[Google Drive](https://drive.google.com/drive/folders/1C1gfUiADjeNnNFeey8iC7Jx_npIJd8TT)에서 `als_user_factors.npy` 제외한 모든 파일 다운로드

```bash
mv als_*.pkl als_*.npy ai/training/als_data/
```

### 5. Docker로 실행

```bash
# Production
docker compose --env-file .env.production up -d --build

# GPU Server (AI)
docker compose -f docker-compose.gpu.yml up -d --build
```

<br/>

### 로컬 개발

```bash
# B2C Frontend (Terminal 1)
cd frontend && npm install && npm run dev

# B2B Console (Terminal 2)
cd frontend-console && npm install && npm run dev

# Backend (Terminal 3)
cd backend && pip install -r requirements.txt && uvicorn main:app --reload

# AI Server (Terminal 4 - GPU Required)
cd ai && pip install -r requirements.txt && uvicorn api:app --reload --port 8001
```

<br/>

---

## 프로젝트 구조

```
MovieSir/
│
├── frontend/                    # B2C Demo App (React + Vite)
│   ├── src/
│   │   ├── api/                 # API 클라이언트
│   │   ├── components/          # 재사용 컴포넌트
│   │   ├── pages/               # 페이지 컴포넌트
│   │   └── store/               # Zustand 상태관리
│   └── package.json
│
├── frontend-console/            # B2B Console (React + Vite)
│   ├── src/
│   │   ├── api/                 # API 클라이언트
│   │   ├── pages/               # Dashboard, ApiKeys, Playground 등
│   │   └── stores/              # Zustand 상태관리
│   └── package.json
│
├── backend/                     # FastAPI + SQLAlchemy
│   ├── domains/
│   │   ├── auth/                # 인증 (JWT)
│   │   ├── b2b/                 # B2B API (External API, Console)
│   │   ├── registration/        # 회원가입
│   │   ├── onboarding/          # 온보딩 플로우
│   │   ├── recommendation/      # 추천 API
│   │   ├── mypage/              # 마이페이지
│   │   ├── user/                # 사용자 관리
│   │   └── movie/               # 영화 데이터
│   ├── core/                    # DB, Rate Limit 설정
│   └── requirements.txt
│
├── ai/                          # SBERT + ALS 추천 엔진
│   ├── api.py                   # FastAPI 서버
│   ├── inference/
│   │   └── recommendation_model.py  # 하이브리드 추천 로직
│   └── training/                # 모델 & 학습 데이터
│
├── database/                    # PostgreSQL + pgvector
│   └── init/                    # 초기화 SQL
│
├── nginx/                       # Nginx 설정
├── scripts/                     # 유틸리티 스크립트
├── .github/workflows/           # CI/CD (GitHub Actions)
├── docker-compose.yml           # Production 설정
├── docker-compose.local.yml     # 로컬 개발용
└── docker-compose.gpu.yml       # GPU 서버 설정
```

<br/>

---

<div align="center">

## 기술 스택

[![React](https://img.shields.io/badge/react-18.x-61DAFB?style=flat&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-5.x-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/vite-5.x-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/tailwindcss-3.x-06B6D4?style=flat&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![FastAPI](https://img.shields.io/badge/fastapi-0.100+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/python-3.11-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-16-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/redis-7-DC382D?style=flat&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/docker-latest-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![Nginx](https://img.shields.io/badge/nginx-latest-009639?style=flat&logo=nginx&logoColor=white)](https://nginx.org/)
[![GitHub Actions](https://img.shields.io/badge/github_actions-CI/CD-2088FF?style=flat&logo=githubactions&logoColor=white)](https://github.com/features/actions)
[![Kakao Cloud](https://img.shields.io/badge/kakao_cloud-FFCD00?style=flat&logo=kakao&logoColor=black)](https://cloud.kakao.com/)

<br/>

## 만든 사람들

<table>
  <tr>
    <td align="center"><a href="https://github.com/qkqqkqkq"><img src="https://github.com/qkqqkqkq.png" width="100px;" alt=""/><br /><sub><b>문수현</b></sub></a><br/><sub>PM/Database</sub></td>
    <td align="center"><a href="https://github.com/Dieod1598741"><img src="https://github.com/Dieod1598741.png" width="100px;" alt=""/><br /><sub><b>한대연</b></sub></a><br/><sub>Frontend</sub></td>
    <td align="center"><a href="https://github.com/tinytinalee"><img src="https://github.com/tinytinalee.png" width="100px;" alt=""/><br /><sub><b>이승원</b></sub></a><br/><sub>Backend</sub></td>
    <td align="center"><a href="https://github.com/wldn7601"><img src="https://github.com/wldn7601.png" width="100px;" alt=""/><br /><sub><b>박지우</b></sub></a><br/><sub>AI/ML</sub></td>
    <td align="center"><a href="https://github.com/leelaeloo"><img src="https://github.com/leelaeloo.png" width="100px;" alt=""/><br /><sub><b>이태수</b></sub></a><br/><sub>Infra/DevOps</sub></td>
  </tr>
</table>

</div>

<br/>

---

<div align="center">
<img src="./docs/moviesir_footer.png" alt="MovieSir Footer" width="100%" />
</div>
