import { useRef } from "react";
import ChatbotButton from "@/services/chatbot/components/ChatbotButton";
import ChatbotPanel from "@/services/chatbot/components/ChatbotPanel";
import type { ChatbotProps } from "@/services/chatbot/components/chatbot.types";
import { useAuth } from '@/app/providers/AuthContext';

export default function Chatbot({ isOpen = false, setIsOpen, onLoginRequired }: ChatbotProps & { onLoginRequired?: () => void }) {
  const { isAuthenticated } = useAuth();
  const isDark = document.documentElement.classList.contains("dark");

  // [반응형] 챗봇 버튼 ref (애니메이션용)
  const buttonRef = useRef<HTMLDivElement>(null);

  // [챗봇 버튼 클릭 핸들러] 토글
  const handleChatbotButtonClick = () => {
    if (isOpen) {
      // 이미 열려있으면 닫기
      setIsOpen?.(false);
    } else if (!isAuthenticated) {
      // 비로그인 시 로그인 모달 표시
      onLoginRequired?.();
    } else {
      // 로그인 상태면 챗봇 열기
      setIsOpen?.(true);
    }
  };

  return (
    <>
      <div className="w-full flex flex-col items-center mt-4 select-none relative">

        {/* 챗봇 버튼 - 열림/닫힘에 따라 위치 변경 */}
        {/* [반응형 가이드]
            - Tailwind Breakpoints:
              * (기본/모바일): < 640px
              * sm: ≥ 640px (태블릿)
              * lg: ≥ 1024px (데스크탑)
            
            - 닫힘 상태:
              * 모바일: translate-y-[200px]
              * sm 이상: translate-y-60
            
            - 열림 상태:
              * 모바일: translate-x-[-35vw] translate-y-[-90px] scale-50
              * sm: -translate-x-[300px] translate-y-[-30px] scale-100
              * lg: -translate-x-[400px]
        */}
        <div
          ref={buttonRef}
          className={`
            z-floating
            transition-all duration-500 ease-out transform sm:translate-y-[150px] lg:translate-y-[150px] translate-y-[150px]
            ${isOpen
              ? `translate-x-[-38vw] translate-y-[-35px] scale-50
                 sm:-translate-x-[300px] sm:translate-y-[-30px] sm:scale-100
                 lg:-translate-x-[400px]`
              : "translate-y-[200px] sm:translate-y-60"
            }
          `}
        >
          <ChatbotButton
            isDark={isDark}
            onClick={handleChatbotButtonClick}
          />
        </div>
      </div>

      {/* 패널 */}
      <ChatbotPanel
        isOpen={isOpen}
        onClose={() => setIsOpen?.(false)}
      />
    </>
  );
}
