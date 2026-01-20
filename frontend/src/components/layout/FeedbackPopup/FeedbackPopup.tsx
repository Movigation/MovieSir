import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ThumbsUp, ThumbsDown, X, CornerLeftDown, CornerRightDown } from 'lucide-react';
import { useMovieStore } from '@/store/useMovieStore';

/**
 * FeedbackLog 인터페이스
 * 피드백 대상이 되는 영화의 기본 정보와 데이터베이스 세션 ID를 정의합니다.
 */
interface FeedbackLog {
    movieId: number;
    title: string;
    posterUrl: string;
    sessionId: number; // 실제 DB 추천 세션 ID (피드백 전송 시 필수)
}

/**
 * FeedbackPopup 컴포넌트
 * 사용자가 시청한 영화에 대한 만족도(좋아요/별로예요)를 조사하는 팝업입니다.
 * 모바일에서는 스와이프(Tinder 스타일), 데스크탑에서는 버튼 클릭으로 조작합니다.
 */
export default function FeedbackPopup() {
    // --- 상태 관리 (State) ---
    const [isVisible, setIsVisible] = useState(false);        // 팝업 표시 여부
    const [targetMovie, setTargetMovie] = useState<FeedbackLog | null>(null); // 피드백 대상 영화 정보
    const [dragX, setDragX] = useState(0);                    // 스와이프 시 이동 거리 (X축)
    const [isDragging, setIsDragging] = useState(false);      // 현재 드래그(스와이프) 중인지 여부
    const [startX, setStartX] = useState(0);                  // 드래그 시작 시점의 마우스/터치 X 좌표
    const [showTutorial, setShowTutorial] = useState(true);   // 모바일용 스와이프 가이드(튜토리얼) 표시 여부
    const { userId } = useMovieStore();                       // 현재 로그인한 사용자 ID
    const swipeContainerRef = useRef<HTMLDivElement>(null);   // ✅ 스와이프 이벤트를 직접 제어하기 위한 Ref

    // --- 상수 설정 ---
    const SWIPE_THRESHOLD = 80;    // 이 거리 이상 스와이프하면 피드백이 확정됨
    const ROTATION_STRENGTH = 0.15; // 스와이프 시 카드가 회전하는 강도

    useEffect(() => {
        /**
         * [테스트용 전용 로직] 
         * 브라우저 콘솔에서 'f1'을 입력하거나 showFeedbackTest()를 실행하면 강제로 팝업을 띄웁니다.
         */
        const showTest = () => {
            try {
                // 1. 로컬 스토리지에서 마지막으로 추천받았던 결과가 있는지 확인
                const storageKey = `last_recommendations_${userId}`;
                const storageData = JSON.parse(localStorage.getItem(storageKey) || 'null');

                let testMovie = null;

                if (storageData && (storageData.trackA?.length > 0 || storageData.trackB?.length > 0)) {
                    // 마지막 추천 기록이 있다면 그 중 첫 번째 영화를 테스트 대상으로 설정
                    testMovie = storageData.trackA?.[0] || storageData.trackB?.[0];
                    const sessionId = storageData.sessionId || 0;

                    setTargetMovie({
                        movieId: testMovie.id,
                        title: testMovie.title,
                        posterUrl: testMovie.poster || "https://image.tmdb.org/t/p/w500/edv5uSjLOnFEzd7xI7tAef09zbC.jpg",
                        sessionId: sessionId
                    });
                } else {
                    // 추천 기록이 전혀 없는 신규 유저 등을 위한 샘플(폴백) 데이터
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

        // 전역 window 객체에 테스트 함수 등록
        (window as any).showFeedbackTest = showTest;
        Object.defineProperty(window, 'f1', {
            get: showTest,
            configurable: true
        });

        // --- 실서비스용 피드백 대상 자동 감지 로직 ---
        // 로그인 상태가 아니면 실행하지 않음
        const user = localStorage.getItem("user") || sessionStorage.getItem("user");
        if (!user || !userId) return;

        /**
         * 사용자가 실제로 영화를 봤을 것으로 예상되는 타이밍을 체크하여 팝업을 노출합니다.
         */
        const checkFeedbackTarget = () => {
            const now = Date.now();

            // 1. 피드백을 수락/거절 완료한 목록
            const feedbackDoneKey = `feedback_done_list_${userId}`;
            const feedbackDone = JSON.parse(localStorage.getItem(feedbackDoneKey) || '[]');

            // 2. 'X'를 눌러 건너뛴 세션 ID (해당 세션의 영화는 다시 묻지 않음)
            const skippedSessionKey = `last_skipped_session_id_${userId}`;
            const skippedSessionId = localStorage.getItem(skippedSessionKey);

            // 사용자가 "보러가기" 등을 클릭하여 OTT로 이동했던 로그 확인
            const clickLogsKey = `movie_click_logs_${userId}`;
            const clickLogsRaw = localStorage.getItem(clickLogsKey);
            let candidates: FeedbackLog[] = [];

            if (clickLogsRaw) {
                const logs = JSON.parse(clickLogsRaw);
                candidates = logs.filter((log: any) => {
                    // 완료했거나 명시적으로 건너뛴 세션보다 이전인 영화는 제외
                    if (feedbackDone.includes(log.movieId)) return false;

                    // 현재 기록된 '마지막 스킵 세션 ID'와 같거나 더 오래된 세션의 영화라면 노출하지 않음
                    // 이를 통해 'X'를 누르면 다음 추천(더 큰 세션 ID)이 생기기 전까지 팝업이 나타나지 않습니다.
                    if (skippedSessionId && log.sessionId && log.sessionId <= parseInt(skippedSessionId)) return false;

                    // 세션 ID가 없는 구버전 로그는 제외
                    if (!log.sessionId) return false;

                    // 'targetShowTime'은 클릭 시점이 아니라, 영화를 다 봤을 법한 미래 시점입니다.
                    // 현재 시간이 이 시점을 지났다면 만족도 조사를 띄웁니다.
                    if (log.targetShowTime && now >= log.targetShowTime) {
                        return true;
                    }
                    return false;
                }).map((log: any) => ({
                    movieId: log.movieId,
                    title: log.title,
                    posterUrl: log.posterUrl,
                    sessionId: log.sessionId
                }));
            }

            // 조건에 맞는 대상이 있다면 팝업 준비
            if (candidates.length > 0) {
                const finalist = candidates[0]; // 가장 최근 조건 충족 대상 선택
                setTargetMovie(finalist);

                // 페이지 접속 후 사용자가 화면을 인지할 수 있게 노출 (기존 3초에서 후보 전환 시엔 0.5초로 단축)
                const showDelay = (window as any).__FEEDBACK_SHOWED_THIS_SESSION__ ? 500 : 3000;

                setTimeout(() => {
                    setIsVisible(true);
                    (window as any).__FEEDBACK_SHOWED_THIS_SESSION__ = true;
                }, showDelay);
            } else {
                setTargetMovie(null);
            }
        };

        // 전역 함수로 등록하여 handleFeedback에서 호출 가능하게 함
        (window as any).refreshFeedbackTarget = checkFeedbackTarget;

        checkFeedbackTarget(); // 컴포넌트 마운트 시 실행

        return () => {
            // 필요 시 클린업 로직 작성 공간
        };
    }, [userId]);

    /**
     * 사용자의 피드백을 처리하는 메인 함수
     * @param type 'good'(좋아요), 'bad'(별로예요), 'later'(다음에)
     */
    const handleFeedback = async (type: 'good' | 'bad' | 'later') => {
        if (!targetMovie) return;

        // 샘플 데이터(ID 0)가 아니고 로그인이 되어있을 때만 서버에 전송
        if (targetMovie.movieId !== 0 && userId) {
            if (type !== 'later') {
                try {
                    // 1. 백엔드 API 호출 (세션 전체의 만족도 업데이트)
                    const { postSatisfaction } = await import('@/api/movieApi');
                    await postSatisfaction(targetMovie.sessionId.toString(), type === 'good');

                    // 2. 로컬 기록 업데이트: 이 영화에 대해서는 다시 팝업을 띄우지 않도록 기록
                    const feedbackDoneKey = `feedback_done_list_${userId}`;
                    const feedbackDone = JSON.parse(localStorage.getItem(feedbackDoneKey) || '[]');
                    const updatedDone = [targetMovie.movieId, ...feedbackDone.filter((id: number) => id !== targetMovie.movieId)].slice(0, 100);
                    localStorage.setItem(feedbackDoneKey, JSON.stringify(updatedDone));

                    // 3. 마지막으로 응답한 세션 ID 저장 (추천 로직 최적화용)
                    localStorage.setItem(`last_responded_session_time_${userId}`, targetMovie.sessionId.toString());

                    console.log(`🎬 [User ${userId}] 피드백 전송 완료: [${targetMovie.title}] - ${type}`);
                } catch (error) {
                    console.error("피드백 서버 전송 실패:", error);
                }
            } else {
                // 명시적 건너뛰기('X' 클릭): 해당 세션 ID를 '스킵'으로 기록하여
                // 다음 추천 목록(새 세션)이 생기기 전까지 더 이상 묻지 않음
                console.log(`⏳ 피드백 건너뛰기: [${targetMovie.title}] 세션(${targetMovie.sessionId}) 전체 스킵`);
                localStorage.setItem(`last_skipped_session_id_${userId}`, targetMovie.sessionId.toString());
            }
        } else {
            console.log(`🧪 테스트 모드 피드백: ${type}`);
        }

        setIsVisible(false); // 팝업 닫기 애니메이션 시작

        // 💡 아주 천천히 슬라이드아웃 애니메이션(3.0초)이 끝난 뒤에 상태를 완전히 정리합니다.
        setTimeout(() => {
            setTargetMovie(null); // 실제 데이터 제거 및 언마운트
            setDragX(0);         // 드래그 상태 초기화

            // 다음 피드백 대상이 있는지 다시 확인 (연속적인 만족도 조사 대응)
            if ((window as any).refreshFeedbackTarget) {
                (window as any).refreshFeedbackTarget();
            }
        }, 800);
    };

    // --- 터치/스와이프 이벤트 핸들러 (모바일 전용 - Native Event 사용) ---
    // ✅ Native touch 이벤트를 처리하여 preventDefault() 호출 시 콘솔 에러가 발생하지 않도록 합니다.
    const onTouchStart = useCallback((e: TouchEvent) => {
        if (window.innerWidth >= 768) return;
        e.stopPropagation();
        setStartX(e.touches[0].clientX);
        setIsDragging(true);
        setShowTutorial(false);
    }, []);

    const onTouchMove = useCallback((e: TouchEvent) => {
        if (!isDragging || window.innerWidth >= 768) return;

        // ✅ passive: false로 등록된 이벤트 리스너이므로 이제 안전하게 차단 가능합니다.
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();

        const currentX = e.touches[0].clientX;
        const diff = currentX - startX;
        setDragX(diff);
    }, [isDragging, startX]);

    const onTouchEnd = useCallback(() => {
        if (!isDragging || window.innerWidth >= 768) return;
        setIsDragging(false);

        if (dragX > SWIPE_THRESHOLD) {
            handleFeedback('good');
        } else if (dragX < -SWIPE_THRESHOLD) {
            handleFeedback('bad');
        } else {
            setDragX(0);
        }
    }, [isDragging, dragX, handleFeedback]);

    // ✅ 컴포넌트 마운트 시 브라우저 네이티브 이벤트를 passive: false로 수동 등록
    useEffect(() => {
        const el = swipeContainerRef.current;
        if (!el) return;

        el.addEventListener('touchstart', onTouchStart, { passive: false });
        el.addEventListener('touchmove', onTouchMove, { passive: false });
        el.addEventListener('touchend', onTouchEnd);

        return () => {
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('touchend', onTouchEnd);
        };
    }, [onTouchStart, onTouchMove, onTouchEnd, targetMovie]);

    if (!targetMovie) return null;

    return (
        <div
            style={{
                transform: isVisible
                    ? (window.innerWidth < 768
                        ? `translate(-50%, ${-23 + Math.abs(dragX) * 0.4}px)`
                        : `translateY(${-23 + Math.abs(dragX) * 0.4}px)`)
                    : (window.innerWidth < 768 ? 'translate(-50%, 150%)' : 'translateY(150%)'),
                opacity: isVisible ? 1 : 0,
                transition: isDragging
                    ? 'none'
                    : 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            className={`
                fixed z-[100000] w-[calc(100%)] md:w-[calc(100%-48px)] max-w-full md:max-w-[300px]
                bg-white/95 dark:bg-gray-900/95 backdrop-blur-3xl border border-black/5 dark:border-white/10
                rounded-t-[20px] md:rounded-[20px] md:shadow-[0_30px_70px_rgba(0,0,0,0.25)] dark:shadow-[0_30px_70px_rgba(0,0,0,0.45)]
                overflow-hidden
                bottom-8 
                left-1/2 md:left-8 md:translate-x-0
                ${!isVisible ? 'pointer-events-none' : ''}
            `}
        >
            <div className="pt-5 pb-8 pr-2 pl-2 flex flex-col items-center gap-3 group/popup">
                {/* 닫기 버튼 */}
                <button
                    onClick={() => handleFeedback('later')}
                    className="absolute top-6 right-6 p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 transition-colors z-10"
                >
                    <X size={20} />
                </button>

                {/* 1. 타이틀 영역 */}
                <div className="text-center space-y-1 px-2">
                    <h3 className="text-[18px] font-bold text-black dark:text-white leading-tight">
                        <span className="text-blue-600 dark:text-blue-400">[{targetMovie.title}]</span><br />어떠셨나요?
                    </h3>
                </div>

                {/* 2. 포스터 및 가이드 레이어 영역 */}
                <div
                    ref={swipeContainerRef}
                    className="relative w-full flex flex-col items-center touch-none"
                    style={{ touchAction: 'none' }} // 브라우저 제스처(스크롤, 뒤로가기) 방지
                >
                    {/* 모바일용 스와이프 가이드 (Portal을 사용해 body에 렌더링) */}
                    {showTutorial && isVisible && !isDragging && typeof document !== 'undefined' && createPortal(
                        <div
                            className="md:hidden fixed inset-0 z-[100001] flex flex-col items-center justify-center p-6 bg-black/60 backdrop-blur-[3px] pointer-events-none animate-in fade-in duration-500"
                        >
                            <div className="text-white text-center space-y-6 max-w-[280px]">
                                <p className="text-[16px] font-bold leading-relaxed drop-shadow-xl text-white">
                                    무비서가 추천해준 영화가 <br />별로였다면&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;마음에 드셨다면<br /><span className="text-red-400"><CornerLeftDown className="inline" /> 왼쪽</span><span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><span className="text-green-400">오른쪽<CornerRightDown className="inline" /></span><br />으로 스와이프해주세요!
                                </p>
                            </div>
                        </div>,
                        document.body
                    )}

                    {/* 영화 포스터 - 이제 이 요소만 스와이프됩니다. */}
                    <div
                        className={`
                                relative w-52 h-72 sm:w-60 sm:h-80 flex-shrink-0 md:shadow-2xl overflow-hidden border border-black/5 dark:border-white/10 group
                                z-10 rounded-[20px]
                            `}
                        style={{
                            transform: `translateX(${dragX}px) rotate(${dragX * ROTATION_STRENGTH}deg)`,
                            // opacity: 1 - Math.abs(dragX) / (SWIPE_THRESHOLD * 3), // 스와이프할수록 투명해짐
                            // transition: isDragging ? 'none' : 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.5s',
                        }}
                    >
                        {/* 스와이프 피드백 그라데이션 - 배지 대신 하단부터 올라오는 컬러 오버레이 적용 */}
                        {dragX !== 0 && (
                            <div
                                className="absolute inset-0 z-50 pointer-events-none"
                                style={{
                                    background: dragX > 0
                                        ? 'linear-gradient(to top, rgba(34, 197, 94, 0.61) 0%, rgba(34, 197, 94, 0) 50%)'
                                        : 'linear-gradient(to top, rgba(239, 68, 68, 0.61) 0%, rgba(239, 68, 68, 0) 50%)',
                                    opacity: Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1),
                                }}
                            />
                        )}
                        <img
                            src={targetMovie.posterUrl}
                            alt={targetMovie.title}
                            className="w-full h-full object-cover transition-transform duration-700"
                        />
                    </div>

                    {/* 3. 데스크탑용 클릭 버튼 영역 (Hover 시에만 아래에서 스윽 올라옴) */}
                    <div className="z-20 hidden md:flex absolute -bottom-6 items-center justify-center gap-20 px-4 w-full translate-y-12 pointer-events-none group-hover/popup:opacity-100 group-hover/popup:translate-y-[-7px] group-hover/popup:pointer-events-auto transition-all duration-500 ease-out">
                        {/* 별로예요 버튼 */}
                        <button
                            onClick={() => handleFeedback('bad')}
                            className="group flex flex-col items-center gap-1.5"
                        >
                            <div className="w-14 h-14 rounded-[10px] bg-white/70 dark:bg-gray-800 shadow-xl border border-black/5 dark:border-white/10 flex items-center justify-center transition-all group-hover:scale-110 group-active:scale-95 group-hover:bg-gray-100 dark:group-hover:bg-white/5">
                                <ThumbsDown className="w-8 h-8 stroke-1 invisible group-hover/popup:visible group-hover:visible" />
                            </div>
                        </button>

                        {/* 좋아요 버튼 */}
                        <button
                            onClick={() => handleFeedback('good')}
                            className="group flex flex-col items-center gap-1.5"
                        >
                            <div className="w-14 h-14 rounded-[10px] bg-white/70 dark:bg-gray-800 shadow-xl border border-black/5 dark:border-white/10 flex items-center justify-center transition-all group-hover:scale-110 group-active:scale-95 group-hover:bg-red-50 dark:group-hover:bg-red-500/10">
                                <ThumbsUp className="w-8 h-8 stroke-1 invisible group-hover/popup:visible group-hover:visible" />
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
