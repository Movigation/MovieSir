// [용도] 어드민 페이지 레이아웃 - 사이드바 + 메인 컨텐츠 영역
// [사용법] /admin/* 라우트의 루트 레이아웃

import { Outlet } from "react-router-dom";
import AdminSidebar from "@/services/admin/components/AdminSidebar";

export default function AdminLayout() {
    return (
        <div className="min-h-screen bg-white dark:bg-gray-900 flex">
            {/* 사이드바 */}
            <AdminSidebar />

            {/* 메인 컨텐츠 영역 */}
            {/* ml-16: 모바일에서 축소된 사이드바(64px) 만큼 왼쪽 마진 */}
            {/* lg:ml-0: 데스크탑에서는 사이드바가 relative이므로 마진 불필요 */}
            {/* p-4 sm:p-6 lg:p-8: 일관된 패딩으로 모든 자식 페이지에 통일된 레이아웃 제공 */}
            <main className="flex-1 overflow-auto ml-16 lg:ml-0 p-4 sm:p-6 lg:p-8">
                <Outlet />
            </main>
        </div>
    );
}
