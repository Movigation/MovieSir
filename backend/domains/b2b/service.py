"""
B2B 도메인 서비스 레이어
- 비즈니스 로직 처리
"""
import os
import secrets
import hashlib
import httpx
from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from jose import jwt

from backend.utils.password import hash_password, verify_password

# OAuth 설정
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
from .models import Company, ApiKey, ApiLog, ApiUsage
from .schemas import (
    CompanyRegister, CompanyResponse, ApiKeyCreate, ApiKeyResponse,
    DashboardResponse, ChartDataPoint, LogEntry
)


# JWT 설정
B2B_JWT_SECRET = os.getenv("B2B_JWT_SECRET", os.getenv("JWT_SECRET_KEY", "b2b-dev-secret-key"))
B2B_JWT_ALGORITHM = "HS256"
B2B_JWT_EXPIRE_DAYS = 7

# 플랜별 일일 한도
PLAN_LIMITS = {
    "BASIC": 1000,
    "PRO": 10000,
    "ENTERPRISE": 100000,
}


# ==================== JWT ====================

def create_access_token(company_id: int) -> str:
    """JWT 액세스 토큰 생성"""
    expire = datetime.utcnow() + timedelta(days=B2B_JWT_EXPIRE_DAYS)
    payload = {
        "sub": str(company_id),
        "exp": expire,
        "type": "b2b_access"
    }
    return jwt.encode(payload, B2B_JWT_SECRET, algorithm=B2B_JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[int]:
    """JWT 토큰 디코딩"""
    try:
        payload = jwt.decode(token, B2B_JWT_SECRET, algorithms=[B2B_JWT_ALGORITHM])
        if payload.get("type") != "b2b_access":
            return None
        return int(payload.get("sub"))
    except Exception:
        return None


# ==================== API Key ====================

def generate_api_key() -> str:
    """sk-moviesir-xxxx 형식의 API 키 생성"""
    random_part = secrets.token_hex(24)  # 48자
    return f"sk-moviesir-{random_part}"


def hash_api_key(key: str) -> str:
    """API 키 SHA256 해시"""
    return hashlib.sha256(key.encode()).hexdigest()


# ==================== Auth Service ====================

def register_company(db: Session, data: CompanyRegister) -> Tuple[Company, str]:
    """기업 회원가입"""
    # 이메일 중복 체크
    existing = db.query(Company).filter(Company.manager_email == data.email).first()
    if existing:
        raise ValueError("이미 등록된 이메일입니다")

    # 회사 생성
    company = Company(
        name=data.name,
        manager_email=data.email,
        password_hash=hash_password(data.password),
        plan_type="BASIC",
        is_active=True,
    )
    db.add(company)
    db.commit()
    db.refresh(company)

    # 토큰 생성
    token = create_access_token(company.company_id)

    return company, token


def login_company(db: Session, email: str, password: str) -> Tuple[Company, str]:
    """기업 로그인"""
    company = db.query(Company).filter(Company.manager_email == email).first()

    if not company:
        raise ValueError("이메일 또는 비밀번호가 올바르지 않습니다")

    if not company.password_hash:
        raise ValueError("이메일 또는 비밀번호가 올바르지 않습니다")

    if not verify_password(password, company.password_hash):
        raise ValueError("이메일 또는 비밀번호가 올바르지 않습니다")

    if not company.is_active:
        raise ValueError("비활성화된 계정입니다. 관리자에게 문의하세요")

    # 토큰 생성
    token = create_access_token(company.company_id)

    return company, token


def get_company_by_id(db: Session, company_id: int) -> Optional[Company]:
    """회사 ID로 조회"""
    return db.query(Company).filter(Company.company_id == company_id).first()


def company_to_response(company: Company) -> CompanyResponse:
    """Company 모델을 응답 스키마로 변환"""
    return CompanyResponse(
        id=str(company.company_id),
        name=company.name,
        email=company.manager_email,
        plan=company.plan_type,
    )


# ==================== API Key Service ====================

def create_api_key(db: Session, company_id: int, data: ApiKeyCreate) -> Tuple[ApiKey, str]:
    """API 키 생성"""
    company = db.query(Company).filter(Company.company_id == company_id).first()
    if not company:
        raise ValueError("회사를 찾을 수 없습니다")

    # 원본 키 생성
    raw_key = generate_api_key()
    hashed_key = hash_api_key(raw_key)

    # 플랜별 일일 한도
    daily_limit = PLAN_LIMITS.get(company.plan_type, 1000)

    api_key = ApiKey(
        company_id=company_id,
        access_key=hashed_key,
        key_name=data.name,
        daily_limit=daily_limit,
        is_active=True,
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)

    return api_key, raw_key


def get_api_keys(db: Session, company_id: int) -> List[ApiKey]:
    """회사의 API 키 목록 조회"""
    return db.query(ApiKey).filter(ApiKey.company_id == company_id).order_by(ApiKey.created_at.desc()).all()


def deactivate_api_key(db: Session, company_id: int, key_id: int) -> bool:
    """API 키 비활성화"""
    api_key = db.query(ApiKey).filter(
        and_(ApiKey.key_id == key_id, ApiKey.company_id == company_id)
    ).first()

    if not api_key:
        return False

    api_key.is_active = False
    db.commit()
    return True


def api_key_to_response(api_key: ApiKey, raw_key: Optional[str] = None) -> ApiKeyResponse:
    """ApiKey 모델을 응답 스키마로 변환"""
    # raw_key가 없으면 마스킹된 키 반환
    display_key = raw_key if raw_key else f"sk-moviesir-{'*' * 20}...{api_key.access_key[-8:]}"

    return ApiKeyResponse(
        id=str(api_key.key_id),
        name=api_key.key_name or "",
        key=display_key,
        daily_limit=api_key.daily_limit,
        is_active=api_key.is_active,
        created_at=api_key.created_at,
    )


# ==================== Dashboard Service ====================

def get_dashboard_data(db: Session, company_id: int) -> DashboardResponse:
    """대시보드 데이터 조회"""
    company = db.query(Company).filter(Company.company_id == company_id).first()
    if not company:
        raise ValueError("회사를 찾을 수 없습니다")

    # 회사의 모든 API 키
    api_keys = db.query(ApiKey).filter(ApiKey.company_id == company_id).all()
    key_ids = [k.key_id for k in api_keys]

    today = datetime.utcnow().date()

    # 오늘 호출 수
    today_count = 0
    total_count = 0

    if key_ids:
        # 오늘 사용량
        today_usage = db.query(func.sum(ApiUsage.request_count)).filter(
            and_(
                ApiUsage.key_id.in_(key_ids),
                ApiUsage.usage_date == today
            )
        ).scalar()
        today_count = today_usage or 0

        # 총 사용량
        total_usage = db.query(func.sum(ApiUsage.request_count)).filter(
            ApiUsage.key_id.in_(key_ids)
        ).scalar()
        total_count = total_usage or 0

    # 최근 7일 차트 데이터
    chart_data = []
    for i in range(6, -1, -1):
        date = today - timedelta(days=i)
        date_str = date.strftime("%m/%d")

        if key_ids:
            # 해당 날짜 사용량
            usage = db.query(ApiUsage).filter(
                and_(
                    ApiUsage.key_id.in_(key_ids),
                    ApiUsage.usage_date == date
                )
            ).all()

            day_count = sum(u.request_count or 0 for u in usage)
            day_error = sum(u.error_count or 0 for u in usage)
            day_success = day_count - day_error
        else:
            day_count = 0
            day_success = 0
            day_error = 0

        chart_data.append(ChartDataPoint(
            date=date_str,
            count=day_count,
            success=day_success,
            error=day_error,
        ))

    # 플랜별 일일 한도
    daily_limit = PLAN_LIMITS.get(company.plan_type, 1000)

    return DashboardResponse(
        today=today_count,
        total=total_count,
        daily_limit=daily_limit,
        plan=company.plan_type,
        chart_data=chart_data,
    )


# ==================== Logs Service ====================

def get_recent_logs(db: Session, company_id: int, limit: int = 10) -> List[LogEntry]:
    """최근 API 로그 조회"""
    # 회사의 API 키들
    api_keys = db.query(ApiKey).filter(ApiKey.company_id == company_id).all()
    key_ids = [k.key_id for k in api_keys]

    if not key_ids:
        return []

    # 최근 로그 조회
    logs = db.query(ApiLog).filter(
        ApiLog.key_id.in_(key_ids)
    ).order_by(ApiLog.created_at.desc()).limit(limit).all()

    result = []
    for log in logs:
        # endpoint에서 method 추출 (없으면 POST 기본값)
        endpoint = log.endpoint or "/v1/recommend"
        method = "POST" if "recommend" in endpoint else "GET"

        result.append(LogEntry(
            id=str(log.log_id),
            time=log.created_at.strftime("%H:%M:%S") if log.created_at else "",
            method=method,
            endpoint=endpoint,
            status=log.status_code or 200,
            latency=log.process_time_ms or 0,
        ))

    return result


# ==================== OAuth Service ====================

async def google_oauth_callback(db: Session, code: str, redirect_uri: str) -> Tuple[Company, str]:
    """Google OAuth 콜백 처리"""
    # 1. code를 access token으로 교환
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )

        if token_response.status_code != 200:
            raise ValueError("Google 인증에 실패했습니다")

        token_data = token_response.json()
        access_token = token_data.get("access_token")

        # 2. access token으로 사용자 정보 조회
        user_response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        if user_response.status_code != 200:
            raise ValueError("Google 사용자 정보를 가져올 수 없습니다")

        user_data = user_response.json()
        email = user_data.get("email")
        name = user_data.get("name", email.split("@")[0])

    # 3. 기존 회원인지 확인
    company = db.query(Company).filter(Company.manager_email == email).first()

    if company:
        # 기존 회원 - 로그인
        if not company.is_active:
            raise ValueError("비활성화된 계정입니다")
        token = create_access_token(company.company_id)
        return company, token
    else:
        # 신규 회원 - 회원가입
        company = Company(
            name=name,
            manager_email=email,
            password_hash=None,  # OAuth 사용자는 비밀번호 없음
            plan_type="BASIC",
            is_active=True,
            oauth_provider="google",
        )
        db.add(company)
        db.commit()
        db.refresh(company)

        token = create_access_token(company.company_id)
        return company, token


async def github_oauth_callback(db: Session, code: str, redirect_uri: str) -> Tuple[Company, str]:
    """GitHub OAuth 콜백 처리"""
    # 1. code를 access token으로 교환
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "code": code,
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
            },
            headers={"Accept": "application/json"},
        )

        if token_response.status_code != 200:
            raise ValueError("GitHub 인증에 실패했습니다")

        token_data = token_response.json()
        access_token = token_data.get("access_token")

        if not access_token:
            error = token_data.get("error_description", "알 수 없는 오류")
            raise ValueError(f"GitHub 인증 실패: {error}")

        # 2. access token으로 사용자 정보 조회
        user_response = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json",
            },
        )

        if user_response.status_code != 200:
            raise ValueError("GitHub 사용자 정보를 가져올 수 없습니다")

        user_data = user_response.json()

        # 이메일 가져오기 (public이 아닐 수 있음)
        email = user_data.get("email")
        if not email:
            # 이메일 API 별도 호출
            email_response = await client.get(
                "https://api.github.com/user/emails",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github.v3+json",
                },
            )
            if email_response.status_code == 200:
                emails = email_response.json()
                primary_email = next((e for e in emails if e.get("primary")), None)
                email = primary_email.get("email") if primary_email else None

        if not email:
            raise ValueError("GitHub 이메일을 가져올 수 없습니다. GitHub 설정에서 이메일을 공개로 설정해주세요.")

        name = user_data.get("name") or user_data.get("login", email.split("@")[0])

    # 3. 기존 회원인지 확인
    company = db.query(Company).filter(Company.manager_email == email).first()

    if company:
        # 기존 회원 - 로그인
        if not company.is_active:
            raise ValueError("비활성화된 계정입니다")
        token = create_access_token(company.company_id)
        return company, token
    else:
        # 신규 회원 - 회원가입
        company = Company(
            name=name,
            manager_email=email,
            password_hash=None,  # OAuth 사용자는 비밀번호 없음
            plan_type="BASIC",
            is_active=True,
            oauth_provider="github",
        )
        db.add(company)
        db.commit()
        db.refresh(company)

        token = create_access_token(company.company_id)
        return company, token
