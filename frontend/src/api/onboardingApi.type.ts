// [용도] 온보딩 관련 API 타입 정의
// [사용법] import { OnboardingMovie, OTTSubmitRequest } from "@/api/onboardingApi.type";

// ------------------------------
// 온보딩 영화 카드 타입 (백엔드 응답)
// ------------------------------
export interface OnboardingMovie {
    movie_id: number;
    mood_tag: string;
    title: string;
    poster_path?: string; // TMDB 포스터 경로 (예: "/abc123.jpg")
}

// 온보딩 설문 영화 리스트 응답
export interface SurveyMoviesResponse {
    movies: OnboardingMovie[];
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
