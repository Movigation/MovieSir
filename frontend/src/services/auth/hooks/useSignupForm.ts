import { useState, useCallback } from 'react';
import { signup } from '@/api/authApi';
import { authAxiosInstance } from '@/api/axiosInstance';
import { useAuth } from '@/app/providers/AuthContext';
import { useEmailValidation } from '@/services/auth/hooks/useEmailValidation';
import { useNicknameValidation } from '@/services/auth/hooks/useNicknameValidation';
import { usePasswordValidation } from '@/services/auth/hooks/usePasswordValidation';
import { useVerificationCode } from '@/services/auth/hooks/useVerificationCode';

export function useSignupForm() {
    const { loadUserFromStorage } = useAuth();

    // 각 필드별 검증 훅
    const emailValidation = useEmailValidation();
    const nicknameValidation = useNicknameValidation();
    const passwordValidation = usePasswordValidation();
    const codeValidation = useVerificationCode();

    // 공통 상태
    const [generalError, setGeneralError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sentEmail, setSentEmail] = useState(''); // 인증번호가 발송된 이메일 기입

    // 회원가입 가능 여부
    const canSignup =
        emailValidation.isEmailValid &&
        nicknameValidation.isNicknameValid &&
        passwordValidation.isPasswordValid &&
        passwordValidation.isPasswordMatch &&
        codeValidation.codeVerified;

    // 진행 상황
    const progress = {
        email: emailValidation.isEmailValid && codeValidation.codeVerified,
        info: nicknameValidation.isNicknameValid &&
            passwordValidation.isPasswordValid &&
            passwordValidation.isPasswordMatch,
    };

    // 이메일 변경 핸들러 (코드 상태 리셋 포함)
    const handleEmailChange = useCallback((value: string) => {
        emailValidation.handleEmailChange(value);
        codeValidation.handleEmailChange();
        setSentEmail('');
    }, [emailValidation, codeValidation]);

    const handleEmailIdChange = useCallback((value: string) => {
        emailValidation.handleEmailIdChange(value);
        codeValidation.handleEmailChange();
        setSentEmail('');
    }, [emailValidation, codeValidation]);

    const handleEmailDomainChange = useCallback((value: string) => {
        emailValidation.handleEmailDomainChange(value);
        codeValidation.handleEmailChange();
        setSentEmail('');
    }, [emailValidation, codeValidation]);

    const handleCustomDomainChange = useCallback((value: string) => {
        emailValidation.handleCustomDomainChange(value);
        codeValidation.handleEmailChange();
        setSentEmail('');
    }, [emailValidation, codeValidation]);

    // 인증 코드 전송 (중복 체크 포함)
    const handleSendCode = useCallback(async () => {
        // 클라이언트 검증
        if (!emailValidation.isEmailValid) {
            setGeneralError('올바른 이메일 형식이 아닙니다');
            return;
        }

        if (nicknameValidation.nicknameStatus !== 'valid') {
            setGeneralError('올바른 닉네임을 입력해주세요');
            return;
        }

        if (!passwordValidation.isPasswordValid) {
            setGeneralError('올바른 비밀번호를 입력해주세요');
            return;
        }

        try {
            codeValidation.setLoading(true);
            setGeneralError('');

            // ✅ UX 개선: 인증번호 입력창을 먼저 띄움
            codeValidation.setCodeSent(true);

            // 백엔드로 전체 정보 전송 (중복 체크 + 인증번호 발송)
            // 백그라운드에서 실행되며, 사용자는 이메일을 확인하는 동안 입력창이 준비됨
            await signup({
                email: emailValidation.email,
                nickname: nicknameValidation.nickname,
                password: passwordValidation.password,
            });

            // 인증코드 훅의 타이머 수동 시작 (signup API 성공 시)
            // signup API 내부에서 메일을 발송하므로 여기서 타이머를 시작해준다.
            // useVerificationCode.sendCode를 직접 쓰지 않는 경우를 위해.
            codeValidation.setCodeSent(true);
            codeValidation.setTimeLeft(600);
            setSentEmail(emailValidation.email); // 발송 시점의 이메일 기록

        } catch (err: any) {
            // 에러 발생 시 입력창 다시 숨김
            codeValidation.setCodeSent(false);

            // 백엔드 에러 메시지 파싱
            const errorMsg = err.response?.data?.detail || err.message || '인증번호 발송 중 오류가 발생했습니다';
            setGeneralError(errorMsg);

            // 이메일/닉네임 중복 에러인 경우 상태 업데이트
            if (errorMsg.includes('이메일') || errorMsg.includes('email')) {
                emailValidation.setEmailStatus('duplicate');
                emailValidation.setEmailError(errorMsg);
            } else if (errorMsg.includes('닉네임') || errorMsg.includes('nickname')) {
                nicknameValidation.setNicknameStatus('duplicate');
                nicknameValidation.setNicknameError(errorMsg);
            }
        } finally {
            codeValidation.setLoading(false);
        }
    }, [
        emailValidation.isEmailValid,
        emailValidation.email,
        nicknameValidation.nicknameStatus,
        nicknameValidation.nickname,
        passwordValidation.isPasswordValid,
        passwordValidation.password,
        codeValidation,
    ]);

    // 인증 코드 확인 (+ 회원가입 완료)
    const handleVerifyCode = useCallback(async () => {

        const result = await codeValidation.verifyCode(
            emailValidation.email,
            codeValidation.code
        );


        if (!result.success) {

            setGeneralError(result.error || '');
        } else {

            setGeneralError('');

            // 회원가입 완료!
            if (result.completed) {


                // AuthContext 업데이트
                await loadUserFromStorage();


                // 온보딩 페이지로 이동은 SignupModal에서 처리
            }
        }
    }, [emailValidation.email, codeValidation, loadUserFromStorage]);

    // 회원가입 최종 완료 (인증 코드 확인)
    const handleSignup = useCallback(async () => {
        if (!canSignup) return;

        // 🛡️ 보안 강화: 현재 이메일과 인증번호가 발송된 이메일이 일치하는지 재검증
        if (emailValidation.email !== sentEmail) {
            setGeneralError('이메일 정보가 변경되었습니다. 다시 인증해주세요.');
            codeValidation.setCodeVerified(false);
            return { success: false };
        }

        try {
            setIsSubmitting(true);
            setGeneralError('');

            // 인증 코드 확인 및 실제 회원가입
            const response = await authAxiosInstance.post('/auth/signup/confirm', {
                email: emailValidation.email,
                code: codeValidation.code,
            });

            const { user_id, email, onboarding_completed, token } = response.data;

            // 토큰 저장
            localStorage.setItem('accessToken', token.access_token);

            // 유저 정보 저장
            const userData = {
                id: user_id,
                email: email,
                onboarding_completed,
            };
            localStorage.setItem('user', JSON.stringify(userData));

            await loadUserFromStorage();

            return { success: true };
        } catch (err: any) {
            const errorMsg = err.response?.data?.detail || err.message || '회원가입 중 오류';
            setGeneralError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setIsSubmitting(false);
        }
    }, [canSignup, emailValidation.email, codeValidation.code, loadUserFromStorage]);

    // 폼 초기화
    const resetForm = useCallback(() => {
        emailValidation.resetEmail();
        nicknameValidation.resetNickname();
        passwordValidation.resetPassword();
        codeValidation.resetCode();
        setGeneralError('');
    }, [emailValidation, nicknameValidation, passwordValidation, codeValidation]);

    return {
        // 이메일
        email: emailValidation.email,
        emailId: emailValidation.emailId,
        emailDomain: emailValidation.emailDomain,
        customDomain: emailValidation.customDomain,
        emailStatus: emailValidation.emailStatus,
        emailError: emailValidation.emailError,
        isEmailValid: emailValidation.isEmailValid,
        handleEmailChange,
        handleEmailIdChange,
        handleEmailDomainChange,
        handleCustomDomainChange,

        // 닉네임
        nickname: nicknameValidation.nickname,
        nicknameStatus: nicknameValidation.nicknameStatus,
        nicknameError: nicknameValidation.nicknameError,
        isNicknameValid: nicknameValidation.isNicknameValid,
        handleNicknameChange: nicknameValidation.handleNicknameChange,

        // 비밀번호
        password: passwordValidation.password,
        passwordConfirm: passwordValidation.passwordConfirm,
        passwordError: passwordValidation.passwordError,
        passwordConfirmError: passwordValidation.passwordConfirmError,
        isPasswordValid: passwordValidation.isPasswordValid,
        isPasswordMatch: passwordValidation.isPasswordMatch,
        handlePasswordChange: passwordValidation.handlePasswordChange,
        handlePasswordConfirmChange: passwordValidation.handlePasswordConfirmChange,

        // 인증 코드
        code: codeValidation.code,
        codeSent: codeValidation.codeSent,
        codeVerified: codeValidation.codeVerified,
        codeError: codeValidation.codeError,
        setCode: codeValidation.setCode,
        timeLeftFormatted: codeValidation.timeLeftFormatted,
        isExpired: codeValidation.isExpired,
        handleSendCode,
        handleVerifyCode,

        // 공통
        generalError,
        isSubmitting,
        isLoading: codeValidation.isLoading,
        canSignup,
        progress,

        // 액션
        handleSignup,
        resetForm,
    };
}
