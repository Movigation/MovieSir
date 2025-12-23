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
// import GradientText from '@/components/ui/GradientText';

export default function MainPage() {
    const { isAuthenticated, user } = useAuth();
    // ✅ JWT 토큰 기반 인증: userId는 백엔드가 토큰에서 추출
    // useMovieStore에서 userId 관리 제거 (불필요)
    const [isChatbotOpen, setIsChatbotOpen] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showOnboardingReminder, setShowOnboardingReminder] = useState(false);

    // 온보딩 리마인더 체크 (DB: completed_at, localStorage: 24시간 체크)
    useEffect(() => {
        console.log('=== 온보딩 리마인더 모달 체크 ===');
        console.log('isAuthenticated:', isAuthenticated);
        console.log('user:', user);

        if (!isAuthenticated || !user) {
            console.log('❌ 로그인하지 않음');
            return;
        }

        // ✅ Step 1: 온보딩 완료 여부 확인
        const isCompleted = !!(user as any).onboarding_completed || !!user.profile?.onboarding_completed_at;
        console.log('  - onboarding_completed:', (user as any).onboarding_completed);
        console.log('  - onboarding_completed_at:', user.profile?.onboarding_completed_at);
        console.log('  - 완료 여부:', isCompleted);

        if (isCompleted) {
            console.log('✅ 온보딩 완료 - 리마인더 표시 안 함');
            return;
        }

        // ✅ Step 2: 24시간 체크 (localStorage에서)
        const lastShownKey = `onboarding_reminder_last_shown_user_${user.id}`;
        const lastShownStr = localStorage.getItem(lastShownKey);
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000; // 24시간 (밀리초)

        if (lastShownStr) {
            const lastShown = parseInt(lastShownStr);
            const timeSinceLastShown = now - lastShown;
            const hoursRemaining = Math.ceil((oneDay - timeSinceLastShown) / (60 * 60 * 1000));

            console.log('  - 마지막 표시 시간 (localStorage):', new Date(lastShown).toLocaleString());
            console.log('  - 경과 시간:', Math.floor(timeSinceLastShown / (60 * 60 * 1000)), '시간');

            if (timeSinceLastShown < oneDay) {
                console.log(`❌ 24시간 이내 (${hoursRemaining}시간 후 다시 표시)`);
                return;
            }
        }

        // ✅ Step 3: 모달 표시
        console.log('🎉 모달 표시! (온보딩 미완료 + 24시간 경과)');
        setShowOnboardingReminder(true);

        // localStorage에 현재 시간 저장
        localStorage.setItem(lastShownKey, now.toString());
        console.log('  - localStorage 업데이트:', new Date(now).toLocaleString());
    }, [isAuthenticated, user]);

    // 로그아웃 시 챗봇 자동 닫기
    useEffect(() => {
        if (!isAuthenticated && isChatbotOpen) {
            console.log('🔒 로그아웃 감지 - 챗봇 패널 닫기');
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
    };

    const handlePermanentDismissOnboardingReminder = () => {
        // 온보딩을 완료하면 자동으로 리마인더가 표시되지 않음
        // 여기서는 단순히 모달만 닫음
        setShowOnboardingReminder(false);
        console.log('ℹ️ 온보딩을 완료하시면 리마인더가 표시되지 않습니다');
    };

    return (
        <div className="flex flex-col items-center max-w-screen-xl mx-auto px-8 py-4">
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
                    className="hidden sm:block !min-w-[250px] left-1/2 sm:left-[240px] -translate-x-1/2 bottom-[0px] sm:bottom-[-40px] font-bold text-blue-400 z-floating cursor-pointer"
                    visible={!isChatbotOpen}
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
                    className="
                            !min-w-[220px] right-1/2 sm:right-[-30px]
                            translate-y-[60px] translate-x-1/2
                            sm:-translate-y-[-30px] sm:-translate-x-1/2 
                            bottom-[0px] sm:bottom-[-40px] 
                            font-bold text-blue-400 z-floating cursor-pointer
                            sm:scale-75
                            "
                    visible={!isChatbotOpen}
                    float
                    onClick={handleOpenChatbot}
                >
                    {isAuthenticated
                        ?
                        <div className="text-center">
                            {/* 모바일: 두 문구 합침 */}
                            <div className="sm:hidden">
                                당신에게 꼭 맞는<br />
                                영화를 추천드리겠습니다,<br />
                                저를 클릭해서<br />
                                영화 추천을 시작해주세요.
                            </div>
                            {/* 데스크탑: 기존 문구 */}
                            <div className="hidden sm:block">
                                저를 클릭해서 <br />
                                영화 추천을 시작해주세요.
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
                />
            </div>

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
                onPermanentDismiss={handlePermanentDismissOnboardingReminder}
            />

            {/* 영화 상세 모달 - ChatbotPanel 외부에서 렌더링하여 z-index 문제 해결 */}
            <MovieDetailModal />
        </div >
    );
}
