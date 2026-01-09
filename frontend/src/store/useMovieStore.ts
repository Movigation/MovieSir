import { create } from 'zustand';
import { type Movie, type MovieDetail } from '@/api/movieApi.type';
import { postRecommendationsV2, postReRecommendSingle, convertV2MovieToMovie, getMovieDetail } from '@/api/movieApi';
import { useToastStore } from './useToastStore';


interface Filters {
  time: string;
  genres: string[];
  exclude_adult: boolean;  // 성인 콘텐츠 제외
}

interface MovieState {
  filters: Filters;
  userId: number | null; // 현재 로그인한 사용자 ID

  // Track A: 맞춤 추천 (장르 + OTT 필터)
  trackAMovies: Movie[]; // 현재 표시 중인 Track A 영화
  trackATotalRuntime: number; // Track A 총 러닝타임
  trackALabel: string; // Track A 라벨

  // Track B: 다양성 추천 (장르 확장)
  trackBMovies: Movie[]; // 현재 표시 중인 Track B 영화
  trackBTotalRuntime: number; // Track B 총 러닝타임
  trackBLabel: string; // Track B 라벨

  // 재추천용 상태
  excludedIds: number[]; // 이미 추천된 영화 ID (재추천 시 제외)

  // 하위 호환용 (기존 UI 지원)
  recommendedMovies: Movie[];
  popularMovies: Movie[];

  detailMovieId: number | null; // 상세 보기 영화 ID (Modal이 직접 API 호출)
  isLoading: boolean;
  error: string | null;

  // Actions
  setUserId: (userId: number | null) => void;
  setTime: (time: string) => void;
  toggleGenre: (genre: string) => void;
  toggleExcludeAdult: () => void; // 성인 제외 토글

  loadRecommended: () => Promise<void>;
  removeRecommendedMovie: (movieId: number) => Promise<void>;
  removePopularMovie: (movieId: number) => Promise<void>; // Track B 영화 제거

  setDetailMovieId: (movieId: number | null) => void;  // 영화 ID만 설정
  resetFilters: () => void;
  prefetchMovieDetails: (movies: Movie[]) => Promise<void>;
  reset: () => void;
}

// [헬퍼] 시간 문자열("HH:MM")을 분 단위 숫자로 변환
const getUserInputMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

// [헬퍼] 스켈레톤 영화 객체 생성
const createSkeletonMovie = (id: number): Movie => ({
  id,
  title: "Loading...",
  genres: [],
  poster: "",
  description: "",
  popular: false,
  isSkeleton: true
});

export const useMovieStore = create<MovieState>((set, get) => {
  // 🔄 내부 공통 재추천 핸들러
  const handleReRecommend = async (trackType: 'a' | 'b', movieId: number) => {
    const state = get();
    const isTrackA = trackType === 'a';
    const movieKey = isTrackA ? 'trackAMovies' : 'trackBMovies';
    const legacyKey = isTrackA ? 'recommendedMovies' : 'popularMovies';
    const runtimeKey = isTrackA ? 'trackATotalRuntime' : 'trackBTotalRuntime';

    console.log(`🔄 [Track ${trackType.toUpperCase()}] 재추천 시작 ========================`);

    const currentMovies = [...state[movieKey]];
    const movieIndex = currentMovies.findIndex(m => m.id === movieId);
    const movieToRemove = currentMovies[movieIndex];

    if (!movieToRemove || movieIndex === -1) {
      console.log('⚠️ 제거할 영화를 찾을 수 없습니다');
      return;
    }

    // 1. 상태 선점: 즉시 스켈레톤으로 교체
    const newExcludedIds = [...state.excludedIds, movieId];
    currentMovies[movieIndex] = createSkeletonMovie(movieId);

    set({
      [movieKey]: currentMovies,
      [legacyKey]: currentMovies
    });

    // 2. 런타임 계산 및 API 요청
    try {
      const userInputTime = getUserInputMinutes(state.filters.time);
      const remainingMovies = currentMovies.filter(m => m.id !== movieId && !m.isSkeleton);
      const remainingRuntime = remainingMovies.reduce((sum, m) => sum + (m.runtime || 0), 0);
      const targetRuntime = userInputTime - remainingRuntime;

      const response = await postReRecommendSingle({
        target_runtime: targetRuntime,
        excluded_ids: newExcludedIds,
        track: trackType,
        genres: state.filters.genres,
        exclude_adult: state.filters.exclude_adult
      });

      if (response.success && response.movie) {
        const newMovie = convertV2MovieToMovie(response.movie);

        // 카드가 당겨지는 효과 방지용 대기
        await new Promise(resolve => setTimeout(resolve, 300));

        set((s) => {
          const finalMovies = [...s[movieKey]];
          // 스켈레톤 위치를 새 영화로 교체
          const skeletonIdx = finalMovies.findIndex(m => m.id === movieId);
          if (skeletonIdx !== -1) {
            finalMovies[skeletonIdx] = newMovie;
          }

          return {
            [movieKey]: finalMovies,
            [legacyKey]: finalMovies,
            [runtimeKey]: remainingRuntime + (newMovie.runtime || 0),
            excludedIds: [...newExcludedIds, newMovie.id]
          };
        });
        console.log(`✅ [Track ${trackType.toUpperCase()}] 재추천 성공:`, newMovie.title);

        // 프리페칭 실행 (성인 정보 등 수집)
        get().prefetchMovieDetails([newMovie]);
      } else {
        throw new Error(response.message || '추천 결과 없음');
      }
    } catch (error) {
      console.error(`❌ [Track ${trackType.toUpperCase()}] 재추천 오류:`, error);

      // 1. 에러 메시지 알림 (토스트)
      useToastStore.getState().showToast(
        "해당영화의 러닝타임과 유사한 맞춤영화가 부족합니다.\n추천을 다시시도해주세요.",
        4000
      );

      // 2. 실패 시 원래 영화로 복구
      console.log(`📡 [Track ${trackType.toUpperCase()}] 복구 시도 (ID: ${movieId})`);
      set((s) => {
        const restoredMovies = [...s[movieKey]];
        const skeletonIdx = restoredMovies.findIndex(m => m.id === movieId);

        if (skeletonIdx !== -1) {
          restoredMovies[skeletonIdx] = movieToRemove;
          console.log(`✅ [Track ${trackType.toUpperCase()}] 영화 복구 완료: ${movieToRemove.title}`);
        } else {
          console.warn(`⚠️ [Track ${trackType.toUpperCase()}] 복구할 스켈레톤을 찾지 못했습니다.`);
        }

        return {
          [movieKey]: restoredMovies,
          [legacyKey]: restoredMovies
        };
      });
    }
  };

  return {
    filters: {
      time: "00:00",
      genres: [],
      exclude_adult: false
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

    setTime: (time) => set((state) => ({
      filters: { ...state.filters, time },
      excludedIds: []
    })),

    toggleGenre: (genre) =>
      set((state) => ({
        filters: {
          ...state.filters,
          genres: state.filters.genres.includes(genre)
            ? state.filters.genres.filter((g) => g !== genre)
            : [...state.filters.genres, genre]
        },
        excludedIds: []
      })),

    toggleExcludeAdult: () =>
      set((state) => ({
        filters: {
          ...state.filters,
          exclude_adult: !state.filters.exclude_adult
        },
        excludedIds: []
      })),

    loadRecommended: async () => {
      const { filters } = get();
      set({ isLoading: true, error: null });

      try {
        const result = await postRecommendationsV2({
          time: filters.time,
          genres: filters.genres,
          exclude_adult: filters.exclude_adult
        });

        const trackAMovies = result.track_a.movies.map(convertV2MovieToMovie);
        const trackBMovies = result.track_b.movies.map(convertV2MovieToMovie);
        // AI 서비스는 movie_id(=id)를 기준으로 제외 처리하므로 id 사용
        const allMovieIds = [...trackAMovies, ...trackBMovies].map(m => m.id);

        set({
          trackAMovies,
          trackATotalRuntime: result.track_a.total_runtime,
          trackALabel: result.track_a.label,
          trackBMovies,
          trackBTotalRuntime: result.track_b.total_runtime,
          trackBLabel: result.track_b.label,
          excludedIds: allMovieIds,
          recommendedMovies: trackAMovies,
          popularMovies: trackBMovies,
          isLoading: false,
          error: null
        });

        // 프리페칭 실행 (성인 정보 등 수집)
        get().prefetchMovieDetails([...trackAMovies, ...trackBMovies]);
      } catch (error: any) {
        console.error("V2 영화 추천 로드 중 오류:", error);
        const errorMessage = error.code === 'ERR_NETWORK'
          ? "서버 연결 실패" : "추천을 가져오는 중 오류가 발생했습니다";

        set({
          error: errorMessage,
          isLoading: false,
          trackAMovies: [],
          trackBMovies: [],
          recommendedMovies: [],
          popularMovies: []
        });
      }
    },

    removeRecommendedMovie: (movieId) => handleReRecommend('a', movieId),
    removePopularMovie: (movieId) => handleReRecommend('b', movieId),

    setDetailMovieId: (movieId) => set({ detailMovieId: movieId }),

    resetFilters: () => set({
      filters: { time: "00:00", genres: [], exclude_adult: false },
      trackAMovies: [],
      trackATotalRuntime: 0,
      trackBMovies: [],
      trackBTotalRuntime: 0,
      excludedIds: [],
      recommendedMovies: [],
      popularMovies: []
    }),

    prefetchMovieDetails: async (movies) => {
      if (!movies.length) return;

      // 중복 실행 방지 및 순차적/병렬 처리 (여기서는 병렬)
      console.log(`📡 [Pre-fetch] ${movies.length}개의 영화 상세 정보 로드 시작...`);

      movies.forEach(async (movie) => {
        try {
          const detail: MovieDetail = await getMovieDetail(movie.id);

          set((state) => {
            const updateTrack = (track: Movie[]) =>
              track.map(m => m.id === movie.id ? { ...m, adult: detail.adult } : m);

            return {
              trackAMovies: updateTrack(state.trackAMovies),
              trackBMovies: updateTrack(state.trackBMovies),
              recommendedMovies: updateTrack(state.recommendedMovies),
              popularMovies: updateTrack(state.popularMovies)
            };
          });
        } catch (error) {
          console.error(`❌ [Pre-fetch] 영화(${movie.title}) 로드 실패:`, error);
        }
      });
    },

    reset: () => set({
      filters: { time: "00:00", genres: [], exclude_adult: false },
      trackAMovies: [],
      trackATotalRuntime: 0,
      trackALabel: "맞춤 추천",
      trackBMovies: [],
      trackBTotalRuntime: 0,
      trackBLabel: "다양성 추천",
      excludedIds: [],
      recommendedMovies: [],
      popularMovies: [],
      detailMovieId: null,
      isLoading: false,
      error: null
    })
  };
});
