# backend/domains/registration/schema.py

from typing import List

from pydantic import BaseModel, EmailStr, Field


# =========================
# REG-01-01 회원가입 요청
# =========================
class SignupRequest(BaseModel):  # 회원가입 요청

    email: EmailStr
    password: str = Field(min_length=8)
    nickname: str = Field(min_length=1, max_length=30)


class SignupRequestResponse(BaseModel):  # 회원가입 요청 응답 (인증 메일 발송 후)

    email: EmailStr
    expires_in: int  # seconds (예: 600)


# =========================
# REG-01-02 이메일 인증 확인
# =========================
class SignupConfirm(BaseModel):  # 이메일 인증 코드 확인 요청

    email: EmailStr
    code: str


class AuthToken(BaseModel):  # JWT 토큰 응답 포맷

    access_token: str
    token_type: str = "bearer"


class SignupConfirmResponse(
    BaseModel
):  # 회원가입, 회원가입 완료시 별도 로그인 필요 없이 로그인된 상태로 전환

    user_id: str
    email: EmailStr
    onboarding_completed: bool
    token: AuthToken



