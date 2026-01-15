import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, X, Hourglass } from 'lucide-react';
import { useMovieStore } from '@/store/useMovieStore';

interface FeedbackLog {
    movieId: number;
    title: string;
    posterUrl: string;
    sessionId: number; // 실제 DB 추천 세션 ID
}

export default function FeedbackPopup() {
    const [isVisible, setIsVisible] = useState(false);
    const [targetMovie, setTargetMovie] = useState<FeedbackLog | null>(null);
    const { userId } = useMovieStore();

    useEffect(() => {
        // [테스트용] 콘솔에 f1 입력 시 팝업 노출
        const showTest = () => {
            try {
                // 1. 로컬 스토리지에서 마지막 추천 결과 가져오기 시도
                const storageKey = `last_recommendations_${userId}`;
                const storageData = JSON.parse(localStorage.getItem(storageKey) || 'null');

                let testMovie = null;

                if (storageData && (storageData.trackA?.length > 0 || storageData.trackB?.length > 0)) {
                    // 트랙 A 또는 B에서 첫 번째 영화 선택
                    testMovie = storageData.trackA?.[0] || storageData.trackB?.[0];
                    const sessionId = storageData.sessionId || 0;

                    setTargetMovie({
                        movieId: testMovie.id,
                        title: testMovie.title,
                        posterUrl: testMovie.poster || "https://image.tmdb.org/t/p/w500/edv5uSjLOnFEzd7xI7tAef09zbC.jpg",
                        sessionId: sessionId
                    });
                } else {
                    // 데이터가 없는 경우 폴백
                    setTargetMovie({
                        movieId: 0,
                        title: "인셉션 (샘플)",
                        posterUrl: "https://image.tmdb.org/t/p/w500/edv5uSjLOnFEzd7xI7tAef09zbC.jpg",
                        sessionId: 0
                    });
                }

                setTimeout(() => setIsVisible(true), 100);
                return testMovie
                    ? `✅ 저장된 마지막 추천 영화 [${testMovie.title}]로 테스트 팝업을 띄웠습니다.`
                    : "⚠️ 저장된 추천 기록이 없어 샘플 데이터로 팝업을 띄웠습니다.";
            } catch (error) {
                console.error("테스트 데이터 로드 실패:", error);
                return "❌ 테스트 로직 실행 중 오류가 발생했습니다.";
            }
        };

        (window as any).showFeedbackTest = showTest;

        // window['1']은 브라우저에 따라 인덱스 속성 보호로 에러가 날 수 있어 f1으로 변경
        Object.defineProperty(window, 'f1', {
            get: showTest,
            configurable: true
        });

        // 로그인 상태 확인 (user 정보 + userId 둘 다 필요)
        const user = localStorage.getItem("user") || sessionStorage.getItem("user");
        if (!user || !userId) return;

        // 한 세션(새로고침 전까지) 동안 이미 떴다면 다시 체크하지 않음
        const sessionsShowed = (window as any).__FEEDBACK_SHOWED_THIS_SESSION__;
        if (sessionsShowed) return;

        const checkFeedbackTarget = () => {
            const now = Date.now();

            // 1. 후보군 추출 (피드백 완료 영화 제외)
            const feedbackDoneKey = `feedback_done_list_${userId}`;
            const feedbackDone = JSON.parse(localStorage.getItem(feedbackDoneKey) || '[]');

            // [우선순위 1] OTT 클릭 로그 기반 + targetShowTime 경과 여부
            const clickLogsKey = `movie_click_logs_${userId}`;
            const clickLogsRaw = localStorage.getItem(clickLogsKey);
            let candidates: FeedbackLog[] = [];

            if (clickLogsRaw) {
                const logs = JSON.parse(clickLogsRaw);
                candidates = logs.filter((log: any) => {
                    // 이미 피드백을 완료했는지 확인
                    if (feedbackDone.includes(log.movieId)) return false;

                    // sessionId가 없으면 제외 (이전 버전 로그)
                    if (!log.sessionId) return false;

                    // targetShowTime이 존재하고 현재 시간이 그보다 지났는지 확인
                    if (log.targetShowTime && now >= log.targetShowTime) {
                        return true;
                    }
                    return false;
                }).map((log: any) => ({
                    movieId: log.movieId,
                    title: log.title,
                    posterUrl: log.posterUrl,
                    sessionId: log.sessionId // 실제 DB 세션 ID 사용
                }));
            }

            // 2. 가장 최근에 클릭한(또는 랜덤) 대상 선정
            if (candidates.length > 0) {
                // 가장 최근 타겟 노출
                const finalist = candidates[0];

                setTargetMovie(finalist);
                // 접속 직후보다는 약간 인지할 시간을 주고 노출
                setTimeout(() => {
                    setIsVisible(true);
                    (window as any).__FEEDBACK_SHOWED_THIS_SESSION__ = true;
                }, 3000);
            }
        };

        // 접속 시 1회만 실행
        checkFeedbackTarget();

        return () => {
            // 클린업: window['1'] 제거 (필요 시)
            // delete (window as any)['1'];
        };
    }, [userId]);

    const handleFeedback = async (type: 'good' | 'bad' | 'later') => {
        if (!targetMovie) return;

        // 테스트 데이터(movieId 0)인 경우 실제 API 호출 스킵
        if (targetMovie.movieId !== 0 && userId) {
            if (type !== 'later') {
                try {
                    // 백엔드 API 호출
                    const { postSatisfaction } = await import('@/api/movieApi');
                    await postSatisfaction(targetMovie.sessionId.toString(), type === 'good');

                    // 하트/하트 회전 피드백 완료 기록
                    const feedbackDoneKey = `feedback_done_list_${userId}`;
                    const feedbackDone = JSON.parse(localStorage.getItem(feedbackDoneKey) || '[]');
                    // 최신 100개 유지
                    const updatedDone = [targetMovie.movieId, ...feedbackDone.filter((id: number) => id !== targetMovie.movieId)].slice(0, 100);
                    localStorage.setItem(feedbackDoneKey, JSON.stringify(updatedDone));

                    // 세션 완료 기록 (A > B 로직용)
                    localStorage.setItem(`last_responded_session_time_${userId}`, targetMovie.sessionId.toString());

                    console.log(`🎬 [User ${userId}] 피드백 수집 및 백엔드 전송 완료: [${targetMovie.title}] - ${type}`);
                } catch (error) {
                    console.error("피드백 백엔드 전송 실패 (로컬 저장은 완료):", error);
                }
            } else {
                console.log('⏳ 피드백 보류: 아직 안 봤음');
            }
        } else {
            console.log(`🧪 테스트 모드 피드백: ${type}`);
        }

        setIsVisible(false);
    };

    if (!targetMovie) return null;

    return (
        <div
            className={`
                fixed z-[100000] w-[calc(100%-48px)] max-w-[300px]
                bg-white/95 dark:bg-gray-900/95 backdrop-blur-3xl border border-black/5 dark:border-white/10
                rounded-[40px] shadow-[0_30px_70px_rgba(0,0,0,0.25)] dark:shadow-[0_30px_70px_rgba(0,0,0,0.45)]
                transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
                overflow-hidden
                /* 반응형 위치: 모바일 중앙하단, 데스크탑 좌측하단 */
                bottom-8 
                left-1/2 -translate-x-1/2 md:left-8 md:translate-x-0
                
                ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-[120%] opacity-0 scale-90'}
            `}
        >
            <div className="pt-5 pb-8 pr-2 pl-2 flex flex-col items-center gap-3 group">
                {/* 닫기 버튼 */}
                <button
                    onClick={() => setIsVisible(false)}
                    className="absolute top-6 right-6 p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 transition-colors z-10"
                >
                    <X size={20} />
                </button>

                {/* 1. 타이틀 영역 - 최상단 */}
                <div className="text-center space-y-1 px-2">
                    <h3 className="text-[18px] font-bold text-black dark:text-white leading-tight">
                        <span className="text-blue-600 dark:text-blue-400">[{targetMovie.title}]</span><br />어떠셨나요?
                    </h3>
                </div>

                {/* 2. 포스터 및 겹치는 버튼 영역 */}
                <div className="relative w-full flex flex-col items-center">
                    {/* 영화 포스터 - 훨씬 더 크게 확대 */}
                    <div className="w-52 h-72 sm:w-60 sm:h-80 flex-shrink-0 shadow-2xl overflow-hidden border border-black/5 dark:border-white/10 group">
                        <img
                            src={targetMovie.posterUrl}
                            alt={targetMovie.title}
                            className="w-full h-full object-cover transition-transform duration-700"
                        />
                    </div>

                    {/* 3. 피드백 아이콘 영역 - 호버 시 노출 */}
                    <div className="absolute -bottom-6 flex items-center justify-center gap-16 px-4 w-full translate-y-10 pointer-events-none group-hover:opacity-100 group-hover:translate-y-[-7px] group-hover:pointer-events-auto transition-all duration-500 ease-out">
                        {/* 별로임 */}
                        <button
                            onClick={() => handleFeedback('bad')}
                            className="group flex flex-col items-center gap-1.5"
                        >
                            <div className="w-14 h-14 rounded-[20px] bg-white/70 dark:bg-gray-800 shadow-xl border border-black/5 dark:border-white/10 flex items-center justify-center transition-all group-hover:scale-110 group-active:scale-95 group-hover:bg-gray-100 dark:group-hover:bg-white/5">
                                <ThumbsDown className="w-8 h-8 stroke-1" />
                            </div>
                        </button>
                        {/* 아직 안 봄 (나중에) */}
                        {/* <button
                            onClick={() => handleFeedback('later')}
                            className="group flex flex-col items-center gap-1.5"
                        >
                            <div className="w-14 h-14 rounded-[20px] bg-white/70 dark:bg-gray-800 shadow-xl border border-black/5 dark:border-white/10 flex items-center justify-center transition-all group-hover:scale-110 group-active:scale-95 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10">
                                <Hourglass className="w-8 h-8 stroke-1 text-blue-500" />
                            </div>
                        </button> */}

                        {/* 좋음 */}
                        <button
                            onClick={() => handleFeedback('good')}
                            className="group flex flex-col items-center gap-1.5"
                        >
                            <div className="w-14 h-14 rounded-[20px] bg-white/70 dark:bg-gray-800 shadow-xl border border-black/5 dark:border-white/10 flex items-center justify-center transition-all group-hover:scale-110 group-active:scale-95 group-hover:bg-red-50 dark:group-hover:bg-red-500/10">
                                <ThumbsUp className="w-8 h-8 stroke-1" />
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
