// [용도] 영화 캐러셀 공통 컴포넌트
// [사용법] RecommendedMoviesSection, PopularMoviesSection에서 사용

import { useState, Children } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MovieCarouselProps {
    children: React.ReactNode;  // ReactNode[] → ReactNode
    className?: string;
}

export default function MovieCarousel({ children, className = '' }: MovieCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // React.Children.toArray로 children을 배열로 변환
    const childrenArray = Children.toArray(children);
    const totalMovies = childrenArray.length;
    const visibleCount = 3; // 항상 3개만 표시

    // 🔍 디버그 로그
    console.log('🎠 MovieCarousel 렌더링:', {
        totalMovies,
        childrenType: typeof children,
        arrayLength: childrenArray.length
    });

    // 영화 개수에 따라 이동 간격 계산
    const getSlideInterval = () => {
        if (totalMovies === 4) return 1;  // 4개: 1칸씩
        if (totalMovies === 5) return 2;  // 5개: 2칸씩
        return 3;  // 6개 이상: 3칸씩
    };

    const slideInterval = getSlideInterval();

    // 좌측 화살표 표시 여부
    const showLeftArrow = currentIndex > 0;

    // 우측 화살표 표시 여부
    const showRightArrow = currentIndex + visibleCount < totalMovies;

    console.log('  화살표:', { left: showLeftArrow, right: showRightArrow, currentIndex });

    // 좌측 이동
    const handlePrev = () => {
        console.log('◀️ 좌측 화살표 클릭');
        setCurrentIndex(prev => Math.max(0, prev - slideInterval));
    };

    // 우측 이동
    const handleNext = () => {
        console.log('▶️ 우측 화살표 클릭');
        setCurrentIndex(prev =>
            Math.min(totalMovies - visibleCount, prev + slideInterval)
        );
    };

    // 3개 이하면 캐러셀 없이 그냥 표시
    if (totalMovies <= 3) {
        return (
            <div className={`flex gap-2 md:gap-3 ${className}`}>
                {childrenArray}
            </div>
        );
    }

    return (
        <div className="relative">
            {/* 좌측 화살표 */}
            {showLeftArrow && (
                <button
                    onClick={handlePrev}
                    className="
                        absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10
                        w-10 h-10 rounded-full
                        bg-white/90 dark:bg-gray-800/90
                        shadow-lg hover:shadow-xl
                        flex items-center justify-center
                        transition-all hover:scale-110
                        border border-gray-200 dark:border-gray-700
                    "
                    aria-label="이전 영화"
                >
                    <ChevronLeft className="w-6 h-6 text-gray-800 dark:text-white" />
                </button>
            )}

            {/* 영화 카드 컨테이너 */}
            <div className="overflow-hidden">
                <div
                    className="flex gap-2 md:gap-3 transition-transform duration-500 ease-out"
                    style={{
                        transform: `translateX(-${currentIndex * (100 / visibleCount + 0.67)}%)`
                        // 0.67% = gap을 고려한 보정값 (2칸 gap / 3개 카드)
                    }}
                >
                    {childrenArray}
                </div>
            </div>

            {/* 우측 화살표 */}
            {showRightArrow && (
                <button
                    onClick={handleNext}
                    className="
                        absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10
                        w-10 h-10 rounded-full
                        bg-white/90 dark:bg-gray-800/90
                        shadow-lg hover:shadow-xl
                        flex items-center justify-center
                        transition-all hover:scale-110
                        border border-gray-200 dark:border-gray-700
                    "
                    aria-label="다음 영화"
                >
                    <ChevronRight className="w-6 h-6 text-gray-800 dark:text-white" />
                </button>
            )}
        </div>
    );
}
