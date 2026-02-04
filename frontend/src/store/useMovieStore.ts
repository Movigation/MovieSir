import { create } from "zustand";
import { type Movie } from "@/api/movieApi.type";
import {
  postRecommendationsV2,
  postReRecommendSingle,
  convertV2MovieToMovie,
  getMovieDetail,
} from "@/api/movieApi";
import type { MovieDetail } from "@/api/movieApi.type";

interface Filters {
  time: string;
  genres: string[];
  exclude_adult: boolean; // 성인 콘텐츠 제외 (snake_case 통일)
}

interface MovieState {
  filters: Filters;
  userId: number | null;

  // Track A: 맞춤 추천
  trackAMovies: Movie[];
  trackATotalRuntime: number;
  trackALabel: string;

  // Track B: 다양성/인기 추천
  trackBMovies: Movie[];
  trackBTotalRuntime: number;
  trackBLabel: string;

  // 세션 내 중복 방지용 ID 목록 (모델 필터링용)
  excludedIds: number[];

  // 추천 세션 ID (피드백용)
  sessionId: number | null;

  // 하위 호환 변수 (기존 UI 지원용 별칭)
  recommendedMovies: Movie[];
  popularMovies: Movie[];

  detailMovieId: number | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUserId: (userId: number | null) => void;
  setTime: (time: string) => void;
  toggleGenre: (genre: string) => void;
  toggleExcludeAdult: () => void;

  loadRecommended: () => Promise<void>;
  handleReRecommend: (trackType: 'a' | 'b', movieId: number) => Promise<void>;

  // 기존 컴포넌트 호출용 래퍼
  removeRecommendedMovie: (movieId: number) => Promise<void>;
  removePopularMovie: (movieId: number) => Promise<void>;

  setDetailMovieId: (movieId: number | null) => void;
  resetFilters: () => void;
  reset: () => void;

  // 헬퍼: 상세 정보 프리페치 (필요 시 확장용)
  prefetchMovieDetails: (movies: Movie[]) => Promise<void>;
}

// 헬퍼: 마지막 추천 결과 로컬 스토리지 저장 (UI 영구 보관용)
const saveLastRecommendations = (trackA: Movie[], trackB: Movie[], filters: Filters, userId: number | string | null, sessionId: number | null) => {
  if (!userId) {
    console.warn("⚠️ [Storage] 비로그인 상태이거나 유저 ID가 없어 저장을 건너띕니다.");
    return;
  }

  try {
    // [최적화] 용량을 많이 차지하는 description(줄거리) 필드 제외
    const filterMovieData = (movies: Movie[]) => movies.map(({ description, ...rest }) => rest);

    const data = {
      trackA: filterMovieData(trackA),
      trackB: filterMovieData(trackB),
      filters,
      sessionId,
      timestamp: Date.now()
    };
    const key = `last_recommendations_${userId}`;
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('❌ [Storage] localStorage 저장 실패:', e);
  }
};

// 헬퍼: "HH:MM" -> 분 변환
const parseMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const useMovieStore = create<MovieState>((set, get) => ({
  filters: {
    time: "00:00",
    genres: [],
    exclude_adult: false, // 기본값: 성인 포함 (체크 해제)
  },
  userId: null,

  trackAMovies: [],
  trackATotalRuntime: 0,
  trackALabel: "맞춤 추천",

  trackBMovies: [],
  trackBTotalRuntime: 0,
  trackBLabel: "다양성 추천",

  excludedIds: [],

  sessionId: null,

  recommendedMovies: [],
  popularMovies: [],

  detailMovieId: null,
  isLoading: false,
  error: null,

  setUserId: (userId) => set({ userId }),

  setTime: (time) => set((s) => ({
    filters: { ...s.filters, time },
    excludedIds: [] // 조건 변경 시 중복 제외 목록 초기화
  })),

  toggleGenre: (genre) => set((s) => ({
    filters: {
      ...s.filters,
      genres: s.filters.genres.includes(genre)
        ? s.filters.genres.filter(g => g !== genre)
        : [...s.filters.genres, genre]
    },
    excludedIds: [] // 조건 변경 시 중복 제외 목록 초기화
  })),

  toggleExcludeAdult: () => set((s) => ({
    filters: { ...s.filters, exclude_adult: !s.filters.exclude_adult },
    excludedIds: []
  })),

  // [액션] 전체 추천 로드
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

      // 세션 중복 방지용 ID 집계
      const allMovieIds = [...trackAMovies, ...trackBMovies].map(m => m.id);

      // 세션 ID 저장
      const sessionId = result.session_id || null;

      // [D방안] 새 추천 시 기존 OTT 클릭 로그 초기화 (세션 혼합 방지)
      const userId = get().userId;
      if (userId) {
        const clickLogsKey = `movie_click_logs_${userId}`;
        localStorage.removeItem(clickLogsKey);
      }

      set({
        trackAMovies,
        trackATotalRuntime: result.track_a.total_runtime,
        trackALabel: result.track_a.label,
        trackBMovies,
        trackBTotalRuntime: result.track_b.total_runtime,
        trackBLabel: result.track_b.label,

        excludedIds: allMovieIds,
        sessionId,
        recommendedMovies: trackAMovies,
        popularMovies: trackBMovies,

        isLoading: false
      });

      // UI용 로컬 스토리지 저장
      saveLastRecommendations(trackAMovies, trackBMovies, filters, get().userId, sessionId);

      // 상세 정보 프리페치 (성인 여부 업데이트 등)
      get().prefetchMovieDetails([...trackAMovies, ...trackBMovies]);

    } catch (err: any) {
      console.error("❌ 추천 로드 실패:", err);
      set({
        isLoading: false,
        error: "영화 추천을 가져오는 중 오류가 발생했습니다."
      });
    }
  },

  // [액션] 개별 영화 재추천 (통합 핸들러)
  handleReRecommend: async (trackType, movieId) => {
    const state = get();
    const isTrackA = trackType === 'a';
    const movieKey = isTrackA ? 'trackAMovies' : 'trackBMovies';
    const runtimeKey = isTrackA ? 'trackATotalRuntime' : 'trackBTotalRuntime';
    const legacyKey = isTrackA ? 'recommendedMovies' : 'popularMovies';

    const currentMovies = [...state[movieKey]];
    const movieIndex = currentMovies.findIndex(m => m.id === movieId);
    if (movieIndex === -1) return;

    // 1. 중복 방지 ID 목록 업데이트
    const newExcludedIds = [...state.excludedIds, movieId];

    // 2. 남은 시간 계산
    const userInputMinutes = parseMinutes(state.filters.time);
    const otherMovies = currentMovies.filter(m => m.id !== movieId);
    const sumOtherRuntime = otherMovies.reduce((sum, m) => sum + (m.runtime || 0), 0);
    const targetRuntime = userInputMinutes - sumOtherRuntime;

    // 2.5. 해당 영화 자리를 스켈레톤으로 즉시 교체 (사용자 피드백 반영)
    const skeletonMovies = [...currentMovies];
    skeletonMovies[movieIndex] = { ...currentMovies[movieIndex], isSkeleton: true };
    set({
      [movieKey]: skeletonMovies,
      [legacyKey]: skeletonMovies,
      isLoading: false // 전역 로딩은 띄우지 않음 (개별 카드만 스켈레톤)
    });

    try {
      const response = await postReRecommendSingle({
        source_movie_id: movieId,  // 교체 대상 영화 ID (로깅용)
        target_runtime: targetRuntime,
        excluded_ids: newExcludedIds,
        track: trackType,
        genres: state.filters.genres,
        exclude_adult: state.filters.exclude_adult,
        session_id: state.sessionId ?? undefined,  // 추천 세션 ID (로깅용)
      });

      if (response.success && response.movie) {
        const newMovie = convertV2MovieToMovie(response.movie);

        // 애니메이션 효과를 위해 약간의 지연
        await new Promise(r => setTimeout(r, 200));

        const updatedMovies = [...currentMovies];
        updatedMovies[movieIndex] = newMovie;

        set((s) => ({
          [movieKey]: updatedMovies,
          [legacyKey]: updatedMovies,
          [runtimeKey]: sumOtherRuntime + (newMovie.runtime || 0),
          excludedIds: [...s.excludedIds, newMovie.id]
        }));

        // 업데이트된 전체 상태 저장
        const finalState = get();
        saveLastRecommendations(finalState.trackAMovies, finalState.trackBMovies, finalState.filters, finalState.userId, finalState.sessionId);

        // 프리페칭 실행 (성인 정보 등 수집)
        get().prefetchMovieDetails([newMovie]);

      } else {
        // 기존 영화로 복구
        set({
          [movieKey]: currentMovies,
          [legacyKey]: currentMovies
        });
        // 토스트 알림 (Zustand store 외부에서 showToast 호출 가능하게 handleReRecommend 인자로 받거나 store import)
        const { useToastStore } = await import('@/store/useToastStore');
        useToastStore.getState().showToast("조건에 맞는 다른 영화가 더 이상 없습니다.");
      }
    } catch (err) {
      console.error("❌ 재추천 오류:", err);
      // 기존 영화로 복구
      set({
        [movieKey]: currentMovies,
        [legacyKey]: currentMovies
      });
      const { useToastStore } = await import('@/store/useToastStore');
      useToastStore.getState().showToast("추천 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    }
  },

  removeRecommendedMovie: (id) => get().handleReRecommend('a', id),
  removePopularMovie: (id) => get().handleReRecommend('b', id),

  setDetailMovieId: (id) => set({ detailMovieId: id }),

  resetFilters: () => set({
    filters: { time: "00:00", genres: [], exclude_adult: false },
    trackAMovies: [],
    trackATotalRuntime: 0,
    trackBMovies: [],
    trackBTotalRuntime: 0,
    excludedIds: [],
    sessionId: null,
    recommendedMovies: [],
    popularMovies: [],
    isLoading: false,
    error: null
  }),

  reset: () => set({
    filters: { time: "00:00", genres: [], exclude_adult: false },
    userId: null,
    trackAMovies: [],
    trackATotalRuntime: 0,
    trackBMovies: [],
    trackBTotalRuntime: 0,
    excludedIds: [],
    sessionId: null,
    recommendedMovies: [],
    popularMovies: [],
    detailMovieId: null,
    isLoading: false,
    error: null
  }),

  prefetchMovieDetails: async (movies) => {
    if (!movies.length) return;

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
  }
}));
