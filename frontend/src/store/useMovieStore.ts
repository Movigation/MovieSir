import { create } from 'zustand';
import { type Movie, type RecommendedMovieV2 } from '@/api/movieApi.type';
import { postRecommendationsV2, postReRecommendSingle, convertV2MovieToMovie } from '@/api/movieApi';


interface Filters {
    time: string;
    genres: string[];
    excludeAdult: boolean;  // 성인 콘텐츠 제외
}

interface MovieState {
    filters: Filters;
    userId: number | null;  // 현재 로그인한 사용자 ID

    // Track A: 맞춤 추천 (장르 + OTT 필터)
    trackAMovies: Movie[];  // 현재 표시 중인 Track A 영화
    trackATotalRuntime: number;  // Track A 총 러닝타임
    trackALabel: string;  // Track A 라벨

    // Track B: 다양성 추천 (장르 확장)
    trackBMovies: Movie[];  // 현재 표시 중인 Track B 영화
    trackBTotalRuntime: number;  // Track B 총 러닝타임
    trackBLabel: string;  // Track B 라벨

    // 재추천용 상태
    excludedIds: number[];  // 이미 추천된 영화 ID (재추천 시 제외)

    // 하위 호환용 (기존 UI 지원)
    recommendedMovies: Movie[];
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
    removeRecommendedMovie: (movieId: number) => Promise<void>;
    removePopularMovie: (movieId: number) => Promise<void>;  // Track B 영화 제거

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

    // Track A: 맞춤 추천
    trackAMovies: [],
    trackATotalRuntime: 0,
    trackALabel: "맞춤 추천",

    // Track B: 다양성 추천
    trackBMovies: [],
    trackBTotalRuntime: 0,
    trackBLabel: "다양성 추천",

    // 재추천용
    excludedIds: [],

    // 하위 호환
    recommendedMovies: [],
    popularMovies: [],

    detailMovieId: null,
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



    // [함수] 백엔드 API로 추천 영화 로드 (V2 API)
    loadRecommended: async () => {
        const { filters } = get();

        console.log('=== loadRecommended V2 호출 ===');
        console.log('filters:', filters);

        set({ isLoading: true, error: null });
        try {
            console.log('V2 API 호출 시작...');
            const result = await postRecommendationsV2({
                time: filters.time,
                genres: filters.genres,
                excludeAdult: filters.excludeAdult
            });

            console.log('V2 API 응답:', result);

            // V2 응답을 Movie 타입으로 변환
            const trackAMovies = result.track_a.movies.map(convertV2MovieToMovie);
            const trackBMovies = result.track_b.movies.map(convertV2MovieToMovie);

            // 모든 영화 ID를 excludedIds에 추가 (재추천 시 제외용)
            const allMovieIds = [
                ...result.track_a.movies.map(m => m.tmdb_id),
                ...result.track_b.movies.map(m => m.tmdb_id)
            ];

            console.log('📦 V2 API 응답 데이터:');
            console.log('  - Track A:', result.track_a.label, '-', trackAMovies.length, '편,', result.track_a.total_runtime, '분');
            console.log('  - Track B:', result.track_b.label, '-', trackBMovies.length, '편,', result.track_b.total_runtime, '분');

            set({
                // Track A
                trackAMovies,
                trackATotalRuntime: result.track_a.total_runtime,
                trackALabel: result.track_a.label,

                // Track B
                trackBMovies,
                trackBTotalRuntime: result.track_b.total_runtime,
                trackBLabel: result.track_b.label,

                // 재추천용
                excludedIds: allMovieIds,

                // 하위 호환 (기존 UI 지원)
                recommendedMovies: trackAMovies,
                popularMovies: trackBMovies,

                isLoading: false,
                error: null
            });
            console.log('✅ V2 추천 영화 로드 완료');
        } catch (error) {
            console.error("V2 영화 추천 로드 중 오류:", error);
            set({ error: "영화 추천을 가져오는 중 오류가 발생했습니다", isLoading: false });
        }
    },

    // [함수] Track A 영화 제거 및 V2 API로 재추천
    removeRecommendedMovie: async (movieId) => {
        const state = get();
        console.log('🔄 Track A 재추천 시작 ========================');
        console.log('  제거할 영화 ID:', movieId);

        // 제거할 영화 찾기
        const movieToRemove = state.trackAMovies.find(m => m.id === movieId);
        if (!movieToRemove) {
            console.log('⚠️ 제거할 영화를 찾을 수 없습니다');
            return;
        }

        console.log('  제거할 영화:', movieToRemove.title, `(${movieToRemove.runtime}분)`);

        // 현재 영화에서 제거
        const newTrackAMovies = state.trackAMovies.filter(m => m.id !== movieId);
        const newExcludedIds = [...state.excludedIds, movieId];

        // 사용자 입력 시간 계산 (HH:MM -> 분)
        const [hours, minutes] = state.filters.time.split(':').map(Number);
        const userInputTime = hours * 60 + minutes;

        // 남은 영화들의 총 러닝타임 계산
        const remainingRuntime = newTrackAMovies.reduce((sum, m) => sum + (m.runtime || 0), 0);

        // target_runtime = 사용자 입력 시간 - 남은 영화들의 러닝타임
        const targetRuntime = userInputTime - remainingRuntime;
        console.log('  사용자 입력 시간:', userInputTime, '분');
        console.log('  남은 영화 러닝타임:', remainingRuntime, '분');
        console.log('  재추천 target_runtime:', targetRuntime, '분');

        set({
            trackAMovies: newTrackAMovies,
            recommendedMovies: newTrackAMovies,
            excludedIds: newExcludedIds
        });

        // V2 API로 재추천 요청
        try {
            const response = await postReRecommendSingle({
                target_runtime: targetRuntime,
                excluded_ids: newExcludedIds,
                track: "a",
                genres: state.filters.genres,
                exclude_adult: state.filters.excludeAdult
            });

            if (response.success && response.movie) {
                const newMovie = convertV2MovieToMovie(response.movie);
                console.log('✅ Track A 재추천 성공:', newMovie.title, `(${newMovie.runtime}분)`);

                set((s) => ({
                    trackAMovies: [...s.trackAMovies, newMovie],
                    recommendedMovies: [...s.trackAMovies, newMovie],
                    trackATotalRuntime: remainingRuntime + (newMovie.runtime || 0),
                    excludedIds: [...s.excludedIds, newMovie.id]
                }));
            } else {
                console.log('⚠️ Track A 재추천 실패:', response.message);
            }
        } catch (error) {
            console.error('Track A 재추천 API 오류:', error);
        }

        console.log('🔄 Track A 재추천 완료 ========================');
    },

    // [함수] Track B 영화 제거 및 V2 API로 재추천
    removePopularMovie: async (movieId) => {
        const state = get();
        console.log('🎬 Track B 재추천 시작 ========================');
        console.log('  제거할 영화 ID:', movieId);

        // 제거할 영화 찾기
        const movieToRemove = state.trackBMovies.find(m => m.id === movieId);
        if (!movieToRemove) {
            console.log('⚠️ 제거할 영화를 찾을 수 없습니다');
            return;
        }

        console.log('  제거할 영화:', movieToRemove.title, `(${movieToRemove.runtime}분)`);

        // 현재 영화에서 제거
        const newTrackBMovies = state.trackBMovies.filter(m => m.id !== movieId);
        const newExcludedIds = [...state.excludedIds, movieId];

        // 사용자 입력 시간 계산 (HH:MM -> 분)
        const [hours, minutes] = state.filters.time.split(':').map(Number);
        const userInputTime = hours * 60 + minutes;

        // 남은 영화들의 총 러닝타임 계산
        const remainingRuntime = newTrackBMovies.reduce((sum, m) => sum + (m.runtime || 0), 0);

        // target_runtime = 사용자 입력 시간 - 남은 영화들의 러닝타임
        const targetRuntime = userInputTime - remainingRuntime;
        console.log('  사용자 입력 시간:', userInputTime, '분');
        console.log('  남은 영화 러닝타임:', remainingRuntime, '분');
        console.log('  재추천 target_runtime:', targetRuntime, '분');

        set({
            trackBMovies: newTrackBMovies,
            popularMovies: newTrackBMovies,
            excludedIds: newExcludedIds
        });

        // V2 API로 재추천 요청
        try {
            const response = await postReRecommendSingle({
                target_runtime: targetRuntime,
                excluded_ids: newExcludedIds,
                track: "b",
                genres: state.filters.genres,
                exclude_adult: state.filters.excludeAdult
            });

            if (response.success && response.movie) {
                const newMovie = convertV2MovieToMovie(response.movie);
                console.log('✅ Track B 재추천 성공:', newMovie.title, `(${newMovie.runtime}분)`);

                set((s) => ({
                    trackBMovies: [...s.trackBMovies, newMovie],
                    popularMovies: [...s.trackBMovies, newMovie],
                    trackBTotalRuntime: remainingRuntime + (newMovie.runtime || 0),
                    excludedIds: [...s.excludedIds, newMovie.id]
                }));
            } else {
                console.log('⚠️ Track B 재추천 실패:', response.message);
            }
        } catch (error) {
            console.error('Track B 재추천 API 오류:', error);
        }

        console.log('🎬 Track B 재추천 완료 ========================');
    },

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
        // V2 상태 초기화
        trackAMovies: [],
        trackATotalRuntime: 0,
        trackALabel: "맞춤 추천",
        trackBMovies: [],
        trackBTotalRuntime: 0,
        trackBLabel: "다양성 추천",
        excludedIds: [],
        // 하위 호환
        recommendedMovies: [],
        popularMovies: []
    })
}));
