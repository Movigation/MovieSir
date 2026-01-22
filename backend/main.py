# backend/main.py
# deploy trigger: 2025-01-21 v9 - nginx CORS 중복 헤더 제거
from dotenv import load_dotenv

# 환경변수 로드 (.env) - 모든 import 전에 먼저 로드해야 함
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 모든 모델 로드 (SQLAlchemy relationship 해결을 위해 필요)
import backend.domains  # noqa: F401

from backend.domains.auth.router import router as auth_router
from backend.domains.registration.router import router as registration_router
from backend.domains.onboarding.router import router as onboarding_router
from backend.domains.recommendation.router import router as recommendation_router
from backend.domains.mypage.router import router as mypage_router
from backend.domains.b2b.router import router as b2b_router
from backend.domains.b2b.external_router import router as external_router

app = FastAPI(
    title="MovieSir API",
    description="AI 기반 영화 추천 서비스 API",
    version="1.0.0",
    docs_url="/swagger",
    redoc_url="/redoc",
)

# CORS 설정 - 프로덕션 (모든 origin 허용, B2B API는 API Key로 인증)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # 와일드카드 사용 시 False 필수
    allow_methods=["*"],
    allow_headers=["*"],
)

# CORS 설정 - 로컬 개발 환경 (credentials 허용)
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=[
#         "http://localhost:5173",
#         "http://localhost:3000",
#         "http://127.0.0.1:5173",
#         "http://127.0.0.1:3000",
#     ],
#     allow_credentials=True,  # 로그인 쿠키/세션 허용
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# 라우터 등록
app.include_router(auth_router)
app.include_router(registration_router)
app.include_router(onboarding_router)
app.include_router(recommendation_router)
app.include_router(mypage_router)
app.include_router(b2b_router)
app.include_router(external_router)


@app.get("/")
def root():
    return {"message": "ok"}
