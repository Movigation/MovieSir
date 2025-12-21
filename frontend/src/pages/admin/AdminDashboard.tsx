// [용도] 어드민 대시보드 메인 페이지
// [사용법] /admin 라우트의 메인 화면

import StatCard from "@/services/admin/components/StatCard";
import {
    Activity,
    Users,
    Film,
    TrendingUp,
} from "lucide-react";

export default function AdminDashboard() {
    return (
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
    );
}
