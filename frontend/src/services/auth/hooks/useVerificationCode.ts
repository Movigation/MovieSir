import { useState, useCallback } from 'react';
import { sendVerificationCode, verifyCode } from '@/api/authApi';

export function useVerificationCode() {
    const [code, setCode] = useState('');
    const [codeSent, setCodeSent] = useState(false);
    const [codeVerified, setCodeVerified] = useState(false);
    const [codeError, setCodeError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // 인증번호 전송
    const sendCode = useCallback(async (email: string) => {
        try {
            setIsLoading(true);
            setCodeError('');
            await sendVerificationCode(email);
            setCodeSent(true);
            return { success: true };
        } catch (err: any) {
            const errorMsg = err.message || '인증번호 전송 실패';
            setCodeError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 인증번호 확인 (+ 회원가입 완료)
    const verifyCodeValue = useCallback(async (email: string, codeValue: string) => {
        if (codeValue.length !== 6) {
            setCodeError('6자리 인증번호를 입력해주세요');
            return { success: false, error: '6자리 인증번호를 입력해주세요' };
        }

        try {
            setIsLoading(true);
            setCodeError('');

            // 인증 확인 + 회원가입 완료
            const res = await verifyCode(email, codeValue);

            if (res.valid) {
                setCodeVerified(true);
                setCodeError('');

                // 회원가입 완료!
                return {
                    success: true,
                    completed: true,  // 회원가입 완료 플래그
                    user: res.user,
                    token: res.token,
                };
            } else {
                setCodeError('잘못된 인증번호입니다');
                return { success: false, error: '잘못된 인증번호입니다' };
            }
        } catch (err: any) {
            const errorMsg = err.message || '인증 확인 중 오류 발생';
            setCodeError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 초기화
    const resetCode = useCallback(() => {
        setCode('');
        setCodeSent(false);
        setCodeVerified(false);
        setCodeError('');
    }, []);

    // 이메일 변경 시 호출 (코드 상태 리셋)
    const handleEmailChange = useCallback(() => {
        setCodeSent(false);
        setCodeVerified(false);
        setCode('');
        setCodeError('');
    }, []);

    return {
        code,
        codeSent,
        codeVerified,
        codeError,
        isLoading,
        setCode,
        setCodeSent,      // 추가
        setCodeVerified,  // 추가
        setCodeError,     // 추가
        setLoading: setIsLoading,  // 추가
        sendCode,
        verifyCode: verifyCodeValue,
        resetCode,
        handleEmailChange,
    };
}
