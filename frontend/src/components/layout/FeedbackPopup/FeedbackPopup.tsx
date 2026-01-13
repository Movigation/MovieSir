import { useState, useEffect } from 'react';
import { Heart, HeartCrack, X } from 'lucide-react';
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
        // 로그인 상태 확인 (accessToken + userId 둘 다 필요)
        const accessToken = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
        if (!accessToken || !userId) return;

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
    }, [userId]);

    const handleFeedback = async (type: 'good' | 'bad' | 'later') => {
        if (!targetMovie || !userId) return;

        if (type !== 'later') {
            try {
                // 백엔드 API 호출
                const { postSatisfaction } = await import('@/api/movieApi');
                await postSatisfaction(targetMovie.sessionId.toString(), type === 'good');

                // 하트/하트-크랙 피드백 완료 기록
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
            // '아직 안 봤어요' 클릭 시: 다음 체크 시 다시 뜰 수 있도록 세션 기록은 안 함
            console.log('⏳ 피드백 보류: 아직 안 봤음');
        }

        setIsVisible(false);
    };

    if (!targetMovie) return null;

    return (
        <div
            className={`
                fixed z-[100000] w-[calc(100%-48px)] max-w-[300px]
                bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-black/5 dark:border-white/10
                rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)]
                transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
                
                /* 반응형 위치: 모바일 중앙하단, 데스크탑 좌측하단 */
                bottom-6 
                left-1/2 -translate-x-1/2 md:left-6 md:translate-x-0
                
                ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-[120%] opacity-0'}
            `}
        >
            <div className="p-6 flex flex-col items-center gap-2">
                {/* 닫기 버튼 */}
                <button
                    onClick={() => setIsVisible(false)}
                    className="absolute top-4 right-4 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-gray-400"
                >
                    <X size={18} />
                </button>

                {/* 영화 포스터 */}
                <div className="w-20 h-28 flex-shrink-0 shadow-lg rounded-lg overflow-hidden border border-black/5 mb-2">
                    <img
                        src={targetMovie.posterUrl}
                        alt={targetMovie.title}
                        className="w-full h-full object-cover"
                    />
                </div>

                <div className="text-center space-y-1">
                    <h3 className="text-sm font-bold text-black dark:text-white leading-tight">
                        추천받으신 <span className="text-blue-600 dark:text-blue-400">[{targetMovie.title}]</span>,<br />어떠셨나요?
                    </h3>
                </div>

                {/* 하트 아이콘 영역 */}
                <div className="flex items-center gap-8 py-2">
                    <button
                        onClick={() => handleFeedback('good')}
                        className="group flex flex-col items-center gap-2"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center transition-all group-hover:scale-110 group-active:scale-95 group-hover:bg-red-100">
                            <Heart className="w-7 h-7 text-red-500 fill-current" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 font-jua">재밌었어요</span>
                    </button>

                    <button
                        onClick={() => handleFeedback('bad')}
                        className="group flex flex-col items-center gap-2"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center transition-all group-hover:scale-110 group-active:scale-95 group-hover:bg-gray-100">
                            <HeartCrack className="w-7 h-7 text-gray-400" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 font-jua">별로였어요</span>
                    </button>
                </div>

                {/* 하단 보류 버튼 */}
                <button
                    onClick={() => handleFeedback('later')}
                    className="mt-1 text-[11px] font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 underline underline-offset-4 transition-colors font-jua"
                >
                    아직 안 봤어요
                </button>
            </div>
        </div>
    );
}
