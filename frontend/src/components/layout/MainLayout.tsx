// [용도] 공통 레이아웃 - Header와 콘텐츠 영역
// [사용법] Routes에서 element로 사용

import { Outlet } from 'react-router-dom';
import Header from '@/components/layout/Header';
import GlowBackground from '@/components/effects/GlowBackground';
import { useTheme } from '@/app/providers/ThemeContext';
// import { WaveFooter } from '@/components/layout/Footer';

export default function MainLayout() {
    const { isDark, toggleTheme } = useTheme();

    return (
        // ===== 반응형 웹 표준: 레이아웃 컨테이너 =====
        // flex flex-col: 세로 방향 플렉스 컨테이너
        // min-h-screen: 최소 높이를 화면 전체로 설정
        // w-full: 가로 너비 100% (모든 기기에서 전체 너비 사용)
        // 
        // 반응형 브레이크포인트 (TailwindCSS 기본값):
        // - Mobile: 기본 (0px ~ 640px)
        // - Tablet: sm: (640px ~ 768px), md: (768px ~ 1024px)
        // - Desktop: lg: (1024px ~ 1280px), xl: (1280px ~ 1536px), 2xl: (1536px+)
        <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 text-black dark:text-white w-full">
            <Header isDark={isDark} handleDarkToggle={toggleTheme} resetChatbot={() => { }} />
            <GlowBackground isDark={isDark} />
            {/* main 태그: 시맨틱 HTML5 - 페이지의 주요 콘텐츠 영역 */}
            {/* flex-1: 남은 공간을 모두 차지하여 푸터가 항상 하단에 위치하도록 함 */}
            <main className="flex-1">
                <Outlet />
            </main>
            {/* <WaveFooter
                title=""
                description=""
            /> */}
        </div>
    );
}
