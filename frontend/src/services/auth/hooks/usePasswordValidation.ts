import { useState, useCallback } from 'react';
import { validatePassword, getPasswordErrorMessage } from '@/services/auth/components/SignupModal/signupModal.utils';

export function usePasswordValidation() {
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordConfirmError, setPasswordConfirmError] = useState('');

    // 비밀번호 입력 핸들러
    const handlePasswordChange = useCallback((value: string) => {
        setPassword(value);
        const errorMsg = getPasswordErrorMessage(value);
        setPasswordError(errorMsg);

        // 비밀번호 확인과 비교
        if (passwordConfirm && value !== passwordConfirm) {
            setPasswordConfirmError('비밀번호가 일치하지 않습니다');
        } else if (passwordConfirm) {
            setPasswordConfirmError('');
        }
    }, [passwordConfirm]);

    // 비밀번호 확인 입력 핸들러
    const handlePasswordConfirmChange = useCallback((value: string) => {
        setPasswordConfirm(value);

        if (!value) {
            setPasswordConfirmError('');
            return;
        }

        if (password !== value) {
            setPasswordConfirmError('비밀번호가 일치하지 않습니다');
        } else {
            setPasswordConfirmError('');
        }
    }, [password]);

    // 초기화
    const resetPassword = useCallback(() => {
        setPassword('');
        setPasswordConfirm('');
        setPasswordError('');
        setPasswordConfirmError('');
    }, []);

    return {
        password,
        passwordConfirm,
        passwordError,
        passwordConfirmError,
        isPasswordValid: validatePassword(password),
        isPasswordMatch: password === passwordConfirm && passwordConfirm.length > 0,
        handlePasswordChange,
        handlePasswordConfirmChange,
        resetPassword,
    };
}
