// [용도] 보호된 라우트 - 로그인 필요
// [사용법] <Route element={<ProtectedRoute />}><Route path="/mypage" ... /></Route>

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthContext';

export default function ProtectedRoute() {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        // 로그인되지 않은 경우 메인 페이지로 리다이렉트
        // 로그인 모달은 Header에서 처리
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
