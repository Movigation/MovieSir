import axios from "axios";

// skipErrorRedirect 및 skipAuth 속성을 위한 타입 확장
declare module 'axios' {
    export interface AxiosRequestConfig {
        skipErrorRedirect?: boolean;
        skipAuth?: boolean;  // 로그인/회원가입 요청은 401 인터셉터 스킵
    }
}

// 메인 API 베이스 URL (영화, 추천 등)
// 프로덕션: 빈 문자열 = 같은 도메인 (nginx 프록시)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV
    ? "http://localhost:8000"
    : "");

// 회원가입 전용 API 베이스 URL (PostgreSQL 연동)
const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL || (import.meta.env.DEV
    ? "http://localhost:8000"
    : "");

// 메인 axios 인스턴스 (영화, 추천 등)
const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

// 회원가입 전용 axios 인스턴스 (backend_sw)
export const authAxiosInstance = axios.create({
    baseURL: AUTH_BASE_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

// ------------------------------
// Request Interceptor: 쿠키 기반 인증 (토큰은 자동으로 쿠키에 포함됨)
// ------------------------------
const requestInterceptor = (config: any) => {
    // 🍪 토큰은 HttpOnly 쿠키로 자동 전송됨 (withCredentials: true)
    // Authorization 헤더 수동 설정 불필요
    return config;
};

const requestErrorInterceptor = (error: any) => {
    return Promise.reject(error);
};

// 메인 인스턴스에 적용
axiosInstance.interceptors.request.use(
    requestInterceptor,
    requestErrorInterceptor
);

// 회원가입 인스턴스에도 적용
authAxiosInstance.interceptors.request.use(
    requestInterceptor,
    requestErrorInterceptor
);

// ------------------------------
// Response Interceptor: 401 처리 (쿠키 기반 인증)
// ------------------------------
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // 401 에러 처리
        // ⚠️ 단, 로그인/회원가입 요청은 제외 (skipAuth 플래그)
        if (
            error.response?.status === 401 &&
            !originalRequest.skipAuth
        ) {
            // 🍪 쿠키 기반 인증: 401 에러 시 로그아웃 처리
            // 1. 사용자 정보 및 상태 초기화 (Zustand)
            try {
                const { useMovieStore } = await import("@/store/useMovieStore");
                useMovieStore.getState().setUserId(null);
                useMovieStore.getState().resetFilters();
            } catch (e) {
                console.error("Zustand store reset failed:", e);
            }

            // 2. AuthContext에 로그아웃 이벤트 전달 (커스텀 이벤트)
            window.dispatchEvent(new CustomEvent('auth:logout'));

            // 3. 메인 페이지로 리다이렉트 (로그아웃됨을 알림)
            window.location.href = "/?expired=true";

            return Promise.reject(error);
        }

        // [New] Error Page Redirection
        // skipErrorRedirect 플래그가 있는 요청은 에러 페이지로 리다이렉트하지 않음
        const skipErrorRedirect = originalRequest?.skipErrorRedirect;
        const status = error.response?.status;
        const currentPath = window.location.pathname;

        if (!skipErrorRedirect) {
            if (status === 400 && currentPath !== "/error/400") {
                window.location.href = "/error/400";
                return Promise.reject(error);
            }

            if (status === 423 && currentPath !== "/error/423") {
                window.location.href = "/error/423";
                return Promise.reject(error);
            }

            if (status === 500 && currentPath !== "/error/500") {
                window.location.href = "/error/500";
                return Promise.reject(error);
            }
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;
