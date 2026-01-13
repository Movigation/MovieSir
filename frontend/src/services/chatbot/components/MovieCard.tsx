// ============================================================
// [용도] 영화 카드 컴포넌트 (포스터 기반 Vertical Overlay 스타일)
// [사용법] <MovieCard movie={movieData} isExpanded={...} onExpand={...} onCollapse={...} onClick={...} />
// ============================================================

import { Eye, RefreshCw } from 'lucide-react';
import type { Movie } from '@/api/movieApi.type';
import { useState, useRef, useEffect } from 'react';

interface MovieCardProps {
    movie: Movie;
    isExpanded: boolean;
    onExpand: () => void;
    onCollapse: () => void;
    onClick: () => void;
    onReRecommend?: () => void;
    showReRecommend?: boolean;
    shouldAnimate?: boolean;
}

export default function MovieCard({
    movie,
    isExpanded,
    onExpand,
    onCollapse,
    onClick,
    onReRecommend,
    showReRecommend = false,
    shouldAnimate = false
}: MovieCardProps) {
    const [isRemoving, setIsRemoving] = useState(false);
    const [isWatched] = useState(movie.watched || false);
    const [isHovered, setIsHovered] = useState(false);
    const [loadingPhase, setLoadingPhase] = useState<0 | 1 | 2>(0); // 0: Skeleton, 1: Pop-in, 2: Final
    const cardRef = useRef<HTMLDivElement>(null);
    // 데이터 로드 완료 또는 복구 시 제거 애니메이션 상태 리셋
    useEffect(() => {
        if (!movie.isSkeleton) {
            setIsRemoving(false);
        }
    }, [movie.isSkeleton, movie.id]);

    // 새로운 영화 데이터가 로드될 때(ID 변경 시) 페이즈 리셋
    useEffect(() => {
        setLoadingPhase(0);
    }, [movie.id]);

    // 외부 클릭 감지 (모바일에서 카드 바깥 클릭 시 닫기)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (isExpanded && cardRef.current && !cardRef.current.contains(event.target as Node)) {
                onCollapse();
            }
        };

        if (isExpanded) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isExpanded, onCollapse]);

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

    // 인터랙션 핸들러
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const isDesktop = window.innerWidth >= 1024;

        if (!isDesktop) {
            // 모바일/태블릿: 1차 클릭 -> 내부 정보 확장, 2차 클릭 -> 상세
            if (isExpanded) {
                onClick();
            } else {
                onExpand();
            }
        } else {
            // 데스크탑: 호버 중 클릭 -> 상세
            // onClick(); // 데스크탑: 상세보기 버튼만 클릭 가능
        }
    };

    const handleMouseEnter = () => {
        if (window.innerWidth >= 1024) {
            setIsHovered(true);
            onExpand();
        }
    };

    const handleMouseLeave = () => {
        if (window.innerWidth >= 1024) {
            setIsHovered(false);
            onCollapse();
        }
    };

    // 0. 스켈레톤 상태인 경우 (API 로딩 중)
    if (movie.isSkeleton) {
        return (
            <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden shadow-md bg-gray-200 dark:bg-gray-800 skeleton-shimmer" />
        );
    }

    // 빈 카드인 경우
    if (movie.isEmpty) {
        return (
            <div className="relative aspect-[2/3] w-[calc((100vw-48px)/3)] sm:w-[180px] md:w-[200px] rounded-lg overflow-hidden shadow-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <div className="text-gray-400 text-center p-4">
                    <p className="text-xs font-medium">검색 결과 없음</p>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={cardRef}
            className={`
                relative flex-shrink-0 cursor-pointer overflow-hidden rounded-lg shadow-xl
                w-full aspect-[2/3]
                transition-all duration-700 ease-[cubic-bezier(0.19,1,0.22,1)]
                group
                ${isExpanded ? 'z-30 ring-2 ring-blue-500 shadow-2xl' : 'z-10'}
                ${isRemoving ? 'animate-slide-down-fade' : shouldAnimate ? 'animate-slide-up' : ''}
            `}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* 1. 배경 포스터 이미지 & 스켈레톤 */}
            <div className="absolute inset-0 w-full h-full overflow-hidden bg-gray-200 dark:bg-gray-800">
                {/* 로딩 스켈레톤 (이미지 아래에 배치) */}
                {loadingPhase === 0 && (
                    <div className="absolute inset-0 w-full h-full skeleton-shimmer" />
                )}

                <img
                    src={movie.poster}
                    alt={movie.title}
                    onLoad={() => {
                        setLoadingPhase(1);
                        setTimeout(() => setLoadingPhase(2), 150);
                    }}
                    className={`
                        w-full h-full object-cover transition-all duration-[600ms] ease-[cubic-bezier(0.19,1,0.22,1)]
                        ${(isHovered || isExpanded) ? 'scale-110' : 'scale-105'}
                        ${loadingPhase === 0 ? 'opacity-0 blur-2xl' :
                            loadingPhase === 1 ? 'opacity-60 blur-md' : 'opacity-100 blur-0'}
                    `}
                />
            </div>

            {/* 2. 그라데이션 오버레이 (Scrim) - 200% 높이로 부드러운 전환 */}
            <div
                className={`
                    absolute inset-0 w-full h-[200%] pointer-events-none
                    bg-gradient-to-t from-black via-black/30 via-black/20 to-transparent
                    transition-transform duration-[1200ms] ease-[cubic-bezier(0.19,1,0.22,1)]
                    ${(isHovered || isExpanded) ? 'translate-y-[-50%]' : 'translate-y-0'}
                `}
            />

            {/* 3. 콘텐츠 영역 (Title & Info) */}
            <div
                className={`
                    absolute inset-0 flex flex-col justify-end p-3 sm:p-5
                    transition-transform duration-700 ease-[cubic-bezier(0.19,1,0.22,1)]
                    ${(isHovered || isExpanded) ? 'translate-y-0' : 'translate-y-[calc(100%-4.5rem)] sm:translate-y-[calc(100%-5rem)]'}
                `}
            >
                {/* 제목 (항상 노출되는 베이스) */}
                <h3 className="text-white font-bold text-sm sm:text-lg leading-tight mb-2 drop-shadow-md line-clamp-2">
                    {movie.title}
                </h3>

                {/* 상세 정보 (호버/활성 시 노출) */}
                <div
                    className={`
                        flex flex-col gap-2 transition-all duration-700 ease-out
                        ${(isHovered || isExpanded) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
                    `}
                >
                    {/* 평점 */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-yellow-400 text-xs">⭐</span>
                        <span className="text-white font-semibold text-xs sm:text-sm">
                            {typeof movie.rating === 'number' ? movie.rating.toFixed(1) : movie.rating}
                        </span>
                    </div>

                    {/* 장르 */}
                    <div className="flex flex-wrap gap-1">
                        {movie.genres.slice(0, 2).map((genre, idx) => (
                            <span
                                key={idx}
                                className="px-1.5 py-0.5 bg-white/20 text-white text-[10px] rounded-md backdrop-blur-sm"
                            >
                                {genre}
                            </span>
                        ))}
                    </div>

                    {/* 버튼 영역 */}
                    <div className="flex flex-col gap-1.5 mt-2">
                        {showReRecommend && onReRecommend && (
                            <div className="relative">
                                {/* 러닝타임 표시 (우측 상단) */}
                                {movie.runtime && movie.runtime > 0 && (
                                    <div className="absolute -top-8 right-0 text-white/80 text-[10px] sm:text-xs font-medium">
                                        {Math.floor(movie.runtime / 60)}시간 {movie.runtime % 60}분
                                    </div>
                                )}
                                <button
                                    onClick={handleReRecommend}
                                    className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs sm:text-sm font-bold uppercase tracking-wider rounded transition-colors shadow-lg"
                                >
                                    <RefreshCw size={14} className="inline mr-1" />
                                    재추천
                                </button>
                            </div>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onClick();
                            }}
                            className="w-full py-2 bg-white text-black hover:bg-gray-200 text-xs sm:text-sm font-bold uppercase tracking-wider rounded transition-colors shadow-lg"
                        >
                            상세보기
                        </button>
                    </div>
                </div>
            </div>

            {/* 4. 기타 배지 (Watched, Adult 등) */}
            <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-20">
                {movie.adult && (
                    <div className="w-8 h-8 bg-transparent flex items-center justify-center animate-fade-in">
                        <img src="/adult.svg" alt="성인 영화" className="w-6 h-6 object-contain" />
                    </div>
                )}
                {isWatched && (
                    <div className="bg-green-500/90 text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1 shadow-sm backdrop-blur-sm">
                        <Eye size={12} />
                        <span>Watched</span>
                    </div>
                )}
            </div>
        </div>
    );
}
