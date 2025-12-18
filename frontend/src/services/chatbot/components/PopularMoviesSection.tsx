// [용도] 인기 영화 섹션 컴포넌트
// [위치] ChatbotPanel에서 사용

import { useMovieStore } from '@/store/useMovieStore';
import MovieCard from './MovieCard';

export default function PopularMoviesSection() {
    const { popularMovies } = useMovieStore();

    // 러닝타임 합계 계산 (빈 영화 제외)
    const totalRuntime = popularMovies
        .filter(movie => !movie.isEmpty && movie.runtime)
        .reduce((sum, movie) => sum + (movie.runtime || 0), 0);

    // 분을 "X시간 Y분" 형식으로 변환
    const formatRuntime = (minutes: number): string => {
        if (minutes === 0) return "";
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours === 0) return `${mins}분`;
        if (mins === 0) return `${hours}시간`;
        return `${hours}시간 ${mins}분`;
    };

    return (
        <>
            <div className="flex items-center gap-2 mb-3">
                <h3 className="text-gray-800 dark:text-white font-bold text-lg text-left">
                    인기 영화
                </h3>
                {totalRuntime > 0 && (
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        ({formatRuntime(totalRuntime)})
                    </span>
                )}
            </div>
            <div className="flex gap-2 md:gap-3">
                <PopularList />
            </div>
        </>
    );
}

// 인기 영화 목록
function PopularList() {
    const { popularMovies, setDetailMovieId, removePopularMovie, userId } = useMovieStore();

    // localStorage에서 봤어요 목록 가져오기
    const getWatchedMovies = (): number[] => {
        if (!userId) return [];
        const stored = localStorage.getItem(`watchedMovies_${userId}`);
        return stored ? JSON.parse(stored) : [];
    };

    // localStorage에 봤어요 목록 저장하기
    const saveWatchedMovie = (movieId: number) => {
        if (!userId) return;
        const watched = getWatchedMovies();
        if (!watched.includes(movieId)) {
            watched.push(movieId);
            localStorage.setItem(`watchedMovies_${userId}`, JSON.stringify(watched));
            console.log('✅ 봤어요 리스트에 추가:', movieId);
        }
    };

    const handleAddToWatched = (movieId: number) => {
        saveWatchedMovie(movieId);

        // ⚠️ 백엔드 API 호출 (현재 주석처리됨)
        // 필요 시 아래 주석을 해제하고 movieApi에서 markMovieAsWatched import
        /*
        // 1. markMovieAsWatched import 추가 필요:
        // import { markMovieAsWatched } from '@/api/movieApi';
        
        // 2. 백엔드에 봤어요 기록 전송
        markMovieAsWatched(movieId)
          .then(() => {
            console.log('✅ 백엔드에 봤어요 기록 저장 완료');
          })
          .catch((error) => {
            console.error('❌ 백엔드 저장 실패 (localStorage에는 저장됨):', error);
          });
        */
    };

    const watchedMovieIds = getWatchedMovies();

    // 항상 3칸 유지: 부족하면 빈 카드로 채우기
    const createEmptyCard = (index: number) => ({
        id: -200 - index,
        title: "",
        genres: [],
        poster: "",
        description: "인기 영화가 없습니다",
        popular: true,
        watched: false,
        isEmpty: true
    });

    const displayMovies = [...popularMovies];
    while (displayMovies.length < 3) {
        displayMovies.push(createEmptyCard(displayMovies.length));
    }

    return (
        <>
            {displayMovies.slice(0, 3).map(movie => (
                <MovieCard
                    key={movie.id}
                    movie={{
                        ...movie,
                        watched: movie.isEmpty ? false : watchedMovieIds.includes(movie.id)
                    }}
                    onClick={movie.isEmpty ? () => { } : () => setDetailMovieId(movie.id)}
                    onReRecommend={movie.isEmpty ? undefined : () => removePopularMovie(movie.id)}
                    onAddToWatched={movie.isEmpty ? undefined : () => handleAddToWatched(movie.id)}
                    showReRecommend={!movie.isEmpty}
                />
            ))}
        </>
    );
}
