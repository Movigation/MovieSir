# AI Service API - GPU Server
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Any
import os
import numpy as np

# [기존] LightGCN 기반 하이브리드 추천 (임시 사용)
# from inference.db_conn_movie_reco_v1 import HybridRecommender

# [신규] ALS 기반 하이브리드 추천 V2 (CPU 모델)
from inference.sbert_als_v1 import HybridRecommenderV2


def convert_numpy_types(obj: Any) -> Any:
    """numpy 타입을 Python 네이티브 타입으로 변환"""
    if isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {k: convert_numpy_types(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    return obj

app = FastAPI(title="MovieSir AI Service")

# 모델 로드 (서버 시작 시 한 번만)
recommender = None

@app.on_event("startup")
async def load_model():
    global recommender
    try:
        db_config = {
            'host': os.getenv("DATABASE_HOST", "localhost"),
            'port': int(os.getenv("DATABASE_PORT", 5432)),
            'database': os.getenv("DATABASE_NAME", "moviesir"),
            'user': os.getenv("DATABASE_USER", "movigation"),
            'password': os.getenv("DATABASE_PASSWORD", "")
        }
        # [기존] LightGCN 모델 (임시 사용)
        # recommender = HybridRecommender(
        #     db_config=db_config,
        #     lightgcn_model_path="training/lightgcn_model/best_model.pt",
        #     lightgcn_data_path="training/lightgcn_data"
        # )
        
        # [신규] ALS 모델 (CPU Version)
        recommender = HybridRecommenderV2(
            db_config=db_config,
            als_model_path="training/als_model/als_model_cpu_final.pkl",
            als_data_path="training/als_model/als_id_mappings_cpu.pkl",
            sbert_weight=0.7,
            als_weight=0.3
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
    available_time: int = 180
    top_k: int = 20
    preferred_genres: Optional[List[str]] = None
    preferred_otts: Optional[List[str]] = None
    allow_adult: bool = False

class RecommendResponse(BaseModel):
    track_a: dict
    track_b: dict
    elapsed_time: float

@app.post("/recommend", response_model=RecommendResponse)
def recommend(request: RecommendRequest):
    if recommender is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        recommendation_type, result = recommender.recommend(
            user_movie_ids=request.user_movie_ids,
            available_time=request.available_time,
            top_k=request.top_k,
            preferred_genres=request.preferred_genres,
            preferred_otts=request.preferred_otts,
            allow_adult=request.allow_adult
        )

        recommendations = result.get("recommendations", {})
        # numpy 타입을 Python 네이티브 타입으로 변환
        track_a = convert_numpy_types(recommendations.get("track_a", {}))
        track_b = convert_numpy_types(recommendations.get("track_b", {}))
        elapsed_time = float(result.get("elapsed_time", 0))

        return RecommendResponse(
            track_a=track_a,
            track_b=track_b,
            elapsed_time=elapsed_time
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
