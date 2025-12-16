// [용도] 애플리케이션 헤더 컴포넌트


import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { HelpCircle, LogIn, User, LogOut, Moon, Sun } from 'lucide-react';
// import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import LoginModal from "@/services/auth/components/LoginModal/LoginModal";
import SignupModal from "@/services/auth/components/SignupModal/SignupModal";
import ForgotPasswordModal from "@/services/auth/components/ForgotPasswordModal/ForgotPasswordModal";
import type { HeaderProps } from "@/components/layout/Header/header.types";
import { useAuth } from "@/app/providers/AuthContext";

export default function Header({ isDark, handleDarkToggle, resetChatbot }: HeaderProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isHelpOpen, setHelpOpen] = useState(false);
  const [isLoginOpen, setLoginOpen] = useState(false);
  const [isSignupOpen, setSignupOpen] = useState(false);
  const [isForgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  // AuthContext에서 인증 상태 가져오기
  const { isAuthenticated, logout } = useAuth();

  // URL 파라미터로 비밀번호 찾기 모달 열기
  useEffect(() => {
    if (searchParams.get('forgot-password') === 'true') {
      setForgotPasswordOpen(true);
      // URL에서 파라미터 제거
      searchParams.delete('forgot-password');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  // 로그아웃 핸들러
  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      logout();
      resetChatbot();
    }
  };

  return (
    <header
      /* [디자인] 헤더 컨테이너 */
      /* w-full: 전체 너비 */
      /* px-5 py-3: 좌우 여백 20px, 위아래 여백 12px */
      /* flex items-center justify-between: 좌우 양쪽 정렬 (로고 왼쪽, 메뉴 오른쪽) */
      /* bg-white: 흰색 배경 (라이트 모드) */
      /* dark:bg-gray-900: 다크모드에서 어두운 배경 */
      /* transition-colors duration-300: 배경색 변화 애니메이션 (0.3초) */
      className="w-full px-4 py-4 sm:px-5 sm:py-3 flex items-center justify-between bg-transparent dark:bg-transparent z-nav"
    >
      {/* 로고 */}
      <div
        /* [디자인] 로고 텍스트 */
        /* text-xl: 모바일 (20px) */
        /* sm:text-2xl: 태블릿 이상 (24px) */
        /* text-blue-400: 파란색 텍스트 (브랜드 색상 변경 가능) */
        /* font-bold: 굵은 글씨 */
        /* cursor-pointer: 마우스 커서를 포인터로 변경 (클릭 가능 표시) */
        className="text-xl sm:text-2xl text-blue-400 font-bold cursor-pointer "
        onClick={() => {
          // 챗봇 닫기 이벤트 발생
          window.dispatchEvent(new CustomEvent('closeChatbot'));
          // 메인 페이지로 이동
          navigate('/');
          resetChatbot();
        }}
      >
        MOVISIR {/* 로고 텍스트 변경 가능 */}
      </div>

      {/* 메뉴 */}
      <div
        /* [디자인] 메뉴 컨테이너 */
        /* flex items-center: 가로 방향으로 요소 배치하고 세로 중앙 정렬 */
        className="flex items-center gap-4 sm:gap-4"
      >
        {/* 도움말 */}
        <button
          onClick={() => setHelpOpen(true)}
          className="text-l sm:text-l font-medium hover:scale-105 text-gray-900 dark:text-white transition-colors transition-transform flex items-center gap-1"
        >
          <HelpCircle size={20} className="sm:hidden" />
          <span className="hidden sm:inline">도움말</span>
        </button>

        {/* 로그인 또는 마이페이지 + 로그아웃 */}
        {!isAuthenticated ? (
          <>
            <button
              onClick={() => setLoginOpen(true)}
              className="text-l sm:text-l font-medium hover:scale-105 text-gray-900 dark:text-white transition-colors transition-transform flex items-center gap-1"
            >
              <LogIn size={20} className="sm:hidden" />
              <span className="hidden sm:inline">로그인</span>
            </button>
            <button
              onClick={() => setSignupOpen(true)}
              className="text-l sm:text-l font-medium hover:scale-105 text-gray-900 dark:text-white transition-colors transition-transform flex items-center gap-1"
            >
              <User size={20} className="sm:hidden" />
              <span className="hidden sm:inline">회원가입</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => navigate('/mypage')}
              className="text-l sm:text-l font-medium hover:scale-105 text-gray-900 dark:text-white transition-colors transition-transform flex items-center gap-1"
            >
              <User size={20} className="sm:hidden" />
              <span className="hidden sm:inline">마이페이지</span>
            </button>
            <button
              onClick={handleLogout}
              className="text-l sm:text-sm font-medium px-2 py-1 sm:px-3 sm:py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all hover:scale-105 flex items-center gap-1"
            >
              <LogOut size={20} className="sm:hidden" />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          </>
        )}

        {/* 다크모드 토글 */}
        <button
          onClick={handleDarkToggle}
          /* [디자인] 다크모드 토글 버튼 */
          /* text-lg: 모바일 크기 */
          /* sm:text-xl: 태블릿 이상 크기 */
          /* p-1.5: 모바일 내부 여백 */
          /* sm:p-2: 태블릿 이상 내부 여백 */
          /* rounded-lg: 모서리를 둥글게 */
          /* hover:animate-spin: 마우스 올리면 회전 애니메이션 */
          className="text-lg sm:text-xl p-1.5 sm:p-2 rounded-lg hover:animate-spin text-gray-900 dark:text-white transition-colors"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />} {/* 다크모드: 달, 라이트모드: 해 */}
        </button>
      </div>

      {/* 도움말 모달 */}
      <Modal isOpen={isHelpOpen} onClose={() => setHelpOpen(false)}>
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">도움말</h2>
          <div className="space-y-4 text-gray-700 dark:text-gray-300">
            <p className="leading-relaxed">
              <strong className="text-gray-900 dark:text-white">MOVISIR</strong>에 오신 것을 환영합니다!
            </p>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">주요 기능</h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>AI 챗봇을 통한 맞춤 영화 추천</li>
                <li>시청 시간, 장르 등 다양한 필터 지원</li>
                <li>영화 상세 정보 확인</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">사용 방법</h3>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>로그인 후 챗봇 버튼을 클릭하세요</li>
                <li>원하는 조건을 선택하세요</li>
                <li>AI가 추천하는 영화를 확인하세요</li>
              </ol>
            </div>
          </div>
        </div>
      </Modal>

      {/* 로그인 모달 */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setLoginOpen(false)}
        onSignupClick={() => {
          setLoginOpen(false);
          setSignupOpen(true);
        }}
      />

      {/* 회원가입 모달 */}
      <SignupModal
        isOpen={isSignupOpen}
        onClose={() => setSignupOpen(false)}
      />

      {/* 비밀번호 찾기 모달 */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
      />
    </header>
  );
}
