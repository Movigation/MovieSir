# backend/domains/recommendation/constants.py

# Frontend와 동일한 장르 ID -> 이름 매핑
GENRE_ID_TO_NAME = {
    1: "Action",
    2: "Adventure",
    3: "Animation",
    4: "Comedy",
    5: "Crime",
    6: "Documentary",
    7: "Drama",
    8: "Family",
    9: "Fantasy",
    10: "History",
    11: "Horror",
    12: "Music",
    13: "Mystery",
    14: "Romance",
    15: "Science Fiction",
    16: "Thriller",
    17: "War",
    18: "Western"
}

# 이름 -> ID 역매핑
GENRE_NAME_TO_ID = {v: k for k, v in GENRE_ID_TO_NAME.items()}

# 한글 -> 영문 장르 매핑 (Frontend에서 한글로 보낼 경우 대비)
GENRE_KO_TO_EN = {
    "액션": "Action",
    "모험": "Adventure",
    "애니메이션": "Animation",
    "코미디": "Comedy",
    "범죄": "Crime",
    "다큐멘터리": "Documentary",
    "드라마": "Drama",
    "가족": "Family",
    "판타지": "Fantasy",
    "역사": "History",
    "공포": "Horror",
    "음악": "Music",
    "미스터리": "Mystery",
    "로맨스": "Romance",
    "SF": "Science Fiction",
    "스릴러": "Thriller",
    "전쟁": "War",
    "서부": "Western"
}

# 영문 -> 한글 역매핑
GENRE_EN_TO_KO = {v: k for k, v in GENRE_KO_TO_EN.items()}


def genre_ids_to_names(genre_ids: list) -> list:
    """장르 ID 리스트를 영문 이름 리스트로 변환"""
    return [GENRE_ID_TO_NAME.get(gid) for gid in genre_ids if gid in GENRE_ID_TO_NAME]


def genre_names_to_ids(genre_names: list) -> list:
    """장르 이름 리스트를 ID 리스트로 변환"""
    return [GENRE_NAME_TO_ID.get(name) for name in genre_names if name in GENRE_NAME_TO_ID]
