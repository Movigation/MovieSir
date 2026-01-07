# backend/domains/mypage/router.py

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from backend.core.db import get_db
from backend.domains.auth.utils import get_current_user
from backend.domains.user.models import User
from backend.domains.mypage import service
from backend.domains.mypage.schemas import (
    WatchedMoviesResponse,
    CurrentOTTResponse,
    UpdateOTTRequest,
    UpdateOTTResponse,
    UpdateNicknameRequest,
    UpdateNicknameResponse,
    DeleteAccountRequest,
    DeleteAccountResponse,
    SatisfactionRequest,
    SatisfactionResponse,
)

router = APIRouter(prefix="/mypage", tags=["mypage"])


# ======================================================
# MP-01-01: 내가 본 영화 조회
# ======================================================
@router.get("/watched", response_model=WatchedMoviesResponse, summary="내가 본 영화 조회")
def get_watched_movies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    사용자가 온보딩에서 선택한 영화 목록 조회
    
    **권한**: 로그인 필요
    
    **응답**:
    - 200: 본 영화 목록
    - 401: 인증되지 않은 사용자
    - 404: 온보딩 미완료
    """
    result = service.get_watched_movies(db, current_user)
    
    return WatchedMoviesResponse(
        watched_movies=result["watched_movies"],
        total_count=result["total_count"]
    )


# ======================================================
# MP-02-00: 현재 구독 OTT 조회
# ======================================================
@router.get("/ott", response_model=CurrentOTTResponse, summary="현재 구독 OTT 조회")
def get_current_ott(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    사용자의 현재 구독 중인 OTT 목록 조회
    
    **권한**: 로그인 필요
    
    **응답**:
    - 200: 현재 구독 중인 OTT ID 리스트
    - 401: 인증되지 않은 사용자
    
    **용도**:
    - 프론트엔드에서 OTT 선택 화면에 현재 선택 상태 표시
    """
    current_ott_ids = service.get_current_ott(db, current_user)
    
    return CurrentOTTResponse(
        current_ott_ids=current_ott_ids
    )


# ======================================================
# MP-02-01: 구독 OTT 변경
# ======================================================
@router.put("/ott", response_model=UpdateOTTResponse, summary="구독 OTT 변경")
def update_ott(
    request: UpdateOTTRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    사용자의 구독 OTT 정보 변경
    
    **권한**: 로그인 필요
    
    **요청 Body**:
    - ott_ids: OTT provider ID 리스트 (빈 리스트 가능)
    
    **응답**:
    - 200: OTT 변경 성공
    - 401: 인증되지 않은 사용자
    - 400: 유효하지 않은 OTT ID
    
    **동작**:
    1. 기존 구독 정보 모두 삭제
    2. 새로운 구독 정보 추가
    """
    updated_ids = service.update_user_ott(db, current_user, request.ott_ids)
    
    return UpdateOTTResponse(
        message="OTT 구독 정보가 업데이트되었습니다",
        updated_ott_ids=updated_ids
    )


# ======================================================
# MP-03-01: 닉네임 변경
# ======================================================
@router.put("/nickname", response_model=UpdateNicknameResponse, summary="닉네임 변경")
def update_nickname(
    request: UpdateNicknameRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    사용자 닉네임 변경
    
    **권한**: 로그인 필요
    
    **요청 Body**:
    - nickname: 새로운 닉네임 (2~16자)
    
    **응답**:
    - 200: 닉네임 변경 성공 (현재 닉네임과 동일해도 성공)
    - 401: 인증되지 않은 사용자
    - 409: 다른 사용자의 닉네임과 중복
    - 422: 유효하지 않은 닉네임 형식 (2~16자 위반 등)
    
    **제한사항**:
    - 2~16자
    - 공백만으로 구성 불가
    - 다른 사용자와 중복 불가
    """
    updated_nickname = service.update_user_nickname(
        db, 
        current_user, 
        request.nickname
    )
    
    return UpdateNicknameResponse(
        message="닉네임이 변경되었습니다",
        nickname=updated_nickname
    )


# ======================================================
# MP-03-02: 회원 탈퇴 (Soft Delete)
# ======================================================
@router.delete("/account", response_model=DeleteAccountResponse, summary="회원 탈퇴")
def delete_account(
    request: DeleteAccountRequest,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    회원 탈퇴 처리 (Soft Delete)
    
    **권한**: 로그인 필요
    
    **요청 Body**:
    - password: 현재 비밀번호 (확인용)
    
    **응답**:
    - 200: 탈퇴 성공
    - 401: 비밀번호 불일치 또는 인증되지 않은 사용자
    - 400: 이미 탈퇴한 회원
    
    **동작**:
    1. 비밀번호 검증
    2. deleted_at 타임스탬프 설정
    3. refresh_token 삭제
    4. 쿠키에서 토큰 삭제
    
    **주의**:
    - 실제 데이터 삭제 없음 (Soft Delete)
    - 로그아웃 처리됨
    """
    # 1. 회원 탈퇴 처리
    service.delete_user_account(db, current_user, request.password)
    
    # 2. 쿠키에서 토큰 삭제 (강제 로그아웃)
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    
    return DeleteAccountResponse(
        message="회원 탈퇴가 완료되었습니다"
    )


# ======================================================
# MP-04-01: 추천 만족도 조사
# ======================================================
@router.post("/satisfaction", response_model=SatisfactionResponse, summary="추천 만족도 조사")
def submit_satisfaction(
    request: SatisfactionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    추천 만족도 조사 제출
    
    **권한**: 로그인 필요
    
    **요청 Body**:
    - session_id: 추천 세션 ID
    - is_positive: 긍정 여부 (True: 좋아요, False: 별로예요)
    
    **응답**:
    - 200: 만족도 조사 제출 성공
    - 401: 인증되지 않은 사용자
    
    **Note**:
    - 현재는 로그만 남김 (만족도 테이블 미구현)
    - 실제 구현 시 RecommendationSatisfaction 테이블에 저장 필요
    """
    result = service.save_satisfaction_survey(
        db=db,
        user=current_user,
        session_id=request.session_id,
        is_positive=request.is_positive
    )
    
    return SatisfactionResponse(
        session_id=result["session_id"],
        is_positive=result["is_positive"]
    )
