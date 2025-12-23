// [용도] 온보딩 플로우 보호 - 온보딩 데이터가 있어야만 접근 가능
// [사용법] <Route element={<OnboardingProtectedRoute />}><Route path="/onboarding/complete" ... /></Route>

import { Navigate, Outlet } from 'react-router-dom';
import { useOnboardingStore } from '@/store/useOnboardingStore';

export default function OnboardingProtectedRoute() {
    const { provider_ids, movie_ids } = useOnboardingStore();

    // 온보딩 데이터가 있는지 확인
    const hasOnboardingData = provider_ids.length > 0 || movie_ids.length > 0;

    if (!hasOnboardingData) {
        // 온보딩 데이터가 없으면 메인 페이지로 리다이렉트
        console.warn('⚠️ 온보딩 데이터 없음 - 비정상 접근 차단');
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
