# backend/main.py
# deploy trigger: 2026-01-13
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

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # 로컬 개발
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # copy 프론트엔드
        "http://localhost:3001",  # copy2 프론트엔드
        # 프로덕션
        "https://moviesir.cloud",
        "https://demo.moviesir.cloud",
        "https://console.moviesir.cloud",
    ],
    allow_credentials=True,
    allow_methods=["*"],  # 모든 HTTP 메서드 허용
    allow_headers=["*"],  # 모든 헤더 허용
)

# 라우터 등록
app.include_router(auth_router)
app.include_router(registration_router)
app.include_router(onboarding_router)
app.include_router(recommendation_router)
app.include_router(mypage_router)
app.include_router(b2b_router)


@app.get("/")
def root():
    return {"message": "ok"}
