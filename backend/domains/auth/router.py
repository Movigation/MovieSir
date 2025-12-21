# backend/domains/auth/router.py

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
import os

from backend.core.db import get_db
from backend.domains.user.models import User
<<<<<<< HEAD
from backend.domains.auth.schemas import LoginRequest, LoginResponse, UserResponse
from backend.domains.auth.utils import create_access_token, get_current_user
=======
from backend.domains.auth.schemas import (
    LoginRequest, LoginResponse, UserResponse,
    RefreshTokenRequest, RefreshTokenResponse
)
from backend.domains.auth.utils import create_access_token, get_current_user, verify_refresh_token
>>>>>>> 994aaba (INFRA: 중간 발표용 MVP)
from backend.utils.password import verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

# 환경별 쿠키 보안 설정
COOKIE_SECURE = os.getenv("ENVIRONMENT", "development") == "production"
COOKIE_SAMESITE = "lax"  # CSRF 방어


@router.post("/login", response_model=LoginResponse)
def login(
    request: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    로그인 API

    - 이메일과 비밀번호로 로그인
    - 성공 시 JWT 토큰을 HttpOnly 쿠키로 발급
    - 실패 시 401 에러 (이메일 또는 비밀번호 불일치)
    """

    # 1. 이메일로 사용자 찾기
    user = db.query(User).filter(User.email == request.email).first()

    # 2. 사용자가 없거나 비밀번호가 틀리면 동일한 에러 메시지 반환 (보안 강화)
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 일치하지 않습니다",
        )

    # 3. 탈퇴한 회원은 로그인 불가
    if user.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="탈퇴한 회원입니다",
        )
<<<<<<< HEAD
    
    # 4. JWT 토큰 생성 (둘 다 새로 발급)
    access_token = create_access_token(data={"sub": str(user.user_id), "nickname": user.nickname})
    refresh_token = create_access_token(data={"sub": str(user.user_id), "nickname": user.nickname}) # 실제로는 만료시간을 다르게 설정해야 함 (예: 7일)
    
    # [Level 1] DB에 Refresh Token 저장 (로그인 시 업데이트)
    user.refresh_token = refresh_token
    db.add(user)
    db.commit()
    
    # 5. HttpOnly 쿠키에 토큰 설정 (XSS 공격 방어)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,          # JavaScript 접근 차단
        secure=COOKIE_SECURE,   # HTTPS에서만 전송 (프로덕션)
        samesite=COOKIE_SAMESITE,  # CSRF 방어
        max_age=1800,           # 30분 (초 단위)
        path="/",               # 모든 경로에서 사용
    )
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=604800,         # 7일 (초 단위)
        path="/",
    )
    
    # 6. 사용자 정보만 응답 (토큰은 쿠키로 전송됨)
=======

    # 4. JWT 토큰 생성 (둘 다 새로 발급)
    access_token = create_access_token(data={"sub": str(user.user_id)})
    refresh_token = create_access_token(data={"sub": str(user.user_id)})

    # DB에 Refresh Token 저장 (로그인 시 업데이트)
    user.refresh_token = refresh_token
    db.add(user)
    db.commit()

    # 5. 사용자 정보 응답
>>>>>>> 994aaba (INFRA: 중간 발표용 MVP)
    user_response = UserResponse(
        user_id=str(user.user_id),
        email=user.email,
        nickname=user.nickname,
        onboarding_completed=bool(user.onboarding_completed_at),
    )
<<<<<<< HEAD
    
    return LoginResponse(user=user_response)
=======

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_response,
    )

>>>>>>> 994aaba (INFRA: 중간 발표용 MVP)

@router.post("/logout", summary="로그아웃")
def logout(
    response: Response,
    db: Session = Depends(get_db),
<<<<<<< HEAD
    # 현재 로그인한 유저를 가져옴 (토큰 검증 포함)
    current_user: User = Depends(get_current_user) 
):
    """
    로그아웃 API (Level 1)
    - HttpOnly 쿠키에서 토큰 삭제
=======
    current_user: User = Depends(get_current_user),
):
    """
    로그아웃 API
>>>>>>> 994aaba (INFRA: 중간 발표용 MVP)
    - DB에 저장된 Refresh Token을 삭제하여 재발급을 불가능하게 함.
    """
    # 1. 쿠키 삭제
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    
    # 2. DB에서 리프레시 토큰 삭제 (NULL 처리)
    current_user.refresh_token = None
    db.add(current_user)
    db.commit()

    return {"message": "로그아웃 되었습니다."}
<<<<<<< HEAD
=======


@router.post("/refresh", response_model=RefreshTokenResponse, summary="토큰 갱신")
def refresh_token(
    request: RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    """
    Refresh Token으로 새로운 Access Token 발급

    - Refresh Token 검증
    - DB에 저장된 토큰과 일치하는지 확인
    - 새로운 Access Token 발급
    """
    # 1. Refresh Token 검증 및 user_id 추출
    user_id = verify_refresh_token(request.refreshToken)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 리프레시 토큰입니다.",
        )

    # 2. DB에서 사용자 조회
    user = db.query(User).filter(User.user_id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="사용자를 찾을 수 없습니다.",
        )

    # 3. DB에 저장된 refresh_token과 일치하는지 확인
    if user.refresh_token != request.refreshToken:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="리프레시 토큰이 일치하지 않습니다.",
        )

    # 4. 탈퇴한 회원 체크
    if user.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="탈퇴한 회원입니다.",
        )

    # 5. 새로운 Access Token 발급
    new_access_token = create_access_token(data={"sub": str(user.user_id)})

    return RefreshTokenResponse(access_token=new_access_token)
>>>>>>> 994aaba (INFRA: 중간 발표용 MVP)
