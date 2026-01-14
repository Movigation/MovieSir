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


class CompanyResponse(BaseModel):
    """회사 정보 응답"""
    id: str
    name: str
    email: str
    plan: str

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
    chart_data: List[ChartDataPoint]


# ==================== Logs ====================

class LogEntry(BaseModel):
    """로그 항목"""
    id: str
    time: str
    method: str
    endpoint: str
    status: int
    latency: int


class LogsResponse(BaseModel):
    """로그 목록 응답"""
    logs: List[LogEntry]
    total: int


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
