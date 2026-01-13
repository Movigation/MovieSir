// [용도] 인기 영화 섹션 컴포넌트
// [위치] ChatbotPanel에서 사용

import { useState } from "react";
import { useMovieStore } from "@/store/useMovieStore";
import MovieCard from "./MovieCard";
import MovieCarousel from "@/services/chatbot/components/MovieCarousel";

export default function PopularMoviesSection() {
  const { popularMovies } = useMovieStore();

  // 총 상영시간 계산 및 포맷팅
  const totalRuntime = popularMovies.reduce((total, movie) => {
    return total + (Number(movie.runtime) || 0);
  }, 0);

  const hours = Math.floor(totalRuntime / 60);
  const minutes = totalRuntime % 60;

  return (
    <div className="w-full">
      <h3 className="text-gray-800 dark:text-white font-bold text-lg mb-3 pl-4 flex items-center gap-2">
        {"인기 영화 추천"}
        {totalRuntime > 0 && (
          <span className="text-sm font-medium text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
            총 {hours > 0 ? `${hours}시간 ` : ""}
            {minutes > 0 || hours === 0 ? `${minutes}분` : ""}
          </span>
        )}
      </h3>
      <PopularList />
    </div>
  );
}

// 인기 영화 목록
const PopularList = () => {
  const { popularMovies, removePopularMovie, setDetailMovieId } =
    useMovieStore();
  const [reRecommendingId, setReRecommendingId] = useState<number | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null);

  // 재추천 핸들러
  const handleReRecommend = (movieId: number) => {
    setReRecommendingId(movieId);
    removePopularMovie(movieId);

    // 애니메이션 완료 후 플래그 리셋
    setTimeout(() => {
      setReRecommendingId(null);
    }, 600);
  };

  const watchedMovieIds: number[] = [];

  // 전체 영화를 그대로 표시 (빈 카드 채우기 제거)
  const displayMovies = popularMovies;

  return (
    <MovieCarousel>
      {displayMovies.map((movie) => (
        <MovieCard
          key={movie.id}
          movie={{
            ...movie,
            watched: watchedMovieIds.includes(movie.id),
          }}
          isExpanded={expandedCardId === movie.id}
          onExpand={() => setExpandedCardId(movie.id)}
          onCollapse={() => setExpandedCardId(null)}
          onClick={() => {
            if (window.innerWidth >= 1024 || expandedCardId === movie.id) {
              // 🎬 movie_id를 사용하여 상세 정보 조회
              setDetailMovieId(movie.id);
            }
          }}
          onReRecommend={() => handleReRecommend(movie.id)}
          showReRecommend={true}
          shouldAnimate={movie.id === reRecommendingId}
        />
      ))}
    </MovieCarousel>
  );
};
