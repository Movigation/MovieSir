// [용도] 학습 상태 모니터링 페이지
// [사용법] AdminDashboard에서 모달로 표시

import { useState, useEffect } from "react";
import { Brain, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface LearningHistory {
    startTime: string;
    endTime?: string;
    status: "진행중" | "완료" | "실패";
    duration?: string;
    accuracy?: number;
}

export default function LearningMonitorPage() {
    const [currentStatus, setCurrentStatus] = useState<"idle" | "running" | "completed">("idle");
    const [progress, setProgress] = useState(0);
    const [startTime, setStartTime] = useState<string | null>(null);
    const [estimatedTime, setEstimatedTime] = useState<string | null>(null);

    const [history, setHistory] = useState<LearningHistory[]>([
        {
            startTime: "2025-12-17 10:00",
            endTime: "2025-12-17 12:15",
            status: "완료",
            duration: "2시간 15분",
            accuracy: 92.3,
        },
        {
            startTime: "2025-12-16 10:00",
            endTime: "2025-12-16 12:10",
            status: "완료",
            duration: "2시간 10분",
            accuracy: 91.8,
        },
        {
            startTime: "2025-12-15 10:00",
            status: "실패",
            duration: "-",
        },
    ]);

    // 진행 상태 시뮬레이션
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (currentStatus === "running") {
            interval = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 100) {
                        setCurrentStatus("completed");
                        clearInterval(interval);
                        return 100;
                    }
                    return prev + 1;
                });
            }, 300);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [currentStatus]);

    const getStatusIcon = (status: LearningHistory["status"]) => {
        switch (status) {
            case "진행중":
                return <Loader2 className="text-blue-500 animate-spin" size={20} />;
            case "완료":
                return <CheckCircle className="text-green-500" size={20} />;
            case "실패":
                return <XCircle className="text-red-500" size={20} />;
        }
    };

    const getStatusColor = (status: LearningHistory["status"]) => {
        switch (status) {
            case "진행중":
                return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300";
            case "완료":
                return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
            case "실패":
                return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300";
        }
    };

    return (
        <div className="space-y-6">
            {/* 설명 */}
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <p className="text-sm text-purple-800 dark:text-purple-200">
                    벡터 학습의 진행 상태를 실시간으로 모니터링합니다.
                    <br />
                    현재 학습 중인 작업의 진행률과 예상 완료 시간을 확인할 수 있습니다.
                </p>
            </div>

            {/* 현재 학습 상태 카드 */}
            <div className="bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-800 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Brain className="text-purple-500" size={24} />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        현재 학습 상태
                    </h3>
                </div>

                {currentStatus === "idle" ? (
                    <div className="text-center py-8">
                        <p className="text-gray-500 dark:text-gray-400 mb-2">
                            현재 진행 중인 학습이 없습니다
                        </p>
                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-sm">
                            <span className="w-2 h-2 bg-gray-400 rounded-full" />
                            대기중
                        </span>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* 상태 배지 */}
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                {currentStatus === "running" ? "진행중" : "완료"}
                            </span>
                        </div>

                        {/* 진행률 */}
                        <div>
                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                                <span>진행률</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                                <div
                                    className="bg-purple-500 h-full transition-all duration-300 rounded-full flex items-center justify-end pr-2"
                                    style={{ width: `${progress}%` }}
                                >
                                    {progress > 10 && (
                                        <span className="text-xs text-white font-medium">
                                            {progress}%
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 시간 정보 */}
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="flex items-center gap-2 text-sm">
                                <Clock size={16} className="text-gray-400" />
                                <div>
                                    <div className="text-gray-500 dark:text-gray-400">시작 시간</div>
                                    <div className="font-medium text-gray-900 dark:text-white">
                                        {startTime || "2025-12-17 10:00"}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Clock size={16} className="text-gray-400" />
                                <div>
                                    <div className="text-gray-500 dark:text-gray-400">예상 완료</div>
                                    <div className="font-medium text-gray-900 dark:text-white">
                                        {estimatedTime || "2025-12-17 11:30"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 학습 이력 */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    학습 이력
                </h3>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    시작 시간
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    상태
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    소요시간
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    정확도
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {history.map((item, index) => (
                                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(item.status)}
                                            {item.startTime}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                        {item.duration}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                        {item.accuracy ? `${item.accuracy}%` : "-"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 새로고침 안내 */}
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                💡 이 페이지는 자동으로 갱신되지 않습니다. 최신 정보를 확인하려면 새로고침하세요.
            </div>
        </div>
    );
}
