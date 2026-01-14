# backend/domains/auth/router.py

from fastapi import APIRouter, Depends, HTTPException, Response, status, Cookie
from sqlalchemy.orm import Session
import os

from backend.core.db import get_db
from backend.domains.user.models import User
from backend.domains.auth.schemas import LoginRequest, LoginResponse, UserResponse
from backend.domains.auth.utils import create_access_token, get_current_user
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
    - remember_me 여부에 따라 토큰 만료 시간 차별화
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

    # 4. remember_me 여부에 따라 토큰 만료 시간 설정
    # - 자동로그인 체크 (remember_me=True): Access 30분, Refresh 7일 (자동 갱신)
    # - 자동로그인 미체크 (remember_me=False): Access 1시간, Refresh 사용 안 함
    from datetime import timedelta
    
    if request.remember_me:
        access_token_max_age = 1800  # 30분 (자동 갱신 예정)
        refresh_token_max_age = 604800  # 7일
        
        # 토큰 생성
        access_token = create_access_token(
            data={"sub": str(user.user_id), "nickname": user.nickname},
            expires_delta=timedelta(seconds=access_token_max_age)
        )
        refresh_token = create_access_token(
            data={"sub": str(user.user_id), "nickname": user.nickname},
            expires_delta=timedelta(seconds=refresh_token_max_age)
        )
        
        # DB에 Refresh Token 저장 (자동 갱신용)
        user.refresh_token = refresh_token
    else:
        access_token_max_age = 3600  # 1시간 (프론트엔드 타이머와 동기화)
        refresh_token_max_age = 3600  # 1시간 (갱신 없음)
        
        # 토큰 생성
        access_token = create_access_token(
            data={"sub": str(user.user_id), "nickname": user.nickname},
            expires_delta=timedelta(seconds=access_token_max_age)
        )
        refresh_token = create_access_token(
            data={"sub": str(user.user_id), "nickname": user.nickname},
            expires_delta=timedelta(seconds=refresh_token_max_age)
        )
        
        # Refresh Token 미사용 (자동로그인 체크 안 함)
        user.refresh_token = None
    
    db.add(user)
    db.commit()

    # 5. HttpOnly 쿠키에 토큰 설정 (XSS 공격 방어)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=access_token_max_age,
        path="/",
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=refresh_token_max_age,
        path="/",
    )

    # 6. remember_me 상태를 쿠키로 전달 (프론트엔드에서 타이머 설정용)
    response.set_cookie(
        key="remember_me",
        value="true" if request.remember_me else "false",
        httponly=False,  # JavaScript에서 읽을 수 있어야 함
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=refresh_token_max_age,
        path="/",
    )

    # 7. 사용자 정보만 응답 (토큰은 쿠키로 전송됨)
    user_response = UserResponse(
        user_id=str(user.user_id),
        email=user.email,
        nickname=user.nickname,
        onboarding_completed=bool(user.onboarding_completed_at),
    )

    return LoginResponse(user=user_response)


@router.post("/refresh", summary="토큰 갱신")
def refresh_access_token(
    refresh_token: str = Cookie(None),
    response: Response = None,
    db: Session = Depends(get_db),
):
    """
    Access Token 갱신 API (자동로그인 사용자 전용)
    
    - Refresh Token으로 새로운 Access Token 발급
    - remember_me=True인 경우에만 사용
    - Refresh Token이 만료되었거나 유효하지 않으면 401 에러
    """
    from backend.domains.auth.utils import verify_refresh_token
    from datetime import timedelta
    
    # 1. Refresh Token 존재 확인
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh Token이 없습니다. 다시 로그인해주세요.",
        )
    
    # 2. Refresh Token 검증 및 user_id 추출
    user_id = verify_refresh_token(refresh_token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않거나 만료된 Refresh Token입니다.",
        )
    
    # 3. DB에서 사용자 조회
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="사용자를 찾을 수 없습니다.",
        )
    
    # 4. DB에 저장된 Refresh Token과 일치 여부 확인 (보안 강화)
    if user.refresh_token != refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 Refresh Token입니다.",
        )
    
    # 5. 탈퇴한 회원 체크
    if user.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="탈퇴한 회원입니다.",
        )
    
    # 6. 새로운 Access Token 생성 (30분)
    new_access_token = create_access_token(
        data={"sub": str(user.user_id), "nickname": user.nickname},
        expires_delta=timedelta(seconds=1800)  # 30분
    )
    
    # 7. 쿠키에 새 Access Token 설정
    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=1800,  # 30분
        path="/",
    )
    
    return {"message": "Access Token이 갱신되었습니다."}


@router.post("/logout", summary="로그아웃")
def logout(
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    로그아웃 API
    - HttpOnly 쿠키에서 토큰 삭제
    - DB에 저장된 Refresh Token을 삭제하여 재발급을 불가능하게 함.
    """
    # 1. 쿠키 삭제
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    response.delete_cookie(key="remember_me", path="/")  # remember_me 쿠키도 삭제

    # 2. DB에서 리프레시 토큰 삭제 (NULL 처리)
    current_user.refresh_token = None
    db.add(current_user)
    db.commit()

    return {"message": "로그아웃 되었습니다."}
