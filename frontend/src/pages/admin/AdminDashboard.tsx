// [용도] 어드민 대시보드 메인 페이지
// [사용법] /admin 라우트의 메인 화면

import { useLocation, useNavigate } from "react-router-dom";
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
    TrendingUp,
    X
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
    const navigate = useNavigate();

    // URL에서 현재 페이지 추출
    const currentPath = location.pathname.replace("/admin/", "");
    const activeModal = currentPath !== location.pathname && currentPath !== "" ? currentPath : null;

    const handleClose = () => {
        navigate("/admin");
    };

    return (
        <div className="min-h-screen bg-white dark:bg-gray-900 flex">
            {/* 사이드바 */}
            <AdminSidebar />

            {/* 메인 컨텐츠 영역 */}
            {/* p-4: 모바일 패딩 16px */}
            {/* sm:p-6: 태블릿 패딩 24px */}
            {/* lg:p-8: 데스크탑 패딩 32px */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8 ml-16 lg:ml-0">
                {activeModal ? (
                    // 기능 페이지 표시
                    // 모바일: 풀스크린 모달
                    // 데스크탑: 일반 컨텐츠
                    <>
                        {/* 모바일 풀스크린 모달 */}
                        <div className="lg:hidden fixed inset-0 bg-white dark:bg-gray-900 z-50 overflow-auto">
                            {/* 헤더 with X 버튼 */}
                            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between z-10">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {modalConfig[activeModal].title}
                                </h2>
                                <button
                                    onClick={handleClose}
                                    className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* 컨텐츠 */}
                            <div className="px-8 py-6">
                                {modalConfig[activeModal].component}
                            </div>
                        </div>


                        {/* 데스크탑 오버레이 모달 */}
                        <div className="hidden lg:block">
                            {/* 배경 오버레이 */}
                            <div
                                className="fixed inset-0 bg-black/50 z-40"
                                onClick={handleClose}
                            />

                            {/* 모달 컨테이너 */}
                            <div className="fixed inset-0 z-50 overflow-y-auto">
                                <div className="flex min-h-full items-center justify-center p-4">
                                    {/* 모달 박스 */}
                                    <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                                        {/* 헤더 */}
                                        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
                                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                                {modalConfig[activeModal].title}
                                            </h2>
                                            <button
                                                onClick={handleClose}
                                                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <X size={24} />
                                            </button>
                                        </div>

                                        {/* 컨텐츠 */}
                                        <div className="overflow-y-auto max-h-[calc(90vh-73px)] px-6 py-4">
                                            {modalConfig[activeModal].component}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    // 대시보드 표시
                    <>
                        {/* 헤더 */}
                        <div className="mb-6 sm:mb-8">
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                                관리자 대시보드
                            </h1>
                            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">
                                시스템 전체 상태를 한눈에 확인하세요
                            </p>
                        </div>

                        {/* 통계 카드 그리드 */}
                        {/* grid-cols-1: 모바일 1열 */}
                        {/* sm:grid-cols-2: 태블릿 2열 */}
                        {/* lg:grid-cols-4: 데스크탑 4열 */}
                        {/* gap-3 sm:gap-4 lg:gap-6: 반응형 간격 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
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
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                                최근 활동 로그
                            </h2>
                            <div className="space-y-2 sm:space-y-3">
                                {[
                                    { time: "2025-12-17 10:30", message: "TMDB 동기화 완료", status: "success" },
                                    { time: "2025-12-17 09:15", message: "벡터 재학습 시작", status: "progress" },
                                    { time: "2025-12-16 22:00", message: "인기 차트 갱신 완료", status: "success" },
                                ].map((log, index) => (
                                    <div
                                        key={index}
                                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg gap-2 sm:gap-3"
                                    >
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${log.status === "success"
                                                ? "bg-green-500"
                                                : "bg-blue-500 animate-pulse"
                                                }`} />
                                            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                                                {log.time}
                                            </span>
                                        </div>
                                        <span className="text-sm text-gray-900 dark:text-white font-medium ml-4 sm:ml-0">
                                            {log.message}
                                        </span>
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
