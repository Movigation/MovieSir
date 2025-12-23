// [용도] 영화 캐러셀 - 3D 원근 효과 + 마우스/터치 드래그
// [참조] crew-carousel CSS 스타일 기반

import { useState, Children, useRef, useEffect, type TouchEvent, type MouseEvent } from 'react';

interface MovieCarouselProps {
    children: React.ReactNode;
    className?: string;
}

export default function MovieCarousel({ children, className = '' }: MovieCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startX = useRef(0);
    const currentX = useRef(0);

    const childrenArray = Children.toArray(children);
    const totalMovies = childrenArray.length;

    // 이전/다음 카드로 이동
    const goToPrev = () => setCurrentIndex(prev => Math.max(0, prev - 1));
    const goToNext = () => setCurrentIndex(prev => Math.min(totalMovies - 1, prev + 1));

    // 마우스 드래그 시작 (데스크탑)
    const handleMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        startX.current = e.clientX;
        currentX.current = e.clientX;
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        currentX.current = e.clientX;
    };

    const handleMouseUp = () => {
        if (!isDragging) return;
        setIsDragging(false);

        const diff = startX.current - currentX.current;
        if (Math.abs(diff) > 50) {
            if (diff > 0) goToNext();
            else goToPrev();
        }

        startX.current = 0;
        currentX.current = 0;
    };

    // 전역 마우스 이벤트 리스너 (드래그 중 마우스가 컨테이너 밖으로 나가도 작동)
    useEffect(() => {
        const handleGlobalMouseMove = (e: globalThis.MouseEvent) => {
            if (!isDragging) return;
            currentX.current = e.clientX;
        };

        const handleGlobalMouseUp = () => {
            if (!isDragging) return;
            setIsDragging(false);

            const diff = startX.current - currentX.current;
            if (Math.abs(diff) > 50) {
                if (diff > 0) goToNext();
                else goToPrev();
            }

            startX.current = 0;
            currentX.current = 0;
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleGlobalMouseMove);
            window.addEventListener('mouseup', handleGlobalMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [isDragging, currentIndex, totalMovies]);

    // 터치 드래그 (모바일)
    const handleTouchStart = (e: TouchEvent) => {
        startX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
        const touchEndX = e.changedTouches[0].clientX;
        const diff = startX.current - touchEndX;

        if (Math.abs(diff) > 50) {
            if (diff > 0) goToNext();
            else goToPrev();
        }
    };

    // 카드 클릭 시 해당 카드로 이동
    const handleCardClick = (index: number) => {
        setCurrentIndex(index);
    };

    if (totalMovies === 0) {
        return <div className="text-center text-gray-500">영화가 없습니다.</div>;
    }

    // 카드 위치 계산 (center, left-1, left-2, right-1, right-2, hidden)
    const getCardPosition = (index: number) => {
        const diff = index - currentIndex;

        if (diff === 0) return 'center';
        if (diff === -1) return 'left-1';
        // if (diff === -2) return 'left-2';
        if (diff === 1) return 'right-1';
        // if (diff === 2) return 'right-2';
        return 'hidden';
    };

    return (
        <div className={`relative w-full ${className}`}>
            {/* 3D 캐러셀 컨테이너 */}
            <div
                className="relative w-full h-[450px] sm:h-[500px] lg:h-[600px] perspective-1000"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                style={{ perspective: '1000px', cursor: isDragging ? 'grabbing' : 'grab' }}
            >
                <div className="relative w-full h-full flex items-center justify-center preserve-3d">
                    {childrenArray.map((child, index) => {
                        const position = getCardPosition(index);

                        return (
                            <div
                                key={index}
                                className={`
                                    absolute w-[280px] sm:w-[320px] lg:w-[380px]
                                    transition-all duration-700 ease-out
                                    ${position === 'center' ? 'z-10 scale-110 opacity-100' : ''}
                                    ${position === 'left-1' ? 'z-5 scale-90 opacity-100 grayscale-[80%]' : ''}
                                    ${position === 'right-1' ? 'z-5 scale-90 opacity-100 grayscale-[80%]' : ''}
                                    ${position === 'hidden' ? 'opacity-0 pointer-events-none' : ''}
                                `}
                                style={{
                                    transform:
                                        position === 'center' ? 'translateX(0) scale(1.0)' :
                                            position === 'left-1' ? 'translateX(-200px) scale(0.9)' :
                                                position === 'right-1' ? 'translateX(200px) scale(0.9)' :
                                                    'translateX(0) scale(0.8)',
                                    cursor: position === 'center' ? 'default' : 'pointer'
                                }}
                                onClick={() => position !== 'center' && handleCardClick(index)}
                            >
                                {child}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 페이지 인디케이터 (점) - 포스터 바로 아래 */}
            <div className="flex justify-center gap-2 mt-6">
                {childrenArray.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`h-2 w-2 rounded-full transition-all duration-300 ${idx === currentIndex
                            ? 'w-6 bg-blue-500'
                            : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                        aria-label={`${idx + 1}번 영화로 이동`}
                    />
                ))}
            </div>
        </div>
    );
}
