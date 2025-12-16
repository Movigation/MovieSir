# backend/main.py
from dotenv import load_dotenv

# 환경변수 로드 (.env) - 모든 import 전에 먼저 로드해야 함
load_dotenv()

from fastapi import FastAPI

# 모든 모델 로드 (SQLAlchemy relationship 해결을 위해 필요)
import backend.domains  # noqa: F401

from backend.domains.registration.router import router as registration_router
from backend.domains.recommendation.router import router as recommendation_router

app = FastAPI()

# 라우터 등록
app.include_router(registration_router)
app.include_router(recommendation_router)


@app.get("/")
def root():
    return {"message": "ok"}
