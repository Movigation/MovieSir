import { useState } from "react";
import { AuthProvider } from "@/app/providers/AuthContext";
import { ThemeProvider } from "@/app/providers/ThemeContext";
import AppRoutes from '@/router/AppRoutes';
import Toast from "@/components/ui/Toast";
import { HelmetProvider } from 'react-helmet-async';
import ErrorBoundary from "@/components/common/ErrorBoundary";
import IntroScreen from "@/components/IntroScreen/IntroScreen";

const INTRO_SEEN_KEY = 'moviesir_intro_seen';

function App() {
  const [showIntro, setShowIntro] = useState(() => {
    // localStorage에서 인트로를 본 적 있는지 확인
    return !localStorage.getItem(INTRO_SEEN_KEY);
  });

  const handleIntroComplete = () => {
    // 인트로 완료 시 localStorage에 저장
    localStorage.setItem(INTRO_SEEN_KEY, 'true');
    setShowIntro(false);
  };

  return (
    <HelmetProvider>
      <ThemeProvider>
        <AuthProvider>
          {showIntro && <IntroScreen onComplete={handleIntroComplete} />}
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
          <Toast />
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  )
}

export default App
