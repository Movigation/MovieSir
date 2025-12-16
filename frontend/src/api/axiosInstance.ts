import axios from "axios";

// skipErrorRedirect 속성을 위한 타입 확장
declare module 'axios' {
    export interface AxiosRequestConfig {
        skipErrorRedirect?: boolean;
    }
}

// 메인 API 베이스 URL (영화, 추천 등)
const API_BASE_URL =
    process.env.NODE_ENV === "development"
        ? "http://localhost:8000"  // Backend (더미 DB)
        : "https://api.movisr.com";

// 회원가입 전용 API 베이스 URL (PostgreSQL 연동)
const AUTH_BASE_URL =
    process.env.NODE_ENV === "development"
        ? "http://localhost:8001"  // Backend_SW (PostgreSQL)
        : "https://auth.movisr.com";

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
// Request Interceptor: 자동으로 accessToken 첨부
// ------------------------------
const requestInterceptor = (config: any) => {
    const accessToken = localStorage.getItem("accessToken");

    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }

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
// Response Interceptor: 401 처리 및 토큰 갱신
// ------------------------------
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
}> = [];

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

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // 401 에러이고 아직 재시도하지 않은 경우
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // 이미 토큰 갱신 중이면 대기열에 추가
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return axiosInstance(originalRequest);
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = localStorage.getItem("refreshToken");

            if (!refreshToken) {
                // Refresh token이 없으면 로그아웃 처리
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                localStorage.removeItem("user");
                window.location.href = "/";
                return Promise.reject(error);
            }

            try {
                // 토큰 갱신 시도
                const response = await axios.post(
                    `${API_BASE_URL}/auth/refresh`,
                    { refreshToken },
                    { withCredentials: true }
                );

                const { accessToken: newAccessToken } = response.data;

                // 새 토큰 저장
                localStorage.setItem("accessToken", newAccessToken);

                // 대기열의 요청들 처리
                processQueue(null, newAccessToken);

                // 원래 요청 재시도
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return axiosInstance(originalRequest);
            } catch (refreshError) {
                // 토큰 갱신 실패 시 로그아웃
                processQueue(refreshError, null);
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                localStorage.removeItem("user");
                window.location.href = "/";
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
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
