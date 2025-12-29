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
    
    Args:
        db: 데이터베이스 세션
        user: 현재 사용자 객체
    
    Returns:
        dict: {
            "watched_movies": List[Movie],
            "total_count": int
        }
    
    Raises:
        HTTPException 404: 온보딩을 완료하지 않은 경우
    """
    # 1. 온보딩 완료 여부 확인
    if not user.onboarding_completed_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="온보딩을 완료하지 않았습니다"
        )
    
    # 2. UserOnboardingAnswer 테이블에서 사용자가 선택한 영화 ID 조회
    answers = (
        db.query(UserOnboardingAnswer)
        .filter(UserOnboardingAnswer.user_id == user.user_id)
        .all()
    )
    
    # 3. 영화 ID 리스트 추출
    movie_ids = [answer.movie_id for answer in answers]
    
    # 4. Movie 테이블에서 영화 정보 조회
    movies = (
        db.query(Movie)
        .filter(Movie.movie_id.in_(movie_ids))
        .all()
    )
    
    return {
        "watched_movies": movies,
        "total_count": len(movies)
    }


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
        HTTPException 400: 현재 닉네임과 동일한 경우
    """
    # 1. 현재 닉네임과 동일한지 확인
    if user.nickname == new_nickname:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="현재 닉네임과 동일합니다"
        )
    
    # 2. 닉네임 업데이트
    user.nickname = new_nickname
    user.updated_at = datetime.utcnow()
    
    # 3. 커밋
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user.nickname


# ======================================================
# MP-03-02: 회원 탈퇴 (Soft Delete)
# ======================================================
def delete_user_account(db: Session, user: User, password: str) -> None:
    """
    회원 탈퇴 처리 (Soft Delete)
    
    Args:
        db: 데이터베이스 세션
        user: 현재 사용자 객체
        password: 확인용 비밀번호
    
    Raises:
        HTTPException 401: 비밀번호가 일치하지 않는 경우
        HTTPException 400: 이미 탈퇴한 회원인 경우
    
    Process:
        1. 비밀번호 검증
        2. deleted_at 타임스탬프 설정 (Soft Delete)
        3. refresh_token 삭제
    """
    # 1. 이미 탈퇴한 회원인지 확인
    if user.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 탈퇴한 회원입니다"
        )
    
    # 2. 비밀번호 검증
    if not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="비밀번호가 일치하지 않습니다"
        )
    
    # 3. Soft Delete 처리
    user.deleted_at = datetime.utcnow()
    user.refresh_token = None  # 토큰 무효화
    
    # 4. 커밋
    db.add(user)
    db.commit()


# ======================================================
# MP-04-01: 추천 만족도 조사
# ======================================================
def save_satisfaction_survey(
    db: Session,
    user: User,
    session_id: str,
    rating: int,
    comment: Optional[str] = None
) -> dict:
    """
    추천 만족도 조사 저장
    
    Args:
        db: 데이터베이스 세션
        user: 현재 사용자 객체
        session_id: 추천 세션 ID
        rating: 만족도 점수 (1~5)
        comment: 추가 코멘트 (선택)
    
    Returns:
        dict: 저장된 정보
    
    Note:
        현재는 만족도 테이블이 없으므로 로그만 남김
        실제 구현 시 RecommendationSatisfaction 테이블에 저장 필요
    """
    # TODO: 실제 만족도 테이블에 저장
    # 현재는 로그만 출력
    print(f"[만족도 조사] user_id={user.user_id}, session_id={session_id}, "
          f"rating={rating}, comment={comment}")
    
    # 실제 구현 예시:
    # satisfaction = RecommendationSatisfaction(
    #     user_id=user.user_id,
    #     session_id=session_id,
    #     rating=rating,
    #     comment=comment,
    #     created_at=datetime.utcnow()
    # )
    # db.add(satisfaction)
    # db.commit()
    
    return {
        "session_id": session_id,
        "rating": rating,
        "comment": comment
    }
