// [용도] 애플리케이션의 모든 라우팅 정의
// [사용법] App.tsx에서 <AppRoutes />로 사용

import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import ProtectedRoute from '@/app/routes/ProtectedRoute';

// Pages
import MainPage from '@/pages/MainPage';
import MyPage from '@/pages/MyPage';
import Error400Page from '@/pages/Error400Page';
import Error423Page from '@/pages/Error423Page';
import Error500Page from '@/pages/Error500Page';
import OTTSelectionPage from '@/pages/OTTSelectionPage';
import MovieSelectionPage from '@/pages/MovieSelectionPage';
import OnboardingCompletePage from '@/pages/OnboardingCompletePage';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import TmdbSyncPage from '@/pages/admin/TmdbSyncPage';
import PopularityUpdatePage from '@/pages/admin/PopularityUpdatePage';
import LearningMonitorPage from '@/pages/admin/LearningMonitorPage';
import VectorRetrainPage from '@/pages/admin/VectorRetrainPage';
import TagModelRetrainPage from '@/pages/admin/TagModelRetrainPage';

// 스크롤 복원 컴포넌트
function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
}

export default function AppRoutes() {
    return (
        <>
            {/* 페이지 전환 시 스크롤을 맨 위로 복원 */}
            <ScrollToTop />

            <Routes>
                {/* 메인 레이아웃을 사용하는 라우트들 */}
                <Route element={<MainLayout />}>
                    {/* URL: / - 메인 페이지 */}
                    <Route path="/" element={<MainPage />} />

                    {/* 보호된 라우트 - 로그인 필요 */}
                    <Route element={<ProtectedRoute />}>
                        {/* URL: /mypage - 마이페이지 (모달 스타일) */}
                        <Route path="/mypage" element={<MyPage />} />
                    </Route>
                </Route>

                {/* Onboarding Flow */}
                <Route path="/onboarding/ott" element={<OTTSelectionPage />} />
                <Route path="/onboarding/movies" element={<MovieSelectionPage />} />
                <Route path="/onboarding/complete" element={<OnboardingCompletePage />} />

                {/* Admin Dashboard - 메인만 사이드바 포함 */}
                <Route path="/admin" element={<AdminDashboard />} />

                {/* Admin 기능 페이지 - 독립 페이지로 표시 */}
                <Route path="/admin/tmdb-sync" element={<TmdbSyncPage />} />
                <Route path="/admin/popularity" element={<PopularityUpdatePage />} />
                <Route path="/admin/learning-monitor" element={<LearningMonitorPage />} />
                <Route path="/admin/vector-retrain" element={<VectorRetrainPage />} />
                <Route path="/admin/tag-retrain" element={<TagModelRetrainPage />} />

                {/* Error pages */}
                <Route path="/error/400" element={<Error400Page />} />
                <Route path="/error/423" element={<Error423Page />} />
                <Route path="/error/500" element={<Error500Page />} />
            </Routes>
        </>
    );
}
