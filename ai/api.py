# AI Service API - GPU Server
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os

from inference.db_conn_movie_reco_v1 import HybridRecommender

app = FastAPI(title="MovieSir AI Service")

# 모델 로드 (서버 시작 시 한 번만)
recommender = None

@app.on_event("startup")
async def load_model():
    global recommender
    try:
        recommender = HybridRecommender(
            db_host=os.getenv("DATABASE_HOST", "localhost"),
            db_port=int(os.getenv("DATABASE_PORT", 5432)),
            db_name=os.getenv("DATABASE_NAME", "moviesir"),
            db_user=os.getenv("DATABASE_USER", "movigation"),
            db_password=os.getenv("DATABASE_PASSWORD", ""),
            lightgcn_data_path="training/lightgcn_data",
            lightgcn_model_path="training/lightgcn_model/best_model.pt"
        )
        print("✅ AI Model loaded successfully")
    except Exception as e:
        print(f"❌ Failed to load AI model: {e}")
        raise e

@app.get("/")
def health():
    return {"message": "ok", "service": "ai"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "model_loaded": recommender is not None}

class RecommendRequest(BaseModel):
    user_movie_ids: List[int]
    top_k: int = 50
    preferred_genres: Optional[List[str]] = None
    max_runtime: Optional[int] = None
    preferred_otts: Optional[List[str]] = None

class RecommendResponse(BaseModel):
    track_a: dict
    track_b: dict
    elapsed_time: float

@app.post("/recommend", response_model=RecommendResponse)
def recommend(request: RecommendRequest):
    if recommender is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        result = recommender.recommend(
            user_movie_ids=request.user_movie_ids,
            top_k=request.top_k,
            preferred_genres=request.preferred_genres,
            max_runtime=request.max_runtime,
            preferred_otts=request.preferred_otts
        )

        recommendations = result.get("recommendations", {})
        return RecommendResponse(
            track_a=recommendations.get("track_a", {}),
            track_b=recommendations.get("track_b", {}),
            elapsed_time=result.get("elapsed_time", 0)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
