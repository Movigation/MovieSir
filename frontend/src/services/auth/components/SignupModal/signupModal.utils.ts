// [용도] SignupModal 유효성 검사 유틸리티
// [사용법] import { validateEmail, validatePassword, validateName, getEmailErrorMessage } from '@/services/auth/components/SignupModal/signupModal.utils';

// ================================
// 검증 함수 (boolean 반환)
// ================================

export const validateEmail = (email: string): boolean => {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
    if (!password || password.length < 8) return false;

    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    return hasLetter && hasNumber;
};

/**
 * 닉네임 검증 (강화된 버전)
 * - 최소 2자 이상
 * - 한글 자음(ㄱ-ㅎ)만으로는 불가
 * - 한글 모음(ㅏ-ㅣ)만으로는 불가
 */
export const validateName = (name: string): boolean => {
    if (!name || name.length < 2) return false;

    // 한글 자음 범위 (U+3131 ~ U+314E)
    const onlyConsonants = /^[ㄱ-ㅎ]+$/;
    // 한글 모음 범위 (U+314F ~ U+3163)
    const onlyVowels = /^[ㅏ-ㅣ]+$/;

    // 자음만으로 이루어진 경우 불가
    if (onlyConsonants.test(name)) return false;
    // 모음만으로 이루어진 경우 불가
    if (onlyVowels.test(name)) return false;

    return true;
};

// ================================
// 에러 메시지 생성 함수
// ================================

export const getEmailErrorMessage = (email: string): string => {
    if (!email) return '이메일을 입력해주세요';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return '올바른 이메일 형식이 아닙니다';
    return '';
};

export const getPasswordErrorMessage = (password: string): string => {
    if (!password) return '비밀번호를 입력해주세요';
    if (password.length < 8) return '비밀번호는 최소 8자 이상이어야 합니다';

    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasLetter || !hasNumber) return '비밀번호는 영문과 숫자를 포함해야 합니다';
    return '';
};

export const getNicknameErrorMessage = (nickname: string): string => {
    if (!nickname) return '닉네임을 입력해주세요';
    if (nickname.length < 2) return '닉네임은 최소 2자 이상이어야 합니다';

    // 한글 자음만으로 이루어진 경우
    const onlyConsonants = /^[ㄱ-ㅎ]+$/;
    if (onlyConsonants.test(nickname)) return '한글 자음만으로는 닉네임을 만들 수 없습니다';

    // 한글 모음만으로 이루어진 경우
    const onlyVowels = /^[ㅏ-ㅣ]+$/;
    if (onlyVowels.test(nickname)) return '한글 모음만으로는 닉네임을 만들 수 없습니다';

    return '';
};
