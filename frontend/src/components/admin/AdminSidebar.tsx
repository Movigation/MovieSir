// [용도] 어드민 사이드바 - 메뉴 네비게이션
// [사용법] AdminLayout에서 사용

import { NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    Film,
    TrendingUp,
    Brain,
    Network,
    Tag
} from "lucide-react";

interface MenuItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    path: string;
}

const menuItems: MenuItem[] = [
    {
        id: "dashboard",
        label: "대시보드",
        icon: <LayoutDashboard size={20} />,
        path: "/admin",
    },
    {
        id: "tmdb-sync",
        label: "TMDB 동기화",
        icon: <Film size={20} />,
        path: "/admin/tmdb-sync",
    },
    {
        id: "popularity",
        label: "인기 차트 갱신",
        icon: <TrendingUp size={20} />,
        path: "/admin/popularity",
    },
    {
        id: "learning-monitor",
        label: "학습 상태 모니터링",
        icon: <Brain size={20} />,
        path: "/admin/learning-monitor",
    },
    {
        id: "vector-retrain",
        label: "벡터 재학습",
        icon: <Network size={20} />,
        path: "/admin/vector-retrain",
    },
    {
        id: "tag-retrain",
        label: "태그 모델 재학습",
        icon: <Tag size={20} />,
        path: "/admin/tag-retrain",
    },
];

export default function AdminSidebar() {
    // 카테고리 정의
    const categories: Record<string, string[]> = {
        "영화 관리": ["tmdb-sync", "popularity"],
        "AI 모델 관리": ["learning-monitor", "vector-retrain", "tag-retrain"],
    };

    return (
        <aside className="w-64 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            {/* 헤더 */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    MovieSir
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Admin Dashboard
                </p>
            </div>

            {/* 메뉴 */}
            <nav className="flex-1 p-4 overflow-y-auto">
                {/* 대시보드 */}
                <div className="mb-6">
                    <NavLink
                        to="/admin"
                        end
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive
                                ? "bg-blue-500 text-white"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                            }`
                        }
                    >
                        <LayoutDashboard size={20} />
                        <span className="text-sm font-medium">대시보드</span>
                    </NavLink>
                </div>

                {/* 카테고리별 메뉴 */}
                {Object.entries(categories).map(([categoryName, itemIds]) => (
                    <div key={categoryName} className="mb-6">
                        <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {categoryName}
                        </h3>
                        <div className="space-y-1">
                            {menuItems
                                .filter((item) => itemIds.includes(item.id))
                                .map((item) => (
                                    <NavLink
                                        key={item.id}
                                        to={item.path}
                                        target="_blank"
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                                    >
                                        {item.icon}
                                        <span className="text-sm font-medium">{item.label}</span>
                                    </NavLink>
                                ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* 푸터 */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    © 2025 MovieSir
                </p>
            </div>
        </aside>
    );
}
