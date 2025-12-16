// [사용법] <TimeFilterStep onNext={() => moveToNextStep()} />

import { useState, useRef, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { useMovieStore } from '@/store/useMovieStore';

interface TimeFilterStepProps {
    onNext: () => void;
}

// 휠 스크롤 선택기 컴포넌트
interface WheelPickerProps {
    items: number[];
    selectedIndex: number;
    onChange: (index: number) => void;
    unit: string;
}

function WheelPicker({ items, selectedIndex, onChange, unit }: WheelPickerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);

    // 컴포넌트 마운트 시 스크롤을 맨 위로 강제 초기화
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = 0;
        }
    }, []); // 마운트 시 1회만 실행

    useEffect(() => {
        // 선택된 항목으로 스크롤
        if (containerRef.current) {
            const itemHeight = 48;
            const targetScroll = selectedIndex * itemHeight;
            containerRef.current.scrollTop = targetScroll;
        }
    }, [selectedIndex]);

    const handleScroll = () => {
        if (containerRef.current && !isDragging) {
            const itemHeight = 48;
            const scrollTop = containerRef.current.scrollTop;
            const index = Math.round(scrollTop / itemHeight);
            onChange(Math.max(0, Math.min(index, items.length - 1)));
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setStartY(e.pageY - (containerRef.current?.offsetTop || 0));
        setScrollTop(containerRef.current?.scrollTop || 0);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !containerRef.current) return;
        e.preventDefault();
        const y = e.pageY - (containerRef.current.offsetTop || 0);
        const walk = (y - startY);
        containerRef.current.scrollTop = scrollTop - walk;
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        // 스냅 효과
        if (containerRef.current) {
            const itemHeight = 48;
            const scrollTop = containerRef.current.scrollTop;
            const index = Math.round(scrollTop / itemHeight);
            const targetScroll = index * itemHeight;
            containerRef.current.scrollTo({
                top: targetScroll,
                behavior: 'smooth'
            });
            onChange(Math.max(0, Math.min(index, items.length - 1)));
        }
    };

    return (
        <div className="relative h-48 w-20 overflow-hidden">
            {/* 선택 영역 블록 - 흰색 배경 */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-12 bg-gray-200 dark:bg-gray-800/50 pointer-events-none z-10 rounded-lg" />

            {/* 상단 페이드 */}
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white dark:from-gray-800 to-transparent pointer-events-none z-20" />

            {/* 하단 페이드 */}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white dark:from-gray-800 to-transparent pointer-events-none z-20" />

            {/* 스크롤 컨테이너 */}
            <div
                ref={containerRef}
                className="relative h-full overflow-y-scroll scrollbar-hide cursor-grab active:cursor-grabbing z-30"
                onScroll={handleScroll}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{
                    scrollSnapType: 'y mandatory',
                    paddingTop: '72px',
                    paddingBottom: '72px'
                }}
            >
                {items.map((item, index) => {
                    const isSelected = index === selectedIndex;
                    // 중앙에서의 거리 계산 (원통형 효과)
                    const distance = Math.abs(index - selectedIndex);
                    // 거리에 따른 opacity와 scale 계산
                    const opacity = Math.max(0.2, 1 - distance * 0.3);
                    const scale = Math.max(0.85, 1 - distance * 0.08);

                    return (
                        <div
                            key={index}
                            className={`h-12 flex items-center justify-center transition-all duration-200 select-none ${isSelected
                                ? 'text-2xl font-bold text-blue-600 dark:text-white'
                                : 'text-lg text-gray-400 dark:text-gray-600'
                                }`}
                            style={{
                                scrollSnapAlign: 'center',
                                opacity,
                                transform: `scale(${scale})`,
                            }}
                        >
                            {item.toString().padStart(2, '0')}{unit}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function TimeFilterStep({ onNext }: TimeFilterStepProps) {
    const { setTime } = useMovieStore();
    const [hours, setHours] = useState(0);
    const [minutes, setMinutes] = useState(0);

    // 시간과 분 배열 생성
    const hoursList = Array.from({ length: 13 }, (_, i) => i); // 0~12
    const minutesList = Array.from({ length: 60 }, (_, i) => i); // 0~59 (1분 단위)

    // 컴포넌트 마운트 시 초기값 00:00 설정
    useEffect(() => {
        setTime("00:00");
    }, [setTime]);

    useEffect(() => {
        const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        setTime(timeStr);
    }, [hours, minutes, setTime]);

    const hasTimeSelected = hours > 0 || minutes > 0;

    return (
        <div className="space-y-4 sm:space-y-6 animate-slide-in-right">
            {/* Title */}
            <div className="text-center px-2">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-1.5 sm:mb-2">
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    얼마나 시간이 있으신가요?
                </p>
            </div>

            {/* Time Display */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center mx-2 sm:mx-0">
                <div className="text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                    {`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`}
                </div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1.5 sm:mt-2">
                    {!hasTimeSelected ? "시간을 선택해주세요" : "선택된 시간"}
                </p>
            </div>

            {/* iOS Style Wheel Picker */}
            <div className="flex items-center justify-center gap-2 px-4">
                <WheelPicker
                    items={hoursList}
                    selectedIndex={hours}
                    onChange={setHours}
                    unit=""
                />
                <span className="text-2xl font-bold text-gray-400 dark:text-gray-600">:</span>
                <WheelPicker
                    items={minutesList}
                    selectedIndex={minutes}
                    onChange={setMinutes}
                    unit=""
                />
            </div>

            {/* Next Button */}
            <button
                onClick={onNext}
                disabled={!hasTimeSelected}
                className={`
                    w-full py-3 sm:py-3.5 md:py-4 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base md:text-lg flex items-center justify-center gap-2
                    transition-all duration-300 transform
                    ${hasTimeSelected
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:scale-[1.02]'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
                    }
                `}
            >
                다음 단계
                <ChevronRight size={20} className="sm:w-6 sm:h-6" />
            </button>

            {/* 스크롤바 숨김 CSS */}
            <style>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
