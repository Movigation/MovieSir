"""
B2B 도메인 API 라우터
- /b2b/* 엔드포인트
"""
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.core.db import get_db
from .schemas import (
    CompanyRegister, CompanyLogin, TokenResponse,
    ApiKeyCreate, ApiKeyResponse,
    DashboardResponse, LogEntry
)
from . import service

router = APIRouter(prefix="/b2b", tags=["B2B Console"])
security = HTTPBearer(auto_error=False)


# ==================== Dependencies ====================

async def get_current_company(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
):
    """현재 로그인된 회사 정보 조회"""
    if not credentials:
        raise HTTPException(status_code=401, detail="인증이 필요합니다")

    token = credentials.credentials
    company_id = service.decode_access_token(token)

    if not company_id:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")

    company = service.get_company_by_id(db, company_id)
    if not company:
        raise HTTPException(status_code=401, detail="회사를 찾을 수 없습니다")

    if not company.is_active:
        raise HTTPException(status_code=403, detail="비활성화된 계정입니다")

    return company


# ==================== Auth Endpoints ====================

@router.post("/auth/register", response_model=TokenResponse)
def register(
    data: CompanyRegister,
    db: Session = Depends(get_db)
):
    """
    기업 회원가입
    - name: 회사명
    - email: 이메일
    - password: 비밀번호 (8자 이상)
    """
    try:
        company, token = service.register_company(db, data)
        return TokenResponse(
            access_token=token,
            company=service.company_to_response(company)
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/auth/login", response_model=TokenResponse)
def login(
    data: CompanyLogin,
    db: Session = Depends(get_db)
):
    """
    기업 로그인
    - email: 이메일
    - password: 비밀번호
    """
    try:
        company, token = service.login_company(db, data.email, data.password)
        return TokenResponse(
            access_token=token,
            company=service.company_to_response(company)
        )
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


# ==================== API Key Endpoints ====================

@router.get("/api-keys", response_model=List[ApiKeyResponse])
def list_api_keys(
    company=Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    API 키 목록 조회
    """
    api_keys = service.get_api_keys(db, company.company_id)
    return [service.api_key_to_response(k) for k in api_keys]


@router.post("/api-keys", response_model=ApiKeyResponse)
def create_api_key(
    data: ApiKeyCreate,
    company=Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    새 API 키 발급
    - name: 키 이름 (예: Production, Development)

    주의: 발급 시에만 원본 키가 표시됩니다. 이후에는 마스킹됩니다.
    """
    try:
        api_key, raw_key = service.create_api_key(db, company.company_id, data)
        return service.api_key_to_response(api_key, raw_key)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/api-keys/{key_id}")
def deactivate_api_key(
    key_id: int,
    company=Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    API 키 비활성화
    """
    success = service.deactivate_api_key(db, company.company_id, key_id)
    if not success:
        raise HTTPException(status_code=404, detail="API 키를 찾을 수 없습니다")
    return {"success": True, "message": "API 키가 비활성화되었습니다"}


# ==================== Dashboard Endpoints ====================

@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(
    company=Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    대시보드 데이터 조회
    - today: 오늘 호출 수
    - total: 총 호출 수
    - daily_limit: 일일 한도
    - plan: 요금제
    - chart_data: 최근 7일 차트 데이터
    """
    try:
        return service.get_dashboard_data(db, company.company_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==================== Logs Endpoints ====================

@router.get("/logs", response_model=List[LogEntry])
def get_logs(
    limit: int = Query(default=10, le=100, description="조회할 로그 수"),
    company=Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    최근 API 로그 조회
    - limit: 조회할 로그 수 (최대 100)
    """
    return service.get_recent_logs(db, company.company_id, limit)


# ==================== Company Info Endpoints ====================

@router.get("/me")
def get_company_info(
    company=Depends(get_current_company),
):
    """
    현재 로그인된 회사 정보 조회
    """
    return service.company_to_response(company)
