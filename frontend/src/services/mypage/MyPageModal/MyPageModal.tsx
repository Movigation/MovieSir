import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LogOut } from 'lucide-react';
import CloseButton from '@/components/ui/CloseButton';
import type { MyPageModalProps, MyPageView } from '@/services/mypage/MyPageModal/myPage.types';
import UserProfile from '@/services/mypage/MyPageModal/components/UserProfile';
import MenuList from '@/services/mypage/MyPageModal/components/MenuList';
import { useAuth } from '@/app/providers/AuthContext';
import WatchedMovies from '@/services/mypage/MyPageModal/components/WatchedMovies';
import UserStats from '@/services/mypage/MyPageModal/components/UserStats';
import UserSettings from '@/services/mypage/MyPageModal/components/UserSettings';
import OTTSelection from '@/services/mypage/MyPageModal/components/OTTSelection';

export default function MyPageModal({ isOpen, onClose, userName, fullScreen = false }: MyPageModalProps & { fullScreen?: boolean }) {
    const [currentView, setCurrentView] = useState<MyPageView>('main');
    const { logout } = useAuth();

    // ESC 키로 모달 닫기 및 스크롤 잠금
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleEscape);
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleEscape);
        };
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

    // Portal을 통해 document.body에 렌더링 (최상위 레이어 보장)
    return createPortal(
        <>
            {fullScreen ? (
                /* 1. 모바일: 전체 화면 모드 (헤더를 완전히 덮음) */
                <div
                    className="fixed inset-0 bg-white dark:bg-gray-900 w-full h-full overflow-y-auto pb-24 flex flex-col z-modal"
                >
                    {/* 헤더 (메인 뷰에서만 표시) */}
                    {currentView === 'main' && (
                        <>
                            {/* 닫기 버튼 */}
                            <CloseButton
                                onClose={onClose}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors z-deco"
                                aria-label="닫기"
                            />

                            {/* 제목 */}
                            <div className="p-4 text-center border-b border-gray-100 dark:border-gray-700">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    마이페이지
                                </h2>
                            </div>

                            {/* 사용자 프로필 */}
                            <UserProfile userName={userName} />

                            {/* 메뉴 리스트 */}
                            <div className="flex-1">
                                <MenuList onMenuClick={handleViewChange} />
                            </div>

                            {/* 로그아웃 버튼 (푸터) */}
                            <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
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
                    {currentView === 'ott' && <OTTSelection onBack={handleBackToMain} />}
                </div>
            ) : (
                /* 2. 데스크톱: 모달 형태 (반투명 배경 + 중앙 배치) */
                <div
                    className="fixed inset-0 bg-black/50 z-modal flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <div
                        className="bg-white dark:bg-gray-900 w-full max-w-md h-[600px] rounded-xl shadow-2xl relative flex flex-col overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 헤더 (메인 뷰에서만 표시) */}
                        {currentView === 'main' && (
                            <>
                                {/* 닫기 버튼 */}
                                <CloseButton
                                    onClose={onClose}
                                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors z-deco"
                                    aria-label="닫기"
                                />

                                {/* 제목 */}
                                <div className="p-4 text-center border-b border-gray-100 dark:border-gray-700">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
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
                                <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
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
                        {currentView === 'ott' && <OTTSelection onBack={handleBackToMain} />}
                    </div>
                </div>
            )}
        </>,
        document.body
    );
}
