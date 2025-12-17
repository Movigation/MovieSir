// [용도] 태그 모델 재학습 페이지
// [사용법] AdminDashboard에서 모달로 표시

import { useState, useRef, useEffect } from "react";
import { Tag, Info, Terminal, CheckCircle } from "lucide-react";

interface LogEntry {
    timestamp: string;
    message: string;
    type: "info" | "success" | "error";
}

export default function TagModelRetrainPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const logEndRef = useRef<HTMLDivElement>(null);

    // 현재 모델 정보 (실제로는 API에서 가져와야 함)
    const modelInfo = {
        version: "v1.2.3",
        lastTrainedAt: "2025-12-10 14:00",
        tagCount: 1128,
        accuracy: 92.3,
    };

    // 로그 자동 스크롤
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    const addLog = (message: string, type: LogEntry["type"] = "info") => {
        const timestamp = new Date().toLocaleTimeString("ko-KR");
        setLogs((prev) => [...prev, { timestamp, message, type }]);
    };

    const handleRetrain = async () => {
        setIsLoading(true);
        setLogs([]);

        // TODO: 실제 API 호출
        // Simulate training process with logs
        addLog("태그 모델 재학습을 시작합니다...", "info");

        await new Promise((resolve) => setTimeout(resolve, 1000));
        addLog("학습 데이터 로딩 중...", "info");

        await new Promise((resolve) => setTimeout(resolve, 1500));
        addLog("학습 데이터 로딩 완료 (1,128개 태그)", "success");

        await new Promise((resolve) => setTimeout(resolve, 1000));
        addLog("모델 학습 시작...", "info");

        await new Promise((resolve) => setTimeout(resolve, 2000));
        addLog("Epoch 1/10 완료 - Loss: 0.523", "info");

        await new Promise((resolve) => setTimeout(resolve, 1500));
        addLog("Epoch 5/10 완료 - Loss: 0.312", "info");

        await new Promise((resolve) => setTimeout(resolve, 1500));
        addLog("Epoch 10/10 완료 - Loss: 0.178", "info");

        await new Promise((resolve) => setTimeout(resolve, 1000));
        addLog("모델 검증 중...", "info");

        await new Promise((resolve) => setTimeout(resolve, 1500));
        addLog("학습 완료! 정확도: 93.7%", "success");

        await new Promise((resolve) => setTimeout(resolve, 500));
        addLog("모델 저장 완료", "success");

        setIsLoading(false);
    };

    const getLogIcon = (type: LogEntry["type"]) => {
        switch (type) {
            case "success":
                return "✓";
            case "error":
                return "✗";
            default:
                return ">";
        }
    };

    const getLogColor = (type: LogEntry["type"]) => {
        switch (type) {
            case "success":
                return "text-green-600 dark:text-green-400";
            case "error":
                return "text-red-600 dark:text-red-400";
            default:
                return "text-gray-600 dark:text-gray-400";
        }
    };

    return (
        <div className="space-y-6">
            {/* 설명 */}
            <div className="bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-lg p-4">
                <p className="text-sm text-pink-800 dark:text-pink-200">
                    MOVIES.tag_genome 필드의 태그 모델을 재학습합니다.
                    <br />
                    영화 메타데이터가 업데이트되었을 때 실행하세요.
                </p>
            </div>

            {/* 현재 모델 정보 */}
            <div className="bg-white dark:bg-gray-800 border-2 border-pink-200 dark:border-pink-800 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Tag className="text-pink-500" size={24} />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        현재 모델 정보
                    </h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Info size={16} className="text-gray-400" />
                            <span className="text-xs text-gray-500 dark:text-gray-400">모델 버전</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {modelInfo.version}
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Info size={16} className="text-gray-400" />
                            <span className="text-xs text-gray-500 dark:text-gray-400">태그 수</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {modelInfo.tagCount.toLocaleString()}개
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Info size={16} className="text-gray-400" />
                            <span className="text-xs text-gray-500 dark:text-gray-400">마지막 학습</span>
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {modelInfo.lastTrainedAt}
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <CheckCircle size={16} className="text-green-500" />
                            <span className="text-xs text-gray-500 dark:text-gray-400">정확도</span>
                        </div>
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                            {modelInfo.accuracy}%
                        </div>
                    </div>
                </div>
            </div>

            {/* 실행 버튼 */}
            <button
                onClick={handleRetrain}
                disabled={isLoading}
                className={`w-full py-3 rounded-lg font-semibold transition-colors ${isLoading
                        ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                        : "bg-pink-500 hover:bg-pink-600 text-white"
                    }`}
            >
                {isLoading ? "재학습 진행 중..." : "모델 재학습 시작"}
            </button>

            {/* 실행 로그 */}
            {logs.length > 0 && (
                <div className="bg-gray-900 dark:bg-black rounded-lg border border-gray-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 dark:bg-gray-900 border-b border-gray-700">
                        <Terminal size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-300 font-medium">실행 로그</span>
                        {isLoading && (
                            <span className="ml-auto flex items-center gap-2 text-xs text-gray-400">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                실행 중
                            </span>
                        )}
                    </div>

                    <div className="p-4 max-h-80 overflow-y-auto font-mono text-sm">
                        {logs.map((log, index) => (
                            <div key={index} className="mb-1">
                                <span className="text-gray-500">[{log.timestamp}]</span>
                                <span className={`ml-2 ${getLogColor(log.type)}`}>
                                    {getLogIcon(log.type)} {log.message}
                                </span>
                            </div>
                        ))}
                        <div ref={logEndRef} />
                    </div>
                </div>
            )}

            {/* 안내 메시지 */}
            {!isLoading && logs.length === 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                        💡 <strong>팁:</strong> 태그 모델 재학습은 통상 10-30분 정도 소요됩니다.
                        <br />
                        실행 로그를 통해 진행 상황을 실시간으로 확인할 수 있습니다.
                    </p>
                </div>
            )}
        </div>
    );
}
