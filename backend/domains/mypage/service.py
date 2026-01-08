# backend/domains/mypage/service.py

from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from backend.domains.user.models import User, UserOttMap, UserOnboardingAnswer
from backend.domains.movie.models import Movie
from backend.utils.password import verify_password

# ======================================================
# MP-01-01: 내가 본 영화 조회
# ======================================================
def get_watched_movies(db: Session, user: User) -> dict:
    """
    사용자가 온보딩에서 선택한 영화 목록 조회
    """
    watched = (
        db.query(Movie)
        .join(UserOnboardingAnswer, Movie.movie_id == UserOnboardingAnswer.movie_id)
        .filter(UserOnboardingAnswer.user_id == user.user_id)
        .all()
    )
    
    return {
        "watched_movies": watched,
        "total_count": len(watched)
    }


# ======================================================
# MP-02-00: 현재 구독 OTT 조회
# ======================================================
def get_current_ott(db: Session, user: User) -> List[int]:
    """
    사용자의 현재 구독 중인 OTT ID 목록 조회
    
    Args:
        db: 데이터베이스 세션
        user: 현재 사용자 객체
    
    Returns:
        List[int]: 현재 구독 중인 OTT provider ID 리스트
    """
    # 현재 구독 중인 OTT 조회
    current_subscriptions = db.query(UserOttMap).filter(
        UserOttMap.user_id == user.user_id
    ).all()
    
    # provider_id만 추출하여 리스트로 반환
    return [subscription.provider_id for subscription in current_subscriptions]


# ======================================================
# MP-02-01: 구독 OTT 변경
# ======================================================
def update_user_ott(db: Session, user: User, ott_ids: List[int]) -> List[int]:
    """
    사용자의 구독 OTT 정보 업데이트
    
    Args:
        db: 데이터베이스 세션
        user: 현재 사용자 객체
        ott_ids: 새로 선택한 OTT provider ID 리스트
    
    Returns:
        List[int]: 실제로 저장된 OTT ID 목록
    
    Process:
        1. 기존 구독 정보 모두 삭제
        2. 새로운 구독 정보 추가
    """
    # 1. 기존 OTT 구독 정보 삭제
    db.query(UserOttMap).filter(
        UserOttMap.user_id == user.user_id
    ).delete(synchronize_session=False)
    
    # 2. 새로운 OTT 구독 정보 추가
    # 빈 리스트가 아닌 경우에만 추가
    if ott_ids:
        for ott_id in ott_ids:
            new_mapping = UserOttMap(
                user_id=user.user_id,
                provider_id=ott_id
            )
            db.add(new_mapping)
    
    # 3. 커밋
    db.commit()
    
    return ott_ids


# ======================================================
# MP-03-01: 닉네임 변경
# ======================================================
def update_user_nickname(db: Session, user: User, new_nickname: str) -> str:
    """
    사용자 닉네임 변경
    
    Args:
        db: 데이터베이스 세션
        user: 현재 사용자 객체
        new_nickname: 새로운 닉네임 (이미 validated됨)
    
    Returns:
        str: 변경된 닉네임
    
    Raises:
        HTTPException 409: 다른 사용자의 닉네임과 중복된 경우
    """
    # 1. 다른 사용자의 닉네임과 중복되는지 확인
    existing_user = db.query(User).filter(
        User.nickname == new_nickname,
        User.user_id != user.user_id,  # 본인은 제외
        User.deleted_at.is_(None)  # 탈퇴하지 않은 사용자만
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 사용 중인 닉네임입니다"
        )
    
    # 2. 닉네임 업데이트 (현재 닉네임과 동일해도 OK)
    user.nickname = new_nickname
    user.updated_at = datetime.utcnow()
    
    # 3. 커밋
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user.nickname


# ======================================================
# MP-03-02: 회원 탈퇴 (Hard Delete)
# ======================================================
def delete_user_account(db: Session, user: User, password: str) -> None:
    """
    회원 탈퇴 처리 (Hard Delete)
    
    Args:
        db: 데이터베이스 세션
        user: 현재 사용자 객체
        password: 확인용 비밀번호
    
    Raises:
        HTTPException 401: 비밀번호가 일치하지 않는 경우
    
    Process:
        1. 비밀번호 검증
        2. DB에서 사용자 데이터 완전 삭제
        3. 관련 데이터(OTT 매핑, 온보딩 응답, 사용자 벡터 등)는 CASCADE로 자동 삭제
    
    Note:
        - 같은 이메일로 재가입 가능
        - 관련 외래 키는 모두 CASCADE 설정되어 있어 자동 삭제됨
    """
    # 1. 비밀번호 검증
    if not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="비밀번호가 일치하지 않습니다"
        )
    
    # 2. Hard Delete 처리
    # CASCADE 설정으로 인해 다음 데이터들이 자동 삭제됨:
    # - UserOttMap (OTT 구독 정보)
    # - UserOnboardingAnswer (온보딩 응답)
    # - UserVector (사용자 임베딩 벡터)
    db.delete(user)
    db.commit()
    
    # ※ Soft Delete 버전 (참고용)
    # # Soft Delete 처리
    # user.deleted_at = datetime.utcnow()
    # user.refresh_token = None  # 토큰 무효화
    # 
    # # 커밋
    # db.add(user)
    # db.commit()


# ======================================================
# MP-04-01: 추천 만족도 조사
# ======================================================
def save_satisfaction_survey(
    db: Session,
    user: User,
    session_id: str,
    is_positive: bool
) -> dict:
    """
    추천 만족도 조사 저장
    
    Args:
        db: 데이터베이스 세션
        user: 현재 사용자 객체
        session_id: 추천 세션 ID (문자열 형태)
        is_positive: 긍정 여부 (True: 좋아요, False: 별로예요)
    
    Returns:
        dict: 저장된 정보
    
    Raises:
        HTTPException 404: 해당 세션을 찾을 수 없는 경우
    
    Note:
        recommendation_sessions 테이블의 feedback_details JSONB 컬럼에 저장
    """
    from backend.domains.recommendation.models import RecommendationSession
    
    # 1. session_id 파싱 (문자열을 정수로 변환)
    try:
        session_id_int = int(session_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="유효하지 않은 session_id 형식입니다"
        )
    
    # 2. 해당 추천 세션 조회
    session = db.query(RecommendationSession).filter(
        RecommendationSession.session_id == session_id_int
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 추천 세션을 찾을 수 없습니다"
        )
    
    # 3. feedback_details에 만족도 저장
    feedback_data = {
        "is_positive": is_positive,
        "submitted_at": datetime.utcnow().isoformat()
    }
    
    session.feedback_details = feedback_data
    
    # 4. DB에 저장
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return {
        "session_id": session_id,
        "is_positive": is_positive
    }
