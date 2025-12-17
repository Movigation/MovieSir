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

app = FastAPI()

# ========================================
# CORS 설정 - 프론트엔드에서 API 호출 허용
# ========================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite 개발 서버
        "http://localhost:3000",  # 다른 프론트엔드 포트
    ],
    allow_credentials=True,  # 쿠키, 인증 헤더 등 허용
    allow_methods=["*"],     # 모든 HTTP 메서드 허용 (GET, POST, PUT, DELETE 등)
    allow_headers=["*"],     # 모든 헤더 허용
)

# 라우터 등록
app.include_router(auth_router)
app.include_router(registration_router)
app.include_router(onboarding_router)
app.include_router(recommendation_router)


@app.get("/")
def root():
    return {"message": "ok"}
