"""
B2B 도메인 서비스 레이어
- 비즈니스 로직 처리
"""
import os
import secrets
import hashlib
import httpx
import resend
from datetime import datetime, timedelta, date
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from jose import jwt

from backend.utils.password import hash_password, verify_password

# Resend 설정
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "noreply@moviesir.cloud")
RESEND_FROM_NAME = os.getenv("RESEND_FROM_NAME", "MovieSir")

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


def change_password(db: Session, company_id: int, current_password: str, new_password: str) -> bool:
    """비밀번호 변경"""
    company = db.query(Company).filter(Company.company_id == company_id).first()

    if not company:
        raise ValueError("회사를 찾을 수 없습니다")

    # OAuth 사용자는 비밀번호 변경 불가
    if company.oauth_provider:
        raise ValueError("소셜 로그인 사용자는 비밀번호를 변경할 수 없습니다")

    # 현재 비밀번호 확인
    if not company.password_hash:
        raise ValueError("비밀번호가 설정되지 않은 계정입니다")

    if not verify_password(current_password, company.password_hash):
        raise ValueError("현재 비밀번호가 올바르지 않습니다")

    # 새 비밀번호로 업데이트
    company.password_hash = hash_password(new_password)
    db.commit()

    return True


def company_to_response(company: Company) -> CompanyResponse:
    """Company 모델을 응답 스키마로 변환"""
    return CompanyResponse(
        id=str(company.company_id),
        name=company.name,
        email=company.manager_email,
        plan=company.plan_type,
        oauth_provider=company.oauth_provider,
        is_admin=company.is_admin or False,
        created_at=company.created_at,
    )


def update_company(db: Session, company_id: int, name: Optional[str] = None, email: Optional[str] = None) -> Company:
    """회사 정보 수정"""
    company = db.query(Company).filter(Company.company_id == company_id).first()

    if not company:
        raise ValueError("회사를 찾을 수 없습니다")

    # 이름 변경
    if name is not None:
        company.name = name

    # 이메일 변경
    if email is not None:
        # OAuth 사용자는 이메일 변경 불가
        if company.oauth_provider:
            raise ValueError("소셜 로그인 사용자는 이메일을 변경할 수 없습니다")

        # 이메일 중복 체크
        existing = db.query(Company).filter(
            Company.manager_email == email,
            Company.company_id != company_id
        ).first()
        if existing:
            raise ValueError("이미 사용 중인 이메일입니다")

        company.manager_email = email

    db.commit()
    db.refresh(company)

    return company


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


def activate_api_key(db: Session, company_id: int, key_id: int) -> bool:
    """API 키 활성화"""
    api_key = db.query(ApiKey).filter(
        and_(ApiKey.key_id == key_id, ApiKey.company_id == company_id)
    ).first()

    if not api_key:
        return False

    api_key.is_active = True
    db.commit()
    return True


def delete_api_key(db: Session, company_id: int, key_id: int) -> bool:
    """API 키 완전 삭제"""
    api_key = db.query(ApiKey).filter(
        and_(ApiKey.key_id == key_id, ApiKey.company_id == company_id)
    ).first()

    if not api_key:
        return False

    db.delete(api_key)
    db.commit()
    return True


def update_api_key(db: Session, company_id: int, key_id: int, name: str) -> Optional[ApiKey]:
    """API 키 이름 수정"""
    api_key = db.query(ApiKey).filter(
        and_(ApiKey.key_id == key_id, ApiKey.company_id == company_id)
    ).first()

    if not api_key:
        return None

    api_key.key_name = name
    db.commit()
    db.refresh(api_key)
    return api_key


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
        api_key_count=len(api_keys),
        chart_data=chart_data,
    )


# ==================== Usage Service ====================

def get_usage_data(db: Session, company_id: int, days: int = 7) -> List[dict]:
    """기간별 API 사용량 조회"""
    # 회사의 모든 API 키
    api_keys = db.query(ApiKey).filter(ApiKey.company_id == company_id).all()
    key_ids = [k.key_id for k in api_keys]

    today = datetime.utcnow().date()
    result = []

    for i in range(days - 1, -1, -1):
        date = today - timedelta(days=i)
        date_str = date.strftime("%m/%d")

        if key_ids:
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

        result.append({
            "date": date_str,
            "count": day_count,
            "success": day_success,
            "error": day_error,
        })

    return result


def get_endpoint_stats(db: Session, company_id: int, days: int = 7) -> List[dict]:
    """엔드포인트별 호출 통계"""
    api_keys = db.query(ApiKey).filter(ApiKey.company_id == company_id).all()
    key_ids = [k.key_id for k in api_keys]

    if not key_ids:
        return []

    # 최근 N일간 로그
    since_date = datetime.utcnow() - timedelta(days=days)

    logs = db.query(ApiLog.endpoint, func.count(ApiLog.log_id).label("count")).filter(
        and_(
            ApiLog.key_id.in_(key_ids),
            ApiLog.created_at >= since_date
        )
    ).group_by(ApiLog.endpoint).order_by(func.count(ApiLog.log_id).desc()).limit(5).all()

    if not logs:
        return []

    total = sum(log.count for log in logs)
    result = []

    for log in logs:
        percent = round((log.count / total) * 100) if total > 0 else 0
        result.append({
            "endpoint": log.endpoint or "/v1/recommend",
            "calls": log.count,
            "percent": percent,
        })

    return result


def get_response_time_stats(db: Session, company_id: int, days: int = 7) -> dict:
    """응답 시간 통계 (avg, p50, p95, p99)"""
    api_keys = db.query(ApiKey).filter(ApiKey.company_id == company_id).all()
    key_ids = [k.key_id for k in api_keys]

    if not key_ids:
        return {"avg": 0, "p50": 0, "p95": 0, "p99": 0}

    # 최근 N일간 응답 시간
    since_date = datetime.utcnow() - timedelta(days=days)

    times = db.query(ApiLog.process_time_ms).filter(
        and_(
            ApiLog.key_id.in_(key_ids),
            ApiLog.created_at >= since_date,
            ApiLog.process_time_ms.isnot(None)
        )
    ).all()

    if not times:
        return {"avg": 0, "p50": 0, "p95": 0, "p99": 0}

    # 응답 시간 리스트 추출 및 정렬
    time_values = sorted([t[0] for t in times if t[0] is not None])
    n = len(time_values)

    if n == 0:
        return {"avg": 0, "p50": 0, "p95": 0, "p99": 0}

    avg = round(sum(time_values) / n)
    p50 = time_values[int(n * 0.5)] if n > 0 else 0
    p95 = time_values[int(n * 0.95)] if n > 0 else 0
    p99 = time_values[min(int(n * 0.99), n - 1)] if n > 0 else 0

    return {"avg": avg, "p50": p50, "p95": p95, "p99": p99}


# ==================== Logs Service ====================

def get_recent_logs(
    db: Session,
    company_id: int,
    limit: int = 50,
    offset: int = 0,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> dict:
    """
    API 로그 조회 (페이지네이션 및 날짜 필터 지원)
    - limit: 조회할 로그 수
    - offset: 건너뛸 로그 수
    - start_date: 시작 날짜 (KST 기준)
    - end_date: 종료 날짜 (KST 기준)
    """
    # 회사의 API 키들
    api_keys = db.query(ApiKey).filter(ApiKey.company_id == company_id).all()
    key_ids = [k.key_id for k in api_keys]

    if not key_ids:
        return {"logs": [], "total": 0, "has_more": False}

    # 기본 쿼리
    query = db.query(ApiLog).filter(ApiLog.key_id.in_(key_ids))

    # 날짜 필터 적용 (KST → UTC 변환 필요)
    if start_date:
        # KST 00:00:00 → UTC로 변환 (9시간 빼기)
        start_utc = datetime.combine(start_date, datetime.min.time()) - timedelta(hours=9)
        query = query.filter(ApiLog.created_at >= start_utc)

    if end_date:
        # KST 23:59:59 → UTC로 변환 (9시간 빼기)
        end_utc = datetime.combine(end_date, datetime.max.time()) - timedelta(hours=9)
        query = query.filter(ApiLog.created_at <= end_utc)

    # 총 개수 조회
    total = query.count()

    # 페이지네이션 적용하여 로그 조회
    logs = query.order_by(ApiLog.created_at.desc()).offset(offset).limit(limit).all()

    result = []
    for log in logs:
        # endpoint에서 method 추출 (없으면 POST 기본값)
        endpoint = log.endpoint or "/v1/recommend"
        method = "POST" if "recommend" in endpoint else "GET"

        # UTC → KST 변환 (+9시간)
        kst_time = (log.created_at + timedelta(hours=9)) if log.created_at else None

        result.append(LogEntry(
            id=str(log.log_id),
            date=kst_time.strftime("%Y-%m-%d") if kst_time else "",
            time=kst_time.strftime("%H:%M:%S") if kst_time else "",
            method=method,
            endpoint=endpoint,
            status=log.status_code or 200,
            latency=log.process_time_ms or 0,
        ))

    return {
        "logs": result,
        "total": total,
        "has_more": offset + len(logs) < total
    }


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


# ==================== Password Reset Service ====================

def generate_temp_password(length: int = 12) -> str:
    """임시 비밀번호 생성 (영문+숫자 조합)"""
    alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _get_reset_email_html(temp_password: str) -> str:
    """비밀번호 재설정 이메일 HTML 템플릿"""
    return f"""
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;">
        <tr>
            <td align="center" style="padding:40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                    <tr>
                        <td style="padding:40px 40px 30px; text-align:center; border-bottom:1px solid #f0f0f0;">
                            <h1 style="margin:0; font-size:28px; font-weight:700; color:#2563EB;">MovieSir API</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px;">
                            <h2 style="margin:0 0 20px; font-size:22px; font-weight:600; color:#333333;">
                                임시 비밀번호 발급
                            </h2>
                            <p style="margin:0 0 30px; font-size:16px; line-height:1.6; color:#666666;">
                                비밀번호 찾기 요청에 따라 임시 비밀번호를 발급해 드립니다.<br>
                                아래 임시 비밀번호로 로그인 후 반드시 비밀번호를 변경해 주세요.
                            </p>
                            <div style="background-color:#f0f7ff; border:2px solid #2563EB; border-radius:8px; padding:25px; text-align:center; margin:0 0 30px;">
                                <p style="margin:0 0 10px; font-size:14px; color:#999999;">임시 비밀번호</p>
                                <p style="margin:0; font-size:28px; font-weight:700; letter-spacing:2px; color:#2563EB;">
                                    {temp_password}
                                </p>
                            </div>
                            <p style="margin:0; font-size:14px; line-height:1.6; color:#999999;">
                                보안을 위해 로그인 후 <strong>Settings</strong>에서 비밀번호를 변경해 주세요.<br>
                                본인이 요청하지 않았다면 이 메일을 무시하고, 즉시 비밀번호를 변경해 주세요.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:30px 40px; background-color:#fafafa; border-radius:0 0 12px 12px; text-align:center;">
                            <p style="margin:0 0 10px; font-size:12px; color:#999999;">
                                본 메일은 발신 전용이며, 회신되지 않습니다.
                            </p>
                            <p style="margin:0; font-size:12px; color:#cccccc;">
                                &copy; 2025 MovieSir. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""


def _get_reset_email_text(temp_password: str) -> str:
    """비밀번호 재설정 이메일 플레인 텍스트"""
    return f"""MovieSir API 임시 비밀번호 발급

비밀번호 찾기 요청에 따라 임시 비밀번호를 발급해 드립니다.
아래 임시 비밀번호로 로그인 후 반드시 비밀번호를 변경해 주세요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
임시 비밀번호: {temp_password}
━━━━━━━━━━━━━━━━━━━━━━━━━━━

보안을 위해 로그인 후 Settings에서 비밀번호를 변경해 주세요.
본인이 요청하지 않았다면 이 메일을 무시하고, 즉시 비밀번호를 변경해 주세요.

---
본 메일은 발신 전용이며, 회신되지 않습니다.
(C) 2025 MovieSir. All rights reserved.
"""


def send_reset_password_email(to_email: str, temp_password: str) -> None:
    """임시 비밀번호 이메일 발송"""
    if not RESEND_API_KEY:
        print(f"[DEV][RESET] to={to_email}, temp_password={temp_password}")
        return

    resend.api_key = RESEND_API_KEY

    resend.Emails.send({
        "from": f"{RESEND_FROM_NAME} <{RESEND_FROM_EMAIL}>",
        "to": [to_email],
        "subject": "[MovieSir API] 임시 비밀번호가 발급되었습니다",
        "html": _get_reset_email_html(temp_password),
        "text": _get_reset_email_text(temp_password),
    })


def forgot_password(db: Session, email: str) -> bool:
    """비밀번호 찾기 - 임시 비밀번호 발급 및 이메일 발송"""
    company = db.query(Company).filter(Company.manager_email == email).first()

    if not company:
        # 보안상 이메일 존재 여부를 알려주지 않음
        return True

    # OAuth 사용자는 비밀번호 찾기 불가
    if company.oauth_provider:
        raise ValueError(f"{company.oauth_provider.capitalize()} 로그인 사용자입니다. 소셜 로그인을 이용해 주세요.")

    if not company.is_active:
        raise ValueError("비활성화된 계정입니다. 관리자에게 문의하세요.")

    # 임시 비밀번호 생성 및 저장
    temp_password = generate_temp_password()
    company.password_hash = hash_password(temp_password)
    db.commit()

    # 이메일 발송
    send_reset_password_email(email, temp_password)

    return True


# ==================== B2C Admin Service ====================

def get_b2c_users(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None
) -> dict:
    """B2C 사용자 목록 조회 (어드민 전용)"""
    from backend.domains.user.models import User

    query = db.query(User)

    # 검색어가 있으면 이메일 또는 닉네임으로 필터
    if search:
        query = query.filter(
            (User.email.ilike(f"%{search}%")) |
            (User.nickname.ilike(f"%{search}%"))
        )

    # 전체 개수
    total = query.count()

    # 페이지네이션
    offset = (page - 1) * page_size
    users = query.order_by(User.created_at.desc()).offset(offset).limit(page_size).all()

    return {
        "users": [
            {
                "user_id": str(u.user_id),
                "email": u.email,
                "nickname": u.nickname,
                "role": u.role or "USER",
                "is_email_verified": u.is_email_verified or False,
                "onboarding_completed": u.onboarding_completed_at is not None,
                "created_at": u.created_at,
                "deleted_at": u.deleted_at,
            }
            for u in users
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": offset + len(users) < total,
    }


def get_b2c_user_detail(db: Session, user_id: str) -> Optional[dict]:
    """B2C 사용자 상세 정보 조회 (어드민 전용)"""
    from backend.domains.user.models import User
    from backend.domains.movie.models import OttProvider
    from uuid import UUID

    try:
        user_uuid = UUID(user_id)
    except ValueError:
        return None

    user = db.query(User).filter(User.user_id == user_uuid).first()
    if not user:
        return None

    # OTT 구독 정보 (로고 포함)
    ott_list = []
    if hasattr(user, 'ott_subscriptions') and user.ott_subscriptions:
        for sub in user.ott_subscriptions:
            if sub.provider:
                ott_list.append({
                    "provider_name": sub.provider.provider_name,
                    "logo_path": sub.provider.logo_path
                })

    # 추천 횟수 (b2c.recommendation_sessions에서 조회)
    from sqlalchemy import text
    rec_count_result = db.execute(
        text("SELECT COUNT(*) FROM b2c.recommendation_sessions WHERE user_id = :uid"),
        {"uid": str(user_uuid)}
    ).scalar() or 0

    # 마지막 추천 시간
    last_rec_result = db.execute(
        text("SELECT MAX(created_at) FROM b2c.recommendation_sessions WHERE user_id = :uid"),
        {"uid": str(user_uuid)}
    ).scalar()

    return {
        "user_id": str(user.user_id),
        "email": user.email,
        "nickname": user.nickname,
        "role": user.role or "USER",
        "is_email_verified": user.is_email_verified or False,
        "onboarding_completed": user.onboarding_completed_at is not None,
        "created_at": user.created_at,
        "deleted_at": user.deleted_at,
        "ott_subscriptions": ott_list,
        "recommendation_count": rec_count_result,
        "last_recommendation_at": last_rec_result,
    }


def get_b2c_stats(db: Session) -> dict:
    """B2C 통계 조회 (어드민 전용)"""
    from backend.domains.user.models import User
    from datetime import datetime, timedelta

    today = datetime.utcnow().date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    # 전체 통계
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.deleted_at.is_(None)).count()
    deleted_users = db.query(User).filter(User.deleted_at.isnot(None)).count()
    verified_users = db.query(User).filter(User.is_email_verified == True).count()
    onboarded_users = db.query(User).filter(User.onboarding_completed_at.isnot(None)).count()

    # 기간별 가입자
    today_signups = db.query(User).filter(
        func.date(User.created_at) == today
    ).count()

    weekly_signups = db.query(User).filter(
        func.date(User.created_at) >= week_ago
    ).count()

    monthly_signups = db.query(User).filter(
        func.date(User.created_at) >= month_ago
    ).count()

    return {
        "total_users": total_users,
        "active_users": active_users,
        "deleted_users": deleted_users,
        "verified_users": verified_users,
        "onboarded_users": onboarded_users,
        "today_signups": today_signups,
        "weekly_signups": weekly_signups,
        "monthly_signups": monthly_signups,
    }


def deactivate_b2c_user(db: Session, user_id: str) -> bool:
    """B2C 사용자 비활성화 (어드민 전용)"""
    from backend.domains.user.models import User
    from uuid import UUID

    try:
        user_uuid = UUID(user_id)
    except ValueError:
        return False

    user = db.query(User).filter(User.user_id == user_uuid).first()
    if not user:
        return False

    user.deleted_at = datetime.utcnow()
    db.commit()
    return True


def activate_b2c_user(db: Session, user_id: str) -> bool:
    """B2C 사용자 활성화 (어드민 전용)"""
    from backend.domains.user.models import User
    from uuid import UUID

    try:
        user_uuid = UUID(user_id)
    except ValueError:
        return False

    user = db.query(User).filter(User.user_id == user_uuid).first()
    if not user:
        return False

    user.deleted_at = None
    db.commit()
    return True


def get_b2c_user_activities(db: Session, user_id: str, limit: int = 20) -> dict:
    """B2C 사용자 최근 활동 조회 (어드민 전용)"""
    from backend.domains.recommendation.models import RecommendationSession, UserMovieFeedback
    from backend.domains.movie.models import Movie
    from uuid import UUID
    from sqlalchemy import text

    try:
        user_uuid = UUID(user_id)
    except ValueError:
        return {"activities": [], "total": 0}

    activities = []

    # 1. 최근 추천 세션 조회
    sessions = db.query(RecommendationSession).filter(
        RecommendationSession.user_id == user_uuid
    ).order_by(RecommendationSession.created_at.desc()).limit(limit).all()

    for session in sessions:
        genres_str = ", ".join(session.req_genres) if session.req_genres else "전체"
        runtime_str = f"{session.req_runtime_max}분 이내" if session.req_runtime_max else "제한없음"
        movie_count = len(session.recommended_movie_ids) if session.recommended_movie_ids else 0

        activities.append({
            "type": "recommendation",
            "description": f"추천 요청: {genres_str} / {runtime_str} ({movie_count}편 추천)",
            "movie_title": None,
            "movie_poster": None,
            "created_at": session.created_at,
        })

    # 2. 최근 피드백 조회 (OTT 클릭, 만족도)
    feedbacks = db.query(UserMovieFeedback, Movie).outerjoin(
        Movie, UserMovieFeedback.movie_id == Movie.movie_id
    ).filter(
        UserMovieFeedback.user_id == user_uuid
    ).order_by(UserMovieFeedback.created_at.desc()).limit(limit).all()

    for feedback, movie in feedbacks:
        movie_title = movie.title if movie else f"영화 #{feedback.movie_id}"
        movie_poster = movie.poster_path if movie else None

        if feedback.feedback_type == "ott_click":
            description = f"'{movie_title}' OTT 링크 클릭"
        elif feedback.feedback_type == "satisfaction_positive":
            description = f"'{movie_title}' 만족도 긍정 응답"
        elif feedback.feedback_type == "satisfaction_negative":
            description = f"'{movie_title}' 만족도 부정 응답"
        else:
            description = f"'{movie_title}' {feedback.feedback_type}"

        activities.append({
            "type": feedback.feedback_type,
            "description": description,
            "movie_title": movie_title,
            "movie_poster": movie_poster,
            "created_at": feedback.created_at,
        })

    # 시간순 정렬 (최신순)
    activities.sort(key=lambda x: x["created_at"], reverse=True)

    return {
        "activities": activities[:limit],
        "total": len(activities),
    }


def get_b2c_live_activities(db: Session, limit: int = 15) -> dict:
    """B2C 전체 유저 실시간 활동 피드 (어드민 전용)"""
    from backend.domains.recommendation.models import RecommendationSession, UserMovieFeedback
    from backend.domains.movie.models import Movie
    from backend.domains.user.models import User

    activities = []

    # 1. 최근 추천 세션 조회 (유저 정보 포함)
    sessions = db.query(RecommendationSession, User).outerjoin(
        User, RecommendationSession.user_id == User.user_id
    ).filter(
        RecommendationSession.user_id.isnot(None)
    ).order_by(RecommendationSession.created_at.desc()).limit(limit).all()

    for session, user in sessions:
        if not user:
            continue
        genres_str = ", ".join(session.req_genres) if session.req_genres else "전체"
        runtime_str = f"{session.req_runtime_max}분" if session.req_runtime_max else ""
        desc_parts = [genres_str]
        if runtime_str:
            desc_parts.append(runtime_str)

        # 추천받은 영화 제목 가져오기
        movie_title = None
        if session.recommended_movie_ids and len(session.recommended_movie_ids) > 0:
            # 첫 번째 영화 제목 조회
            first_movie = db.query(Movie).filter(
                Movie.movie_id == session.recommended_movie_ids[0]
            ).first()
            if first_movie:
                movie_count = len(session.recommended_movie_ids)
                if movie_count > 1:
                    movie_title = f"'{first_movie.title}' 외 {movie_count - 1}편"
                else:
                    movie_title = f"'{first_movie.title}'"

        activities.append({
            "user_id": str(session.user_id),
            "user_nickname": user.nickname or user.email.split('@')[0],
            "type": "recommendation",
            "description": f"추천 요청: {' / '.join(desc_parts)}",
            "movie_title": movie_title,
            "session_id": session.session_id,  # 클릭해서 영화 목록 보기용
            "created_at": session.created_at,
        })

    # 2. 최근 피드백 조회 (유저 + 영화 정보 포함)
    feedbacks = db.query(UserMovieFeedback, User, Movie).outerjoin(
        User, UserMovieFeedback.user_id == User.user_id
    ).outerjoin(
        Movie, UserMovieFeedback.movie_id == Movie.movie_id
    ).order_by(UserMovieFeedback.created_at.desc()).limit(limit).all()

    for feedback, user, movie in feedbacks:
        if not user:
            continue
        movie_title = movie.title if movie else f"영화 #{feedback.movie_id}"

        if feedback.feedback_type == "ott_click":
            description = f"'{movie_title}' OTT 클릭"
        elif feedback.feedback_type == "satisfaction_positive":
            description = f"'{movie_title}' 좋아요"
        elif feedback.feedback_type == "satisfaction_negative":
            description = f"'{movie_title}' 별로예요"
        else:
            description = f"'{movie_title}' 피드백"

        activities.append({
            "user_id": str(feedback.user_id),
            "user_nickname": user.nickname or user.email.split('@')[0],
            "type": feedback.feedback_type,
            "description": description,
            "movie_title": movie_title,
            "created_at": feedback.created_at,
        })

    # 시간순 정렬 (최신순)
    activities.sort(key=lambda x: x["created_at"], reverse=True)

    return {
        "activities": activities[:limit],
    }


def get_session_movies(db: Session, session_id: int) -> dict:
    """추천 세션의 영화 목록 조회 (어드민 전용)"""
    from backend.domains.recommendation.models import RecommendationSession
    from backend.domains.movie.models import Movie
    from backend.domains.user.models import User

    # 세션 조회
    session = db.query(RecommendationSession).filter(
        RecommendationSession.session_id == session_id
    ).first()

    if not session:
        return None

    # 유저 정보 조회
    user = None
    if session.user_id:
        user = db.query(User).filter(User.user_id == session.user_id).first()

    user_nickname = "Guest"
    if user:
        user_nickname = user.nickname or user.email.split('@')[0]

    # 추천된 영화 목록 조회
    movies = []
    if session.recommended_movie_ids:
        movie_records = db.query(Movie).filter(
            Movie.movie_id.in_(session.recommended_movie_ids)
        ).all()

        # movie_id 순서 유지
        movie_map = {m.movie_id: m for m in movie_records}
        for movie_id in session.recommended_movie_ids:
            movie = movie_map.get(movie_id)
            if movie:
                # 장르 파싱 (JSON 문자열 또는 리스트)
                genres = []
                if movie.genres:
                    if isinstance(movie.genres, list):
                        genres = movie.genres
                    elif isinstance(movie.genres, str):
                        import json
                        try:
                            genres = json.loads(movie.genres)
                        except:
                            genres = []

                movies.append({
                    "movie_id": movie.movie_id,
                    "title": movie.title,
                    "poster_path": movie.poster_path,
                    "release_date": str(movie.release_date) if movie.release_date else None,
                    "genres": genres,
                })

    return {
        "session_id": session.session_id,
        "user_nickname": user_nickname,
        "req_genres": session.req_genres or [],
        "req_runtime_max": session.req_runtime_max,
        "movies": movies,
        "created_at": session.created_at,
    }


def get_unified_live_feed(db: Session, company_id: int, limit: int = 20) -> dict:
    """
    통합 실시간 피드 (API 로그 + B2C 활동)
    - 어드민: B2C 활동 + API 로그 (단, /v1/recommend는 B2C 활동으로 표시되므로 제외)
    - 일반: API 로그만
    - 모든 시간은 KST로 통일하여 반환
    """
    from backend.domains.recommendation.models import RecommendationSession, UserMovieFeedback
    from backend.domains.movie.models import Movie
    from backend.domains.user.models import User

    items = []

    # 어드민 여부 먼저 확인
    company = db.query(Company).filter(Company.company_id == company_id).first()
    is_admin = company and company.is_admin

    # 1. API 로그 조회
    api_keys = db.query(ApiKey).filter(ApiKey.company_id == company_id).all()
    key_ids = [k.key_id for k in api_keys]

    if key_ids:
        logs = db.query(ApiLog).filter(
            ApiLog.key_id.in_(key_ids)
        ).order_by(ApiLog.created_at.desc()).limit(limit).all()

        for log in logs:
            endpoint = log.endpoint or "/v1/recommend"
            method = "POST" if "recommend" in endpoint else "GET"

            # 어드민이면 /v1/recommend, /v1/recommend_single은 B2C 활동으로 표시되므로 API 로그에서 제외
            if is_admin and "recommend" in endpoint:
                continue

            # UTC → KST 변환 (+9시간)
            kst_time = (log.created_at + timedelta(hours=9)) if log.created_at else None

            if kst_time:
                items.append({
                    "kind": "api",
                    "date": kst_time.strftime("%Y-%m-%d"),
                    "time": kst_time.strftime("%H:%M:%S"),
                    "timestamp": log.created_at,  # 정렬용 (UTC)
                    "log_id": str(log.log_id),
                    "method": method,
                    "endpoint": endpoint,
                    "status": log.status_code or 200,
                    "latency": log.process_time_ms or 0,
                })

    if is_admin:
        # 추천 세션 조회
        sessions = db.query(RecommendationSession, User).outerjoin(
            User, RecommendationSession.user_id == User.user_id
        ).filter(
            RecommendationSession.user_id.isnot(None)
        ).order_by(RecommendationSession.created_at.desc()).limit(limit).all()

        for session, user in sessions:
            if not user:
                continue

            genres_str = ", ".join(session.req_genres) if session.req_genres else "전체"
            runtime_str = f"{session.req_runtime_max}분" if session.req_runtime_max else ""
            desc_parts = [genres_str]
            if runtime_str:
                desc_parts.append(runtime_str)

            # 추천받은 영화 제목
            movie_title = None
            if session.recommended_movie_ids and len(session.recommended_movie_ids) > 0:
                first_movie = db.query(Movie).filter(
                    Movie.movie_id == session.recommended_movie_ids[0]
                ).first()
                if first_movie:
                    movie_count = len(session.recommended_movie_ids)
                    if movie_count > 1:
                        movie_title = f"'{first_movie.title}' 외 {movie_count - 1}편"
                    else:
                        movie_title = f"'{first_movie.title}'"

            # UTC → KST 변환 (+9시간)
            kst_time = (session.created_at + timedelta(hours=9)) if session.created_at else None

            if kst_time:
                items.append({
                    "kind": "b2c",
                    "date": kst_time.strftime("%Y-%m-%d"),
                    "time": kst_time.strftime("%H:%M:%S"),
                    "timestamp": session.created_at,  # 정렬용 (UTC)
                    "user_id": str(session.user_id),
                    "user_nickname": user.nickname or user.email.split('@')[0],
                    "activity_type": "recommendation",
                    "description": f"추천 요청: {' / '.join(desc_parts)}",
                    "movie_title": movie_title,
                    "session_id": session.session_id,
                })

        # 피드백 조회
        feedbacks = db.query(UserMovieFeedback, User, Movie).outerjoin(
            User, UserMovieFeedback.user_id == User.user_id
        ).outerjoin(
            Movie, UserMovieFeedback.movie_id == Movie.movie_id
        ).order_by(UserMovieFeedback.created_at.desc()).limit(limit).all()

        for feedback, user, movie in feedbacks:
            if not user:
                continue

            movie_title = movie.title if movie else f"영화 #{feedback.movie_id}"

            if feedback.feedback_type == "ott_click":
                description = f"'{movie_title}' OTT 클릭"
            elif feedback.feedback_type == "satisfaction_positive":
                description = f"'{movie_title}' 좋아요"
            elif feedback.feedback_type == "satisfaction_negative":
                description = f"'{movie_title}' 별로예요"
            else:
                description = f"'{movie_title}' 피드백"

            # UTC → KST 변환 (+9시간)
            kst_time = (feedback.created_at + timedelta(hours=9)) if feedback.created_at else None

            if kst_time:
                items.append({
                    "kind": "b2c",
                    "date": kst_time.strftime("%Y-%m-%d"),
                    "time": kst_time.strftime("%H:%M:%S"),
                    "timestamp": feedback.created_at,  # 정렬용 (UTC)
                    "user_id": str(feedback.user_id),
                    "user_nickname": user.nickname or user.email.split('@')[0],
                    "activity_type": feedback.feedback_type,
                    "description": description,
                    "movie_title": movie_title,
                    "session_id": None,
                })

    # 시간순 정렬 (최신순) - UTC timestamp 기준
    items.sort(key=lambda x: x["timestamp"], reverse=True)

    return {
        "items": items[:limit],
    }
