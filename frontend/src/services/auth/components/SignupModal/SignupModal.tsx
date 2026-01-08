import { X, CheckCircle2, XCircle, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import type { SignupModalProps } from "@/services/auth/components/SignupModal/signupModal.types";
import { useSignupForm } from "@/services/auth/hooks";

export default function SignupModal({ isOpen, onClose }: SignupModalProps) {
    const navigate = useNavigate();
    const modalContentRef = useRef<HTMLDivElement>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // ✅ 모든 로직을 useSignupForm 훅에서 가져옴
    const {
        // 이메일
        email,
        emailId,
        emailDomain,
        customDomain,
        emailStatus,
        emailError,
        isEmailValid,
        handleEmailIdChange,
        handleEmailDomainChange,
        handleCustomDomainChange,

        // 닉네임
        nickname,
        nicknameStatus,
        nicknameError,
        handleNicknameChange,

        // 비밀번호
        password,
        passwordConfirm,
        passwordError,
        passwordConfirmError,
        isPasswordValid,
        isPasswordMatch,
        handlePasswordChange,
        handlePasswordConfirmChange,

        // 인증 코드
        code,
        codeSent,
        codeVerified,
        codeError,
        setCode,
        timeLeftFormatted,
        isExpired,
        handleSendCode,
        handleVerifyCode,

        // 공통
        generalError,
        isLoading,
        progress,

        // 액션
        resetForm,
    } = useSignupForm();

    // 모달 닫기 핸들러
    const handleClose = () => {
        resetForm();
        onClose();
    };

    // ✅ 회원가입 완료 감지: codeVerified가 true가 되면 자동으로 온보딩 페이지로 이동
    useEffect(() => {
        console.log('🔍 [SignupModal] useEffect 실행 - codeVerified:', codeVerified, 'isOpen:', isOpen);

        if (codeVerified && isOpen) {
            console.log('✅ [SignupModal] 회원가입 완료! 온보딩 페이지로 자동 이동');
            handleClose();
            // OTT 선택부터 시작
            navigate("/onboarding/ott");
        }
    }, [codeVerified, isOpen]);

    // 인증 확인 핸들러
    const handleVerifyCodeWrapper = async () => {
        console.log('🔍 [SignupModal] handleVerifyCodeWrapper 시작');

        // handleVerifyCode는 내부적으로 signup/confirm API를 호출하여 
        // 인증 코드 확인 + 회원가입 완료 + 토큰 저장을 수행
        // 성공 시 codeVerified가 true로 설정되고, useEffect가 자동으로 온보딩 페이지로 이동
        await handleVerifyCode();

        console.log('🔍 [SignupModal] handleVerifyCodeWrapper 완료 - codeVerified:', codeVerified);
    };

    // 모달 열림 시 배경 스크롤 방지
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // 모달 내부에서 휠 스크롤이 작동하도록 이벤트 전파 중단
    useEffect(() => {
        const modalContent = modalContentRef.current;
        if (!modalContent || !isOpen) return;

        const handleWheel = (e: WheelEvent) => {
            // 모달 내부 스크롤을 허용하기 위해 이벤트 전파만 중단
            e.stopPropagation();
        };

        modalContent.addEventListener('wheel', handleWheel);
        return () => modalContent.removeEventListener('wheel', handleWheel);
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-modal sm:p-4">
            <div
                ref={modalContentRef}
                className="bg-white dark:bg-gray-800 w-full h-screen sm:h-[90vh] sm:w-[90%] sm:max-w-md sm:rounded-xl p-6 relative space-y-6 overflow-y-auto"
            >                {/* CLOSE */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                    <X size={24} />
                </button>

                {/* HEADER */}
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        회원가입 🎬
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        무비서와 함께 영화 추천을 시작하세요
                    </p>

                    {/* 진행 상황 표시 */}
                    <div className="mt-4 flex gap-2">
                        <div
                            className={`flex-1 h-1 rounded-full transition-colors ${progress.email ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
                                }`}
                        />
                        <div
                            className={`flex-1 h-1 rounded-full transition-colors ${progress.info ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
                                }`}
                        />
                    </div>
                </div>

                {/* SECTION 1: 이메일 인증 */}
                <section className="border-b border-gray-200 dark:border-gray-700 pb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            1. 이메일 인증
                        </h3>
                        {progress.email && (
                            <span className="text-green-500 text-xl">✓</span>
                        )}
                    </div>

                    <div className="space-y-3">
                        {/* EMAIL INPUT - 두 가지 방식 중 선택 가능 */}
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                이메일 *
                            </label>

                            {/* ============================================ */}
                            {/* 방식 1: 단순 타이핑 방식 (이전 방식) */}
                            {/* 사용하려면 아래 주석을 해제하고, "방식 2" 부분을 주석 처리하세요 */}
                            {/* ============================================ */}
                            {/* 
                            <div className="relative">
                                <input
                                    value={email}
                                    onChange={(e) => handleEmailIdChange(e.target.value.split('@')[0])}
                                    onBlur={(e) => {
                                        const fullEmail = e.target.value;
                                        if (fullEmail.includes('@')) {
                                            const [id, domain] = fullEmail.split('@');
                                            handleEmailIdChange(id);
                                            if (domain) {
                                                const commonDomains = ['gmail.com', 'naver.com', 'daum.net', 'kakao.com', 'hanmail.net', 'nate.com', 'hotmail.com', 'outlook.com', 'yahoo.com'];
                                                if (commonDomains.includes(domain)) {
                                                    handleEmailDomainChange(domain);
                                                } else {
                                                    handleEmailDomainChange('direct');
                                                    handleCustomDomainChange(domain);
                                                }
                                            }
                                        }
                                    }}
                                    placeholder="example@gmail.com"
                                    className={`w-full px-4 py-3 pr-12 rounded-lg border ${
                                        emailStatus === 'invalid' || emailStatus === 'duplicate'
                                            ? "border-red-500"
                                            : emailStatus === 'checking'
                                                ? "border-blue-400"
                                                : emailStatus === 'valid'
                                                    ? "border-green-500"
                                                    : "border-gray-300 dark:border-gray-600"
                                    } bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors`}
                                    disabled={codeVerified}
                                />
                                
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    {emailStatus === 'checking' && (
                                        <Loader2 className="animate-spin text-blue-500" size={20} />
                                    )}
                                    {emailStatus === 'valid' && (
                                        <CheckCircle2 className="text-green-500" size={20} />
                                    )}
                                    {(emailStatus === 'invalid' || emailStatus === 'duplicate') && (
                                        <XCircle className="text-red-500" size={20} />
                                    )}
                                </div>
                            </div>
                            */}

                            {/* ============================================ */}
                            {/* 방식 2: 아이디 + 도메인 분리 방식 (현재 방식) */}
                            {/* 사용 안하려면 이 부분을 주석 처리하세요 */}
                            {/* ============================================ */}
                            {/* 이메일 아이디 + 도메인 입력 */}
                            <div className="flex gap-2 items-center">
                                {/* 아이디 부분 */}
                                <div className="flex-1 relative">
                                    <input
                                        value={emailId}
                                        onChange={(e) => handleEmailIdChange(e.target.value)}
                                        placeholder="아이디"
                                        className={`w-full px-4 py-3 pr-12 rounded-lg border ${emailStatus === 'invalid' || emailStatus === 'duplicate'
                                            ? "border-red-500"
                                            : emailStatus === 'checking'
                                                ? "border-blue-400"
                                                : emailStatus === 'valid'
                                                    ? "border-green-500"
                                                    : "border-gray-300 dark:border-gray-600"
                                            } bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors`}
                                        disabled={codeVerified}
                                    />
                                    {/* 검증 상태 아이콘 */}
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        {emailStatus === 'checking' && (
                                            <Loader2 className="animate-spin text-blue-500" size={20} />
                                        )}
                                        {emailStatus === 'valid' && (
                                            <CheckCircle2 className="text-green-500" size={20} />
                                        )}
                                        {(emailStatus === 'invalid' || emailStatus === 'duplicate') && (
                                            <XCircle className="text-red-500" size={20} />
                                        )}
                                    </div>
                                </div>

                                {/* @ 기호 */}
                                <span className="text-gray-500 dark:text-gray-400 font-bold">@</span>

                                {/* 도메인 선택 */}
                                <div className="flex-1">
                                    <select
                                        value={emailDomain}
                                        onChange={(e) => handleEmailDomainChange(e.target.value)}
                                        disabled={codeVerified}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                                    >
                                        <option value="gmail.com">gmail.com</option>
                                        <option value="naver.com">naver.com</option>
                                        <option value="daum.net">daum.net</option>
                                        <option value="kakao.com">kakao.com</option>
                                        <option value="hanmail.net">hanmail.net</option>
                                        <option value="nate.com">nate.com</option>
                                        <option value="hotmail.com">hotmail.com</option>
                                        <option value="outlook.com">outlook.com</option>
                                        <option value="yahoo.com">yahoo.com</option>
                                        <option value="direct">직접 입력</option>
                                    </select>
                                </div>
                            </div>

                            {/* 직접 입력 도메인 */}
                            {emailDomain === 'direct' && (
                                <div className="mt-2">
                                    <input
                                        value={customDomain}
                                        onChange={(e) => handleCustomDomainChange(e.target.value)}
                                        placeholder="example.com"
                                        disabled={codeVerified}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>
                            )}

                            {/* 전체 이메일 미리보기 */}
                            {email && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    이메일: <span className="font-mono">{email}</span>
                                </p>
                            )}

                            {/* 에러 메시지 */}
                            {emailError && (
                                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                                    <AlertCircle size={14} />
                                    {emailError}
                                </p>
                            )}

                            {/* 성공 메시지 */}
                            {emailStatus === 'valid' && !emailError && (
                                <p className="text-green-600 text-sm mt-1 flex items-center gap-1">
                                    <CheckCircle2 size={14} />
                                    사용 가능한 이메일입니다
                                </p>
                            )}
                        </div>

                        {codeVerified && (
                            <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <span className="text-green-600 dark:text-green-400 text-xl">✓</span>
                                    <p className="text-green-700 dark:text-green-300 font-medium">
                                        이메일 인증 완료
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* SECTION 2: 계정 정보 */}
                <section className="pb-4">
                    <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            2. 계정 정보
                        </h3>
                        {progress.info && (
                            <span className="text-green-500 text-xl">✓</span>
                        )}
                    </div>

                    <div className="space-y-4">
                        {/* 닉네임 */}
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                닉네임 *
                            </label>
                            <div className="relative">
                                <input
                                    value={nickname}
                                    onChange={(e) => handleNicknameChange(e.target.value)}
                                    placeholder="사용하실 닉네임을 입력하세요"
                                    className={`w-full px-4 py-3 pr-12 rounded-lg border ${nicknameStatus === 'invalid' || nicknameStatus === 'duplicate'
                                        ? "border-red-500"
                                        : nicknameStatus === 'checking'
                                            ? "border-blue-400"
                                            : nicknameStatus === 'valid'
                                                ? "border-green-500"
                                                : "border-gray-300 dark:border-gray-600"
                                        } bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors`}
                                />
                                {/* 검증 상태 아이콘 */}
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    {nicknameStatus === 'checking' && (
                                        <Loader2 className="animate-spin text-blue-500" size={20} />
                                    )}
                                    {nicknameStatus === 'valid' && (
                                        <CheckCircle2 className="text-green-500" size={20} />
                                    )}
                                    {(nicknameStatus === 'invalid' || nicknameStatus === 'duplicate') && (
                                        <XCircle className="text-red-500" size={20} />
                                    )}
                                </div>
                            </div>

                            {/* 에러 메시지 */}
                            {nicknameError && (
                                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                                    <AlertCircle size={14} />
                                    {nicknameError}
                                </p>
                            )}

                            {/* 성공 메시지 */}
                            {nicknameStatus === 'valid' && !nicknameError && (
                                <p className="text-green-600 text-sm mt-1 flex items-center gap-1">
                                    <CheckCircle2 size={14} />
                                    사용 가능한 닉네임입니다
                                </p>
                            )}
                        </div>

                        {/* 비밀번호 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                비밀번호 *
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => handlePasswordChange(e.target.value)}
                                    className={`w-full px-4 py-3 pr-10 rounded-lg border ${passwordError
                                        ? "border-red-500"
                                        : password && isPasswordValid
                                            ? "border-green-500"
                                            : "border-gray-300 dark:border-gray-600"
                                        } bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors`}
                                    placeholder="영문, 숫자 포함 8자 이상"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            {passwordError && (
                                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                                    <AlertCircle size={14} />
                                    {passwordError}
                                </p>
                            )}
                            {password && isPasswordValid && !passwordError && (
                                <p className="text-green-600 text-sm mt-1 flex items-center gap-1">
                                    <CheckCircle2 size={14} />
                                    안전한 비밀번호입니다
                                </p>
                            )}
                        </div>

                        {/* 비밀번호 확인 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                비밀번호 확인 *
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={passwordConfirm}
                                    onChange={(e) => handlePasswordConfirmChange(e.target.value)}
                                    className={`w-full px-4 py-3 pr-10 rounded-lg border ${!isPasswordMatch && passwordConfirm
                                        ? "border-red-500"
                                        : isPasswordMatch && passwordConfirm
                                            ? "border-green-500"
                                            : "border-gray-300 dark:border-gray-600"
                                        } bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors`}
                                    placeholder="비밀번호를 다시 입력하세요"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            {passwordConfirmError && (
                                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                                    <AlertCircle size={14} />
                                    {passwordConfirmError}
                                </p>
                            )}
                            {isPasswordMatch && passwordConfirm && (
                                <p className="text-green-600 text-sm mt-1 flex items-center gap-1">
                                    <CheckCircle2 size={14} />
                                    비밀번호가 일치합니다
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                {/* 오류 메시지 */}
                {generalError && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
                        <p className="text-red-700 dark:text-red-300 text-sm text-center">
                            {generalError}
                        </p>
                    </div>
                )}

                {/* 인증 섹션 */}
                {!codeVerified && (
                    <div className="space-y-3">
                        {/* 인증번호 전송 전: 인증번호 받기 버튼 */}
                        {!codeSent ? (
                            <button
                                onClick={handleSendCode}
                                disabled={!isEmailValid || nicknameStatus !== 'valid' || !isPasswordValid || !isPasswordMatch || isLoading}
                                className={`w-full py-3 rounded-lg font-bold transition-all ${isEmailValid && nicknameStatus === 'valid' && isPasswordValid && isPasswordMatch && !isLoading
                                    ? "bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl"
                                    : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                    }`}
                            >
                                {isLoading ? "전송 중..." : "인증번호 받기"}
                            </button>
                        ) : (
                            <>
                                {/* 인증번호 전송 후: 인증번호 입력 필드 + 비활성화된 회원가입 완료 버튼 */}
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg">
                                    <p className="text-blue-700 dark:text-blue-300 text-sm text-center">
                                        이메일로 6자리 인증번호가 전송되었습니다
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-0 sm:gap-2">
                                    <input
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                        onKeyPress={(e) => {
                                            if (e.key === "Enter" && code.length === 6) {
                                                handleVerifyCodeWrapper();
                                            }
                                        }}
                                        className={`flex-1 px-4 py-3 text-center text-xl font-bold tracking-widest rounded-t-lg sm:rounded-lg border ${codeError || isExpired
                                            ? "border-red-500"
                                            : "border-gray-300 dark:border-gray-600"
                                            } bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-blue-500`}
                                        placeholder="000000"
                                        maxLength={6}
                                        disabled={isExpired}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-mono text-blue-500 dark:text-blue-400 font-bold bg-white/80 dark:bg-gray-800/80 px-2 py-1 rounded pointer-events-none">
                                        {isExpired ? "만료됨" : timeLeftFormatted}
                                    </div>
                                    <button
                                        onClick={handleVerifyCodeWrapper}
                                        disabled={isLoading || code.length !== 6 || isExpired}
                                        className={`px-6 py-3 rounded-b-lg sm:rounded-lg font-bold transition-colors ${isLoading || code.length !== 6 || isExpired
                                            ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                                            : "bg-blue-500 hover:bg-blue-600 text-white"
                                            }`}
                                    >
                                        {isLoading ? "확인 중" : "확인"}
                                    </button>
                                </div>

                                {codeError && (
                                    <p className="text-red-500 text-sm text-center">{codeError}</p>
                                )}

                                {isExpired && (
                                    <p className="text-red-500 text-sm text-center font-medium animate-pulse">
                                        인증 시간이 만료되었습니다. 다시 시도해주세요.
                                    </p>
                                )}

                                <button
                                    onClick={handleSendCode}
                                    disabled={isLoading}
                                    className="w-full py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                                >
                                    인증번호 재전송
                                </button>

                                {/* 비활성화된 회원가입 완료 버튼 */}
                                <button
                                    disabled={true}
                                    className="w-full py-3 rounded-lg font-bold bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                >
                                    인증 후 회원가입 완료
                                </button>
                            </>
                        )}

                        {!codeSent && (
                            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                                모든 정보를 입력하면 인증번호를 받을 수 있습니다
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
