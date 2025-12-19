import { create } from 'zustand';
import { type Movie } from '@/api/movieApi.type';
import { postRecommendations } from '@/api/movieApi';


interface Filters {
    time: string;
    genres: string[];
    excludeAdult: boolean;  // 성인 콘텐츠 제외
}

interface MovieState {
    filters: Filters;
    userId: number | null;  // 현재 로그인한 사용자 ID
    recommendedMovies: Movie[];  // 현재 표시 중인 추천 영화 (최대 3개)
    allRecommendedMovies: Movie[];  // 백엔드에서 받은 전체 추천 영화 목록
    popularMovies: Movie[];
    detailMovieId: number | null;  // 상세 보기 영화 ID (Modal이 직접 API 호출)
    isLoading: boolean;
    error: string | null;

    // Actions
    setUserId: (userId: number | null) => void;
    setTime: (time: string) => void;
    toggleGenre: (genre: string) => void;
    toggleExcludeAdult: () => void;  // 성인 제외 토글

    loadRecommended: () => Promise<void>;
    removeRecommendedMovie: (movieId: number) => void;
    removePopularMovie: (movieId: number) => void;  // 인기 영화 제거

    setDetailMovieId: (movieId: number | null) => void;  // 영화 ID만 설정
    resetFilters: () => void;
}

export const useMovieStore = create<MovieState>((set, get) => ({
    filters: {
        time: "00:00",
        genres: [],
        excludeAdult: false  // 기본값: 성인 콘텐츠 포함
    },
    userId: null,
    recommendedMovies: [],
    allRecommendedMovies: [],  // 전체 추천 영화 목록
    popularMovies: [],
    detailMovieId: null,  // 영화 ID만 저장
    isLoading: false,
    error: null,

    setUserId: (userId) => set({ userId }),

    setTime: (time) => set((state) => ({ filters: { ...state.filters, time } })),

    toggleGenre: (genre) =>
        set((state) => ({
            filters: {
                ...state.filters,
                genres: state.filters.genres.includes(genre)
                    ? state.filters.genres.filter((g) => g !== genre)
                    : [...state.filters.genres, genre]
            }
        })),

    toggleExcludeAdult: () =>
        set((state) => ({
            filters: {
                ...state.filters,
                excludeAdult: !state.filters.excludeAdult
            }
        })),



    // [함수] 백엔드 API로 추천 영화 로드
    loadRecommended: async () => {
        const { filters, userId } = get();

        console.log('=== loadRecommended 호출 ===');
        console.log('userId:', userId);
        console.log('filters:', filters);

        // 🔧 userId가 없으면 임시 ID 사용 (백엔드 없이 테스트 가능)
        const effectiveUserId = userId || 0;
        // userId가 없어도 정상 동작 (임시 ID 0 사용)

        set({ isLoading: true, error: null });
        try {
            console.log('백엔드 API 호출 시작...');
            // 백엔드 API 호출 (실패 시 자동으로 임시 데이터 사용)
            const result = await postRecommendations({
                time: filters.time,
                genres: filters.genres,
                userId: effectiveUserId,
                excludeAdult: filters.excludeAdult
            });

            console.log('API 응답:', result);

            // 전체 추천 영화 목록 저장 (재추천 시 사용)
            set({
                allRecommendedMovies: result.algorithmic,  // 전체 목록 저장
                recommendedMovies: result.algorithmic.slice(0, 3),  // 처음 3개만 표시
                popularMovies: result.popular,
                isLoading: false,
                error: null
            });
            console.log('✅ 추천 영화 로드 완료');
        } catch (error) {
            console.error("영화 추천 로드 중 오류:", error);
            set({ error: "영화 추천을 가져오는 중 오류가 발생했습니다", isLoading: false });
        }
    },

    // [함수] 추천 영화 제거 및 자동 채우기
    removeRecommendedMovie: (movieId) => set((state) => {
        console.log('🔄 재추천: 제거할 영화 ID:', movieId);

        // 1. 현재 표시 중인 영화에서 제거
        const newRecommended = state.recommendedMovies.filter(m => m.id !== movieId);

        // 2. 이미 표시된 영화 ID 목록
        const displayedIds = state.recommendedMovies.map(m => m.id);

        // 3. 전체 목록에서 아직 표시되지 않은 영화 찾기
        const nextMovie = state.allRecommendedMovies.find(
            m => !displayedIds.includes(m.id) && m.id !== movieId
        );

        // 4. 다음 영화가 있으면 추가
        if (nextMovie) {
            console.log('✅ 다음 영화로 채움:', nextMovie.title);
            newRecommended.push(nextMovie);
        } else {
            console.log('⚠️ 더 이상 추천할 영화가 없습니다');
        }

        return { recommendedMovies: newRecommended };
    }),

    // [함수] 인기 영화 제거
    removePopularMovie: (movieId) => set((state) => {
        console.log('🔄 인기 영화 제거: ID:', movieId);
        const newPopular = state.popularMovies.filter(m => m.id !== movieId);
        return { popularMovies: newPopular };
    }),

    setDetailMovieId: (movieId) => {
        console.log('🎬 setDetailMovieId called with:', movieId);
        set({ detailMovieId: movieId });
    },

    resetFilters: () => set({
        filters: {
            time: "00:00",
            genres: [],
            excludeAdult: false
        }
    })
}));
