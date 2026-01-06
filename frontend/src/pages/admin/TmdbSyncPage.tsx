// [용도] TMDB 동기화 페이지
// [사용법] AdminDashboard에서 모달로 표시

import { useState } from "react";
import { Calendar, CheckSquare } from "lucide-react";

export default function TmdbSyncPage() {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [updateFields, setUpdateFields] = useState({
        poster: true,
        title: true,
        overview: true,
        genres: true,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleSync = async () => {
        setIsLoading(true);
        setProgress(0);

        // TODO: 실제 API 호출
        // const selectedFields = Object.entries(updateFields)
        //     .filter(([_, checked]) => checked)
        //     .map(([field]) => field);

        // Simulate progress
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setIsLoading(false);
                    return 100;
                }
                return prev + 10;
            });
        }, 500);
    };

    return (
        <div className="space-y-6">
            {/* 설명 */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                    TMDB API를 통해 영화 메타데이터를 업데이트합니다.
                    <br />
                    업데이트할 날짜 범위와 항목을 선택하세요.
                </p>
            </div>

            {/* 날짜 설정 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <Calendar className="inline mr-2" size={16} />
                        시작 날짜
                    </label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <Calendar className="inline mr-2" size={16} />
                        종료 날짜
                    </label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* 업데이트 항목 선택 */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    <CheckSquare className="inline mr-2" size={16} />
                    업데이트 항목
                </label>
                <div className="grid grid-cols-2 gap-3">
                    {Object.entries(updateFields).map(([field, checked]) => (
                        <label
                            key={field}
                            className="flex items-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) =>
                                    setUpdateFields({
                                        ...updateFields,
                                        [field]: e.target.checked,
                                    })
                                }
                                className="w-4 h-4 text-blue-500 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                                {field === "poster" && "포스터"}
                                {field === "title" && "제목"}
                                {field === "overview" && "개요"}
                                {field === "genres" && "장르"}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* 진행 상태 */}
            {isLoading && (
                <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                        <span>진행 중...</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div
                            className="bg-blue-500 h-full transition-all duration-300 rounded-full"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* 실행 버튼 */}
            <button
                onClick={handleSync}
                disabled={isLoading || !startDate || !endDate}
                className={`w-full py-3 rounded-lg font-semibold transition-colors ${isLoading || !startDate || !endDate
                        ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                        : "bg-blue-500 hover:bg-blue-600 text-white"
                    }`}
            >
                {isLoading ? "동기화 중..." : "동기화 실행"}
            </button>
        </div>
    );
}
