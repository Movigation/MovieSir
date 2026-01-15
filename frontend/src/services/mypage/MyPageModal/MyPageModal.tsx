// [용도] 마이페이지 메인 모달 컴포넌트
// [사용법] <MyPageModal isOpen={isOpen} onClose={handleClose} userName="User" />
// [주의사항] ESC 키 및 외부 클릭으로 닫힘
// [fullScreen] 모바일에서 전체 화면 모드 (오버레이 제거)

import { useState, useEffect } from 'react';
import { X, LogOut } from 'lucide-react';
import type { MyPageModalProps, MyPageView } from '@/services/mypage/MyPageModal/myPage.types';
import UserProfile from '@/services/mypage/MyPageModal/components/UserProfile';
import MenuList from '@/services/mypage/MyPageModal/components/MenuList';
import { useAuth } from '@/app/providers/AuthContext';
import WatchedMovies from '@/services/mypage/MyPageModal/components/WatchedMovies';
import UserStats from '@/services/mypage/MyPageModal/components/UserStats';
import UserSettings from '@/services/mypage/MyPageModal/components/UserSettings';
import MovieCalendar from '@/services/mypage/MyPageModal/components/MovieCalendar';
import OTTSelection from '@/services/mypage/MyPageModal/components/OTTSelection';

export default function MyPageModal({ isOpen, onClose, userName, fullScreen = false }: MyPageModalProps & { fullScreen?: boolean }) {
    const [currentView, setCurrentView] = useState<MyPageView>('main');
    const { logout } = useAuth();

    // ESC 키로 모달 닫기
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // 모달이 닫힐 때 뷰 초기화
    useEffect(() => {
        if (!isOpen) {
            setCurrentView('main');
        }
    }, [isOpen]);

    // 뷰 변경 핸들러
    const handleViewChange = (view: MyPageView) => {
        setCurrentView(view);
    };

    // 메인 메뉴로 돌아가기
    const handleBackToMain = () => {
        setCurrentView('main');
    };

    // 로그아웃 핸들러
    const handleLogout = async () => {
        if (window.confirm('로그아웃 하시겠습니까?')) {
            console.log('🚪 마이페이지: 로그아웃 실행');
            onClose(); // 우선 모달 닫기
            await logout(); // 실제 로그아웃 처리 (전역 상태 및 스토리지 정리)
        }
    };

    if (!isOpen) return null;

    // 전체 화면 모드 (모바일)
    if (fullScreen) {
        return (
            <div
                /* [디자인] 모달 컨테이너 (전체 화면) */
                className="bg-black dark:bg-gray-900 w-full min-h-screen pb-24 relative flex flex-col z-modal"
            >
                {/* 헤더 (메인 뷰에서만 표시) */}
                {currentView === 'main' && (
                    <>
                        {/* 닫기 버튼 */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-deco"
                            aria-label="닫기"
                        >
                            <X size={24} />
                        </button>

                        {/* 제목 */}
                        <div
                            /* [디자인] 헤더 영역 */
                            className="p-4 text-center border-b border-gray-700"
                        >
                            <h2
                                /* [디자인] 제목 텍스트 */
                                className="text-xl font-bold text-white"
                            >
                                마이페이지
                            </h2>
                        </div>

                        {/* 사용자 프로필 */}
                        <UserProfile userName={userName} />

                        {/* 메뉴 리스트 */}
                        <div
                            /* [디자인] 메뉴 리스트 컨테이너 */
                            /* 모바일에서는 고정 높이 대신 자연스러운 흐름 사용 */
                            className="flex-1"
                        >
                            <MenuList onMenuClick={handleViewChange} />
                        </div>

                        {/* 로그아웃 버튼 (푸터) */}
                        <div
                            /* [디자인] 푸터 영역 */
                            className="p-4 border-t border-gray-700"
                        >
                            <button
                                onClick={handleLogout}
                                /* [디자인] 로그아웃 버튼 */
                                className="w-full flex items-center justify-center gap-2 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                            >
                                <LogOut size={20} />
                                <span className="font-medium">LOGOUT</span>
                            </button>
                        </div>
                    </>
                )}

                {/* 서브 뷰 */}
                {currentView === 'watched' && <WatchedMovies onBack={handleBackToMain} />}
                {currentView === 'stats' && <UserStats onBack={handleBackToMain} />}
                {currentView === 'settings' && <UserSettings onBack={handleBackToMain} />}
                {currentView === 'calendar' && <MovieCalendar onBack={handleBackToMain} />}
                {currentView === 'ott' && <OTTSelection onBack={handleBackToMain} />}
            </div>
        );
    }

    // 데스크톱: 모달 형태
    return (
        <div
            className="fixed inset-0 bg-black/50 z-modal flex items-center justify-center p-4"
        >
            <div
                className="bg-black dark:bg-gray-900 w-[90%] md:w-full max-w-md h-[600px] rounded-xl shadow-2xl relative flex flex-col overflow-hidden"
            >
                {/* 헤더 (메인 뷰에서만 표시) */}
                {currentView === 'main' && (
                    <>
                        {/* 닫기 버튼 */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-deco"
                            aria-label="닫기"
                        >
                            <X size={24} />
                        </button>

                        {/* 제목 */}
                        <div className="p-4 text-center border-b border-gray-700">
                            <h2 className="text-xl font-bold text-white">
                                마이페이지
                            </h2>
                        </div>

                        {/* 사용자 프로필 */}
                        <UserProfile userName={userName} />

                        {/* 메뉴 리스트 */}
                        <div className="flex-1 overflow-y-auto">
                            <MenuList onMenuClick={handleViewChange} />
                        </div>

                        {/* 로그아웃 버튼 (푸터) */}
                        <div className="p-4 border-t border-gray-700">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                            >
                                <LogOut size={20} />
                                <span className="font-medium">LOGOUT</span>
                            </button>
                        </div>
                    </>
                )}

                {/* 서브 뷰 */}
                {currentView === 'watched' && <WatchedMovies onBack={handleBackToMain} />}
                {currentView === 'stats' && <UserStats onBack={handleBackToMain} />}
                {currentView === 'settings' && <UserSettings onBack={handleBackToMain} />}
                {currentView === 'calendar' && <MovieCalendar onBack={handleBackToMain} />}
                {currentView === 'ott' && <OTTSelection onBack={handleBackToMain} />}
            </div>
        </div>
    );
}
