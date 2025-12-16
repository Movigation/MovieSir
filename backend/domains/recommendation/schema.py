# backend/domains/recommendation/schema.py

from pydantic import BaseModel
from typing import List, Optional

class RecommendationRequest(BaseModel):
    runtime_limit: int = 120
    genres: List[str] = []
    exclude_adult: bool = True

class ClickLogRequest(BaseModel):
    provider_id: int