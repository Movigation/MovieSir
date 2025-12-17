// [용도] 어드민 대시보드 메인 페이지
// [사용법] /admin 라우트의 메인 화면

import { useLocation } from "react-router-dom";
import StatCard from "@/components/admin/StatCard";
import AdminSidebar from "@/components/admin/AdminSidebar";
import TmdbSyncPage from "@/pages/admin/TmdbSyncPage";
import PopularityUpdatePage from "@/pages/admin/PopularityUpdatePage";
import LearningMonitorPage from "@/pages/admin/LearningMonitorPage";
import VectorRetrainPage from "@/pages/admin/VectorRetrainPage";
import TagModelRetrainPage from "@/pages/admin/TagModelRetrainPage";
import {
    Activity,
    Users,
    Film,
    TrendingUp
} from "lucide-react";

// 페이지별 컴포넌트 매핑
const modalConfig: Record<string, { title: string; component: React.ReactNode }> = {
    "tmdb-sync": { title: "TMDB 동기화", component: <TmdbSyncPage /> },
    "popularity": { title: "인기 차트 갱신", component: <PopularityUpdatePage /> },
    "learning-monitor": { title: "학습 상태 모니터링", component: <LearningMonitorPage /> },
    "vector-retrain": { title: "벡터 재학습", component: <VectorRetrainPage /> },
    "tag-retrain": { title: "태그 모델 재학습", component: <TagModelRetrainPage /> },
};

export default function AdminDashboard() {
    const location = useLocation();

    // URL에서 현재 페이지 추출
    const currentPath = location.pathname.replace("/admin/", "");
    const activeModal = currentPath !== location.pathname && currentPath !== "" ? currentPath : null;

    return (
        <div className="min-h-screen bg-white dark:bg-gray-900 flex">
            {/* 사이드바 */}
            <AdminSidebar />

            {/* 메인 컨텐츠 영역 */}
            <main className="flex-1 p-8">
                {activeModal ? (
                    // 기능 페이지 표시 (모달 래퍼 없음)
                    <div className="max-w-4xl mx-auto">
                        {modalConfig[activeModal].component}
                    </div>
                ) : (
                    // 대시보드 표시
                    <>
                        {/* 헤더 */}
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                관리자 대시보드
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">
                                시스템 전체 상태를 한눈에 확인하세요
                            </p>
                        </div>

                        {/* 통계 카드 그리드 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <StatCard
                                title="API 호출"
                                value="12,345"
                                icon={<Activity className="text-blue-500" />}
                                trend="+12.5%"
                                trendUp={true}
                            />
                            <StatCard
                                title="DAU"
                                value="892"
                                icon={<Users className="text-green-500" />}
                                trend="+8.2%"
                                trendUp={true}
                            />
                            <StatCard
                                title="추천 요청"
                                value="3,456"
                                icon={<Film className="text-purple-500" />}
                                trend="-2.1%"
                                trendUp={false}
                            />
                            <StatCard
                                title="OTT 전환율"
                                value="23.5%"
                                icon={<TrendingUp className="text-orange-500" />}
                                trend="+5.3%"
                                trendUp={true}
                            />
                        </div>

                        {/* 최근 활동 로그 */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                                최근 활동 로그
                            </h2>
                            <div className="space-y-3">
                                {[
                                    { time: "2025-12-17 10:30", message: "TMDB 동기화 완료", status: "success" },
                                    { time: "2025-12-17 09:15", message: "벡터 재학습 시작", status: "progress" },
                                    { time: "2025-12-16 22:00", message: "인기 차트 갱신 완료", status: "success" },
                                ].map((log, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`w-2 h-2 rounded-full ${log.status === "success"
                                                ? "bg-green-500"
                                                : "bg-blue-500 animate-pulse"
                                                }`} />
                                            <span className="text-sm text-gray-600 dark:text-gray-300">
                                                {log.time}
                                            </span>
                                            <span className="text-sm text-gray-900 dark:text-white font-medium">
                                                {log.message}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
