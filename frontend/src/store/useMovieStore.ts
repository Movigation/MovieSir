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
    shownRecommendedIds: number[];  // 이미 표시된 추천 영화 ID (재추천 방지)
    popularMovies: Movie[];  // 현재 표시 중인 인기 영화 (최대 3개)
    allPopularMovies: Movie[];  // 백엔드에서 받은 전체 인기 영화 목록
    shownPopularIds: number[];  // 이미 표시된 인기 영화 ID (재추천 방지)
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
    shownRecommendedIds: [],  // 이미 표시된 추천 영화 ID
    popularMovies: [],
    allPopularMovies: [],  // 전체 인기 영화 목록
    shownPopularIds: [],  // 이미 표시된 인기 영화 ID
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

            // 초기 6개만 표시, 나머지는 재추천 풀에 보관
            const initialRecommended = result.algorithmic.slice(0, 6);
            const initialPopular = result.popular.slice(0, 6);

            console.log('📦 API 응답 데이터:');
            console.log('  - algorithmic 전체:', result.algorithmic.length, '개');
            console.log('  - popular 전체:', result.popular.length, '개');
            console.log('  - 맞춤추천 초기 표시:', initialRecommended.length, '개');
            console.log('  - 인기영화 초기 표시:', initialPopular.length, '개');

            set({
                allRecommendedMovies: result.algorithmic,  // 전체 목록 저장 (재추천 풀)
                recommendedMovies: initialRecommended,  // 6개만 표시
                shownRecommendedIds: initialRecommended.map(m => m.id),  // 표시된 ID 기록
                allPopularMovies: result.popular,  // 전체 인기 영화 목록 저장 (재추천 풀)
                popularMovies: initialPopular,  // 6개만 표시
                shownPopularIds: initialPopular.map(m => m.id),  // 표시된 ID 기록
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
        console.log('🔄 재추천 시작 ========================');
        console.log('  제거할 영화 ID:', movieId);
        console.log('  현재 표시 중:', state.recommendedMovies.map(m => `${m.id}:${m.title}`));
        console.log('  전체 풀:', state.allRecommendedMovies.length, '개');
        console.log('  이미 표시된 IDs:', state.shownRecommendedIds);

        // 1. 현재 표시 중인 영화에서 제거
        const newRecommended = state.recommendedMovies.filter(m => m.id !== movieId);

        // 2. 이미 표시된 적 있는 영화 ID 목록 (기존 + 현재 제거하는 영화)
        const shownIds = [...state.shownRecommendedIds];
        if (!shownIds.includes(movieId)) {
            shownIds.push(movieId);
        }

        // 3. 전체 목록에서 아직 표시되지 않은 영화 찾기
        const availableMovies = state.allRecommendedMovies.filter(m => !shownIds.includes(m.id));
        console.log('  남은 영화:', availableMovies.length, '개');
        console.log('  남은 영화 목록:', availableMovies.map(m => m.title));

        const nextMovie = availableMovies[0];

        // 4. 다음 영화가 있으면 추가하고 shownIds 업데이트
        if (nextMovie) {
            console.log('✅ 다음 영화로 채움:', nextMovie.title);
            newRecommended.push(nextMovie);
            shownIds.push(nextMovie.id);
        } else {
            console.log('⚠️ 더 이상 추천할 영화가 없습니다');
        }

        console.log('  새로운 표시 목록:', newRecommended.map(m => m.title));
        console.log('🔄 재추천 완료 ========================');

        return {
            recommendedMovies: newRecommended,
            shownRecommendedIds: shownIds
        };
    }),

    // [함수] 인기 영화 제거 및 자동 채우기
    removePopularMovie: (movieId) => set((state) => {
        console.log('🎬 인기영화 재추천 시작 ========================');
        console.log('  제거할 영화 ID:', movieId);
        console.log('  현재 표시 중:', state.popularMovies.map(m => `${m.id}:${m.title}`));
        console.log('  전체 풀:', state.allPopularMovies.length, '개');
        console.log('  이미 표시된 IDs:', state.shownPopularIds);

        // 1. 현재 표시 중인 영화에서 제거
        const newPopular = state.popularMovies.filter(m => m.id !== movieId);

        // 2. 이미 표시된 적 있는 영화 ID 목록 (기존 + 현재 제거하는 영화)
        const shownIds = [...state.shownPopularIds];
        if (!shownIds.includes(movieId)) {
            shownIds.push(movieId);
        }

        // 3. 전체 목록에서 아직 표시되지 않은 영화 찾기
        const availableMovies = state.allPopularMovies.filter(m => !shownIds.includes(m.id));
        console.log('  남은 인기영화:', availableMovies.length, '개');
        console.log('  남은 영화 목록:', availableMovies.map(m => m.title));

        const nextMovie = availableMovies[0];

        // 4. 다음 영화가 있으면 추가하고 shownIds 업데이트
        if (nextMovie) {
            console.log('✅ 다음 인기영화로 채움:', nextMovie.title);
            newPopular.push(nextMovie);
            shownIds.push(nextMovie.id);
        } else {
            console.log('⚠️ 더 이상 추천할 인기 영화가 없습니다');
        }

        console.log('  새로운 표시 목록:', newPopular.map(m => m.title));
        console.log('🎬 인기영화 재추천 완료 ========================');

        return {
            popularMovies: newPopular,
            shownPopularIds: shownIds
        };
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
        },
        // 재추천 기록도 초기화 (새로운 추천 시작)
        shownRecommendedIds: [],
        shownPopularIds: [],
        recommendedMovies: [],
        popularMovies: [],
        allRecommendedMovies: [],
        allPopularMovies: []
    })
}));
