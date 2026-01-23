# backend/domains/registration/mail.py

import os
import secrets
import resend


def generate_signup_code(length: int = 6) -> str:
    """
    회원가입용 인증번호 생성 (기본: 6자리 숫자).
    """
    return "".join(str(secrets.randbelow(10)) for _ in range(length))


def _get_email_html(code: str) -> str:
    """
    인증 메일 HTML 템플릿 생성 (라이트/다크모드 지원, 컴팩트).
    """
    return f"""
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <style>
        :root {{ color-scheme: light dark; }}
        @media (prefers-color-scheme: dark) {{
            .email-body {{ background-color: #0f172a !important; }}
            .email-card {{ background-color: #1e293b !important; border-color: #334155 !important; }}
            .brand-text {{ color: #60a5fa !important; }}
            .title-text {{ color: #f1f5f9 !important; }}
            .code-box {{ background-color: #0f172a !important; border-color: #3b82f6 !important; }}
            .code-text {{ color: #60a5fa !important; }}
            .info-text {{ color: #94a3b8 !important; }}
            .divider {{ border-color: #334155 !important; }}
        }}
    </style>
</head>
<body class="email-body" style="margin:0; padding:0; background-color:#f1f5f9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
            <td align="center" style="padding:24px 16px;">
                <table class="email-card" width="100%" cellpadding="0" cellspacing="0" style="max-width:400px; background-color:#ffffff; border-radius:12px; border:1px solid #e2e8f0;">
                    <!-- 헤더: 로고 + 브랜드 -->
                    <tr>
                        <td style="padding:28px 24px 20px; text-align:center;">
                            <img src="https://demo.moviesir.cloud/moviesir-logo.png" alt="무비서" width="72" height="72" style="display:block; margin:0 auto 12px; border-radius:50%;">
                            <p class="brand-text" style="margin:0; font-size:20px; font-weight:600; color:#3B82F6;">무비서</p>
                            <p class="info-text" style="margin:4px 0 0; font-size:12px; color:#94a3b8;">이동 시간 맞춤형 콘텐츠 서비스</p>
                        </td>
                    </tr>
                    <!-- 구분선 -->
                    <tr>
                        <td style="padding:0 24px;">
                            <div class="divider" style="border-top:1px solid #e2e8f0;"></div>
                        </td>
                    </tr>
                    <!-- 본문 -->
                    <tr>
                        <td style="padding:20px 24px; text-align:center;">
                            <h1 class="title-text" style="margin:0 0 12px; font-size:17px; font-weight:700; color:#1e293b;">이메일 인증</h1>
                            <p class="info-text" style="margin:0 0 20px; font-size:14px; line-height:1.5; color:#64748b;">
                                안녕하세요! 무비서 가입을 환영합니다<br>
                                아래 인증 코드를 입력해주세요
                            </p>
                            <!-- 인증 코드 박스 -->
                            <div class="code-box" style="background-color:#f0f9ff; border:1px solid #bfdbfe; border-radius:8px; padding:20px; text-align:center;">
                                <p class="code-text" style="margin:0; font-size:32px; font-weight:700; letter-spacing:8px; color:#2563eb;">{code}</p>
                            </div>
                        </td>
                    </tr>
                    <!-- 푸터 -->
                    <tr>
                        <td style="padding:16px 24px 24px; text-align:center;">
                            <p class="info-text" style="margin:0 0 4px; font-size:13px; color:#64748b;">이 코드는 <strong>10분</strong> 동안만 유효합니다</p>
                            <p class="info-text" style="margin:0 0 16px; font-size:12px; color:#94a3b8;">본인이 요청하지 않았다면 무시해주세요</p>
                            <p class="info-text" style="margin:0; font-size:11px; color:#cbd5e1;">Team Movigation</p>
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
    return f"""무비서 이메일 인증

인증 코드: {code}

10분간 유효 · 1회 사용
타인에게 공유하지 마세요
"""


def send_signup_code_email(to_email: str, code: str) -> None:
    """
    인증번호 메일 발송 (Resend API 사용).

    - RESEND_API_KEY 환경변수가 설정되어 있으면 실제 메일 전송
    - 설정이 없으면 개발 모드로 간주하고 콘솔에만 찍고 끝냄
    """
    api_key = os.getenv("RESEND_API_KEY")
    from_email = os.getenv("RESEND_FROM_EMAIL", "noreply@moviesir.cloud")
    from_name = os.getenv("RESEND_FROM_NAME", "MovieSir")

    # API Key 설정이 없으면: 개발 모드 → 콘솔 로그만 남기고 끝
    if not api_key:
        print(f"[DEV][SIGNUP] to={to_email}, code={code}")
        return

    # Resend API 설정
    resend.api_key = api_key

    # 이메일 발송
    resend.Emails.send({
        "from": f"{from_name} <{from_email}>",
        "to": [to_email],
        "subject": f"[무비서] 인증 코드: {code}",
        "html": _get_email_html(code),
        "text": _get_email_text(code),
    })
