// [용도] 인증 관련 API 함수 정의
// [사용법] import { login, signup, logout, getCurrentUser } from "@/api/authApi";

import axiosInstance, { authAxiosInstance } from "@/api/axiosInstance";
import type { LoginRequest, LoginResponse, User } from "@/api/authApi.type";
import type { SignupRequest, SignupResponse } from "@/api/authApi.type";
import { rateLimiter, validateEmail, getSecureErrorMessage, secureLog } from "@/utils/security";

// ------------------------------
// 🔐 로그인
// ------------------------------
export const login = async (data: LoginRequest, rememberMe: boolean = true): Promise<LoginResponse> => {
    // 🛡️ Rate Limiting: 1분에 5번만 시도 가능
    if (!rateLimiter.isAllowed('login', 5, 60000)) {
        const waitTime = rateLimiter.getTimeUntilNextRequest('login', 5, 60000);
        throw new Error(`너무 많은 로그인 시도가 감지되었습니다. ${waitTime}초 후에 다시 시도해주세요.`);
    }

    // 🛡️ 입력 검증
    if (!validateEmail(data.email)) {
        throw new Error('올바른 이메일 형식이 아닙니다.');
    }

    try {
        const response = await axiosInstance.post("/auth/login", {
            email: data.email,
            password: data.password,
        }, {
            skipErrorRedirect: true,
        } as any);

        const { access_token, refresh_token, user } = response.data;

        // 토큰 저장 (rememberMe에 따라 localStorage 또는 sessionStorage)
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem("accessToken", access_token);
        storage.setItem("refreshToken", refresh_token);
        
        // user 데이터를 올바른 형식으로 변환하여 저장
        const userData = {
            id: user.user_id,
            email: user.email,
            nickname: user.nickname,
            onboarding_completed: user.onboarding_completed,
        };
        storage.setItem("user", JSON.stringify(userData));
        
        // 로그인 방식 저장 (나중에 확인용)
        storage.setItem("rememberMe", rememberMe ? "true" : "false");

        secureLog('로그인 성공', { userId: user.user_id });  // 민감 정보 제외 로깅

        return response.data;
    } catch (error: any) {
        // 🛡️ 보안 강화: 에러 메시지 정보 노출 최소화
        const secureMessage = getSecureErrorMessage(error);

        // 백엔드 에러 응답 구조: { detail: { error: "...", message: "..." } }
        const errorData = error?.response?.data;
        let msg = secureMessage;

        // 개발 환경에서만 상세 메시지 표시
        if (process.env.NODE_ENV === 'development' && errorData) {
            // detail이 객체인 경우 (백엔드 FastAPI 표준)
            if (typeof errorData.detail === 'object' && errorData.detail?.message) {
                msg = errorData.detail.message;
            }
            // detail이 문자열인 경우
            else if (typeof errorData.detail === 'string') {
                msg = errorData.detail;
            }
            // message 필드가 있는 경우
            else if (errorData.message) {
                msg = errorData.message;
            }
        }

        throw new Error(msg);
    }
};

// ------------------------------
// 📝 회원가입
// ------------------------------
export const signup = async (data: SignupRequest): Promise<SignupResponse> => {
    try {
        // ✅ backend_sw (포트 8001, PostgreSQL DB)로 요청
        const response = await authAxiosInstance.post("/auth/signup/request", data, {
            skipErrorRedirect: true,
        } as any);

        const { user, message } = response.data;

        return {
            user,
            message,
        };
    } catch (error: any) {
        // 에러 메시지 우선순위: detail.message > message > detail (문자열) > 기본 메시지
        let msg = "회원가입 중 오류가 발생했습니다";

        if (error?.response?.data) {
            const errorData = error.response.data;

            // 중복 이메일 에러 처리 (일반적으로 400 에러)
            if (error.response.status === 400) {
                if (typeof errorData.detail === 'string' && errorData.detail.includes('already exists')) {
                    msg = "이미 가입된 이메일입니다.";
                } else if (typeof errorData.detail === 'string' && errorData.detail.includes('이미')) {
                    msg = errorData.detail;
                } else if (errorData.detail?.message) {
                    msg = errorData.detail.message;
                } else if (errorData.message) {
                    msg = errorData.message;
                } else if (typeof errorData.detail === 'string') {
                    msg = errorData.detail;
                }
            } else {
                msg = errorData.detail?.message || errorData.message || msg;
            }
        }

        throw new Error(msg);
    }
};

// ------------------------------
// 🚪 로그아웃
// ------------------------------
export const logout = async (): Promise<void> => {
    try {
        await axiosInstance.post("/auth/logout");
    } catch (error) {
        console.error("로그아웃 중 오류가 발생했습니다:", error);
    }

    // localStorage와 sessionStorage 모두에서 제거
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("rememberMe");

    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("rememberMe");
};

// ------------------------------
// 👤 현재 로그인된 사용자 가져오기
// ------------------------------
export const getCurrentUser = async () => {
    try {
        // 1. localStorage 또는 sessionStorage에서 user 확인
        let userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
        let storage: Storage | null = null;

        if (localStorage.getItem("user")) {
            storage = localStorage;
        } else if (sessionStorage.getItem("user")) {
            storage = sessionStorage;
        }

        if (userStr && storage) {
            try {
                const user = JSON.parse(userStr);
                if (user && user.id) {
                    return user;
                }
            } catch (parseError) {
                console.error("user 파싱 오류:", parseError);
                storage?.removeItem("user");
            }
        }

        // 2. accessToken 확인 (localStorage 또는 sessionStorage)
        const accessToken = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
        if (accessToken) {
            const tokenStorage = localStorage.getItem("accessToken") ? localStorage : sessionStorage;
            try {
                const response = await axiosInstance.get("/auth/me");
                const user = response.data;
                tokenStorage.setItem("user", JSON.stringify(user));
                return user;
            } catch (error) {
                console.error("사용자 정보 가져오기 실패:", error);
            }
        }

        return null;
    } catch (error) {
        console.error("getCurrentUser 오류:", error);
        return null;
    }
};

// ------------------------------
// 🗑️ 회원 탈퇴 (백엔드 API 필요 시 연결)
// ------------------------------
export const deleteUser = async (userId: string): Promise<void> => {
    try {
        await axiosInstance.delete(`/users/${userId}`);
        logout();
    } catch (error) {
        throw new Error("회원 탈퇴 중 오류가 발생했습니다");
    }
};

// ------------------------------
// 📧 이메일 인증 코드 전송
// ------------------------------
export const sendVerificationCode = async (email: string): Promise<{ message: string; expiresIn: number }> => {
    try {
        const response = await axiosInstance.post("/auth/signup/send-code", { email });
        return {
            message: response.data.message,
            expiresIn: response.data.expiresIn,
        };
    } catch (error: any) {
        const msg = error?.response?.data?.message || "인증 코드 전송 중 오류가 발생했습니다";
        throw new Error(msg);
    }
};

// ------------------------------
// ✅ 이메일 인증 코드 확인 + 회원가입 완료
// ------------------------------
export const verifyCode = async (email: string, code: string): Promise<{ valid: boolean; message: string; user?: any; token?: any }> => {
    try {
        // 인증 확인과 동시에 회원가입 완료
        const response = await authAxiosInstance.post("/auth/signup/confirm", {
            email,
            code
        });

        // 토큰과 유저 정보 저장
        const { token, user_id, email: userEmail, nickname, onboarding_completed } = response.data;

        if (token) {
            localStorage.setItem('accessToken', token.access_token);
            const userData = {
                id: user_id,
                email: userEmail,
                nickname: nickname,  // ✅ nickname 추가
                onboarding_completed,
            };
            localStorage.setItem('user', JSON.stringify(userData));
        }

        return {
            valid: true,
            message: "회원가입이 완료되었습니다!",
            user: response.data,
            token: token,
        };
    } catch (error: any) {
        const msg = error?.response?.data?.detail || error?.response?.data?.message || "인증 코드 확인 중 오류가 발생했습니다";
        throw new Error(msg);
    }
};

// ------------------------------
// 💾 사용자 정보 저장 (로컬 스토리지 업데이트)
// ------------------------------
export const saveUser = (user: Omit<User, 'password'>, rememberMe: boolean = true): void => {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem("user", JSON.stringify(user));
    storage.setItem("rememberMe", rememberMe ? "true" : "false");
};
