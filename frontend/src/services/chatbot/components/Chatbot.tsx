import { useRef, useState, useEffect } from "react";
import ChatbotButton from "@/services/chatbot/components/ChatbotButton";
import ChatbotPanel from "@/services/chatbot/components/ChatbotPanel";
import type { ChatbotProps } from "@/services/chatbot/components/chatbot.types";
import { useAuth } from '@/app/providers/AuthContext';

export default function Chatbot({
  isOpen = false,
  setIsOpen,
  onLoginRequired,
  isTutorialActive,
  tutorialStep
}: ChatbotProps & { onLoginRequired?: () => void; isTutorialActive?: boolean; tutorialStep?: number }) {
  const { isAuthenticated } = useAuth();
  const isDark = document.documentElement.classList.contains("dark");

  // [상태] 추천 완료 여부 (2단계 위치 이동용)
  const [isRecommended, setIsRecommended] = useState(false);

  // [반응형] 챗봇 버튼 ref (애니메이션용)
  const buttonRef = useRef<HTMLDivElement>(null);

  // [챗봇 버튼 클릭 핸들러] 토글
  const handleChatbotButtonClick = () => {
    if (isOpen) {
      // 이미 열려있으면 닫기
      setIsOpen?.(false);
      setIsRecommended(false);  // 추천 상태 초기화
    } else if (!isAuthenticated) {
      // 비로그인 시 로그인 모달 표시
      onLoginRequired?.();
    } else {
      // 로그인 상태면 챗봇 열기
      setIsOpen?.(true);
    }
  };

  // 챗봇 버튼 영역 스크롤 방지 (모바일에서만)
  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    // 챗봇 패널이 열려있으면 wheel 차단 안 함
    if (isOpen) return;

    const handleWheel = (e: WheelEvent) => {
      // 모바일(640px 미만)에서만 차단, 데스크탑/태블릿은 통과
      const isMobile = window.innerWidth < 640;
      if (isMobile) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    button.addEventListener('wheel', handleWheel, { passive: false });
    return () => button.removeEventListener('wheel', handleWheel);
  }, [isOpen]);

  // 챗봇 닫힐 때 추천 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setIsRecommended(false);
    }
  }, [isOpen]);

  return (
    <>
      {/* 부모 컨테이너 */}
      <div className="w-full flex flex-col items-center mt-4 select-none">

        {/* 챗봇 버튼 외부 컨테이너 (스티키 위치 제어) */}
        <div
          ref={buttonRef}
          className={`
            inline-block w-28 h-28
            transition-all duration-500 ease-out
            ${isTutorialActive && tutorialStep === 0 ? 'tutorial-highlight-target' : ''}
            ${!isOpen
              ? "relative translate-y-[200px] sm:translate-y-[150px]"
              : isRecommended
                // 추천 상태일 때는 버튼이 화면 중앙 아래에 고정 (모바일)
                ? "fixed bottom-[-25px] sm:top-[15%] lg:top-[15%] xl:top-[15%] 2xl:top-[7%] left-1/2 -translate-x-1/2 z-[60] sm:left-1/2 lg:left-1/2 xl:left-1/2 2xl:left-1/2 sm:ml-[-40%] lg:ml-[-43%] xl:ml-[-40%] 2xl:ml-[-17%]"
                : "fixed bottom-[-25px] sm:top-[15%] lg:top-[15%] xl:top-[15%] 2xl:top-[7%] left-1/2 -translate-x-1/2 z-[60] sm:left-1/2 lg:left-1/2 xl:left-1/2 2xl:left-1/2 sm:ml-[-40%] lg:ml-[-30%] xl:ml-[-23%] 2xl:ml-[-12%]"
            }
          `}
        >
          {/* 챗봇 버튼 내부 컨테이너 (scale만 담당) */}
          <div className={`
            inline-block w-28
            ${!isOpen
              ? ""
              : isRecommended
                ? "scale-[0.35] sm:scale-100"
                : "scale-[0.35] sm:scale-100"
            }
          `}>
            <ChatbotButton
              isDark={isDark}
              onClick={handleChatbotButtonClick}
            />
          </div>
        </div>
      </div>

      {/* 패널 */}
      <ChatbotPanel
        isOpen={isOpen}
        onClose={() => setIsOpen?.(false)}
        onRecommended={setIsRecommended}
      />
    </>
  );
}
