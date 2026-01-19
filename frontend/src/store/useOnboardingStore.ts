import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OnboardingMovie } from '@/api/onboardingApi.type';

interface OnboardingState {
    provider_ids: number[];  // OTT provider IDs (예: ["1", "3", "5"])
    movie_ids: number[];  // 좋아요한 영화 ID 배열
    movies: OnboardingMovie[]; // 로드된 전체 영화 목록 (상세 정보 포함)

    // Actions
    setMovies: (movies: OnboardingMovie[]) => void;
    toggleOTT: (platform: number) => void;
    clearOttList: () => void;  // OTT 선택 초기화
    addLikedMovie: (movieId: number) => void;  // 영화 좋아요 추가
    removeLikedMovie: (movieId: number) => void;  // 영화 좋아요 제거 (선택 취소)
    clearMovieSelection: () => void;  // 영화 선택만 초기화 (OTT 선택은 유지)
    reset: () => void;  // 전체 초기화
}

export const useOnboardingStore = create<OnboardingState>()(
    persist(
        (set) => ({
            provider_ids: [],
            movie_ids: [],
            movies: [],

            setMovies: (movies) => set({ movies }),

            addLikedMovie: (movieId) => {
                set((state) => {
                    // 중복 방지
                    if (state.movie_ids.includes(movieId)) {
                        return state;
                    }
                    return {
                        movie_ids: [...state.movie_ids, movieId],
                    };
                });
            },

            removeLikedMovie: (movieId) => {
                set((state) => ({
                    movie_ids: state.movie_ids.filter((id) => id !== movieId),
                }));
            },

            toggleOTT: (platform) => {
                set((state) => {
                    const isSelected = state.provider_ids.includes(platform);
                    return {
                        provider_ids: isSelected
                            ? state.provider_ids.filter((p) => p !== platform)
                            : [...state.provider_ids, platform],
                    };
                });
            },

            clearOttList: () => {
                set({ provider_ids: [] });
            },

            clearMovieSelection: () => {
                set({ movie_ids: [], movies: [] });
            },

            reset: () => {
                set({
                    movie_ids: [],
                    provider_ids: [],
                    movies: [],
                });
            }
        }),
        {
            name: 'onboarding-storage', // localStorage key
            // 💾 localStorage에 저장할 필드만 지정 (actions는 제외)
            partialize: (state) => ({
                provider_ids: state.provider_ids,
                movie_ids: state.movie_ids,
                // [최적화] movies(줄거리 포함 전체 정보)는 저장하지 않음. 
                // 필요시 id를 기반으로 다시 로드하거나 세션용으로만 사용.
            }),
        }
    )
);
