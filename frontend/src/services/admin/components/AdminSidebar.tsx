// [용도] 어드민 사이드바 - 메뉴 네비게이션
// [사용법] AdminLayout에서 사용

import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    Film,
    TrendingUp,
    Brain,
    Network,
    Tag,
    Menu,
    X
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
    const [isExpanded, setIsExpanded] = useState(false);

    // 카테고리 정의
    const categories: Record<string, string[]> = {
        "영화 관리": ["tmdb-sync", "popularity"],
        "AI 모델 관리": ["learning-monitor", "vector-retrain", "tag-retrain"],
    };

    return (
        <>
            {/* 모바일 배경 오버레이 */}
            {isExpanded && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsExpanded(false)}
                />
            )}

            <aside
                className={`
                    fixed lg:relative
                    top-0 left-0
                    h-screen
                    bg-gray-50 dark:bg-gray-800
                    border-r border-gray-200 dark:border-gray-700
                    flex flex-col
                    z-50
                    transition-all duration-300 ease-in-out
                    ${isExpanded ? 'w-64' : 'w-16 lg:w-64'}
                `}
            >
                {/* 헤더 */}
                <div className={`p-6 border-b border-gray-200 dark:border-gray-700 flex items-center ${isExpanded ? 'justify-between' : 'justify-center lg:justify-between'}`}>
                    <div className={`transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 lg:opacity-100'}`}>
                        <h2 className={`text-2xl font-bold text-gray-900 dark:text-white ${isExpanded ? 'block' : 'hidden lg:block'}`}>
                            MovieSir
                        </h2>
                        <p className={`text-sm text-gray-500 dark:text-gray-400 mt-1 ${isExpanded ? 'block' : 'hidden lg:block'}`}>
                            Admin Dashboard
                        </p>
                    </div>

                    {/* 모바일 토글 버튼 */}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className=" lg:hidden p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        {isExpanded ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                {/* 메뉴 */}
                <nav className={`flex-1 overflow-y-auto ${isExpanded ? 'p-4' : 'px-2 py-4 lg:p-4'}`}>
                    {/* 대시보드 */}
                    <div className="mb-4">
                        <NavLink
                            to="/admin"
                            end
                            className={({ isActive }) =>
                                `flex items-center rounded-lg transition-colors
                                ${isExpanded ? 'gap-3 px-3 py-2 w-full' : 'justify-center w-10 h-10 mx-auto lg:justify-start lg:gap-3 lg:px-3 lg:py-2 lg:w-full lg:mx-0'}
                                ${isActive
                                    ? "bg-blue-500 text-white"
                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                                }`
                            }
                            onClick={() => setIsExpanded(false)}
                        >
                            <LayoutDashboard size={20} className="flex-shrink-0" />
                            <span className={`text-sm font-medium whitespace-nowrap transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 lg:opacity-100'} ${isExpanded ? 'block' : 'hidden lg:block'}`}>
                                대시보드
                            </span>
                        </NavLink>
                    </div>

                    {/* 카테고리별 메뉴 */}
                    {Object.entries(categories).map(([categoryName, itemIds]) => (
                        <div key={categoryName} className="mb-4">
                            <h3 className={`px-3 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 lg:opacity-100'} ${isExpanded ? 'block' : 'hidden lg:block'}`}>
                                {categoryName}
                            </h3>
                            <div className="space-y-2">
                                {menuItems
                                    .filter((item) => itemIds.includes(item.id))
                                    .map((item) => (
                                        <NavLink
                                            key={item.id}
                                            to={item.path}
                                            className={({ isActive }) =>
                                                `flex items-center rounded-lg transition-colors
                                                ${isExpanded ? 'gap-3 px-3 py-2 w-full' : 'justify-center w-10 h-10 mx-auto lg:justify-start lg:gap-3 lg:px-3 lg:py-2 lg:w-full lg:mx-0'}
                                                ${isActive
                                                    ? "bg-blue-500 text-white"
                                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                                                }`
                                            }
                                            onClick={() => setIsExpanded(false)}
                                        >
                                            <span className="flex-shrink-0">{item.icon}</span>
                                            <span className={`text-sm font-medium whitespace-nowrap transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 lg:opacity-100'} ${isExpanded ? 'block' : 'hidden lg:block'}`}>
                                                {item.label}
                                            </span>
                                        </NavLink>
                                    ))}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* 푸터 */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <p className={`text-xs text-gray-500 dark:text-gray-400 text-center transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 lg:opacity-100'} ${isExpanded ? 'block' : 'hidden lg:block'}`}>
                        © 2025 MovieSir
                    </p>
                </div>
            </aside>
        </>
    );
}
