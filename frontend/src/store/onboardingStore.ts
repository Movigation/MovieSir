import { create } from 'zustand';

interface OnboardingState {
    ottList: string[];  // OTT provider IDs (예: ["1", "3", "5"])
    likedMovieIds: number[];  // 좋아요한 영화 ID 배열

    // Actions
    toggleOTT: (platform: string) => void;
    clearOttList: () => void;  // OTT 선택 초기화
    addLikedMovie: (movieId: number) => void;  // 영화 좋아요 추가
    removeLikedMovie: (movieId: number) => void;  // 영화 좋아요 제거 (선택 취소)
    reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
    ottList: [],
    likedMovieIds: [],

    addLikedMovie: (movieId) => {
        set((state) => {
            // 중복 방지
            if (state.likedMovieIds.includes(movieId)) {
                return state;
            }
            return {
                likedMovieIds: [...state.likedMovieIds, movieId],
            };
        });
    },

    removeLikedMovie: (movieId) => {
        set((state) => ({
            likedMovieIds: state.likedMovieIds.filter((id) => id !== movieId),
        }));
    },

    toggleOTT: (platform) => {
        set((state) => {
            const isSelected = state.ottList.includes(platform);
            return {
                ottList: isSelected
                    ? state.ottList.filter((p) => p !== platform)
                    : [...state.ottList, platform],
            };
        });
    },

    clearOttList: () => {
        set({ ottList: [] });
    },

    reset: () => {
        set({
            likedMovieIds: [],
            ottList: [],
        });
    }
}));


