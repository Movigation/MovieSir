// [용도] 벡터 재학습 페이지
// [사용법] AdminDashboard에서 모달로 표시

import { useState } from "react";
import { Network, AlertTriangle, Settings } from "lucide-react";

export default function VectorRetrainPage() {
    const [mode, setMode] = useState<"full" | "incremental">("full");
    const [batchSize, setBatchSize] = useState(100);
    const [isLoading, setIsLoading] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const handleStartRetrain = () => {
        setShowConfirmModal(true);
    };

    const confirmRetrain = async () => {
        setShowConfirmModal(false);
        setIsLoading(true);

        // TODO: 실제 API 호출
        // const payload = {
        //     mode: mode,
        //     batch_size: batchSize
        // };

        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            alert("벡터 재학습이 시작되었습니다. 학습 상태 모니터링에서 진행 상황을 확인하세요.");
        }, 2000);
    };

    return (
        <div className="space-y-6">
            {/* 경고 메시지 */}
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                        <h4 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
                            ⚠️ 주의사항
                        </h4>
                        <p className="text-sm text-red-700 dark:text-red-300">
                            전체 재학습을 실행하면 <strong>기존 벡터가 모두 덮어쓰기</strong>됩니다.
                            <br />
                            이 작업은 취소할 수 없으며, 완료까지 수 시간이 걸릴 수 있습니다.
                        </p>
                    </div>
                </div>
            </div>

            {/* 학습 모드 선택 */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    <Network className="inline mr-2" size={16} />
                    학습 모드
                </label>
                <div className="space-y-3">
                    {/* 전체 재학습 */}
                    <label className="flex items-start gap-3 p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <input
                            type="radio"
                            name="mode"
                            value="full"
                            checked={mode === "full"}
                            onChange={() => setMode("full")}
                            className="mt-1 w-4 h-4 text-blue-500"
                        />
                        <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                전체 재학습 (Full Retrain)
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                모든 사용자의 벡터를 처음부터 다시 학습합니다.
                                <br />
                                기존 데이터가 모두 삭제되고 새로운 벡터로 대체됩니다.
                            </div>
                            <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs font-medium">
                                <AlertTriangle size={12} />
                                위험: 기존 데이터 삭제
                            </div>
                        </div>
                    </label>

                    {/* 증분 학습 */}
                    <label className="flex items-start gap-3 p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <input
                            type="radio"
                            name="mode"
                            value="incremental"
                            checked={mode === "incremental"}
                            onChange={() => setMode("incremental")}
                            className="mt-1 w-4 h-4 text-blue-500"
                        />
                        <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                증분 학습 (Incremental Learning)
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                신규 데이터만 학습하여 기존 벡터에 추가합니다.
                                <br />
                                기존 사용자의 벡터는 유지되며, 새로운 사용자만 학습됩니다.
                            </div>
                            <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs font-medium">
                                ✓ 안전: 기존 데이터 유지
                            </div>
                        </div>
                    </label>
                </div>
            </div>

            {/* 배치 크기 설정 */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Settings className="inline mr-2" size={16} />
                    배치 크기 (Batch Size)
                </label>
                <div className="flex items-center gap-4">
                    <input
                        type="range"
                        min="10"
                        max="500"
                        step="10"
                        value={batchSize}
                        onChange={(e) => setBatchSize(parseInt(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <input
                        type="number"
                        value={batchSize}
                        onChange={(e) => setBatchSize(parseInt(e.target.value))}
                        min="10"
                        max="500"
                        className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    배치 크기가 클수록 빠르지만 메모리를 많이 사용합니다. (권장: 100-200)
                </p>
            </div>

            {/* 실행 버튼 */}
            <button
                onClick={handleStartRetrain}
                disabled={isLoading}
                className={`w-full py-3 rounded-lg font-semibold transition-colors ${isLoading
                        ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                        : mode === "full"
                            ? "bg-red-500 hover:bg-red-600 text-white"
                            : "bg-blue-500 hover:bg-blue-600 text-white"
                    }`}
            >
                {isLoading
                    ? "재학습 시작 중..."
                    : mode === "full"
                        ? "⚠️ 전체 재학습 시작"
                        : "✓ 증분 학습 시작"}
            </button>

            {/* 안내 메시지 */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                    💡 <strong>팁:</strong> 처음 사용하거나 데이터가 크게 변경된 경우 전체 재학습을,
                    <br />
                    일상적인 업데이트는 증분 학습을 권장합니다.
                </p>
            </div>

            {/* 확인 모달 */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                                <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                정말 실행하시겠습니까?
                            </h3>
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            {mode === "full" ? (
                                <>
                                    <strong className="text-red-600 dark:text-red-400">전체 재학습</strong>을 실행하면
                                    기존의 모든 벡터 데이터가 삭제되고 새로 생성됩니다.
                                    <br /><br />
                                    이 작업은 <strong>되돌릴 수 없습니다</strong>.
                                </>
                            ) : (
                                <>
                                    <strong className="text-blue-600 dark:text-blue-400">증분 학습</strong>을 실행합니다.
                                    <br />
                                    기존 벡터는 유지되며, 신규 데이터만 학습됩니다.
                                </>
                            )}
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={confirmRetrain}
                                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${mode === "full"
                                        ? "bg-red-500 hover:bg-red-600 text-white"
                                        : "bg-blue-500 hover:bg-blue-600 text-white"
                                    }`}
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
