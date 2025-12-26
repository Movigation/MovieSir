// [용도] 인기 영화 섹션 컴포넌트
// [위치] ChatbotPanel에서 사용

import { useState } from 'react';
import { useMovieStore } from '@/store/useMovieStore';
import MovieCard from './MovieCard';
import MovieCarousel from '@/components/ui/MovieCarousel';

export default function PopularMoviesSection() {
    const { trackBLabel } = useMovieStore();

    return (
        <div className="w-full">
            <h3 className="text-gray-800 dark:text-white font-bold text-lg mb-3 pl-4 sm:pl-40 lg:pl-96">
                {"인기 영화 추천"}
            </h3>
            <PopularList />
        </div>
    );
}

// 인기 영화 목록
const PopularList = ({ label }: { label?: string }) => {
    const { popularMovies, removePopularMovie, setDetailMovieId, userId } = useMovieStore();
    const [reRecommendingId, setReRecommendingId] = useState<number | null>(null);
    const [expandedCardId, setExpandedCardId] = useState<number | null>(null);

    console.log('🎬 PopularMoviesSection - popularMovies:', popularMovies);

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
    };

    // 재추천 핸들러
    const handleReRecommend = (movieId: number) => {
        setReRecommendingId(movieId);
        removePopularMovie(movieId);

        // 애니메이션 완료 후 플래그 리셋
        setTimeout(() => {
            setReRecommendingId(null);
        }, 600);
    };

    const watchedMovieIds = getWatchedMovies();

    // 전체 영화를 그대로 표시 (빈 카드 채우기 제거)
    const displayMovies = popularMovies;

    return (
        <MovieCarousel>
            {displayMovies.map((movie) => (
                <MovieCard
                    key={movie.id}
                    movie={{
                        ...movie,
                        watched: watchedMovieIds.includes(movie.id)
                    }}
                    isExpanded={expandedCardId === movie.id}
                    onExpand={() => setExpandedCardId(movie.id)}
                    onCollapse={() => setExpandedCardId(null)}
                    onClick={() => {
                        if (window.innerWidth >= 1024 || expandedCardId === movie.id) {
                            setDetailMovieId(movie.movie_id ?? movie.id);  // ✅ movie_id 우선, 없으면 id 사용
                        }
                    }}
                    onReRecommend={() => handleReRecommend(movie.id)}
                    onAddToWatched={() => handleAddToWatched(movie.id)}
                    showReRecommend={true}
                    shouldAnimate={movie.id === reRecommendingId}
                />
            ))}
        </MovieCarousel>
    );
};
