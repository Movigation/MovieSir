# backend/domains/recommendation/mock_ai.py

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.domains.movie.models import Movie
from .constants import genre_ids_to_names


class MockRecommender:
    """
    AI 모델 데이터 파일이 없을 때 사용하는 Mock 추천기
    DB에서 직접 영화를 조회하여 인기도/평점 순으로 추천
    """

    def __init__(self, db: Session):
        self.db = db

    def predict(self, user_id: str, top_k: int = 20) -> List[int]:
        """
        Mock 예측: DB에서 인기도/평점 순으로 영화 ID 반환
        """
        movies = (
            self.db.query(Movie.movie_id)
            .filter(Movie.adult == False)
            .order_by(Movie.popularity.desc().nullslast())
            .limit(top_k)
            .all()
        )
        return [m.movie_id for m in movies]

    def recommend_with_filters(
        self,
        runtime_limit: Optional[int] = None,
        genre_ids: Optional[List[int]] = None,
        include_adult: bool = False,
        top_k: int = 6
    ) -> List[Movie]:
        """
        필터 조건을 적용한 Mock 추천

        Args:
            runtime_limit: 최대 러닝타임(분)
            genre_ids: 장르 ID 리스트 (Frontend에서 전송)
            include_adult: 성인 콘텐츠 포함 여부
            top_k: 반환할 영화 개수
        """
        query = self.db.query(Movie)

        # 1. 성인물 필터
        if not include_adult:
            query = query.filter(Movie.adult == False)

        # 2. 런타임 필터
        if runtime_limit:
            query = query.filter(
                or_(
                    Movie.runtime <= runtime_limit,
                    Movie.runtime == None  # 런타임 정보 없는 영화도 포함
                )
            )

        # 3. 장르 필터 (장르 ID -> 영문 이름으로 변환 후 필터링)
        if genre_ids:
            genre_names = genre_ids_to_names(genre_ids)
            if genre_names:
                # PostgreSQL ARRAY 타입: 하나라도 포함되면 통과
                genre_conditions = [Movie.genres.any(g) for g in genre_names if g]
                if genre_conditions:
                    query = query.filter(or_(*genre_conditions))

        # 4. 인기도/평점 순 정렬
        query = query.order_by(
            Movie.vote_average.desc().nullslast(),
            Movie.popularity.desc().nullslast()
        )

        return query.limit(top_k).all()


def get_mock_recommender(db: Session) -> MockRecommender:
    """MockRecommender 인스턴스 반환"""
    return MockRecommender(db)
