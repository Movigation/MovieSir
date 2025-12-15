// [용도] 온보딩 완료 및 데이터 제출 페이지
// [사용법] /onboarding/complete 라우트에서 사용

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOnboardingStore } from "@/store/onboardingStore";
import { completeOnboarding, skipOnboarding } from "@/api/onboardingApi";

export default function OnboardingCompletePage() {
    const navigate = useNavigate();
    // const { loadUserFromStorage } = useAuth();
    const { ottList, likedMovieIds, reset } = useOnboardingStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError("");

        try {
            console.log("=== 온보딩 데이터 전송 ===");
            console.log("ottList:", ottList);
            console.log("likedMovieIds:", likedMovieIds);

            let response;

            // likedMovieIds가 비어있으면 건너뛰기로 처리
            if (likedMovieIds.length === 0) {
                console.log("영화 선택 없음 - skipOnboarding 호출");
                response = await skipOnboarding();
            } else {
                console.log("온보딩 데이터 전송:", {
                    ottIds: ottList,
                    movieIds: likedMovieIds,
                });

                // 백엔드에 온보딩 데이터 전송
                response = await completeOnboarding(ottList, likedMovieIds);
            }

            console.log("=== API 응답 ===");
            console.log("응답:", response);

            // 온보딩 스토어 초기화
            reset();

            // 메인 페이지로 이동
            navigate("/");

        } catch (err: any) {
            console.error("온보딩 완료 오류:", err);
            setError(err.message || "온보딩 완료 중 오류가 발생했습니다");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-gray-800/50 backdrop-blur-sm rounded-3xl p-8 border border-gray-700">
                {/* 헤더 */}
                <div className="text-center mb-8">
                    <div className="text-7xl mb-4">🎉</div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        거의 다 왔어요!
                    </h1>
                    <p className="text-gray-300 text-lg">
                        선택하신 정보를 확인하고 완료해주세요
                    </p>
                </div>

                {/* 요약 정보 */}
                <div className="space-y-6 mb-8">
                    {/* OTT 플랫폼 */}
                    <div className="bg-gray-900/50 rounded-xl p-6">
                        <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                            📺 선택한 OTT 플랫폼
                        </h2>
                        {ottList.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {ottList.map((ott) => (
                                    <span
                                        key={ott}
                                        className="px-4 py-2 bg-blue-600/50 text-white rounded-lg capitalize"
                                    >
                                        {ott}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-400">선택한 플랫폼이 없습니다</p>
                        )}
                    </div>

                    {/* 좋아요한 영화 */}
                    <div className="bg-gray-900/50 rounded-xl p-6">
                        <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                            ❤️ 좋아요한 영화
                        </h2>
                        {likedMovieIds.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {likedMovieIds.map((movieId) => (
                                    <span
                                        key={movieId}
                                        className="px-4 py-2 bg-green-600/50 text-white rounded-lg"
                                    >
                                        영화 ID: {movieId}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-400">아직 선택한 영화가 없습니다</p>
                        )}
                    </div>
                </div>

                {/* 에러 메시지 */}
                {error && (
                    <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
                        <p className="text-red-300 text-center">{error}</p>
                    </div>
                )}

                {/* 버튼 */}
                <div className="flex gap-4">
                    <button
                        onClick={() => {
                            // 기존 조사 값 초기화
                            reset();
                            console.log("✅ 온보딩 데이터 초기화 완료");
                            // OTT 선택 페이지부터 다시 시작
                            navigate("/onboarding/ott");
                        }}
                        className="flex-1 py-4 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition-colors"
                    >
                        다시 선택하기
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? "처리 중..." : "완료하기 🚀"}
                    </button>
                </div>
            </div>
        </div>
    );
}
