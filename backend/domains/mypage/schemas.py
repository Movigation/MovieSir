# backend/domains/mypage/schemas.py

from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


# ======================================================
# MP-01-01: 내가 본 영화 조회
# ======================================================
class WatchedMovieItem(BaseModel):
    """
    본 영화 목록의 개별 영화 정보
    """
    movie_id: int
    title: str
    poster_path: Optional[str] = None
    release_date: Optional[str] = None
    vote_average: Optional[float] = None
    
    class Config:
        from_attributes = True  # SQLAlchemy 모델과 호환


class WatchedMoviesResponse(BaseModel):
    """
    본 영화 목록 응답
    - 온보딩에서 선택한 영화 목록 반환
    """
    watched_movies: List[WatchedMovieItem]
    total_count: int  # 총 영화 개수


# ======================================================
# MP-02-01: 구독 OTT 변경
# ======================================================
class UpdateOTTRequest(BaseModel):
    """
    구독 OTT 변경 요청
    - ott_ids: 새로 선택한 OTT provider ID 리스트
    - 빈 리스트도 가능 (모든 구독 해제)
    """
    ott_ids: List[int] = Field(
        ...,
        description="선택한 OTT provider ID 리스트 (예: [1, 2, 3])",
        example=[1, 2, 3]
    )
    
    @field_validator('ott_ids')
    @classmethod
    def validate_ott_ids(cls, v):
        """OTT ID 유효성 검증"""
        if v is None:
            raise ValueError("ott_ids는 필수입니다 (빈 리스트 가능)")
        # 중복 제거
        if len(v) != len(set(v)):
            raise ValueError("중복된 OTT ID가 있습니다")
        return v


class UpdateOTTResponse(BaseModel):
    """
    구독 OTT 변경 응답
    """
    message: str = "OTT 구독 정보가 업데이트되었습니다"
    updated_ott_ids: List[int]  # 실제로 저장된 OTT ID 목록


# ======================================================
# MP-03-01: 닉네임 변경
# ======================================================
class UpdateNicknameRequest(BaseModel):
    """
    닉네임 변경 요청
    - 2~16자 제한
    """
    nickname: str = Field(
        ...,
        min_length=2,
        max_length=16,
        description="새로운 닉네임 (2~16자)",
        example="영화광123"
    )
    
    @field_validator('nickname')
    @classmethod
    def validate_nickname(cls, v):
        """닉네임 유효성 검증"""
        # 공백 제거 후 확인
        v = v.strip()
        if not v:
            raise ValueError("닉네임은 공백만으로 이루어질 수 없습니다")
        if len(v) < 2 or len(v) > 16:
            raise ValueError("닉네임은 2~16자여야 합니다")
        return v


class UpdateNicknameResponse(BaseModel):
    """
    닉네임 변경 응답
    """
    message: str = "닉네임이 변경되었습니다"
    nickname: str  # 변경된 닉네임


# ======================================================
# MP-03-02: 회원 탈퇴 (Soft Delete)
# ======================================================
class DeleteAccountRequest(BaseModel):
    """
    회원 탈퇴 요청
    - 비밀번호 확인 필수 (보안)
    """
    password: str = Field(
        ...,
        description="현재 비밀번호 (확인용)",
        example="password123"
    )


class DeleteAccountResponse(BaseModel):
    """
    회원 탈퇴 응답
    """
    message: str = "회원 탈퇴가 완료되었습니다"


# ======================================================
# MP-04-01: 추천 만족도 조사
# ======================================================
class SatisfactionRequest(BaseModel):
    """
    추천 만족도 조사 요청
    - session_id: 추천 세션 ID
    - rating: 만족도 점수 (1~5점)
    - comment: 선택적 코멘트
    """
    session_id: str = Field(
        ...,
        description="추천 세션 ID",
        example="rec_20231223_abc123"
    )
    rating: int = Field(
        ...,
        ge=1,
        le=5,
        description="만족도 점수 (1~5)",
        example=4
    )
    comment: Optional[str] = Field(
        None,
        max_length=500,
        description="추가 코멘트 (선택사항, 최대 500자)",
        example="추천이 정확했어요!"
    )


class SatisfactionResponse(BaseModel):
    """
    만족도 조사 응답
    """
    message: str = "만족도 조사가 완료되었습니다"
    session_id: str
    rating: int
