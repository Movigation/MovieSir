// [용도] 보안 유틸리티 함수 (XSS 방지, 입력 검증 등)
// [사용법] import { sanitizeInput, validateEmail, isValidPassword } from '@/utils/security';

/**
 * XSS 공격 방지: HTML 특수문자 이스케이프
 */
export function sanitizeInput(input: string): string {
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
    };
    return input.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * 이메일 정규식 검증 (RFC 5322 표준)
 */
export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // 추가 보안 검사
    if (email.length > 254) return false;  // RFC 5321 최대 길이
    if (email.includes('..')) return false;  // 연속된 점 방지

    return emailRegex.test(email);
}

/**
 * 강력한 비밀번호 검증
 * - 최소 8자
 * - 대문자 1개 이상
 * - 소문자 1개 이상
 * - 숫자 1개 이상
 * - 특수문자 1개 이상
 */
export function isValidPassword(password: string): boolean {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    // 추가 보안 검사
    if (password.length < 8 || password.length > 128) return false;

    return passwordRegex.test(password);
}

/**
 * 닉네임 검증
 * - 한글, 영문, 숫자만 허용
 * - 2-20자
 * - 특수문자 및 공백 불가
 */
export function isValidNickname(nickname: string): boolean {
    const nicknameRegex = /^[가-힣a-zA-Z0-9]{2,20}$/;

    // 한글 자음/모음만으로 구성된 경우 방지
    const onlyConsonants = /^[ㄱ-ㅎㅏ-ㅣ]+$/;
    if (onlyConsonants.test(nickname)) return false;

    return nicknameRegex.test(nickname);
}

/**
 * URL 검증 (안전한 URL만 허용)
 */
export function isValidUrl(url: string): boolean {
    try {
        const urlObj = new URL(url);
        // https만 허용 (프로덕션) 또는 localhost 허용 (개발)
        const isHttps = urlObj.protocol === 'https:';
        const isLocalhost = urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1';

        return isHttps || (process.env.NODE_ENV === 'development' && isLocalhost);
    } catch {
        return false;
    }
}

/**
 * 프로덕션 환경에서 민감 정보 로깅 방지
 */
export function secureLog(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
        console.log(message, data);
    } else {
        // 프로덕션에서는 에러만 로깅 (민감 정보 제외)
        if (message.toLowerCase().includes('error')) {
            console.error(message);  // data는 로깅하지 않음
        }
    }
}

/**
 * 사용자 데이터에서 민감 정보 제거
 */
export function sanitizeUserData<T extends Record<string, any>>(
    user: T,
    sensitiveFields: string[] = ['password', 'token', 'accessToken', 'refreshToken']
): Partial<T> {
    const sanitized = { ...user };

    sensitiveFields.forEach(field => {
        if (field in sanitized) {
            delete sanitized[field];
        }
    });

    return sanitized;
}

/**
 * Rate Limiting: 특정 시간 내 요청 횟수 제한
 */
class RateLimiter {
    private timestamps: Map<string, number[]> = new Map();

    /**
     * 요청 허용 여부 확인
     * @param key - 제한할 키 (예: 'login', 'signup')
     * @param maxRequests - 최대 요청 수
     * @param windowMs - 시간 창 (밀리초)
     */
    public isAllowed(key: string, maxRequests: number, windowMs: number): boolean {
        const now = Date.now();
        const timestamps = this.timestamps.get(key) || [];

        // 시간 창 밖의 요청 제거
        const validTimestamps = timestamps.filter(ts => now - ts < windowMs);

        // 요청 수 확인
        if (validTimestamps.length >= maxRequests) {
            return false;
        }

        // 새 요청 추가
        validTimestamps.push(now);
        this.timestamps.set(key, validTimestamps);

        return true;
    }

    /**
     * 다음 요청까지 남은 시간 (초)
     */
    public getTimeUntilNextRequest(key: string, maxRequests: number, windowMs: number): number {
        const timestamps = this.timestamps.get(key) || [];
        if (timestamps.length < maxRequests) return 0;

        const oldestTimestamp = timestamps[0];
        const timeUntilExpire = windowMs - (Date.now() - oldestTimestamp);

        return Math.ceil(timeUntilExpire / 1000);
    }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

/**
 * 입력 길이 검증 (DoS 공격 방지)
 */
export function isWithinLengthLimit(input: string, maxLength: number = 1000): boolean {
    return input.length <= maxLength;
}

/**
 * SQL Injection 패턴 감지 (기본적인 방어)
 * 주의: 백엔드에서 Prepared Statement 사용이 필수!
 */
export function containsSqlInjectionPattern(input: string): boolean {
    const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
        /(--|\#|\/\*|\*\/)/g,  // SQL 주석
        /('|('')|;|\\x)/g      // SQL 특수문자
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * 보안 에러 메시지 생성 (정보 노출 최소화)
 */
export function getSecureErrorMessage(error: any): string {
    // 프로덕션에서는 일반적인 메시지만 반환
    if (process.env.NODE_ENV === 'production') {
        if (error?.response?.status === 401) {
            return '인증에 실패했습니다. 다시 로그인해주세요.';
        }
        if (error?.response?.status === 403) {
            return '접근 권한이 없습니다.';
        }
        if (error?.response?.status === 404) {
            return '요청한 리소스를 찾을 수 없습니다.';
        }
        if (error?.response?.status >= 500) {
            return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        }
        return '오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }

    // 개발 환경에서는 상세 메시지 반환
    return error?.response?.data?.message || error?.message || '알 수 없는 오류';
}
