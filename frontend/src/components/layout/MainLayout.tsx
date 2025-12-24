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
        // 모바일: Header는 fixed bottom이므로 레이아웃 흐름에서 제외
        // 데스크톱: Header는 static이므로 flex-col 흐름에 포함
        <div className="relative min-h-screen bg-gray-50 dark:bg-gray-900 text-black dark:text-white w-full">
            {/* 데스크톱: 상단 헤더로 표시, 모바일: fixed bottom으로 오버레이 */}
            <Header isDark={isDark} handleDarkToggle={toggleTheme} resetChatbot={() => { }} />

            <GlowBackground isDark={isDark} />

            {/* main 태그: 시맨틱 HTML5 - 페이지의 주요 콘텐츠 영역 */}
            {/* min-h-screen: 모바일에서 전체 화면 높이 차지 */}
            {/* pb-20 sm:pb-0: 모바일에서 하단 네비게이션 바 여백 */}
            {/* sm:min-h-0: 데스크톱에서는 min-height 제한 제거 */}
            <main className="min-h-screen sm:min-h-0 pb-20 sm:pb-0">
                <Outlet />
            </main>
            {/* <WaveFooter
                title=""
                description=""
            /> */}
        </div>
    );
}
