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
    MovieRecommendationResult,
    BackendRecommendResponse,
    BackendMovieRecommendation,
    MovieDetail
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

        // 임시 데이터 반환 (개발용)
        return {
            movie_id: movieId,
            title: "인터스텔라",
            overview: "세계 각국의 정부와 경제가 완전히 붕괴된 미래가 다가온다. 지구 대기권에서 극심한 먼지 폭풍이 일어나고, 결국 지구에서의 삶은 불가능하게 된다. 여전히 남아있는 자들을 위한 최후의 희망은 우주 저편에 살 수 있는 새로운 행성을 찾는 것이다. 지구의 미래를 짊어진 그들의 위대한 도전이 시작된다.",
            genres: ["SF", "드라마", "모험"],
            release_date: "2014-11-06",
            runtime: 169,
            vote_average: 8.6,
            vote_count: 28500,
            popularity: 584.0,
            poster_url: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
            backdrop_url: "https://image.tmdb.org/t/p/original/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg",
            director: "크리스토퍼 놀란",
            cast: [
                { name: "매튜 맥커너히", character: "쿠퍼", profile_url: "https://image.tmdb.org/t/p/w185/cnqwv5Uz3d8c4TxVGxGkjOJuFPb.jpg" },
                { name: "앤 해서웨이", character: "아멜리아 브랜드", profile_url: "https://image.tmdb.org/t/p/w185/tLelacaCxfRFRpGLYkdEY3d1mrq.jpg" },
                { name: "제시카 차스테인", character: "머피 쿠퍼", profile_url: "https://image.tmdb.org/t/p/w185/vOFtVlCUyMMBXJ0RvJkS7lKoPVG.jpg" },
                { name: "마이클 케인", character: "브랜드 교수", profile_url: "https://image.tmdb.org/t/p/w185/bVZRMlpjTAO2pJK6v90buFgVbSW.jpg" },
                { name: "맷 데이먼", character: "맨 박사", profile_url: "https://image.tmdb.org/t/p/w185/ehwS5WvU5yL5vKcUEqbzGK8Fh8B.jpg" }
            ],
            tagline: "Mankind was born on Earth. It was never meant to die here.",
            ott_providers: [
                {
                    ott_id: 1,
                    ott_name: "Netflix",
                    ott_logo: "https://image.tmdb.org/t/p/original/wwemzKWzjKYJFfCeiB57q3r4Bcm.png",
                    watch_url: "https://www.netflix.com"
                },
                {
                    ott_id: 2,
                    ott_name: "Disney+",
                    ott_logo: "https://image.tmdb.org/t/p/original/dgPueyEdOwpQ10fjuhL2WYFQwQs.png",
                    watch_url: "https://www.disneyplus.com"
                }
            ],
            tags: ["우주", "시간여행", "감동", "SF 걸작"],
            user_status: {
                liked: false,
                watched: false,
                bookmarked: false
            }
        };
    }
};

// [용도] 백엔드 API를 통한 영화 추천
// [사용법] const result = await postRecommendations({ time: "02:30", genres: ["SF", "드라마"], userId: 1, excludeAdult: true });
export const postRecommendations = async (filters: {
    time: string;      // "HH:MM" 형식
    genres: string[];  // 장르 이름 배열 ["SF", "드라마"]
    userId: number;
    excludeAdult?: boolean;  // 성인 콘텐츠 제외 여부 (기본값: false)
}): Promise<MovieRecommendationResult> => {
    try {
        // 1. 시간 변환: "02:30" -> 150분
        const [hours, minutes] = filters.time.split(':').map(Number);
        const runtimeLimit = hours * 60 + minutes;

        // 2. 장르: 문자열 배열 그대로 사용 (ID 변환 불필요)
        const genreIds = filters.genres
            .map(genreName => genreName)
            .filter(id => id !== undefined);  // undefined 제외

        // 3. 백엔드 API 호출
        const response = await axiosInstance.post<BackendRecommendResponse>("/api/recommend", {
            runtime_limit: runtimeLimit,  // ✅ 수정 1/5: runtime → runtime_limit
            genres: genreIds,  // ✅ 수정 2/5: 문자열 배열 그대로
            exclude_adult: filters.excludeAdult || false  // ✅ 수정 3/5: include_adult → exclude_adult (반대 아님!)
        });

        // 4. 백엔드 응답을 프론트엔드 Movie 타입으로 변환
        const backendMovies = response.data.results;  // ✅ 수정 4/5: recommendations → results

        // Movie 타입으로 변환하는 헬퍼 함수
        const convertToMovie = (backendMovie: any): Movie => ({
            id: backendMovie.movie_id,  // ✅ 수정 4/5: movie_id 매핑
            title: backendMovie.title,
            genres: backendMovie.genres,
            rating: backendMovie.vote_average,
            poster: `https://image.tmdb.org/t/p/w500${backendMovie.poster_path}`,  // ✅ 수정 5/5: URL 조합
            description: backendMovie.overview,
            runtime: backendMovie.runtime,
            popular: false,
            watched: false
        })

        // 5. algorithmic과 popular로 분리
        // 백엔드가 AI 추천 순서대로 반환하므로:
        // - 전체를 algorithmic으로 사용
        // - popular는 별도 로직 필요 (일단 빈 배열)
        const allMovies = backendMovies.map(convertToMovie);

        console.log('전체 추천 영화 개수:', allMovies.length);

        return {
            algorithmic: allMovies.slice(0, 3),  // 상위 3개
            popular: allMovies.slice(3, 6)       // 다음 3개
        };
    } catch (error: any) {
        console.error("영화 추천 API 호출 중 오류 (백엔드 연결 실패, 임시 데이터 사용):", error);

        // 🔧 임시 데이터: 백엔드 연결 실패 시 사용 (404 포함)
        console.warn("⚠️ 백엔드 연결 실패 - 임시 추천 데이터 사용");
        console.warn(`   에러 상태: ${error?.response?.status || '네트워크 오류'}`);


        // 장르별 맞춤 영화 생성
        const mockMovies: Movie[] = [
            // Algorithmic (필터 기반 추천) - 3개
            {
                id: 1001,
                title: "인터스텔라",
                genres: ["SF", "드라마", "모험"],
                rating: 8.6,
                runtime: 169,  // 2시간 49분
                poster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
                description: "우주를 배경으로 펼쳐지는 감동적인 SF 대작. 시간과 공간을 초월한 사랑 이야기.",
                popular: false,
                watched: false
            },
            {
                id: 1002,
                title: "인셉션",
                genres: ["SF", "액션", "스릴러"],
                rating: 8.8,
                runtime: 148,  // 2시간 28분
                poster: "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
                description: "꿈 속의 꿈을 파고드는 독창적인 스토리. 놀란 감독의 걸작.",
                popular: false,
                watched: false
            },
            {
                id: 1003,
                title: "매트릭스",
                genres: ["SF", "액션"],
                rating: 8.7,
                runtime: 136,  // 2시간 16분
                poster: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
                description: "현실과 가상을 넘나드는 혁명적인 SF 액션.",
                popular: false,
                watched: false
            },
            // Popular (인기 영화) - 3개
            {
                id: 2001,
                title: "어벤져스: 엔드게임",
                genres: ["액션", "SF", "어드벤처"],
                rating: 8.4,
                runtime: 181,  // 3시간 1분
                poster: "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
                description: "마블 시네마틱 유니버스의 대서사시. 역대급 블록버스터.",
                popular: true,
                watched: false
            },
            {
                id: 2002,
                title: "기생충",
                genres: ["드라마", "스릴러"],
                rating: 8.5,
                runtime: 132,  // 2시간 12분
                poster: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
                description: "아카데미 4관왕에 빛나는 봉준호 감독의 작품.",
                popular: true,
                watched: false
            },
            {
                id: 2003,
                title: "조커",
                genres: ["드라마", "범죄", "스릴러"],
                rating: 8.4,
                runtime: 122,  // 2시간 2분
                poster: "https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg",
                description: "조커의 탄생을 그린 강렬한 캐릭터 드라마.",
                popular: true,
                watched: false
            }
        ];

        // 필터 조건에 맞는 영화들 선택 (간단한 장르 매칭)
        const filteredAlgorithmic = mockMovies
            .filter(m => !m.popular)
            .filter(m => {
                // 요청한 장르 중 하나라도 포함되면 선택
                if (filters.genres.length === 0) return true;
                return m.genres.some(g => filters.genres.includes(g));
            })
            .slice(0, 3);

        const filteredPopular = mockMovies
            .filter(m => m.popular)
            .slice(0, 3);

        // 필터 조건에 맞는 영화가 부족하면 모든 영화에서 채우기
        const allAlgorithmic = filteredAlgorithmic.length >= 3
            ? filteredAlgorithmic
            : mockMovies.filter(m => !m.popular).slice(0, 3);

        return {
            algorithmic: allAlgorithmic,
            popular: filteredPopular
        };
    }
};


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
