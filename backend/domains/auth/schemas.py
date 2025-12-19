# backend/domains/auth/schemas.py

from pydantic import BaseModel, EmailStr


# =========================
# 로그인
# =========================
class LoginRequest(BaseModel):
    """로그인 요청"""
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """로그인 응답 - 토큰은 HttpOnly 쿠키로 전달"""
    user: "UserResponse"


class UserResponse(BaseModel):
    """사용자 정보 응답"""
    user_id: str
    email: EmailStr
    nickname: str
    onboarding_completed: bool

    class Config:
        from_attributes = True  # SQLAlchemy 모델과 호환
