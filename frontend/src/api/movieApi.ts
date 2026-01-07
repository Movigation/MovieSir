// [용도] 영화 관련 API 함수 정의
// [사용법] import { postRecommendations, getMovieDetail, markMovieAsWatched } from "@/api/movieApi";

import axiosInstance from "@/api/axiosInstance";
import type {
    Movie,
    WatchHistory,
    WatchHistoryWithMovie,
    Recommendation,
    RecommendationWithMovie,
    UserStats,
    MovieDetail,
    RecommendResponseV2,
    RecommendedMovieV2,
    ReRecommendRequest,
    ReRecommendResponse
} from "@/api/movieApi.type";



// 특정 영화 조회
export const getMovie = async (movieId: number): Promise<Movie> => {
    const response = await axiosInstance.get(`api/movies/${movieId}`);
    const movie = response.data;

    // 백엔드 응답을 프론트엔드 Movie 타입으로 변환
    return {
        id: movie.movie_id,
        title: movie.title,
        genres: movie.genres,
        year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
        rating: movie.vote_average,
        popularity: movie.popularity,
        poster: movie.poster_url,
        description: movie.overview,
        popular: false,
        watched: false
    };
};

// [용도] 영화 상세 정보 조회
// [사용법] const detail = await getMovieDetail(123);
export const getMovieDetail = async (movieId: number): Promise<MovieDetail> => {
    try {
        const response = await axiosInstance.get(`/api/movies/${movieId}`);
        const data = response.data;
        const movie = data.info;  // ✅ info 객체에서 영화 정보 추출
        const otts = data.otts || [];  // ✅ otts 배열 추출

        // 백엔드 응답을 MovieDetail 타입으로 변환
        return {
            movie_id: movie.movie_id,
            title: movie.title,
            overview: movie.overview || "줄거리 정보가 없습니다.",  // ✅ 디폴트값
            genres: movie.genres || [],  // ✅ 디폴트값
            release_date: movie.release_date || "2000-01-01",  // ✅ 디폴트값
            runtime: movie.runtime || 0,
            vote_average: movie.vote_average || 0,
            vote_count: movie.vote_count || 0,
            popularity: movie.popularity || 0,
            poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : "",  // ✅ URL 조합
            backdrop_url: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : "",
            director: movie.director,
            cast: movie.cast,
            tagline: movie.tagline,
            ott_providers: otts.map((ott: any) => ({  // ✅ otts → ott_providers 변환
                ott_id: ott.provider_id,
                ott_name: ott.provider_name,
                ott_logo: "",  // 백엔드에서 제공 안 함
                watch_url: ott.url
            })),
            user_status: movie.user_status || {
                liked: false,
                watched: false,
                bookmarked: false
            }
        };
    } catch (error) {
        console.error("영화 상세 정보 로드 실패:", error);
        throw error;
    }
};


// ============================================================
// [V2 API] 시간 맞춤 조합 추천 (V1 제거됨 - V2만 사용)
// ============================================================

// [용도] 영화 추천 v2 - 시간 맞춤 조합 반환
// [사용법] const result = await postRecommendationsV2({ time: "02:30", genres: ["SF"], excludeAdult: true });
export const postRecommendationsV2 = async (filters: {
    time: string;      // "HH:MM" 형식
    genres: string[];  // 장르 이름 배열
    excludeAdult?: boolean;
}): Promise<RecommendResponseV2> => {
    console.log('🚀 [V2 API] postRecommendationsV2 호출!', filters);

    try {
        // 시간 변환: "02:30" -> 150분
        const [hours, minutes] = filters.time.split(':').map(Number);
        const runtimeLimit = hours * 60 + minutes;

        const response = await axiosInstance.post<RecommendResponseV2>("/api/v2/recommend", {
            runtime_limit: runtimeLimit,
            genres: filters.genres,
            exclude_adult: filters.excludeAdult ?? true
        });

        console.log('[V2 API] 추천 결과:', {
            track_a: response.data.track_a.movies.length + '편',
            track_b: response.data.track_b.movies.length + '편',
            elapsed_time: response.data.elapsed_time
        });

        return response.data;
    } catch (error: any) {
        console.error("V2 영화 추천 API 호출 중 오류:", error);
        throw error;
    }
};

// [용도] 개별 영화 재추천 - 단일 영화 교체
// [사용법] const result = await postReRecommendSingle({ target_runtime: 120, excluded_ids: [550, 27205], track: "a" });
export const postReRecommendSingle = async (request: ReRecommendRequest): Promise<ReRecommendResponse> => {
    try {
        const response = await axiosInstance.post<ReRecommendResponse>("/api/v2/recommend/single", request);

        if (response.data.success && response.data.movie) {
            console.log('[V2 API] 재추천 성공:', response.data.movie.title);
        } else {
            console.log('[V2 API] 재추천 실패:', response.data.message);
        }

        return response.data;
    } catch (error: any) {
        console.error("V2 재추천 API 호출 중 오류:", error);
        throw error;
    }
};

// [용도] RecommendedMovieV2를 프론트엔드 Movie 타입으로 변환
export const convertV2MovieToMovie = (v2Movie: RecommendedMovieV2): Movie => ({
    id: v2Movie.movie_id,
    tmdb_id: v2Movie.tmdb_id ?? undefined,  // ✅ tmdb_id 보존 (optional)
    title: v2Movie.title,
    genres: v2Movie.genres,
    year: v2Movie.release_date ? new Date(v2Movie.release_date).getFullYear() : undefined,
    rating: v2Movie.vote_average,
    poster: v2Movie.poster_path ? `https://image.tmdb.org/t/p/w500${v2Movie.poster_path}` : '',
    description: v2Movie.overview,
    runtime: v2Movie.runtime,
    popular: false,
    watched: false
});


// 추천 기록 추가
export const addRecommendation = async (
    userId: number,
    movieId: number,
    reason: string
): Promise<Recommendation> => {
    const newRecommendation = {
        userId,
        movieId,
        recommendedAt: new Date().toISOString(),
        reason
    };

    const response = await axiosInstance.post<Recommendation>("/recommendations", newRecommendation);
    return response.data;
};

// 사용자별 시청 기록 조회 (영화 정보 포함)
export const getWatchHistory = async (userId: string): Promise<WatchHistoryWithMovie[]> => {
    try {
        const response = await axiosInstance.get<WatchHistory[]>(`/watchHistory?userId=${userId}`);
        const watchHistory = response.data;

        // 각 시청 기록에 영화 정보 추가
        const historyWithMovies = await Promise.all(
            watchHistory.map(async (history) => {
                const movie = await getMovie(history.movieId);
                return {
                    ...history,
                    movie
                };
            })
        );

        // 최신순으로 정렬
        return historyWithMovies.sort((a, b) =>
            new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime()
        );
    } catch (error) {
        console.error("시청 기록 조회 중 오류:", error);
        throw new Error("시청 기록을 가져오는 중 오류가 발생했습니다");
    }
};

// 시청 기록 추가 (기존 함수 - 삭제 예정)
export const addWatchHistory = async (
    userId: number,
    movieId: number,
    rating: number
): Promise<WatchHistory> => {
    const newHistory = {
        userId,
        movieId,
        watchedAt: new Date().toISOString(),
        rating
    };

    const response = await axiosInstance.post<WatchHistory>("/watchHistory", newHistory);
    return response.data;
};

// 사용자 통계 조회
export const getUserStats = async (userId: string): Promise<UserStats> => {
    try {
        const watchHistory = await getWatchHistory(userId);

        if (watchHistory.length === 0) {
            return {
                totalWatched: 0,
                averageRating: 0,
                favoriteGenre: "없음",
                watchedByGenre: {}
            };
        }

        // 총 시청 횟수
        const totalWatched = watchHistory.length;

        // 평균 평점
        const averageRating = watchHistory.reduce((sum, h) => sum + h.rating, 0) / totalWatched;

        // 장르별 시청 횟수
        const watchedByGenre: { [genre: string]: number } = {};
        watchHistory.forEach(h => {
            const genres = h.movie.genres;
            genres.forEach(genre => {
                watchedByGenre[genre] = (watchedByGenre[genre] || 0) + 1;
            });
        });

        // 가장 많이 본 장르
        const favoriteGenre = Object.entries(watchedByGenre)
            .sort(([, a], [, b]) => b - a)[0]?.[0] || "없음";

        // [변경 필요] 백엔드 이관 권장
        // 통계 계산 로직도 백엔드로 옮기는 것이 좋습니다. (GET /users/stats)
        return {
            totalWatched,
            averageRating: Math.round(averageRating * 10) / 10,
            favoriteGenre,
            watchedByGenre
        };
    } catch (error) {
        console.error("사용자 통계 조회 중 오류:", error);
        throw new Error("사용자 통계를 가져오는 중 오류가 발생했습니다");
    }
};

// 사용자별 추천 기록 조회 (영화 정보 포함)
export const getUserRecommendations = async (userId: number): Promise<RecommendationWithMovie[]> => {
    try {
        const response = await axiosInstance.get<Recommendation[]>(`/recommendations?userId=${userId}`);
        const recommendations = response.data;

        // 각 추천에 영화 정보 추가
        const recommendationsWithMovies = await Promise.all(
            recommendations.map(async (rec) => {
                const movie = await getMovie(rec.movieId);
                return {
                    ...rec,
                    movie
                };
            })
        );

        // 최신순으로 정렬
        return recommendationsWithMovies.sort((a, b) =>
            new Date(b.recommendedAt).getTime() - new Date(a.recommendedAt).getTime()
        );
    } catch (error) {
        console.error("추천 기록 조회 중 오류:", error);
        throw new Error("추천 기록을 가져오는 중 오류가 발생했습니다");
    }
};

// ============================================================
// [영화 봤어요 체크 API] - REC-03-04
// ============================================================

// [용도] 영화 봤어요 체크 (백엔드에 기록)
// [API 스펙] POST api/movies/{movie_id}/watched
// [사용법] await markMovieAsWatched(550);
// ⚠️ 현재 주석처리됨 - 필요 시 주석 해제하여 사용
/*
export const markMovieAsWatched = async (movieId: number): Promise<void> => {
    try {
        await axiosInstance.post(`api/movies/${movieId}/watched`);
        console.log('✅ 영화 봤어요 체크 완료:', movieId);
    } catch (error) {
        console.error('❌ 영화 봤어요 체크 실패:', error);
        throw error;
    }
};
*/
