// [용도] 로그인 폼 유효성 검증 로직
// [사용법] import { validateEmail, validatePassword } from '@/services/auth/components/LoginModal/loginModal.utils';

import type { LoginFormErrors } from '@/services/auth/components/LoginModal/loginModal.types';

/**
 * 이메일 형식 검증
 * @param email - 검증할 이메일 주소
 * @returns 에러 메시지 또는 undefined
 */
export const validateEmail = (email: string): string | undefined => {
    if (!email) {
        return '이메일을 입력해주세요';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return '올바른 이메일 형식이 아닙니다';
    }

    return undefined;
};

/**
 * 비밀번호 검증
 * @param password - 검증할 비밀번호
 * @returns 에러 메시지 또는 undefined
 */
export const validatePassword = (password: string): string | undefined => {
    if (!password) {
        return '비밀번호를 입력해주세요';
    }

    if (password.length < 6) {
        return '비밀번호는 최소 6자 이상이어야 합니다';
    }

    return undefined;
};

/**
 * 로그인 폼 전체 검증
 * @param email - 이메일 주소
 * @param password - 비밀번호
 * @returns 에러 객체
 */
export const validateLoginForm = (
    email: string,
    password: string
): LoginFormErrors => {
    return {
        email: validateEmail(email),
        password: validatePassword(password),
    };
};
