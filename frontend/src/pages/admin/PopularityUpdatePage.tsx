// [용도] 인기 차트 갱신 페이지
// [사용법] AdminDashboard에서 모달로 표시

import { useState } from "react";
import { TrendingUp, Hash } from "lucide-react";

export default function PopularityUpdatePage() {
    const [scope, setScope] = useState<"all" | "range">("all");
    const [movieIds, setMovieIds] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdates, setLastUpdates] = useState([
        { date: "2025-12-16 22:00", scope: "전체 영화", status: "성공", count: 15234 },
        { date: "2025-12-15 22:00", scope: "전체 영화", status: "성공", count: 15198 },
        { date: "2025-12-14 22:00", scope: "전체 영화", status: "성공", count: 15156 },
    ]);

    const handleUpdate = async () => {
        setIsLoading(true);

        // TODO: 실제 API 호출
        // const payload = {
        //     scope: scope,
        //     movie_ids: scope === "range" ? movieIds.split(",").map(id => parseInt(id.trim())) : undefined
        // };

        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            // 성공 시 최근 이력에 추가
            const newUpdate = {
                date: new Date().toLocaleString("ko-KR"),
                scope: scope === "all" ? "전체 영화" : `특정 범위 (${movieIds})`,
                status: "성공",
                count: scope === "all" ? 15234 : movieIds.split(",").length,
            };
            setLastUpdates([newUpdate, ...lastUpdates.slice(0, 4)]);
        }, 2000);
    };

    return (
        <div className="space-y-6">
            {/* 설명 */}
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                    MOVIES 테이블의 popularity 필드를 수동으로 업데이트합니다.
                    <br />
                    전체 영화 또는 특정 영화 ID를 선택할 수 있습니다.
                </p>
            </div>

            {/* 갱신 대상 선택 */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    <TrendingUp className="inline mr-2" size={16} />
                    갱신 대상
                </label>
                <div className="space-y-3">
                    {/* 전체 영화 */}
                    <label className="flex items-center gap-3 p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <input
                            type="radio"
                            name="scope"
                            value="all"
                            checked={scope === "all"}
                            onChange={() => setScope("all")}
                            className="w-4 h-4 text-blue-500"
                        />
                        <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                전체 영화
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                DB에 있는 모든 영화의 인기도를 업데이트합니다
                            </div>
                        </div>
                    </label>

                    {/* 특정 범위 */}
                    <label className="flex items-center gap-3 p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <input
                            type="radio"
                            name="scope"
                            value="range"
                            checked={scope === "range"}
                            onChange={() => setScope("range")}
                            className="w-4 h-4 text-blue-500"
                        />
                        <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                특정 범위
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                영화 ID를 직접 입력하여 선택한 영화만 업데이트합니다
                            </div>
                        </div>
                    </label>
                </div>

                {/* 특정 범위 선택 시 입력 필드 */}
                {scope === "range" && (
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Hash className="inline mr-2" size={16} />
                            영화 ID (쉼표로 구분)
                        </label>
                        <input
                            type="text"
                            value={movieIds}
                            onChange={(e) => setMovieIds(e.target.value)}
                            placeholder="예: 1, 2, 3, 15, 42"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                )}
            </div>

            {/* 실행 버튼 */}
            <button
                onClick={handleUpdate}
                disabled={isLoading || (scope === "range" && !movieIds.trim())}
                className={`w-full py-3 rounded-lg font-semibold transition-colors ${isLoading || (scope === "range" && !movieIds.trim())
                        ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                        : "bg-orange-500 hover:bg-orange-600 text-white"
                    }`}
            >
                {isLoading ? "갱신 중..." : "갱신 실행"}
            </button>

            {/* 최근 갱신 이력 */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    최근 갱신 이력
                </h3>
                <div className="space-y-2">
                    {lastUpdates.map((update, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                            <div className="flex items-center gap-3">
                                <span className={`w-2 h-2 rounded-full ${update.status === "성공"
                                        ? "bg-green-500"
                                        : "bg-red-500"
                                    }`} />
                                <div>
                                    <div className="text-sm text-gray-900 dark:text-white font-medium">
                                        {update.scope}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {update.date} · {update.count}개 영화
                                    </div>
                                </div>
                            </div>
                            <span className={`text-xs font-medium px-2 py-1 rounded ${update.status === "성공"
                                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                    : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                                }`}>
                                {update.status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
