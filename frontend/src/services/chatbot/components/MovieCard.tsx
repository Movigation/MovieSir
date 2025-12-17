// ============================================================
// [용도] 영화 카드 컴포넌트 (포스터, 제목, 장르 표시 + Netflix 스타일 Hover 확장)
// [사용법] <MovieCard movie={movieData} onClick={handleClick} />
// ============================================================

import { Eye, RefreshCw } from 'lucide-react';
import type { Movie } from '@/api/movieApi.type';
import { useState, useEffect } from 'react';


interface MovieCardProps {
    movie: Movie;
    onClick: () => void;
    onReRecommend?: () => void;     // 재추천받기 콜백
    onAddToWatched?: () => void;    // 봤어요 리스트 추가 콜백
    showReRecommend?: boolean;      // 재추천받기 버튼 표시 여부
}

export default function MovieCard({ movie, onClick, onReRecommend, onAddToWatched, showReRecommend = false }: MovieCardProps) {
    const [isRemoving, setIsRemoving] = useState(false);
    const [isWatched, setIsWatched] = useState(movie.watched || false);
    const [isAppearing, setIsAppearing] = useState(true);

    // 컴포넌트 마운트 시 등장 애니메이션
    useEffect(() => {
        setIsAppearing(true);
        const timer = setTimeout(() => setIsAppearing(false), 700);
        return () => clearTimeout(timer);
    }, [movie.id]);

    // 재추천받기 버튼 클릭
    const handleReRecommend = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onReRecommend) {
            setIsRemoving(true);
            setTimeout(() => {
                onReRecommend();
            }, 600);
        }
    };

    // 봤어요 버튼 클릭
    const handleAddToWatched = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onAddToWatched && !isWatched) {
            setIsWatched(true);
            onAddToWatched();
        }
    };

    // 빈 카드인 경우
    if (movie.isEmpty) {
        return (
            <div className="relative rounded-lg overflow-hidden shadow-md">
                <div className="aspect-[2/3] w-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex flex-col items-center justify-center p-4">
                    <div className="text-gray-400 dark:text-gray-500 text-center">
                        <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-3-3v6" />
                        </svg>
                        <p className="text-sm font-medium">조건에 맞는</p>
                        <p className="text-sm font-medium">영화가 없습니다</p>
                        <p className="text-xs mt-2 opacity-75">다른 조건으로<br />시도해보세요</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`relative group cursor-pointer rounded-lg overflow-visible shadow-md transition-all duration-300 w-[calc((100vw-48px)/3)] sm:w-[180px] md:w-[200px] flex-shrink-0 md:hover:z-50 ${isRemoving ? 'animate-slide-down' : isAppearing ? 'animate-slide-up' : ''
                }`}
            onClick={() => {
                console.log('MovieCard clicked, movie ID:', movie.id);
                onClick();
            }}
        >
            {/* 메인 카드 */}
            <div className="relative rounded-lg overflow-hidden transition-all duration-300 md:group-hover:rounded-r-none">
                {/* 포스터 */}
                <div className="aspect-[2/3] w-full relative">
                    <img
                        src={movie.poster}
                        alt={movie.title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

                    {/* 시청 완료 배지 */}
                    {isWatched && (
                        <div className="absolute top-2 left-2 bg-green-500/90 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-sm backdrop-blur-sm z-10">
                            <Eye size={12} />
                            <span>Watched</span>
                        </div>
                    )}

                    {/* 봤어요 버튼 */}
                    {showReRecommend && onAddToWatched && (
                        <button
                            onClick={handleAddToWatched}
                            className={`absolute top-2 right-2 p-2 rounded-full shadow-md transition-all duration-300 backdrop-blur-sm z-10 ${isWatched
                                ? 'bg-gray-400/90 text-white cursor-default'
                                : 'bg-green-500/90 text-white hover:bg-green-600 hover:scale-110'
                                }`}
                            title={isWatched ? '이미 봤어요 리스트에 추가됨' : '봤어요 리스트에 추가'}
                            disabled={isWatched}
                        >
                            <Eye size={16} />
                        </button>
                    )}
                </div>

                {/* 제목 및 장르 */}
                <div className="p-2 bg-white dark:bg-gray-800">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {movie.title}
                    </h3>

                    {/* 러닝타임 */}
                    {movie.runtime && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                            <span>{movie.runtime}분</span>
                        </p>
                    )}

                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {movie.genres.join(", ")}
                    </p>

                    {/* 재추천받기 버튼 */}
                    {showReRecommend && onReRecommend && (
                        <button
                            onClick={handleReRecommend}
                            className="w-full mt-2 py-1.5 px-3 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                        >
                            <RefreshCw size={12} />
                            재추천받기
                        </button>
                    )}
                </div>
            </div>

            {/* Hover 확장 패널 (오른쪽) - 데스크탑만 */}
            <div className="hidden md:block absolute left-full top-0 h-full w-64 bg-gray-900 dark:bg-gray-800 rounded-r-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 overflow-hidden">
                <div className="p-4 h-full flex flex-col justify-between">
                    {/* 상단: 제목 & 평점 */}
                    <div>
                        <h3 className="text-white font-bold text-base mb-2 line-clamp-2">
                            {movie.title}
                        </h3>

                        {/* 평점 */}
                        {movie.rating && (
                            <div className="flex items-center gap-2 mb-3">
                                <div className="flex items-center gap-1">
                                    <span className="text-yellow-400 text-lg">⭐</span>
                                    <span className="text-white font-semibold">{movie.rating}</span>
                                </div>
                                <span className="text-gray-400 text-xs">/ 10</span>
                            </div>
                        )}

                        {/* 장르 태그 */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {movie.genres.slice(0, 3).map((genre: string, idx: number) => (
                                <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-blue-600/30 text-blue-300 text-xs rounded-full border border-blue-500/30"
                                >
                                    {genre}
                                </span>
                            ))}
                        </div>

                        {/* 설명 */}
                        {movie.description && (
                            <p className="text-gray-300 text-xs leading-relaxed line-clamp-4">
                                {movie.description}
                            </p>
                        )}
                    </div>

                    {/* 하단: 상세보기 버튼 */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onClick();
                        }}
                        className="w-full py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors border border-white/20"
                    >
                        상세보기
                    </button>
                </div>
            </div>
        </div>
    );
}
