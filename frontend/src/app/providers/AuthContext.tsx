// [용도] 전역 인증 상태 관리 Context
// [사용법] 
// App.tsx에서: <AuthProvider><App /></AuthProvider>
// 컴포넌트에서: const { user, isAuthenticated, login, logout } = useAuth();
//
// ⚠️ [보안 경고]
// 현재 구현 방식: localStorage에 토큰 저장 (XSS 공격 취약)
// 프로덕션 권장 방식:
//   1. HttpOnly Cookie로 토큰 저장 (JavaScript 접근 불가)
//   2. 백엔드에서 Set-Cookie 헤더 설정
//   3. HTTPS 필수 (Secure 플래그)
//   4. SameSite=Strict 설정 (CSRF 방지)
//
// 현재는 CSP(Content Security Policy)로 일부 보호 중
// 향후 Phase 2에서 HttpOnly Cookie로 마이그레이션 예정

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import * as authApi from '@/api/authApi';
import * as userApi from '@/api/userApi';
import type { User } from '@/api/authApi.type';
import { useMovieStore } from '@/store/useMovieStore';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { useToastStore } from '@/store/useToastStore';

interface AuthContextType {
    user: Omit<User, 'password'> | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
    signup: (email: string, password: string, nickname: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
    loadUserFromStorage: () => Promise<void>;
    updateUser: (newData: Partial<Omit<User, 'password'>>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<Omit<User, 'password'> | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Store의 함수들 가져오기
    const setMovieStoreUserId = useMovieStore((state) => state.setUserId);
    const resetMovieStore = useMovieStore((state) => state.reset);
    const resetOnboardingStore = useOnboardingStore((state) => state.reset);
    const showToast = useToastStore((state) => state.showToast);

    // 로그아웃
    const logout = useCallback(async () => {
        console.log('🚪 로그아웃 시작...');
        try {
            // 백엔드 API 호출 (refresh_token 무효화)
            await authApi.logout();
            console.log('✅ 백엔드 로그아웃 완료');
        } catch (error) {
            console.error('⚠️ 백엔드 로그아웃 실패 (로컬 정리는 진행):', error);
        } finally {
            // 백엔드 성공/실패 여부와 관계없이 로컬 상태는 정리
            setUser(null);

            // 스토어 초기화
            resetMovieStore();
            resetOnboardingStore();

            // 세션 타이머 정리
            sessionStorage.removeItem('loginTime');

            console.log('✅ 로컬 상태 및 스토어 정리 완료');
        }
    }, [resetMovieStore, resetOnboardingStore]);

    // 컴포넌트 마운트 시 localStorage에서 사용자 정보 복원
    useEffect(() => {
        const loadUser = async () => {
            const savedUser = await authApi.getCurrentUser();
            if (savedUser) {
                setUser(savedUser);
            }
            setIsLoading(false);
        };

        loadUser();
    }, []);

    // 401 에러 시 axios interceptor에서 발행하는 로그아웃 이벤트 리스너
    useEffect(() => {
        const handleAuthLogout = (event: any) => {
            const reason = (event as CustomEvent).detail?.reason;
            console.log(`🔔 auth:logout 이벤트 받음 (이유: ${reason}) - AuthContext에서 로그아웃 처리`);

            if (reason === 'expired') {
                showToast('세션이 만료되었습니다. 다시 로그인해 주세요.', 5000);
            }

            setUser(null);
            localStorage.removeItem('user');
            sessionStorage.removeItem('user');
            resetMovieStore();
            resetOnboardingStore();
        };

        window.addEventListener('auth:logout', handleAuthLogout);
        return () => window.removeEventListener('auth:logout', handleAuthLogout);
    }, [resetMovieStore, resetOnboardingStore, showToast]);

    // user 상태가 변경될 때마다 MovieStore에 userId 동기화
    useEffect(() => {
        if (user) {
            // MovieStore에 userId 설정 (문자열 ID/숫자 모두 대응)
            const rawId = user.id || (user as any).user_id;
            if (rawId) {
                const currentId = isNaN(Number(rawId)) ? rawId : Number(rawId);
                console.log('👤 [AuthSync] MovieStore userId 동기화:', { rawId, currentId, type: typeof currentId });
                setMovieStoreUserId(currentId as any);
            } else {
                console.warn('⚠️ [AuthSync] user 객체에 id가 없음:', user);
            }
        } else {
            // 로그아웃 시 userId를 null로 설정
            console.log('🔒 [AuthSync] 로그아웃: MovieStore userId를 null로 설정');
            setMovieStoreUserId(null);
        }
    }, [user, setMovieStoreUserId]);

    // 새로고침 시 세션 만료 체크 (자동로그인 미체크 사용자용)
    useEffect(() => {
        const loginTimeStr = sessionStorage.getItem('loginTime');
        const rememberMe = localStorage.getItem('rememberMe') === 'true';
        let timerId: NodeJS.Timeout;

        // 자동로그인 미체크 상태에서 로그인 시간이 있으면
        if (loginTimeStr && !rememberMe && user) {
            const loginTime = parseInt(loginTimeStr);
            const elapsed = Date.now() - loginTime;
            const remaining = 3600000 - elapsed; // 1시간 - 경과 시간

            console.log(`⏰ 세션 체크: ${Math.floor(remaining / 1000)}초 남음`);

            if (remaining <= 0) {
                console.log('⏰ 세션 만료 - 즉시 로그아웃');
                showToast('세션 시간이 만료되어 자동으로 로그아웃되었습니다.', 5000);
                logout();
            } else {
                console.log(`⏰ 타이머 재설정: ${Math.floor(remaining / 1000)}초 후 로그아웃`);
                timerId = setTimeout(() => {
                    console.log('⏰ 1시간 경과 - 자동 로그아웃 실행');
                    showToast('세션 시간이 만료되어 자동으로 로그아웃되었습니다.', 5000);
                    logout();
                }, remaining);
            }
        }

        return () => {
            if (timerId) clearTimeout(timerId);
        };
    }, [user, logout]);

    // 로그인 (rememberMe 추가)
    const login = async (email: string, password: string, rememberMe: boolean = true) => {
        try {
            const response = await authApi.login({ email, password }, rememberMe);
            setUser(response.user as any);
            authApi.saveUser(response.user as any, rememberMe);

            // 🕐 자동로그인 미체크 시: 1시간 후 자동 로그아웃 타이머 설정
            if (!rememberMe) {
                const loginTime = Date.now();
                sessionStorage.setItem('loginTime', loginTime.toString());

                console.log('⏰ 자동로그인 미체크: 1시간 후 자동 로그아웃 타이머 시작');
                setTimeout(() => {
                    console.log('⏰ 1시간 경과 - 자동 로그아웃 실행');

                    // 팝업 표시
                    showToast('세션 시간이 만료되어 자동으로 로그아웃되었습니다.', 5000);

                    logout();
                }, 3600000); // 1시간 (밀리초)
            }
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('로그인에 실패했습니다');
        }
    };

    // 회원가입
    const signup = async (email: string, password: string, nickname: string) => {
        try {
            const response = await authApi.signup({ email, password, nickname });
            setUser(response.user as any);  // useEffect가 자동으로 MovieStore userId 설정
            authApi.saveUser(response.user as any);
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('회원가입에 실패했습니다');
        }
    };
    // 사용자 정보 새로고침 (프로필 업데이트 후 등)
    const refreshUser = async () => {
        if (!user) return;

        try {
            // 최신 사용자 정보를 서버에서 가져오기
            const response = await userApi.getUser(user.id);
            const updatedUser = response.data;
            setUser(updatedUser);
            authApi.saveUser(updatedUser);
        } catch (error) {
            console.error('사용자 정보 새로고침 실패:', error);
        }
    };

    // localStorage에서 사용자 정보 로드 (회원가입 직후 등)
    const loadUserFromStorage = async () => {
        try {
            const savedUser = await authApi.getCurrentUser();
            if (savedUser) {
                setUser(savedUser);
                console.log('localStorage에서 사용자 정보 로드 완료:', savedUser);
            }
        } catch (error) {
            console.error('사용자 정보 로드 실패:', error);
        }
    };

    // 사용자 정보 부분 업데이트 (닉네임 변경 등)
    const updateUser = (newData: Partial<Omit<User, 'password'>>) => {
        if (!user) return;
        const updatedUser = { ...user, ...newData };
        setUser(updatedUser);

        // 스토리지 종류 확인 후 저장
        const rememberMe = localStorage.getItem('rememberMe') === 'true';
        authApi.saveUser(updatedUser as any, rememberMe);
    };

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        refreshUser,
        loadUserFromStorage,
        updateUser
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// useAuth 훅
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
