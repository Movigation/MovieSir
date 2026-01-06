// [용도] 온보딩 관련 API 함수 정의
// [사용법] import { submitOTT, submitSurvey, completeOnboarding } from "@/api/onboardingApi";

import { authAxiosInstance } from "@/api/axiosInstance";
import type {
    OnboardingMovie,
    OnboardingCompleteResponse
} from "@/api/onboardingApi.type";

// ------------------------------
// 🎬 온보딩용 영화 목록 가져오기
// ------------------------------
export const fetchOnboardingMovies = async (limit: number = 10): Promise<OnboardingMovie[]> => {
    try {
        // ⚠️ 영화 데이터는 메인 백엔드(8000)에서 가져옴
        const response = await authAxiosInstance.get(
            `/onboarding/survey/movies?limit=${limit}`
        );

        // 백엔드 MovieDetail 응답을 OnboardingMovie로 변환
        return response.data.map((movie: any) => ({
            id: movie.movie_id,
            title: movie.title,
            genres: movie.genres,
            posterUrl: movie.poster_url
        }));
    } catch (error: any) {
        const msg =
            error?.response?.data?.message ||
            "영화 목록을 가져오는 중 오류가 발생했습니다";

        throw new Error(msg);
    }
};

// ------------------------------
// 📺 OTT 선택 제출
// ------------------------------
export const submitOTT = async (
    providerIds: number[]
): Promise<{ status: string }> => {
    try {
        const response = await authAxiosInstance.post<{ status: string }>(
            "/onboarding/ott",
            { provider_ids: providerIds }
        );

        return response.data;
    } catch (error: any) {
        const msg =
            error?.response?.data?.detail ||
            error?.response?.data?.message ||
            "OTT 선택 제출 중 오류가 발생했습니다";

        throw new Error(msg);
    }
};

// ------------------------------
// 🎭 취향 조사 제출
// ------------------------------
export const submitSurvey = async (
    movieIds: number[]
): Promise<{ status: string }> => {
    try {
        const response = await authAxiosInstance.post<{ status: string }>(
            "/onboarding/survey",
            { movie_ids: movieIds }
        );

        return response.data;
    } catch (error: any) {
        const msg =
            error?.response?.data?.detail ||
            error?.response?.data?.message ||
            "취향 조사 제출 중 오류가 발생했습니다";

        throw new Error(msg);
    }
};

// ------------------------------
// ✅ 온보딩 완료
// ------------------------------
// 주의: 백엔드는 이전 단계에서 저장된 provider_ids와 movie_ids를 사용하므로
// 이 함수는 파라미터 없이 완료 처리만 요청합니다.
export const completeOnboarding = async (): Promise<OnboardingCompleteResponse> => {
    try {
        const response = await authAxiosInstance.post<OnboardingCompleteResponse>(
            "/onboarding/complete"
        );

        return response.data;
    } catch (error: any) {
        const msg =
            error?.response?.data?.detail ||
            error?.response?.data?.message ||
            "온보딩 완료 중 오류가 발생했습니다";

        throw new Error(msg);
    }
};

// ------------------------------
// 🚫 온보딩 건너뛰기
// ------------------------------
export const skipOnboarding = async (): Promise<OnboardingCompleteResponse> => {
    try {
        const response = await authAxiosInstance.post<OnboardingCompleteResponse>(
            "/onboarding/skip"
        );

        return response.data;
    } catch (error: any) {
        const msg =
            error?.response?.data?.detail ||
            error?.response?.data?.message ||
            "온보딩 건너뛰기 중 오류가 발생했습니다";

        throw new Error(msg);
    }
};
