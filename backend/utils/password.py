# backend/utils/password.py

import bcrypt


def hash_password(password: str) -> str:
    """
    비밀번호 해싱 (bcrypt 사용)
    """
    # UTF-8로 인코딩
    password_bytes = password.encode("utf-8")

    # bcrypt는 72바이트 제한이 있으므로 잘라줌
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]

    # bcrypt 해싱
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)

    # 문자열로 반환
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    비밀번호 검증
    """
    # UTF-8로 인코딩
    password_bytes = plain_password.encode("utf-8")

    # bcrypt는 72바이트 제한이 있으므로 잘라줌
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]

    # 해시된 비밀번호도 bytes로 변환
    hashed_bytes = hashed_password.encode("utf-8")

    # 검증
    return bcrypt.checkpw(password_bytes, hashed_bytes)
