// [용도] 어드민 페이지 레이아웃 - 사이드바 + 메인 컨텐츠 영역
// [사용법] /admin/* 라우트의 루트 레이아웃

import { Outlet } from "react-router-dom";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout() {
    return (
        <div className="min-h-screen bg-white dark:bg-gray-900 flex">
            {/* 사이드바 */}
            <AdminSidebar />

            {/* 메인 컨텐츠 영역 */}
            <main className="flex-1 overflow-auto">
                <Outlet />
            </main>
        </div>
    );
}
