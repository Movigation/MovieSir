// [용도] 챗봇 기반 영화 추천 서비스 로그인 모달
// [사용법] <LoginModal isOpen={isOpen} onClose={handleClose} onSignupClick={...} />
// [주의사항] ESC 키로 닫힐, X 버튼으로만 닫기 가능힘

import { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import type { LoginModalProps, LoginFormData, LoginFormErrors } from '@/services/auth/components/LoginModal/loginModal.types';
import { validateEmail, validatePassword } from '@/services/auth/components/LoginModal/loginModal.utils';
import SignupModal from '@/services/auth/components/SignupModal/SignupModal';

// 🔥 로그인 성공 시 AuthContext의 상태 업데이트에 사용
import { useAuth } from '@/app/providers/AuthContext';

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {

    // ✔ AuthContext의 login 함수 사용
    const { login } = useAuth();

    // ✔ 회원가입 모달 표시 여부
    const [showSignupModal, setShowSignupModal] = useState(false);

    const [formData, setFormData] = useState<LoginFormData>({
        email: '',
        password: '',
    });

    const [errors, setErrors] = useState<LoginFormErrors>({});
    const [touched, setTouched] = useState({ email: false, password: false });
    const [isLoading, setIsLoading] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [rememberMe, setRememberMe] = useState(true); // 기본값: 로그인 상태 유지
    const [showPassword, setShowPassword] = useState(false);

    // ESC 키로 모달 닫기
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // 모달 닫힐 때 초기화
    useEffect(() => {
        if (!isOpen) {
            setFormData({ email: '', password: '' });
            setErrors({});
            setTouched({ email: false, password: false });
            setLoginError('');
            setIsLoading(false);
            setRememberMe(true); // 기본값으로 리셋
        }
    }, [isOpen]);

    // 입력 변경
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        setFormData(prev => ({ ...prev, [name]: value }));

        // 이미 touched 상태면 실시간 검증 실행
        if (touched[name as keyof typeof touched]) {
            setErrors(prev => ({
                ...prev,
                [name]: name === 'email'
                    ? validateEmail(value)
                    : validatePassword(value),
            }));
        }
    };

    // 입력 포커스 아웃 → 검증 실행
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name } = e.target;

        setTouched(prev => ({ ...prev, [name]: true }));

        setErrors(prev => ({
            ...prev,
            [name]:
                name === 'email'
                    ? validateEmail(formData.email)
                    : validatePassword(formData.password),
        }));
    };

    // ⭐ 로그인 실행 로직 (rememberMe 파라미터 추가)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');

        // 1) 전체 필드 검증
        const emailError = validateEmail(formData.email);
        const passwordError = validatePassword(formData.password);

        setErrors({ email: emailError, password: passwordError });
        setTouched({ email: true, password: true });

        if (emailError || passwordError) return;

        // 2) 로그인 실행 (rememberMe 상태 전달)
        setIsLoading(true);
        try {
            // 백엔드 API 호출 및 상태 업데이트 (AuthContext에서 처리)
            await login(formData.email, formData.password, rememberMe);

            // 모달 닫기
            onClose();
        } catch (error) {
            if (error instanceof Error) {
                setLoginError(error.message);
            } else {
                setLoginError("로그인에 실패했습니다");
            }
        } finally {
            setIsLoading(false);
        }
    };
    if (!isOpen) return (
        <>
            {showSignupModal && (
                <SignupModal
                    isOpen={showSignupModal}
                    onClose={() => setShowSignupModal(false)}
                />
            )}
        </>
    );

    return (
        <div className="fixed inset-0 bg-black/50 z-modal flex items-center justify-center sm:p-4">
            <div className="bg-white dark:bg-gray-800 w-full h-screen sm:h-auto sm:w-[90%] md:w-full sm:max-w-md sm:max-h-[90vh] sm:rounded-xl shadow-2xl relative overflow-y-auto">

                {/* 닫기 버튼 */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                    <X size={24} />
                </button>

                {/* 헤더 */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        로그인
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        영화 추천 서비스를 이용하려면 로그인하세요
                    </p>
                </div>

                {/* 폼 */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                    {/* 백엔드에서 내려온 에러 표시 */}
                    {loginError && (
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 rounded-lg">
                            <p className="text-sm text-red-700 dark:text-red-400">{loginError}</p>
                        </div>
                    )}

                    {/* 이메일 */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                            이메일
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            disabled={isLoading}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={`w-full px-4 py-2 rounded-lg border transition-colors
                                bg-white dark:bg-gray-700 
                                text-gray-900 dark:text-white
                                placeholder-gray-400 dark:placeholder-gray-500
                                focus:outline-none focus:ring-2 focus:ring-blue-500
                                disabled:opacity-50 disabled:cursor-not-allowed
                                ${touched.email && errors.email
                                    ? 'border-red-500'
                                    : 'border-gray-300 dark:border-gray-600'
                                }`}
                            placeholder="example@email.com"
                        />
                        {touched.email && errors.email && (
                            <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                        )}
                    </div>

                    {/* 비밀번호 */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                            비밀번호
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                value={formData.password}
                                disabled={isLoading}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                className={`w-full px-4 py-2 pr-10 rounded-lg border transition-colors
                                    bg-white dark:bg-gray-700 
                                    text-gray-900 dark:text-white
                                    placeholder-gray-400 dark:placeholder-gray-500
                                    focus:outline-none focus:ring-2 focus:ring-blue-500
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    ${touched.password && errors.password
                                        ? 'border-red-500'
                                        : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                disabled={isLoading}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        {touched.password && errors.password && (
                            <p className="mt-1 text-sm text-red-500">{errors.password}</p>
                        )}
                    </div>

                    {/* 로그인 상태 유지 체크박스 */}
                    <div className="flex items-center">
                        <input
                            id="rememberMe"
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                            로그인 상태 유지
                        </label>
                    </div>

                    {/* 로그인 버튼 */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium rounded-lg transition-colors"
                    >
                        {isLoading ? '로그인 중...' : '로그인'}
                    </button>
                </form>

                {/* 회원가입 링크 */}
                <div className="p-6 pt-0 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        계정이 없으신가요?{' '}
                        <button
                            type="button"
                            className="text-blue-500 hover:text-blue-600 font-medium"
                            onClick={() => {
                                onClose(); // 로그인 모달 닫기
                                setShowSignupModal(true); // 회원가입 모달 열기
                            }}
                        >
                            회원가입
                        </button>
                    </p>
                </div>
            </div>

            {/* 회원가입 모달 */}
            {showSignupModal && (
                <SignupModal
                    isOpen={showSignupModal}
                    onClose={() => setShowSignupModal(false)}
                />
            )}
        </div>
    );
}
