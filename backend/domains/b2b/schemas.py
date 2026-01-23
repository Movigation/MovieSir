"""
B2B 도메인 Pydantic 스키마
- 요청/응답 데이터 검증
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# ==================== Auth ====================

class CompanyRegister(BaseModel):
    """회원가입 요청"""
    name: str = Field(..., min_length=1, max_length=100, description="회사명")
    email: EmailStr = Field(..., description="이메일")
    password: str = Field(..., min_length=8, description="비밀번호")


class CompanyLogin(BaseModel):
    """로그인 요청"""
    email: EmailStr
    password: str


class OAuthCallback(BaseModel):
    """OAuth 콜백 요청"""
    code: str = Field(..., description="OAuth 인증 코드")
    redirect_uri: Optional[str] = Field(None, description="OAuth redirect URI (선택)")


class ChangePasswordRequest(BaseModel):
    """비밀번호 변경 요청"""
    current_password: str = Field(..., description="현재 비밀번호")
    new_password: str = Field(..., min_length=8, description="새 비밀번호 (8자 이상)")


class ForgotPasswordRequest(BaseModel):
    """비밀번호 찾기 요청"""
    email: EmailStr = Field(..., description="가입한 이메일")


class UpdateCompanyRequest(BaseModel):
    """회사 정보 수정 요청"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="회사명")
    email: Optional[EmailStr] = Field(None, description="이메일")


class CompanyResponse(BaseModel):
    """회사 정보 응답"""
    id: str
    name: str
    email: str
    plan: str
    oauth_provider: Optional[str] = None
    is_admin: bool = False
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """로그인/회원가입 응답"""
    access_token: str
    token_type: str = "bearer"
    company: CompanyResponse


# ==================== API Keys ====================

class ApiKeyCreate(BaseModel):
    """API 키 생성 요청"""
    name: str = Field(..., min_length=1, max_length=50, description="키 이름")


class UpdateApiKeyRequest(BaseModel):
    """API 키 수정 요청"""
    name: str = Field(..., min_length=1, max_length=50, description="키 이름")


class ApiKeyResponse(BaseModel):
    """API 키 응답"""
    id: str
    name: str
    key: str  # 생성 시에만 원본 키 반환, 이후에는 마스킹
    daily_limit: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== Dashboard ====================

class ChartDataPoint(BaseModel):
    """차트 데이터 포인트"""
    date: str
    count: int
    success: int
    error: int


class DashboardResponse(BaseModel):
    """대시보드 응답"""
    today: int
    total: int
    daily_limit: int
    plan: str
    api_key_count: int
    chart_data: List[ChartDataPoint]


# ==================== Logs ====================

class LogEntry(BaseModel):
    """로그 항목"""
    id: str
    date: str  # YYYY-MM-DD
    time: str  # HH:MM:SS
    method: str
    endpoint: str
    status: int
    latency: int


class LogsResponse(BaseModel):
    """로그 목록 응답 (페이지네이션 지원)"""
    logs: List[LogEntry]
    total: int
    has_more: bool


# ==================== Usage ====================

class UsageStats(BaseModel):
    """사용량 통계"""
    date: str
    request_count: int
    error_count: int
    success_rate: float


class UsageResponse(BaseModel):
    """사용량 응답"""
    period: str  # daily, weekly, monthly
    stats: List[UsageStats]
    total_requests: int
    total_errors: int


# ==================== Error ====================

class ErrorResponse(BaseModel):
    """표준 에러 응답"""
    success: bool = False
    error: dict


class SuccessResponse(BaseModel):
    """표준 성공 응답"""
    success: bool = True
    message: str


# ==================== B2C Admin ====================

class OttSubscriptionResponse(BaseModel):
    """OTT 구독 정보"""
    provider_name: str
    logo_path: Optional[str] = None


class B2CUserResponse(BaseModel):
    """B2C 사용자 정보 응답"""
    user_id: str
    email: str
    nickname: str
    role: str
    is_email_verified: bool
    onboarding_completed: bool
    created_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class B2CUserDetailResponse(BaseModel):
    """B2C 사용자 상세 정보 응답"""
    user_id: str
    email: str
    nickname: str
    role: str
    is_email_verified: bool
    onboarding_completed: bool
    created_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    ott_subscriptions: List[OttSubscriptionResponse] = []
    recommendation_count: int = 0
    last_recommendation_at: Optional[datetime] = None


class B2CUsersListResponse(BaseModel):
    """B2C 사용자 목록 응답"""
    users: List[B2CUserResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


class B2CStatsResponse(BaseModel):
    """B2C 통계 응답"""
    total_users: int
    active_users: int
    deleted_users: int
    verified_users: int
    onboarded_users: int
    today_signups: int
    weekly_signups: int
    monthly_signups: int


class B2CUserActivity(BaseModel):
    """B2C 유저 활동 항목"""
    type: str  # 'recommendation', 'ott_click', 'satisfaction_positive', 'satisfaction_negative'
    description: str
    movie_title: Optional[str] = None
    movie_poster: Optional[str] = None
    created_at: datetime


class B2CUserActivitiesResponse(BaseModel):
    """B2C 유저 활동 목록 응답"""
    activities: List[B2CUserActivity]
    total: int


class B2CLiveActivity(BaseModel):
    """B2C 실시간 활동 (전체 유저)"""
    user_id: str
    user_nickname: str
    type: str
    description: str
    movie_title: Optional[str] = None
    session_id: Optional[int] = None  # recommendation 타입일 때 세션 ID
    created_at: datetime


class B2CLiveActivitiesResponse(BaseModel):
    """B2C 실시간 활동 피드 응답"""
    activities: List[B2CLiveActivity]


class SessionMovieInfo(BaseModel):
    """세션 추천 영화 정보"""
    movie_id: int
    title: str
    poster_path: Optional[str] = None
    release_date: Optional[str] = None
    genres: List[str] = []


class SessionMoviesResponse(BaseModel):
    """세션 영화 목록 응답"""
    session_id: int
    user_nickname: str
    req_genres: List[str] = []
    req_runtime_max: Optional[int] = None
    movies: List[SessionMovieInfo]
    created_at: datetime
