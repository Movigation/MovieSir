import { useRef, useState, useEffect } from "react";
import ChatbotButton from "@/services/chatbot/components/ChatbotButton";
import ChatbotPanel from "@/services/chatbot/components/ChatbotPanel";
import type { ChatbotProps } from "@/services/chatbot/components/chatbot.types";
import { useAuth } from '@/app/providers/AuthContext';

export default function Chatbot({ isOpen = false, setIsOpen, onLoginRequired }: ChatbotProps & { onLoginRequired?: () => void }) {
  const { isAuthenticated } = useAuth();
  const isDark = document.documentElement.classList.contains("dark");

  // [반응형] 챗봇 버튼 ref (애니메이션용)
  const buttonRef = useRef<HTMLDivElement>(null);

  // [반응형] 모바일/타블렛 감지
  // [수정 가이드] breakpoint 변경 시 여기와 tailwind.config.js의 값을 함께 수정
  // - 모바일: < 768px
  // - 타블렛: 768px ~ 1024px
  // - 데스크탑: ≥ 1024px
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // [반응형] 화면 크기 변화 감지
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    // 초기 체크
    checkScreenSize();

    // resize 이벤트 리스너
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // [챗봇 버튼 위치] 동적 계산계산
  // [수정 가이드]
  // - 데스크탑 (≥1024px): -translate-x-[400px] 값 조정 (현재 400px)
  // - 타블렛 (768px~1024px): -translate-x-[250px] 값 조정 (현재 250px, 안 짤리게)
  // - 모바일 (<768px): -translate-x-[30vw] 값 조정 (현재 30vw)
  // - 모바일 scale: scale-75 조정 (현재 75%, 더 작게 하려면 scale-50 등)
  const getButtonTransform = () => {
    if (!isOpen) return "translate-y-20";  // 닫힘: 기본 위치

    if (isMobile) {
      // 모바일: 좌상단으로 작아지며 이동
      return "translate-x-[-30vw] translate-y-[-120px] scale-75";
    } else if (isTablet) {
      // 타블렛: 적당히 왼쪽으로 이동 (안 짤리게)
      return "-translate-x-[300px] translate-y-[-30px]";
    } else {
      // 데스크탑: 왼쪽으로 많이 이동
      return "-translate-x-[400px] translate-y-[-30px]";
    }
  };

  // 챗봇 버튼 클릭 핸들러 (토글)
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
      <div className="w-full flex flex-col items-center mt-16 select-none relative">

        {/* 챗봇 버튼 - 열림/닫힘에 따라 위치 변경 */}
        <div
          ref={buttonRef}
          className={`
            z-floating
            transition-all duration-500 ease-out transform
            ${getButtonTransform()}`}
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
        isMobile={isMobile}
        isTablet={isTablet}
      />
    </>
  );
}
