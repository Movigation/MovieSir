# backend/main.py
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

import os

app = FastAPI()

# CORS 설정 (환경 변수에서 로드, 기본값은 로컬 호스트)
cors_origins_str = os.getenv(
    "CORS_ORIGINS", 
    "http://localhost:5173,http://localhost:3000,http://localhost:3001"
)
cors_origins = [origin.strip() for origin in cors_origins_str.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],  # 브라우저에서 접근 가능한 헤더
    max_age=3600,  # Preflight 요청 캐시 시간 (1시간)
)

# 라우터 등록
app.include_router(auth_router)
app.include_router(registration_router)
app.include_router(onboarding_router)
app.include_router(recommendation_router)


@app.get("/")
def root():
    return {"message": "ok"}
