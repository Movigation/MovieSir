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
// Response Interceptor: 401 처리 + 토큰 자동 갱신
// ------------------------------
let isRefreshing = false;  // 토큰 갱신 중복 방지
let failedQueue: any[] = [];  // 대기 중인 요청 큐

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// 쿠키 읽기 헬퍼 함수
const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
};

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // 401 에러 처리
        if (
            error.response?.status === 401 &&
            !originalRequest.skipAuth &&
            !originalRequest._retry  // 무한 루프 방지
        ) {
            // remember_me 쿠키 확인
            const rememberMe = getCookie('remember_me') === 'true';

            // 🔄 자동로그인 체크 시: 토큰 갱신 시도
            if (rememberMe && !isRefreshing) {
                isRefreshing = true;
                originalRequest._retry = true;

                try {
                    // /auth/refresh API 호출 (쿠키 자동 전송)
                    await axiosInstance.post('/auth/refresh');

                    // 토큰 갱신 성공 → 대기 중인 요청 처리
                    processQueue(null, 'success');
                    isRefreshing = false;

                    // 원래 요청 재시도
                    return axiosInstance(originalRequest);
                } catch (refreshError) {
                    // Refresh Token도 만료 → 로그아웃 처리
                    processQueue(refreshError, null);
                    isRefreshing = false;

                    // 로그아웃 처리
                    handleLogout();
                    return Promise.reject(refreshError);
                }
            }
            // 🔄 자동로그인 체크 안 함: 즉시 로그아웃
            else if (!rememberMe) {
                handleLogout();
                return Promise.reject(error);
            }
            // 토큰 갱신 중인 경우: 대기 큐에 추가
            else {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(() => {
                        return axiosInstance(originalRequest);
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }
        }

        // [기존] Error Page Redirection 코드는 그대로 유지
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

// 로그아웃 처리 헬퍼 함수
function handleLogout() {
    try {
        const { useMovieStore } = require("@/store/useMovieStore");
        useMovieStore.getState().setUserId(null);
        useMovieStore.getState().resetFilters();
    } catch (e) {
        console.error("Zustand store reset failed:", e);
    }

    // AuthContext에 로그아웃 이벤트 전달
    window.dispatchEvent(new CustomEvent('auth:logout'));

    // 메인 페이지로 리다이렉트
    window.location.href = "/?expired=true";
}

export default axiosInstance;