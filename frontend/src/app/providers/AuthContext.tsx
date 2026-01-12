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

import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import * as authApi from '@/api/authApi';
import * as userApi from '@/api/userApi';
import type { User } from '@/api/authApi.type';
import { useMovieStore } from '@/store/useMovieStore';
import { useOnboardingStore } from '@/store/useOnboardingStore';

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
        const handleAuthLogout = () => {
            console.log('🔔 auth:logout 이벤트 받음 - AuthContext에서 로그아웃 처리');
            setUser(null);
            localStorage.removeItem('user');
            sessionStorage.removeItem('user');
            resetMovieStore();
            resetOnboardingStore();
        };

        window.addEventListener('auth:logout', handleAuthLogout);
        return () => window.removeEventListener('auth:logout', handleAuthLogout);
    }, [resetMovieStore, resetOnboardingStore]);

    // user 상태가 변경될 때마다 MovieStore에 userId 동기화
    useEffect(() => {
        if (user) {
            // MovieStore에 userId 설정 (문자열 ID를 숫자로 변환)
            const userId = user.id || (user as any).user_id;
            if (userId) {
                const numericUserId = typeof userId === 'number' ? userId : parseInt(userId as string, 10);
                console.log('✅ MovieStore userId 설정:', numericUserId);
                setMovieStoreUserId(numericUserId);
            } else {
                console.warn('⚠️ user 객체에 id가 없음:', user);
            }
        } else {
            // 로그아웃 시 userId를 null로 설정
            console.log('🔒 로그아웃: MovieStore userId를 null로 설정');
            setMovieStoreUserId(null);
        }
    }, [user, setMovieStoreUserId]);

    // 로그인 (rememberMe 추가)
    const login = async (email: string, password: string, rememberMe: boolean = true) => {
        try {
            const response = await authApi.login({ email, password }, rememberMe);
            setUser(response.user as any);  // useEffect가 자동으로 MovieStore userId 설정
            authApi.saveUser(response.user as any, rememberMe);
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

    // 로그아웃
    const logout = async () => {
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
            console.log('✅ 로컬 상태 및 스토어 정리 완료');
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
