import { useState, useRef, useCallback, useEffect } from 'react';
import { validateName, getNicknameErrorMessage } from '@/services/auth/components/SignupModal/signupModal.utils';

export type ValidationStatus = 'idle' | 'checking' | 'valid' | 'invalid' | 'duplicate';

export function useNicknameValidation() {
    const [nickname, setNickname] = useState('');
    const [nicknameStatus, setNicknameStatus] = useState<ValidationStatus>('idle');
    const [nicknameError, setNicknameError] = useState('');
    const nicknameDebounceTimer = useRef<NodeJS.Timeout | null>(null);

    // 클린업
    useEffect(() => {
        return () => {
            if (nicknameDebounceTimer.current) {
                clearTimeout(nicknameDebounceTimer.current);
            }
        };
    }, []);

    // 닉네임 형식 검증만 수행 (중복 체크는 회원가입 시 백엔드에서 처리)
    const checkNicknameFormat = useCallback((nicknameValue: string) => {
        // 형식 검증
        if (!validateName(nicknameValue)) {
            setNicknameStatus('invalid');
            setNicknameError(getNicknameErrorMessage(nicknameValue));
            return false;
        }

        setNicknameStatus('valid');
        setNicknameError('');
        return true;
    }, []);

    // 닉네임 입력 핸들러
    const handleNicknameChange = useCallback((value: string) => {
        setNickname(value);

        // 빈 값
        if (!value) {
            setNicknameStatus('idle');
            setNicknameError('');
            return;
        }

        // 형식 검증만 수행 (중복 체크 제거)
        checkNicknameFormat(value);
    }, [checkNicknameFormat]);

    // 초기화
    const resetNickname = useCallback(() => {
        setNickname('');
        setNicknameStatus('idle');
        setNicknameError('');
        if (nicknameDebounceTimer.current) {
            clearTimeout(nicknameDebounceTimer.current);
        }
    }, []);

    return {
        nickname,
        nicknameStatus,
        nicknameError,
        isNicknameValid: validateName(nickname) && nicknameStatus === 'valid',
        setNicknameStatus,
        setNicknameError,
        handleNicknameChange,
        resetNickname,
    };
}
