import { useState, useEffect, useRef } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { useMovieStore } from '@/store/useMovieStore';
import MovieCard from '@/services/chatbot/components/MovieCard';
import MovieCarousel from '@/services/chatbot/components/MovieCarousel';
import type { Movie } from '@/api/movieApi.type';

export default function SideRecommendationPopup({
    isChatbotOpen,
    onOpen
}: {
    isChatbotOpen?: boolean;
    onOpen?: () => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'trackA' | 'trackB'>('trackA');
    const [lastData, setLastData] = useState<{
        trackA: Movie[],
        trackB: Movie[],
        filters?: { time: string, genres: string[] },
        timestamp: number
    } | null>(null);
    const [expandedMovieId, setExpandedMovieId] = useState<number | null>(null);
    const { detailMovieId, setDetailMovieId, userId } = useMovieStore();
    const panelRef = useRef<HTMLDivElement>(null);

    // 로컬 스토리지에서 데이터 로드
    const loadLastData = () => {
        if (!userId) {
            setLastData(null);
            return;
        }

        try {
            const stored = localStorage.getItem(`last_recommendations_${userId}`);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.trackA?.length || parsed.trackB?.length) {
                    setLastData(parsed);
                } else {
                    setLastData(null);
                }
            } else {
                setLastData(null);
            }
        } catch (e) {
            console.error('Failed to parse last_recommendations:', e);
            setLastData(null);
        }
    };

    // 시간 포맷팅 헬퍼 ("02:30" -> "2시간 30분")
    const formatTime = (time?: string) => {
        if (!time || time === "00:00") return "제한 없음";
        const [h, m] = time.split(':').map(Number);
        if (h === 0) return `${m}분`;
        if (m === 0) return `${h}시간`;
        return `${h}시간 ${m}분`;
    };

    useEffect(() => {
        if (!userId) {
            setLastData(null);
            return;
        }

        loadLastData();

        // 다른 창이나 동일창에서의 변경 감지
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === `last_recommendations_${userId}`) {
                loadLastData();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        const interval = setInterval(loadLastData, 2000);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, [userId]);

    // 외부 클릭 시 닫기
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            // 상세 모달이 열려있으면 외부 클릭으로 닫지 않음
            if (detailMovieId) return;

            if (isOpen && panelRef.current && !panelRef.current.contains(e.target as Node)) {
                if (!(e.target as HTMLElement).closest('.side-reco-trigger')) {
                    setIsOpen(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, detailMovieId]);

    // 챗봇이 열리면 사이드 팝업 닫기
    useEffect(() => {
        if (isChatbotOpen && isOpen) {
            setIsOpen(false);
        }
    }, [isChatbotOpen]);

    // 로그인 상태가 아니면 아예 표시하지 않음
    if (!userId) return null;

    // 데이터가 없으면 아무것도 렌더링하지 않음
    if (!lastData) return null;

    const currentTrackMovies = activeTab === 'trackA' ? lastData.trackA : lastData.trackB;

    return (
        <>
            {/* 슬라이딩 컨네이너 (버튼 + 패널 통합 이동) */}
            <div
                className={`
                    fixed top-0 right-0 h-full w-full sm:w-auto z-chatbot-btn flex items-center justify-end
                    transition-transform duration-700 ease-[cubic-bezier(0.19,1,0.22,1)]
                    ${isOpen
                        ? 'translate-x-0'
                        : (isChatbotOpen ? 'translate-x-[calc(100%+100px)]' : 'translate-x-full')
                    }
                    flex
                `}
            >
                {/* 1. 사이드 버튼 (Wrapper 기준 왼쪽 외부에 고정) */}
                <button
                    onClick={() => {
                        const nextOpen = !isOpen;
                        if (nextOpen && onOpen) onOpen();
                        setIsOpen(nextOpen);
                    }}
                    className={`
                        side-reco-trigger absolute left-0 -translate-x-full top-1/2 -translate-y-1/2
                        bg-gray-500/25 hover:bg-gray-600/35 dark:bg-gray-500/55 dark:hover:bg-gray-500/75 text-white w-[36px] h-[150px] rounded-l-xl
                        flex flex-col items-center justify-center gap-2 shadow-lg
                    `}
                    title={isOpen ? '닫기' : '마지막 추천 다시보기'}
                >
                    {isOpen ? <div /> : <div />}
                    <span className="[writing-mode:vertical-lr] font-bold tracking-widest text-sm">
                        {isOpen ? '닫기' : '추천 다시보기'}
                    </span>
                </button>

                {/* 2. 슬라이딩 패널 */}
                <div
                    ref={panelRef}
                    className={`
                        w-full sm:w-[320px] h-full flex flex-col shadow-2xl
                        bg-white/98 dark:bg-gray-900/98 backdrop-blur-xl border-l border-black/5 dark:border-white/5
                    `}
                >
                    {/* 필터 정보 요약 */}
                    {lastData.filters && (
                        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800 border-b border-black/5 dark:border-white/5">
                            <div className="flex flex-col gap-1">
                                <span className="text-[12px] uppercase tracking-wider text-blue-500 dark:text-blue-400 font-bold">선택한 조건</span>
                                <p className="text-xs text-gray-600 dark:text-gray-300 leading-tight">
                                    <span className="text-black dark:text-white font-semibold">{formatTime(lastData.filters.time)}</span> 동안 볼 수 있는{' '}
                                    <span className="text-black dark:text-white font-semibold">
                                        {lastData.filters.genres.length > 0 ? lastData.filters.genres.join(', ') : '전체'}
                                    </span> 장르의 영화입니다.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* 탭 헤더 */}
                    <div className="flex justify-center px-4 border-b border-black/5 dark:border-white/5 bg-gray-50/50 dark:bg-gray-800">
                        {[
                            { id: 'trackA', label: '맞춤 추천', count: lastData.trackA.length },
                            { id: 'trackB', label: '인기 영화', count: lastData.trackB.length },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`relative px-6 py-3 text-sm transition-all flex items-center gap-2 ${activeTab === tab.id
                                    ? 'font-bold text-black dark:text-white'
                                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                                    }`}
                            >
                                {tab.label}
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-400">
                                    {tab.count}
                                </span>
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* 콘텐츠 영역 (스크롤러 제거) */}
                    <div className="flex-1 overflow-hidden flex flex-col items-center py-2 bg-gray-50 dark:bg-gray-800">
                        {currentTrackMovies.length > 0 ? (
                            <div className="w-full flex flex-col items-center">
                                <div className="w-full mb-4 px-6">
                                    <div className="flex items-center gap-2">
                                        {/* <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'trackA' ? 'bg-blue-400' : 'bg-purple-400'}`} /> */}
                                        {/* <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                            {activeTab === 'trackA' ? 'Track A - Personal' : 'Track B - Popular'}
                                        </span> */}
                                    </div>
                                </div>

                                {/* 캐러셀 사이즈 조정 (사이드바 환경에 맞춰 축소 및 반응형 적용) */}
                                <div className="w-full transition-all duration-500">
                                    <MovieCarousel
                                        key={activeTab}
                                        containerClassName="h-[380px]"
                                        cardWidthClassName="w-[250px]"
                                    >
                                        {currentTrackMovies.map((movie) => (
                                            <MovieCard
                                                key={`${activeTab}-${movie.id}-${isOpen}`}
                                                movie={movie}
                                                isExpanded={expandedMovieId === movie.id}
                                                onExpand={() => setExpandedMovieId(movie.id)}
                                                onCollapse={() => setExpandedMovieId(null)}
                                                onClick={() => setDetailMovieId(movie.id)}
                                                showReRecommend={false}
                                            />
                                        ))}
                                    </MovieCarousel>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4">
                                <div className="p-4 bg-white/5 rounded-full">
                                    <div />
                                </div>
                                <p className="text-sm">추천 데이터가 없습니다.</p>
                            </div>
                        )}
                    </div>

                    {/* 패널 푸터 (제목 하단 이동) */}
                    <div className="dark:bg-gray-800 relative flex items-center justify-center p-3">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute left-6 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                            aria-label="닫기"
                        >
                            <ChevronRight size={28} />
                        </button>

                        <div className="text-center">
                            <h2 className="text-[15px] font-bold text-blue-500 dark:text-blue-400">최근 추천 영화</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(lastData.timestamp).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. 모바일용 백드롭 (음영 제거 및 투명) */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-chatbot-backdrop sm:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    );
}
