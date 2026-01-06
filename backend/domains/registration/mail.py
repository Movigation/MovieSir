# backend/domains/registration/mail.py

import os
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def generate_signup_code(length: int = 6) -> str:
    """
    회원가입용 인증번호 생성 (기본: 6자리 숫자).
    """
    return "".join(str(secrets.randbelow(10)) for _ in range(length))


def _get_email_html(code: str) -> str:
    """
    인증 메일 HTML 템플릿 생성.
    """
    return f"""
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;">
        <tr>
            <td align="center" style="padding:40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                    <!-- 헤더 -->
                    <tr>
                        <td style="padding:40px 40px 30px; text-align:center; border-bottom:1px solid #f0f0f0;">
                            <img src="https://moviesir.cloud/moviesir-logo.png" alt="MovieSir" width="120" style="display:block; margin:0 auto 15px;">
                            <h1 style="margin:0; font-size:28px; font-weight:700; color:#2563EB;">MovieSir</h1>
                        </td>
                    </tr>
                    <!-- 본문 -->
                    <tr>
                        <td style="padding:40px;">
                            <h2 style="margin:0 0 20px; font-size:22px; font-weight:600; color:#333333;">
                                이메일 인증
                            </h2>
                            <p style="margin:0 0 30px; font-size:16px; line-height:1.6; color:#666666;">
                                안녕하세요! MovieSir 가입을 환영합니다.<br>
                                아래 인증 코드를 입력하여 회원가입을 완료해주세요.
                            </p>
                            <!-- 인증 코드 박스 -->
                            <div style="background-color:#f0f7ff; border:2px solid #2563EB; border-radius:8px; padding:25px; text-align:center; margin:0 0 30px;">
                                <p style="margin:0 0 10px; font-size:14px; color:#999999;">인증 코드</p>
                                <p style="margin:0; font-size:36px; font-weight:700; letter-spacing:8px; color:#2563EB;">
                                    {code}
                                </p>
                            </div>
                            <p style="margin:0; font-size:14px; line-height:1.6; color:#999999;">
                                이 코드는 <strong>10분</strong> 동안만 유효합니다.<br>
                                본인이 요청하지 않았다면 이 메일을 무시해주세요.
                            </p>
                        </td>
                    </tr>
                    <!-- 푸터 -->
                    <tr>
                        <td style="padding:30px 40px; background-color:#fafafa; border-radius:0 0 12px 12px; text-align:center;">
                            <p style="margin:0 0 10px; font-size:12px; color:#999999;">
                                본 메일은 발신 전용이며, 회신되지 않습니다.
                            </p>
                            <p style="margin:0; font-size:12px; color:#cccccc;">
                                &copy; 2025 MovieSir. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""


def _get_email_text(code: str) -> str:
    """
    인증 메일 플레인 텍스트 버전 (HTML 미지원 클라이언트용).
    """
    return f"""MovieSir 이메일 인증

안녕하세요! MovieSir 가입을 환영합니다.
아래 인증 코드를 입력하여 회원가입을 완료해주세요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
인증 코드: {code}
━━━━━━━━━━━━━━━━━━━━━━━━━━━

이 코드는 10분 동안만 유효합니다.
본인이 요청하지 않았다면 이 메일을 무시해주세요.

---
본 메일은 발신 전용이며, 회신되지 않습니다.
(C) 2025 MovieSir. All rights reserved.
"""


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
    from_name = os.getenv("SMTP_FROM_NAME", "무비서")

    # SMTP 설정이 없으면: 개발 모드 → 콘솔 로그만 남기고 끝
    if not (smtp_host and smtp_user and smtp_password):
        print(f"[DEV][SIGNUP] to={to_email}, code={code}")
        return

    # HTML + 플레인 텍스트 멀티파트 메시지
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "[MovieSir] 이메일 인증을 완료해주세요"
    msg["From"] = f"{from_name} <{from_email}>"
    msg["To"] = to_email

    # 플레인 텍스트 버전 (먼저 추가)
    text_part = MIMEText(_get_email_text(code), "plain", "utf-8")
    msg.attach(text_part)

    # HTML 버전 (나중에 추가 - 우선 표시됨)
    html_part = MIMEText(_get_email_html(code), "html", "utf-8")
    msg.attach(html_part)

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)
