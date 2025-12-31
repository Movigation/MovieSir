// [용도] 온보딩 완료 후 재접근 방지
// [사용법] <Route element={<OnboardingCompletedRoute />}>...</Route>

import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

export default function OnboardingCompletedRoute() {
    const navigate = useNavigate();
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');

    let shouldBlock = false;

    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            shouldBlock = user.onboarding_completed === true;
        } catch (e) {
            console.error('❌ user 데이터 파싱 실패:', e);
        }
    }

    useEffect(() => {
        if (shouldBlock) {
            console.warn('⚠️ 온보딩 이미 완료 - 재접근 차단');
            navigate('/', { replace: true });
        }
    }, [shouldBlock, navigate]);

    // 차단 중에는 null 반환 (깜빡임 방지)
    if (shouldBlock) {
        return null;
    }

    return <Outlet />;
}
