# backend/domains/registration/mail.py

import os
import secrets
import smtplib
from email.message import EmailMessage


def generate_signup_code(length: int = 6) -> str:
    """
    회원가입용 인증번호 생성 (기본: 6자리 숫자).
    """
    return "".join(str(secrets.randbelow(10)) for _ in range(length))


def send_signup_code_email(to_email: str, code: str) -> None:
    """
    인증번호 메일 발송.

    - SMTP 환경변수가 설정되어 있으면 실제 메일 전송
    - 설정이 없으면 개발 모드로 간주하고 콘솔에만 찍고 끝냄
    """

    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    from_email = os.getenv("SMTP_FROM", smtp_user or "")

    # SMTP 설정이 없으면: 개발 모드 → 콘솔 로그만 남기고 끝
    if not (smtp_host and smtp_user and smtp_password):
        print(f"[DEV][SIGNUP] to={to_email}, code={code}")
        return

    msg = EmailMessage()
    msg["Subject"] = "Movigation 회원가입 인증 코드"
    msg["From"] = from_email
    msg["To"] = to_email
    msg.set_content(
        f"Movigation 회원가입을 위한 인증 코드입니다.\n\n"
        f"인증 코드: {code}\n"
        f"10분 안에 입력해 주세요."
    )

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)
