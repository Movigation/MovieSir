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
}: ChatbotProps & { onLoginRequired?: () => void }) {
  const prevIsOpenRef = useRef(isOpen);
  const { isAuthenticated } = useAuth();
  const isDark = document.documentElement.classList.contains("dark");

  // [상태] 추천 완료 여부 (2단계 위치 이동용)
  const [isRecommended, setIsRecommended] = useState(false);
  // [상태] 원위치 복귀 시 투명화 (순간이동 효과)
  const [isTeleporting, setIsTeleporting] = useState(false);

  // [반응형] 챗봇 버튼 ref (애니메이션용)
  const buttonRef = useRef<HTMLDivElement>(null);

  // [챗봇 버튼 클릭 핸들러] 토글
  const handleChatbotButtonClick = () => {
    if (isOpen) {
      // setIsTeleporting(true)와 setTimeout 로직은 제거해도 됩니다.
      setIsOpen?.(false);
      setIsRecommended(false);
    } else if (!isAuthenticated) {
      onLoginRequired?.();
    } else {
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

  useEffect(() => {
    // 조건: 이전에 열려있었고(true), 지금 닫혔다면(false)
    if (prevIsOpenRef.current === true && isOpen === false) {
      setIsTeleporting(true);

      // 500ms 후 다시 보이게 처리
      const timer = setTimeout(() => {
        setIsTeleporting(false);
      }, 500);

      return () => clearTimeout(timer);
    }

    // 매 렌더링 끝에 현재 상태를 Ref에 업데이트
    prevIsOpenRef.current = isOpen;
  }, [isOpen]); // isOpen이 바뀔 때마다 실행

  return (
    <>
      {/* 부모 컨테이너 */}
      <div className="w-full flex flex-col items-center mt-4 select-none">

        {/* 챗봇 버튼 외부 컨테이너 (스티키 위치 제어) */}
        <div
          ref={buttonRef}
          className={`
              inline-block w-28 h-28
              transition-all ease-out
              ${isTeleporting ? "duration-0 opacity-0 scale-0" : "duration-500 opacity-100 scale-100"}
            ${isTutorialActive && tutorialStep === 0 ? 'tutorial-highlight-target' : ''}
            ${!isOpen
              ? "relative translate-y-[200px] sm:translate-y-[150px] sm:translate-x-0"
              : isRecommended
                ? "fixed bottom-[-25px] left-1/2 -translate-x-1/2 z-chatbot-btn sm:relative sm:top-0 sm:bottom-auto sm:left-auto sm:translate-x-[-306px] sm:translate-y-[-20px] xl:translate-x-[-600px] xl:translate-y-[-20px] 2xl:translate-y-[-20px]"
                : "fixed bottom-[-25px] left-1/2 -translate-x-1/2 z-chatbot-btn sm:relative sm:top-0 sm:bottom-auto sm:left-auto sm:translate-x-[-306px] sm:translate-y-[-20px] xl:translate-x-[-306px] xl:translate-y-[-20px] 2xl:translate-y-[-20px]"
            }
          `}
        >
          {/* 챗봇 버튼 내부 컨테이너 (scale만 담당) */}
          <div
            className={`
              inline-block w-28
              ${!isOpen
                ? ""
                : isRecommended
                  ? "scale-[0.35] sm:scale-100"
                  : "scale-[0.35] sm:scale-100"
              }
            `}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
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
