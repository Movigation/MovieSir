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

  // 챗봇 버튼 영역 스크롤 방지
  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    button.addEventListener('wheel', handleWheel, { passive: false });
    return () => button.removeEventListener('wheel', handleWheel);
  }, []);

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

        {/* 챗봇 버튼 외부 컨테이너 (위치만 담당, transform 없음) */}
        <div
          ref={buttonRef}
          className={`
            ${!isOpen
              ? "transition-all duration-500 ease-out"
              : isRecommended
                ? "transition-none sm:transition-all sm:duration-500 sm:ease-out"
                : "transition-all duration-500 ease-out"
            }
            ${!isOpen
              ? "translate-y-[200px] sm:translate-y-[150px]"
              : isRecommended
                ? "-translate-x-[5px] translate-y-[calc(100dvh-120px)] z-[60] sm:-translate-x-[300px] sm:translate-y-[110px] lg:-translate-x-[480px] lg:translate-y-[110px]"
                : "-translate-x-[5px] translate-y-[calc(100dvh-120px)] z-[60] sm:-translate-x-[300px] sm:-translate-y-[40px]"
            /* ↑ fixed (transform 없음!) + 데스크탑은 relative로 복원 */
            }
          `}
        >
          {/* 챗봇 버튼 내부 컨테이너 (scale만 담당) */}
          <div className={`
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
