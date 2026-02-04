// [용도] 온보딩 플로우 보호 - 온보딩 진행 중일 때만 접근 가능
// [사용법] <Route element={<OnboardingProtectedRoute />}><Route path="/onboarding/complete" ... /></Route>

import { Navigate, Outlet } from 'react-router-dom';

export default function OnboardingProtectedRoute() {
    // 온보딩 플로우 진행 중인지 확인
    const isOnboardingInProgress = sessionStorage.getItem('onboarding_in_progress') === 'true';

    if (!isOnboardingInProgress) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
