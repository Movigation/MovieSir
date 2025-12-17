# backend/domains/auth/router.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.core.db import get_db
from backend.domains.user.models import User
from backend.domains.auth.schemas import LoginRequest, LoginResponse, UserResponse
from backend.domains.auth.utils import create_access_token
from backend.utils.password import verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
):
    """
    로그인 API
    
    - 이메일과 비밀번호로 로그인
    - 성공 시 JWT 토큰 발급
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
    
    # 4. JWT 토큰 생성
    access_token = create_access_token(data={"sub": str(user.user_id)})
    
    # refresh_token은 일단 access_token과 동일하게 설정 (나중에 개선 가능)
    refresh_token = access_token
    
    # 5. 사용자 정보 응답
    user_response = UserResponse(
        user_id=str(user.user_id),
        email=user.email,
        nickname=user.nickname,
        onboarding_completed=bool(user.onboarding_completed_at),
    )
    
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_response,
    )
