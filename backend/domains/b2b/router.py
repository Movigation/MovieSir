"""
B2B 도메인 API 라우터
- /b2b/* 엔드포인트
- 2025.01.15: 플랜 기반 일일 한도 동적 적용, API 키 삭제 기능 추가
"""
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.core.db import get_db
from .schemas import (
    CompanyRegister, CompanyLogin, TokenResponse,
    ApiKeyCreate, ApiKeyResponse, UpdateApiKeyRequest,
    DashboardResponse, LogEntry, LogsResponse, OAuthCallback,
    ChangePasswordRequest, ForgotPasswordRequest, UpdateCompanyRequest,
    B2CUserResponse, B2CUserDetailResponse, B2CUsersListResponse, B2CStatsResponse,
    B2CUserActivitiesResponse, B2CLiveActivitiesResponse, SessionMoviesResponse,
    UnifiedLiveFeedResponse
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


@router.post("/auth/google/callback", response_model=TokenResponse)
async def google_callback(
    data: OAuthCallback,
    db: Session = Depends(get_db)
):
    """
    Google OAuth 콜백
    - code: Google로부터 받은 인증 코드
    """
    try:
        redirect_uri = data.redirect_uri or "https://console.moviesir.cloud/auth/google/callback"
        company, token = await service.google_oauth_callback(db, data.code, redirect_uri)
        return TokenResponse(
            access_token=token,
            company=service.company_to_response(company)
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/auth/github/callback", response_model=TokenResponse)
async def github_callback(
    data: OAuthCallback,
    db: Session = Depends(get_db)
):
    """
    GitHub OAuth 콜백
    - code: GitHub로부터 받은 인증 코드
    """
    try:
        redirect_uri = data.redirect_uri or "https://console.moviesir.cloud/auth/github/callback"
        company, token = await service.github_oauth_callback(db, data.code, redirect_uri)
        return TokenResponse(
            access_token=token,
            company=service.company_to_response(company)
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/auth/change-password")
def change_password(
    data: ChangePasswordRequest,
    company=Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    비밀번호 변경
    - current_password: 현재 비밀번호
    - new_password: 새 비밀번호 (8자 이상)
    """
    try:
        service.change_password(
            db,
            company.company_id,
            data.current_password,
            data.new_password
        )
        return {"success": True, "message": "비밀번호가 변경되었습니다"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/auth/forgot-password")
def forgot_password(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    비밀번호 찾기 - 임시 비밀번호 발급
    - email: 가입한 이메일

    등록된 이메일로 임시 비밀번호를 발송합니다.
    보안상 이메일 존재 여부와 관계없이 동일한 응답을 반환합니다.
    """
    try:
        service.forgot_password(db, data.email)
        return {
            "success": True,
            "message": "등록된 이메일로 임시 비밀번호를 발송했습니다."
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==================== API Key Endpoints ====================

@router.get("/api-keys", response_model=List[ApiKeyResponse])
def list_api_keys(
    company=Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    API 키 목록 조회
    - daily_limit은 회사 플랜 기준으로 반환
    """
    api_keys = service.get_api_keys(db, company.company_id)
    # 플랜 기준 일일 한도 적용
    plan_limit = service.PLAN_LIMITS.get(company.plan_type, 1000)
    result = []
    for k in api_keys:
        k.daily_limit = plan_limit  # 플랜 기준 한도로 설정
        result.append(service.api_key_to_response(k))
    return result


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
        # 플랜 기준 일일 한도 적용
        plan_limit = service.PLAN_LIMITS.get(company.plan_type, 1000)
        api_key.daily_limit = plan_limit
        return service.api_key_to_response(api_key, raw_key)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/api-keys/{key_id}/deactivate")
def deactivate_api_key(
    key_id: int,
    company=Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    API 키 비활성화 (소프트 삭제)
    """
    success = service.deactivate_api_key(db, company.company_id, key_id)
    if not success:
        raise HTTPException(status_code=404, detail="API 키를 찾을 수 없습니다")
    return {"success": True, "message": "API 키가 비활성화되었습니다"}


@router.patch("/api-keys/{key_id}/activate")
def activate_api_key(
    key_id: int,
    company=Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    API 키 활성화
    """
    success = service.activate_api_key(db, company.company_id, key_id)
    if not success:
        raise HTTPException(status_code=404, detail="API 키를 찾을 수 없습니다")
    return {"success": True, "message": "API 키가 활성화되었습니다"}


@router.delete("/api-keys/{key_id}")
def delete_api_key(
    key_id: int,
    company=Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    API 키 완전 삭제
    """
    success = service.delete_api_key(db, company.company_id, key_id)
    if not success:
        raise HTTPException(status_code=404, detail="API 키를 찾을 수 없습니다")
    return {"success": True, "message": "API 키가 삭제되었습니다"}


@router.patch("/api-keys/{key_id}")
def update_api_key(
    key_id: int,
    data: UpdateApiKeyRequest,
    company=Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    API 키 이름 수정
    - name: 새로운 키 이름
    """
    api_key = service.update_api_key(db, company.company_id, key_id, data.name)
    if not api_key:
        raise HTTPException(status_code=404, detail="API 키를 찾을 수 없습니다")
    # 플랜 기준 일일 한도 적용
    plan_limit = service.PLAN_LIMITS.get(company.plan_type, 1000)
    api_key.daily_limit = plan_limit
    return {
        "success": True,
        "message": "API 키 이름이 수정되었습니다",
        "api_key": service.api_key_to_response(api_key)
    }


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

@router.get("/logs", response_model=LogsResponse)
def get_logs(
    limit: int = Query(default=50, le=200, description="조회할 로그 수"),
    offset: int = Query(default=0, ge=0, description="건너뛸 로그 수"),
    start_date: Optional[str] = Query(default=None, description="시작 날짜 (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(default=None, description="종료 날짜 (YYYY-MM-DD)"),
    company=Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    API 로그 조회 (페이지네이션 및 날짜 필터 지원)
    - limit: 조회할 로그 수 (최대 200)
    - offset: 건너뛸 로그 수 (페이지네이션)
    - start_date: 시작 날짜 (YYYY-MM-DD, KST 기준)
    - end_date: 종료 날짜 (YYYY-MM-DD, KST 기준)
    """
    from datetime import datetime

    parsed_start = None
    parsed_end = None

    if start_date:
        try:
            parsed_start = datetime.strptime(start_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="start_date 형식이 올바르지 않습니다 (YYYY-MM-DD)")

    if end_date:
        try:
            parsed_end = datetime.strptime(end_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="end_date 형식이 올바르지 않습니다 (YYYY-MM-DD)")

    return service.get_recent_logs(
        db,
        company.company_id,
        limit=limit,
        offset=offset,
        start_date=parsed_start,
        end_date=parsed_end
    )


# ==================== Usage Endpoints ====================

@router.get("/usage")
def get_usage(
    period: str = Query(default="7d", description="조회 기간 (7d 또는 30d)"),
    company=Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    API 사용량 조회
    - period: 7d (7일) 또는 30d (30일)
    """
    days = 30 if period == "30d" else 7
    return service.get_usage_data(db, company.company_id, days)


@router.get("/usage/endpoints")
def get_endpoint_stats(
    period: str = Query(default="7d", description="조회 기간 (7d 또는 30d)"),
    company=Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    엔드포인트별 호출 통계
    - period: 7d (7일) 또는 30d (30일)
    """
    days = 30 if period == "30d" else 7
    return service.get_endpoint_stats(db, company.company_id, days)


@router.get("/usage/response-time")
def get_response_time_stats(
    period: str = Query(default="7d", description="조회 기간 (7d 또는 30d)"),
    company=Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    응답 시간 통계 (avg, p50, p95, p99)
    - period: 7d (7일) 또는 30d (30일)
    """
    days = 30 if period == "30d" else 7
    return service.get_response_time_stats(db, company.company_id, days)


# ==================== Company Info Endpoints ====================

@router.get("/me")
def get_company_info(
    company=Depends(get_current_company),
):
    """
    현재 로그인된 회사 정보 조회
    """
    return service.company_to_response(company)


@router.patch("/me")
def update_company_info(
    data: UpdateCompanyRequest,
    company=Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    회사 정보 수정
    - name: 회사명 (선택)
    - email: 이메일 (선택, OAuth 사용자는 변경 불가)
    """
    try:
        updated = service.update_company(
            db,
            company.company_id,
            name=data.name,
            email=data.email
        )
        return {
            "success": True,
            "message": "회사 정보가 수정되었습니다",
            "company": service.company_to_response(updated)
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/me")
def delete_company(
    company=Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    회사 계정 영구 삭제
    - 모든 API 키, 로그, 설정이 영구 삭제됩니다
    """
    try:
        service.delete_company(db, company.company_id)
        return {"success": True, "message": "계정이 삭제되었습니다"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==================== B2C Admin Endpoints ====================

async def get_admin_company(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
):
    """어드민 권한 체크 (is_admin=True인 회사만)"""
    company = await get_current_company(credentials, db)
    if not company.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    return company


@router.get("/admin/b2c-users", response_model=B2CUsersListResponse)
def list_b2c_users(
    page: int = Query(default=1, ge=1, description="페이지 번호"),
    page_size: int = Query(default=20, ge=1, le=100, description="페이지 크기"),
    search: Optional[str] = Query(default=None, description="검색어 (이메일/닉네임)"),
    company=Depends(get_admin_company),
    db: Session = Depends(get_db)
):
    """
    [어드민] B2C 사용자 목록 조회
    - page: 페이지 번호
    - page_size: 페이지 크기 (최대 100)
    - search: 검색어 (이메일 또는 닉네임)
    """
    return service.get_b2c_users(db, page, page_size, search)


@router.get("/admin/b2c-users/{user_id}", response_model=B2CUserDetailResponse)
def get_b2c_user(
    user_id: str,
    company=Depends(get_admin_company),
    db: Session = Depends(get_db)
):
    """
    [어드민] B2C 사용자 상세 정보 조회
    """
    user = service.get_b2c_user_detail(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    return user


@router.get("/admin/b2c-stats", response_model=B2CStatsResponse)
def get_b2c_stats(
    company=Depends(get_admin_company),
    db: Session = Depends(get_db)
):
    """
    [어드민] B2C 통계 조회
    - 총 사용자, 활성 사용자, 탈퇴 사용자
    - 이메일 인증 완료, 온보딩 완료
    - 오늘/주간/월간 가입자
    """
    return service.get_b2c_stats(db)


@router.patch("/admin/b2c-users/{user_id}/deactivate")
def deactivate_b2c_user(
    user_id: str,
    company=Depends(get_admin_company),
    db: Session = Depends(get_db)
):
    """
    [어드민] B2C 사용자 비활성화 (소프트 삭제)
    """
    success = service.deactivate_b2c_user(db, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    return {"success": True, "message": "사용자가 비활성화되었습니다"}


@router.patch("/admin/b2c-users/{user_id}/activate")
def activate_b2c_user(
    user_id: str,
    company=Depends(get_admin_company),
    db: Session = Depends(get_db)
):
    """
    [어드민] B2C 사용자 활성화
    """
    success = service.activate_b2c_user(db, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    return {"success": True, "message": "사용자가 활성화되었습니다"}


@router.get("/admin/b2c-users/{user_id}/activities", response_model=B2CUserActivitiesResponse)
def get_b2c_user_activities(
    user_id: str,
    limit: int = Query(default=20, ge=1, le=100),
    company=Depends(get_admin_company),
    db: Session = Depends(get_db)
):
    """
    [어드민] B2C 사용자 최근 활동 조회
    - 추천 요청, OTT 클릭, 만족도 응답 등
    """
    return service.get_b2c_user_activities(db, user_id, limit)


@router.get("/admin/b2c-live", response_model=B2CLiveActivitiesResponse)
def get_b2c_live_activities(
    limit: int = Query(default=15, ge=1, le=50),
    company=Depends(get_admin_company),
    db: Session = Depends(get_db)
):
    """
    [어드민] B2C 전체 유저 실시간 활동 피드
    - 대시보드에서 Live Logs처럼 실시간 모니터링용
    """
    return service.get_b2c_live_activities(db, limit)


@router.get("/live-feed", response_model=UnifiedLiveFeedResponse)
def get_unified_live_feed(
    limit: int = Query(default=20, ge=1, le=50),
    company=Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    통합 실시간 피드 (API 로그 + B2C 활동)
    - 어드민: API 로그 + B2C 활동 혼합
    - 일반: API 로그만
    - 모든 시간은 KST로 변환되어 반환
    """
    return service.get_unified_live_feed(db, company.company_id, limit)


@router.get("/admin/sessions/{session_id}/movies", response_model=SessionMoviesResponse)
def get_session_movies(
    session_id: int,
    company=Depends(get_admin_company),
    db: Session = Depends(get_db)
):
    """
    [어드민] 추천 세션의 영화 목록 조회
    - Live Feed에서 영화 클릭 시 상세 정보 표시용
    """
    result = service.get_session_movies(db, session_id)
    if not result:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다")
    return result
