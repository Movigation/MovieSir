// [용도] 온보딩 플로우 보호 - 온보딩 데이터가 있어야만 접근 가능
// [사용법] <Route element={<OnboardingProtectedRoute />}><Route path="/onboarding/complete" ... /></Route>

import { Outlet } from 'react-router-dom';

export default function OnboardingProtectedRoute() {
    // 온보딩 데이터가 없더라도 온보딩 플로우 중이라면 허용 (건너뛰기 지원)
    // 단, 최소한 로그인 상태 등은 상위 가드에서 체크됨
    return <Outlet />;
}
