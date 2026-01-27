import { useState, useCallback, useEffect, useRef } from 'react';
import { sendVerificationCode, verifyCode } from '@/api/authApi';

export function useVerificationCode() {
    const [code, setCode] = useState('');
    const [codeSent, setCodeSent] = useState(false);
    const [codeVerified, setCodeVerified] = useState(false);
    const [codeError, setCodeError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0); // 초 단위 남은 시간
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    // 타이머 로직
    useEffect(() => {
        if (codeSent && !codeVerified && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [codeSent, codeVerified, timeLeft]);

    // 인증번호 전송 상태가 true가 될 때 타이머 시작
    useEffect(() => {
        if (codeSent && timeLeft === 0 && !codeVerified) {
            setTimeLeft(600);
        }
    }, [codeSent, codeVerified]);

    // 시간 포맷팅 (MM:SS)
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const timeLeftFormatted = formatTime(timeLeft);
    const isExpired = codeSent && timeLeft === 0;


    // 인증번호 전송
    const sendCode = useCallback(async (email: string) => {
        try {
            setIsLoading(true);
            setCodeError('');
            await sendVerificationCode(email);
            setCodeSent(true);
            setTimeLeft(600); // 10분 설정
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
        setTimeLeft(0);
        if (timerRef.current) clearInterval(timerRef.current);
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
        timeLeft,
        timeLeftFormatted,
        isExpired,
        setTimeLeft
    };
}
