# backend/domains/auth/utils.py

import os
from datetime import datetime, timedelta
from typing import Optional

from jose import jwt
from jose.exceptions import ExpiredSignatureError
from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.core.db import get_db
from backend.domains.user.models import User

# ======================================================
# JWT 설정
# ======================================================
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-key")  # 테스트 환경 기본값
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7
# 일단은 단일토큰에 일주일로 설정
# 자동로그인 기능 추가할때는 refresh 토큰을 추가해서 access 토큰을 갱신하는 방향으로 수정


# ======================================================
# JWT 생성 함수
# ======================================================
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    payload(data)를 받아 JWT access token을 생성한다.
    """
    to_encode = data.copy()

    expire = datetime.utcnow() + (
        expires_delta
        if expires_delta
        else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# ======================================================
# 현재 로그인된 유저 조회 (쿠키 기반)
# ======================================================
def get_current_user(
    access_token: Optional[str] = Cookie(None),  # HttpOnly 쿠키에서 자동 추출
    db: Session = Depends(get_db),
) -> User:
    # -----------------------------
    # 토큰 존재 여부 확인
    # -----------------------------
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증이 필요합니다.",
        )
    
    # -----------------------------
    # 토큰 디코딩
    # -----------------------------
    try:
        payload = jwt.decode(access_token, SECRET_KEY, algorithms=[ALGORITHM])
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰이 만료되었습니다.",
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 토큰입니다.",
        )

    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰에 유저 정보가 없습니다.",
        )

    # -----------------------------
    # DB에서 유저 조회
    # -----------------------------
    user = db.query(User).filter(User.user_id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="해당 유저를 찾을 수 없습니다.",
        )

    if user.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="탈퇴한 유저입니다.",
        )

    return user
