import { useRef, useState, useEffect } from "react";
import ChatbotButton from "@/services/chatbot/components/ChatbotButton";
import ChatbotPanel from "@/services/chatbot/components/ChatbotPanel";
import type { ChatbotProps } from "@/services/chatbot/components/chatbot.types";
import { useAuth } from '@/app/providers/AuthContext';

export default function Chatbot({ isOpen = false, setIsOpen, onLoginRequired }: ChatbotProps & { onLoginRequired?: () => void }) {
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

  // 챗봇 닫힐 때 추천 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setIsRecommended(false);
    }
  }, [isOpen]);

  return (
    <>
      <div className="w-full flex flex-col items-center mt-4 select-none">

        {/* 챗봇 버튼 - 열림/닫힘/추천에 따라 위치 변경 */}
        {/* [반응형 가이드]
            - Tailwind Breakpoints:
              * (기본/모바일): < 640px
              * sm: ≥ 640px (태블릿)
              * lg: ≥ 1024px (데스크톱)
            
            - 닫힘 상태:
              * 모바일: translate-y-[200px]
              * sm 이상: translate-y-60
            
            - 열림 상태 (1차 이동):
              * 모바일: translate-x-[-38vw] -translate-y-[30px] scale-50
              * sm: -translate-x-[300px] -translate-y-[40px] scale-100
            
            - 추천 완료 (2차 이동):
              * 모바일: -translate-x-[7px] translate-y-[calc(100dvh-160px)] (푸터 Home 위치 위)
              * sm: -translate-x-[480px] -translate-y-[-110px] (더 왼쪽)
        */}
        <div
          ref={buttonRef}
          className={`
            ${!isOpen
              ? "transition-all duration-500 ease-out"  // 닫힘 → 열림: 부드럽게
              : isRecommended
                ? "transition-none sm:transition-all sm:duration-500 sm:ease-out"  // 추천 완료: 모바일 즉시, 데스크탑 부드럽게
                : "transition-all duration-500 ease-out"  // 열림: 부드럽게
            }
            ${!isOpen
              ? "translate-y-[200px] sm:translate-y-[150px]"  // 닫힘
              : isRecommended
                ? "-translate-x-[7px] translate-y-[calc(100dvh-120px)] scale-[0.35] z-[60] sm:-translate-x-[300px] sm:translate-y-[110px] sm:scale-100 lg:-translate-x-[480px] lg:translate-y-[110px] lg:scale-100"  // 추천 완료 (2차)
                : "translate-x-[-38vw] -translate-y-[30px] scale-50 sm:-translate-x-[300px] sm:-translate-y-[40px] sm:scale-100"  // 열림 (1차)
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
        onRecommended={setIsRecommended}
      />
    </>
  );
}
