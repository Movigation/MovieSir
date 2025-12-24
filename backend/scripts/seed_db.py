#!/usr/bin/env python3
"""
MovieSir 초기 데이터 삽입 스크립트

사용법:
    cd backend
    python -m scripts.seed_db
"""

import sys
from pathlib import Path

# backend 디렉토리를 path에 추가
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from dotenv import load_dotenv
load_dotenv()

from backend.core.db import engine, SessionLocal, Base, init_db
from backend.domains.movie.models import Movie, OttProvider, MovieOttMap


def seed_ott_providers(db):
    """OTT 제공자 데이터 삽입 (TMDB provider ID 사용)"""
    providers = [
        {"provider_id": 8, "provider_name": "Netflix", "logo_path": "/netflix-logo.png"},
        {"provider_id": 337, "provider_name": "Disney+", "logo_path": "/disney-logo.png"},
        {"provider_id": 97, "provider_name": "Watcha", "logo_path": "/watcha-logo.png"},
        {"provider_id": 356, "provider_name": "Wavve", "logo_path": "/wavve-logo.png"},
        {"provider_id": 1883, "provider_name": "TVING", "logo_path": "/tving-logo.png"},
        {"provider_id": 350, "provider_name": "Apple TV+", "logo_path": "/apple-logo.png"},
        {"provider_id": 119, "provider_name": "Prime Video", "logo_path": "/prime-logo.png"},
    ]

    for p in providers:
        existing = db.query(OttProvider).filter(OttProvider.provider_id == p["provider_id"]).first()
        if not existing:
            db.add(OttProvider(**p))

    db.commit()
    print(f"[Seed] OTT 제공자 {len(providers)}개 삽입 완료")


def seed_movies(db):
    """샘플 영화 데이터 삽입"""
    movies = [
        {
            "tmdb_id": 550,
            "title": "Fight Club",
            "overview": "A ticking-Loss in the rat race of modern life.",
            "poster_path": "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
            "vote_average": 8.4,
            "genres": ["Drama", "Thriller"],
            "runtime": 139,
            "adult": False,
            "popularity": 73.5,
        },
        {
            "tmdb_id": 680,
            "title": "Pulp Fiction",
            "overview": "The lives of two mob hitmen, a boxer, a gangster and his wife.",
            "poster_path": "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
            "vote_average": 8.5,
            "genres": ["Crime", "Thriller"],
            "runtime": 154,
            "adult": False,
            "popularity": 69.8,
        },
        {
            "tmdb_id": 278,
            "title": "The Shawshank Redemption",
            "overview": "Two imprisoned men bond over a number of years.",
            "poster_path": "/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
            "vote_average": 8.7,
            "genres": ["Drama", "Crime"],
            "runtime": 142,
            "adult": False,
            "popularity": 82.3,
        },
        {
            "tmdb_id": 238,
            "title": "The Godfather",
            "overview": "The aging patriarch of an organized crime dynasty.",
            "poster_path": "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
            "vote_average": 8.7,
            "genres": ["Drama", "Crime"],
            "runtime": 175,
            "adult": False,
            "popularity": 88.2,
        },
        {
            "tmdb_id": 155,
            "title": "The Dark Knight",
            "overview": "Batman raises the stakes in his war on crime.",
            "poster_path": "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
            "vote_average": 8.5,
            "genres": ["Action", "Crime", "Drama"],
            "runtime": 152,
            "adult": False,
            "popularity": 95.1,
        },
        {
            "tmdb_id": 27205,
            "title": "Inception",
            "overview": "A thief who steals corporate secrets through dream-sharing technology.",
            "poster_path": "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
            "vote_average": 8.4,
            "genres": ["Action", "Science Fiction", "Adventure"],
            "runtime": 148,
            "adult": False,
            "popularity": 91.7,
        },
        {
            "tmdb_id": 603,
            "title": "The Matrix",
            "overview": "A computer hacker learns about the true nature of reality.",
            "poster_path": "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
            "vote_average": 8.2,
            "genres": ["Action", "Science Fiction"],
            "runtime": 136,
            "adult": False,
            "popularity": 78.4,
        },
        {
            "tmdb_id": 120,
            "title": "The Lord of the Rings: The Fellowship of the Ring",
            "overview": "A meek Hobbit sets out on an unexpected journey.",
            "poster_path": "/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg",
            "vote_average": 8.4,
            "genres": ["Adventure", "Fantasy", "Action"],
            "runtime": 178,
            "adult": False,
            "popularity": 85.6,
        },
        {
            "tmdb_id": 13,
            "title": "Forrest Gump",
            "overview": "The presidencies of Kennedy and Johnson through the eyes of an Alabama man.",
            "poster_path": "/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",
            "vote_average": 8.5,
            "genres": ["Comedy", "Drama", "Romance"],
            "runtime": 142,
            "adult": False,
            "popularity": 76.3,
        },
        {
            "tmdb_id": 122,
            "title": "The Lord of the Rings: The Return of the King",
            "overview": "Gandalf and Aragorn lead the World of Men against Sauron's army.",
            "poster_path": "/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg",
            "vote_average": 8.5,
            "genres": ["Adventure", "Fantasy", "Action"],
            "runtime": 201,
            "adult": False,
            "popularity": 84.9,
        },
        {
            "tmdb_id": 389,
            "title": "12 Angry Men",
            "overview": "A jury holdout attempts to prevent a miscarriage of justice.",
            "poster_path": "/ppd84D2i9W8jXmsyInGyihiSyqz.jpg",
            "vote_average": 8.5,
            "genres": ["Drama"],
            "runtime": 96,
            "adult": False,
            "popularity": 42.1,
        },
        {
            "tmdb_id": 424,
            "title": "Schindler's List",
            "overview": "The story of a German industrialist who saved over a thousand Jewish lives.",
            "poster_path": "/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg",
            "vote_average": 8.6,
            "genres": ["Drama", "History", "War"],
            "runtime": 195,
            "adult": False,
            "popularity": 67.8,
        },
    ]

    inserted = 0
    for m in movies:
        existing = db.query(Movie).filter(Movie.tmdb_id == m["tmdb_id"]).first()
        if not existing:
            db.add(Movie(**m))
            inserted += 1

    db.commit()
    print(f"[Seed] 영화 {inserted}개 삽입 완료 (총 {len(movies)}개 중)")


def seed_movie_ott_mappings(db):
    """영화-OTT 매핑 데이터 삽입 (TMDB provider ID 사용)"""
    # 영화별 OTT 매핑 (movie_id -> provider_ids)
    # TMDB IDs: 8=Netflix, 337=Disney+, 97=Watcha, 356=Wavve, 1883=TVING, 350=AppleTV, 119=Prime
    mappings = [
        (1, [8, 97]),        # Fight Club -> Netflix, Watcha
        (2, [8, 356]),       # Pulp Fiction -> Netflix, Wavve
        (3, [8, 97, 1883]),  # Shawshank -> Netflix, Watcha, Tving
        (4, [337, 356]),     # Godfather -> Disney+, Wavve
        (5, [8, 1883, 119]), # Dark Knight -> Netflix, Tving, Prime
        (6, [8, 337]),       # Inception -> Netflix, Disney+
        (7, [8, 356]),       # Matrix -> Netflix, Wavve
        (8, [337, 97]),      # LOTR Fellowship -> Disney+, Watcha
        (9, [8, 356, 1883]), # Forrest Gump -> Netflix, Wavve, Tving
        (10, [337, 97]),     # LOTR Return -> Disney+, Watcha
        (11, [97, 1883]),    # 12 Angry Men -> Watcha, Tving
        (12, [8, 97]),       # Schindler's List -> Netflix, Watcha
    ]

    inserted = 0
    for movie_id, provider_ids in mappings:
        for provider_id in provider_ids:
            existing = db.query(MovieOttMap).filter(
                MovieOttMap.movie_id == movie_id,
                MovieOttMap.provider_id == provider_id
            ).first()
            if not existing:
                db.add(MovieOttMap(
                    movie_id=movie_id,
                    provider_id=provider_id,
                    link_url=f"https://example.com/watch/{movie_id}?provider={provider_id}"
                ))
                inserted += 1

    db.commit()
    print(f"[Seed] 영화-OTT 매핑 {inserted}개 삽입 완료")


def main():
    print("=" * 50)
    print("MovieSir 데이터베이스 초기화")
    print("=" * 50)

    # 테이블 생성
    print("\n[1/5] 테이블 생성 중...")
    init_db()
    print("[1/5] 테이블 생성 완료")

    # 세션 생성
    db = SessionLocal()

    try:
        # OTT 제공자 삽입
        print("\n[2/4] OTT 제공자 데이터 삽입 중...")
        seed_ott_providers(db)

        # 영화 데이터 삽입
        print("\n[3/4] 영화 데이터 삽입 중...")
        seed_movies(db)

        # 영화-OTT 매핑 삽입
        print("\n[4/4] 영화-OTT 매핑 데이터 삽입 중...")
        seed_movie_ott_mappings(db)

        print("\n" + "=" * 50)
        print("데이터베이스 초기화 완료!")
        print("=" * 50)

    finally:
        db.close()


if __name__ == "__main__":
    main()
