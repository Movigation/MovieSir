import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { validateEmail } from '@/services/auth/components/SignupModal/signupModal.utils';

export type ValidationStatus = 'idle' | 'checking' | 'valid' | 'invalid' | 'duplicate';

// 대표 이메일 도메인 목록
export const EMAIL_DOMAINS = [
    'gmail.com',
    'naver.com',
    'daum.net',
    'kakao.com',
    'hanmail.net',
    'nate.com',
    'hotmail.com',
    'outlook.com',
    'yahoo.com',
    'direct', // 직접 입력
];

export function useEmailValidation() {
    const [emailId, setEmailId] = useState(''); // 아이디 부분 (@ 앞)
    const [emailDomain, setEmailDomain] = useState('gmail.com'); // 도메인 부분 (@ 뒤)
    const [customDomain, setCustomDomain] = useState(''); // 직접 입력 도메인
    const [emailStatus, setEmailStatus] = useState<ValidationStatus>('idle');
    const [emailError, setEmailError] = useState('');
    const emailDebounceTimer = useRef<NodeJS.Timeout | null>(null);

    // 전체 이메일 조합
    const email = useMemo(() => {
        if (!emailId) return '';
        const domain = emailDomain === 'direct' ? customDomain : emailDomain;
        if (!domain) return emailId + '@';
        return `${emailId}@${domain}`;
    }, [emailId, emailDomain, customDomain]);

    // 클린업
    useEffect(() => {
        return () => {
            if (emailDebounceTimer.current) {
                clearTimeout(emailDebounceTimer.current);
            }
        };
    }, []);

    // 이메일 형식 검증만 수행 (중복 체크는 회원가입 시 백엔드에서 처리)
    const checkEmailFormat = useCallback((emailValue: string) => {
        // 형식 검증
        if (!validateEmail(emailValue)) {
            setEmailStatus('invalid');
            setEmailError('올바른 이메일 형식이 아닙니다');
            return false;
        }

        setEmailStatus('valid');
        setEmailError('');
        return true;
    }, []);

    // 이메일 아이디 입력 핸들러
    const handleEmailIdChange = useCallback((value: string) => {
        setEmailId(value);

        // 타이머 클리어
        if (emailDebounceTimer.current) {
            clearTimeout(emailDebounceTimer.current);
        }

        // 빈 값
        if (!value) {
            setEmailStatus('idle');
            setEmailError('');
            return;
        }

        // 도메인이 없으면 대기
        const domain = emailDomain === 'direct' ? customDomain : emailDomain;
        if (!domain) {
            setEmailStatus('idle');
            setEmailError('도메인을 선택하거나 입력해주세요');
            return;
        }

        const fullEmail = `${value}@${domain}`;

        // 형식 검증만 수행 (중복 체크 제거)
        checkEmailFormat(fullEmail);
    }, [emailDomain, customDomain, checkEmailFormat]);

    // 이메일 도메인 선택 핸들러
    const handleEmailDomainChange = useCallback((value: string) => {
        setEmailDomain(value);

        // 직접 입력이 아닌 경우 customDomain 초기화
        if (value !== 'direct') {
            setCustomDomain('');
        }

        // 아이디가 있으면 재검증
        if (emailId) {
            handleEmailIdChange(emailId);
        }
    }, [emailId, handleEmailIdChange]);

    // 커스텀 도메인 입력 핸들러
    const handleCustomDomainChange = useCallback((value: string) => {
        setCustomDomain(value);

        // 아이디가 있으면 재검증
        if (emailId) {
            handleEmailIdChange(emailId);
        }
    }, [emailId, handleEmailIdChange]);

    // 전체 이메일 변경 핸들러 (기존 호환성 유지)
    const handleEmailChange = useCallback((value: string) => {
        const [id, domain] = value.split('@');
        setEmailId(id || '');
        if (domain) {
            if (EMAIL_DOMAINS.includes(domain)) {
                setEmailDomain(domain);
            } else {
                setEmailDomain('direct');
                setCustomDomain(domain);
            }
        }
    }, []);

    // 초기화
    const resetEmail = useCallback(() => {
        setEmailId('');
        setEmailDomain('gmail.com');
        setCustomDomain('');
        setEmailStatus('idle');
        setEmailError('');
        if (emailDebounceTimer.current) {
            clearTimeout(emailDebounceTimer.current);
        }
    }, []);

    return {
        email, // 전체 이메일
        emailId, // 아이디 부분
        emailDomain, // 도메인 부분
        customDomain, // 직접 입력 도메인
        emailStatus,
        emailError,
        isEmailValid: validateEmail(email) && emailStatus === 'valid',
        setEmailStatus,  // 추가
        setEmailError,   // 추가
        handleEmailIdChange,
        handleEmailDomainChange,
        handleCustomDomainChange,
        handleEmailChange, // 기존 호환성 유지
        resetEmail,
    };
}
