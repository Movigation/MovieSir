"""
B2B 인증 의존성 모듈
- JWT 인증 (Console 사용자용)
- API Key 인증 (External API용)
"""
import hashlib
from fastapi import Depends, HTTPException, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import jwt, JWTError
import os

from backend.core.db import get_db
from backend.core.rate_limit import check_rate_limit
from .models import Company, ApiKey

# JWT 설정
B2B_JWT_SECRET = os.getenv("B2B_JWT_SECRET_KEY", "b2b-dev-secret-key")
JWT_ALGORITHM = "HS256"

security = HTTPBearer()


# ==================== Console 인증 (JWT) ====================

async def get_current_company(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Company:
    """
    B2B Console JWT 인증

    - Authorization: Bearer <token>
    - Console 로그인 사용자용
    """
    try:
        payload = jwt.decode(
            credentials.credentials,
            B2B_JWT_SECRET,
            algorithms=[JWT_ALGORITHM]
        )
        company_id = payload.get("sub")
        if not company_id:
            raise HTTPException(401, "Invalid token: missing subject")
    except JWTError as e:
        raise HTTPException(401, f"Invalid token: {str(e)}")

    company = db.query(Company).filter(Company.company_id == int(company_id)).first()
    if not company:
        raise HTTPException(401, "Company not found")

    if not company.is_active:
        raise HTTPException(403, "Company account is deactivated")

    return company


# 플랜별 일일 한도
PLAN_LIMITS = {
    "BASIC": 1000,
    "PRO": 10000,
    "ENTERPRISE": 100000,
}


# ==================== External API 인증 (API Key) ====================

async def verify_api_key(
    x_api_key: str = Header(..., alias="X-API-Key"),
    db: Session = Depends(get_db)
) -> ApiKey:
    """
    External API Key 인증

    - Header: X-API-Key: sk-moviesir-xxxx
    - Rate Limit 체크 포함
    - 일일 한도는 회사 플랜 기준으로 동적 적용
    """
    # API 키 해시
    hashed_key = hashlib.sha256(x_api_key.encode()).hexdigest()

    api_key = db.query(ApiKey).filter(
        ApiKey.access_key == hashed_key,
        ApiKey.is_active == True
    ).first()

    if not api_key:
        raise HTTPException(
            status_code=401,
            detail={
                "code": "INVALID_API_KEY",
                "message": "Invalid or inactive API Key"
            }
        )

    # 회사 플랜 기준 일일 한도 (동적 적용)
    company = db.query(Company).filter(Company.company_id == api_key.company_id).first()
    daily_limit = PLAN_LIMITS.get(company.plan_type, 1000) if company else api_key.daily_limit

    # Rate Limit 체크
    if not await check_rate_limit(str(api_key.key_id), daily_limit):
        raise HTTPException(
            status_code=429,
            detail={
                "code": "RATE_LIMIT_EXCEEDED",
                "message": f"Daily limit ({daily_limit}) exceeded",
                "limit": daily_limit
            }
        )

    # API 키에 동적 한도 설정 (응답용)
    api_key.daily_limit = daily_limit

    return api_key
