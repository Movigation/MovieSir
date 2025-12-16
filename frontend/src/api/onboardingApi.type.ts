// [용도] 온보딩 관련 API 타입 정의
// [사용법] import { OnboardingMovie, OTTSubmitRequest } from "@/api/onboardingApi.type";

// ------------------------------
// 온보딩 영화 카드 타입
// ------------------------------
export interface OnboardingMovie {
    id: number;
    title: string;
    genres: string[];
    posterUrl?: string;
    popularity?: number;
}

// ------------------------------
// OTT 선택 요청 타입
// ------------------------------
export interface OTTSubmitRequest {
    provider_ids: number[];
}

// ------------------------------
// 취향 조사 요청 타입
// ------------------------------
export interface SurveySubmitRequest {
    movie_ids: number[];
}

// ------------------------------
// 온보딩 완료 응답 타입
// ------------------------------
export interface OnboardingCompleteResponse {
    user_id: string;
    onboarding_completed: boolean;
}
