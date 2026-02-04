// ============================================================
// [용도] 메인 페이지 - Chatbot과 실험실 버튼
// [사용법] 라우트: /
// ============================================================
// [스타일 수정 가이드]
//
// 1. 페이지 컨테이너
//    - max-w-screen-xl: 최대 너비 1280px
//    - mx-auto: 가로 중앙 정렬
//    - px-4: 좌우 패딩 16px
//    - py-6: 위아래 패딩 24px
//
// 2. 버튼 크기
//    - px-8 py-3: 좌우 32px, 위아래 12px
//    - 더 크게: px-10 py-4 / 더 작게: px-6 py-2
//
// 4. 호버 효과
//    - hover:shadow-2xl: 호버 시 그림자 강조
//    - hover:scale-105: 호버 시 5% 확대
//    - group-hover:translate-x-1: 화살표 오른쪽 이동
// ============================================================

import { useState, useEffect } from 'react';
import Chatbot from '@/services/chatbot/components/Chatbot';
import FloatingBubble from "@/components/ui/FloatingBubble";
import { useAuth } from '@/app/providers/AuthContext';
import LoginModal from '@/services/auth/components/LoginModal/LoginModal';
import OnboardingReminderModal from '@/services/onboarding/components/OnboardingReminderModal';
import MovieDetailModal from '@/services/chatbot/MovieDetailModal/MovieDetailModal';
import SideRecommendationPopup from '@/components/layout/SideRecommendationPopup/SideRecommendationPopup';
import FeedbackPopup from '@/components/layout/FeedbackPopup/FeedbackPopup';
import { useUIStore } from '@/store/useUIStore';
import SEO from '@/components/common/SEO/SEO';
// import GradientText from '@/components/ui/GradientText';

export default function MainPage() {
    const { isAuthenticated, user } = useAuth();
    const isChatbotOpen = useUIStore((state) => state.isChatbotOpen);
    const setIsChatbotOpen = useUIStore((state) => state.setIsChatbotOpen);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showOnboardingReminder, setShowOnboardingReminder] = useState(false);
    const [isTutorialActive, setIsTutorialActive] = useState(false);
    const [tutorialStep, setTutorialStep] = useState(0);
    const [delayedBubbleVisible, setDelayedBubbleVisible] = useState(!isChatbotOpen);

    // 온보딩 리마인더 체크 (DB: completed_at, localStorage: 24시간 체크)
    useEffect(() => {
        if (!isAuthenticated || !user) return;

        // ✅ 온보딩 완료 여부 확인
        const isCompleted = !!(user as any).onboarding_completed;
        if (isCompleted) return;

        // ✅ Step 2: 24시간 체크 (localStorage에서)
        const lastShownKey = `onboarding_reminder_last_shown_user_${user.id}`;
        const lastShownStr = localStorage.getItem(lastShownKey);
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000; // 24시간 (밀리초)

        if (lastShownStr) {
            const lastShown = parseInt(lastShownStr);
            const timeSinceLastShown = now - lastShown;

            if (timeSinceLastShown < oneDay) return;
        } else {
            // ✅ 첫 진입 시 (localStorage 데이터 없음): 타이머만 시작하고 모달 안 띄움
            localStorage.setItem(lastShownKey, now.toString());
            return;
        }

        // ✅ Step 3: 모달 표시 (타이머는 닫을 때 다시 갱신됨)
        setShowOnboardingReminder(true);
    }, [isAuthenticated, user]);

    // 메인 페이지 진입 시 온보딩 플래그 정리 (비정상 종료 시 잔류 방지)
    useEffect(() => {
        if (!showOnboardingReminder) {
            sessionStorage.removeItem('onboarding_in_progress');
            sessionStorage.removeItem('onboarding_from_reminder');
        }
    }, [showOnboardingReminder]);

    // 튜토리얼 체크 및 자동 종료 (온보딩 리마인더가 안 나올 때만 자동 시작/종료)
    useEffect(() => {
        if (!isAuthenticated || !user) return;

        const userId = user.id || (user as any).user_id;
        const tutorialKey = `tutorial_completed_user_${userId}`;
        const isTutorialCompleted = localStorage.getItem(tutorialKey) === 'true';

        // 1. 튜토리얼 종료 로직: 챗봇이 열리면 어떤 상황에서도 튜토리얼 완료 처리
        if (isTutorialActive && isChatbotOpen) {
            localStorage.setItem(tutorialKey, 'true');
            setIsTutorialActive(false);
            return;
        }

        // 2. 튜토리얼 시작 로직: 온보딩 리마인더가 없을 때만 시작 시도
        if (showOnboardingReminder) {
            // 리마인더가 뜨면 진행 중이던 튜토리얼도 잠시 끔 (UI 겹침 방지)
            if (isTutorialActive) setIsTutorialActive(false);
            return;
        }

        if (!isTutorialCompleted && !isChatbotOpen && !isTutorialActive) {
            setIsTutorialActive(true);
            setTutorialStep(0);
        }
    }, [isAuthenticated, user, showOnboardingReminder, isChatbotOpen, isTutorialActive]);

    // 로그아웃 시 챗봇 자동 닫기
    useEffect(() => {
        if (!isAuthenticated && isChatbotOpen) {
            setIsChatbotOpen(false);
        }
    }, [isAuthenticated, isChatbotOpen]);

    // 챗봇 닫기 이벤트 리스너 (Header의 로고 클릭 등)
    useEffect(() => {
        const handleCloseChatbot = () => {
            setIsChatbotOpen(false);
        };

        window.addEventListener('closeChatbot', handleCloseChatbot);
        return () => window.removeEventListener('closeChatbot', handleCloseChatbot);
    }, []);

    // 글로벌 로그인 모달 열기 이벤트 리스너
    useEffect(() => {
        const handleOpenLogin = () => setShowLoginModal(true);
        window.addEventListener('auth:open-login', handleOpenLogin);
        return () => window.removeEventListener('auth:open-login', handleOpenLogin);
    }, []);

    // 챗봇 패널 열기/닫기 시 말풍선 노출 타이밍 동기화
    useEffect(() => {
        if (isChatbotOpen) {
            // 패널이 열리면 말풍선은 즉시 숨김
            setDelayedBubbleVisible(false);
        } else {
            // 패널이 닫히면 캐릭터 복귀 애니메이션(500ms) 후 말풍선 표시
            // [LCP 최적화] 이미 표시 중인 초기 상태(mount)라면 타이머를 건너뜁니다.
            if (delayedBubbleVisible) return;

            const timer = setTimeout(() => {
                setDelayedBubbleVisible(true);
            }, 700);
            return () => clearTimeout(timer);
        }
    }, [isChatbotOpen]);
    // [참고] delayedBubbleVisible은 처음부터 !isChatbotOpen 상태이므로, 
    // 첫 렌더링 시에는 이미 true 상태여서 LCP가 지연되지 않습니다.


    // 챗봇 열기 핸들러 (로그인 체크)
    const handleOpenChatbot = () => {
        if (!isAuthenticated) {
            // 비로그인 시 로그인 모달 표시
            setShowLoginModal(true);
        } else {
            // 로그인 상태면 챗봇 열기
            setIsChatbotOpen(true);
        }
    };

    const handleCloseOnboardingReminder = () => {
        setShowOnboardingReminder(false);

        // ✨ 모달을 닫을 때 24시간 타이머 시작
        const userId = user?.id;
        if (userId) {
            const lastShownKey = `onboarding_reminder_last_shown_user_${userId}`;
            localStorage.setItem(lastShownKey, Date.now().toString());
        }
    };

    return (
        <div className="relative">
            <SEO
                title="무비서"
                description="AI 챗봇이 추천하는 당신만을 위한 영화 가이드, Moviesir입니다."
            >
                {/* 시각적으로는 숨겨져 있지만 검색 엔진을 위한 구조화 데이터 */}
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "WebSite",
                        "name": "Moviesir",
                        "url": "https://moviesir.cloud",
                        "description": "AI 기반 영화 추천 서비스",
                        "potentialAction": {
                            "@type": "SearchAction",
                            "target": "https://moviesir.cloud/?q={search_term_string}",
                            "query-input": "required name=search_term_string"
                        }
                    })}
                </script>
            </SEO>

            {/* 시맨틱 구조를 위한 H1 (sr-only로 시각적 방해 최소화) */}
            <h1 className="sr-only">Moviesir - AI 기반 영화 추천 및 OTT 정보 가이드</h1>

            <main className="flex flex-col items-center max-w-screen-lg mx-auto px-8 py-4">
                {/* 최근 추천 다시보기 사이드 팝업 */}
                <SideRecommendationPopup
                    isChatbotOpen={isChatbotOpen}
                    onOpen={() => setIsChatbotOpen(false)}
                />

                {/* 히어로 타이틀 */}
                {/* [위치 조정 가이드]
                - mt-6: 타이틀을 아래로 24px 이동 (이 값을 바꾸면 타이틀 위치 조정)
                - mb-[-24px]: 아래 요소(챗봇)를 24px 위로 당김 (챗봇 위치 유지)

                [미세 조정 방법]
                타이틀을 더 내리고 싶으면:
                  - mt-8 mb-[-32px]  (32px 내림)
                  - mt-10 mb-[-40px] (40px 내림)

                타이틀을 덜 내리고 싶으면:
                  - mt-4 mb-[-16px]  (16px 내림)
                  - mt-2 mb-[-8px]   (8px 내림)
            */}
                {/* <div className="text-bold text-center mt-6 mb-[-24px] font-jua text-3xl sm:text-4xl lg:text-[80px] leading-[150%] sm:leading-[60%] tracking-[0.01em] text-gray-900 dark:text-white">
                <div className="mb-[-15px] sm:mb-6">
                    <GradientText variant="dark">무비서</GradientText>가 맞춰주는
                </div>
                <div>
                    <GradientText>당신만의 영화</GradientText>
                </div>
            </div> */}

                <div className='max-w-screen-2xl mx-auto relative'>
                    <FloatingBubble
                        position="left"
                        className={`hidden sm:block !min-w-[250px] left-1/2 sm:left-[240px] -translate-x-1/2 bottom-[0px] sm:bottom-[-40px] font-bold text-blue-400 z-floating cursor-pointer ${isTutorialActive && tutorialStep === 0 ? 'tutorial-highlight-target' : ''}`}
                        visible={delayedBubbleVisible}
                        float
                        onClick={handleOpenChatbot}
                    >
                        {isAuthenticated
                            ?
                            <div className="text-center">
                                당신에게 꼭 맞는 영화를 추천드리겠습니다.
                            </div>
                            :
                            <div className="text-center">
                                로그인 이후 서비스 이용이 가능합니다.
                            </div>
                        }
                    </FloatingBubble>
                    <FloatingBubble
                        position="right"
                        className={`
                            !min-w-[220px] right-1/2 sm:right-[-30px]
                            translate-y-[60px] translate-x-1/2
                            sm:-translate-y-[-30px] sm:-translate-x-1/2
                            bottom-[0px] sm:bottom-[-40px]
                            font-bold text-blue-400 z-floating cursor-pointer
                            sm:scale-75
                            ${isTutorialActive && tutorialStep === 0 ? 'tutorial-highlight-target' : ''}
                            `}
                        visible={delayedBubbleVisible}
                        float
                        onClick={() => {
                            if (isTutorialActive) {
                                if (tutorialStep === 0) {
                                    handleOpenChatbot();
                                }
                            } else {
                                handleOpenChatbot();
                            }
                        }}
                    >
                        {isAuthenticated
                            ?
                            <div className="text-center">
                                {/* 모바일: 두 문구 합침 */}
                                <div className="sm:hidden">
                                    당신에게 꼭 맞는<br />영화를 추천드리겠습니다,<br />저를 클릭해서<br />영화 추천을 시작해주세요.
                                </div>
                                {/* 데스크탑: 기존 문구 */}
                                <div className="hidden sm:block">
                                    저를 클릭해서 <br />영화 추천을 시작해주세요.
                                </div>
                            </div>
                            :
                            <div className="text-center">
                                로그인 이후 서비스 이용이 가능합니다.
                            </div>
                        }
                    </FloatingBubble>
                    <Chatbot
                        isOpen={isChatbotOpen}
                        setIsOpen={setIsChatbotOpen}
                        onLoginRequired={() => setShowLoginModal(true)}
                        isTutorialActive={isTutorialActive}
                        tutorialStep={tutorialStep}
                    />
                </div>

                {/* 튜토리얼 배경 오버레이 (캐릭터 강조용) */}
                {isTutorialActive && tutorialStep === 0 && (
                    <div
                        className="tutorial-overlay"
                        onClick={handleOpenChatbot}
                    />
                )}

                {/* 하단 전용 가이드바 (Tutorial Step 0용) */}
                {isTutorialActive && tutorialStep === 0 && (
                    <div className="tutorial-guide-bar">
                        <p className="text-lg font-bold">
                            반가워요! 당신의 여행길을 즐겁게 해드릴 무비서입니다. <br />
                            저를 클릭해서 영화추천을 시작해볼까요?
                        </p>
                    </div>
                )}

                {/* 로그인 모달 */}
            </main>

            {/* 로그인 모달 */}
            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                onSignupClick={() => {
                    setShowLoginModal(false);
                    // 필요시 회원가입 모달 열기
                }}
            />

            {/* 온보딩 리마인더 모달 */}
            <OnboardingReminderModal
                visible={showOnboardingReminder}
                onClose={handleCloseOnboardingReminder}
            />

            {/* 영화 상세 모달 - ChatbotPanel 외부에서 렌더링하여 z-index 문제 해결 */}
            <MovieDetailModal />

            {/* 사용자 만족도 조사 (Feedback Loop) 팝업 */}
            <FeedbackPopup />
        </div >
    );
}
