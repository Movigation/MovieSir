// [용도] 온보딩 완료 및 데이터 제출 페이지
// [사용법] /onboarding/complete 라우트에서 사용

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { skipOnboarding } from "@/api/onboardingApi";
import { authAxiosInstance } from "@/api/axiosInstance";
import ChatbotButton from '@/services/chatbot/components/ChatbotButton';
import { RotateCcw, Undo2, Check } from 'lucide-react';

// OTT 로고 - public 폴더 URL 사용
const OTT_PLATFORMS_MAP: Record<number, { name: string; logo: string; bg: string }> = {
    8: { name: "Netflix", logo: "/logos/NETFLEX_Logo.svg", bg: "bg-black" },
    97: { name: "Watcha", logo: "/logos/WATCHA_Logo_Main.svg", bg: "bg-[#1A1A1A]" },
    337: { name: "Disney+", logo: "/logos/Disney+_logo.svg", bg: "bg-[#040714]" },
    356: { name: "Wavve", logo: "/logos/WAVVE_Logo.svg", bg: "bg-[#0A0E27]" },
    1883: { name: "TVING", logo: "/logos/TVING_Logo.svg", bg: "bg-black" },
    350: { name: "Apple TV+", logo: "/logos/Apple_TV_logo.svg", bg: "bg-black" },
    119: { name: "Prime Video", logo: "/logos/Amazon_Prime_Logo.svg", bg: "bg-[#00050D]" }
};

export default function OnboardingCompletePage() {
    const navigate = useNavigate();
    const { provider_ids, movie_ids, reset, movies } = useOnboardingStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    // 온보딩 재조사 팝업에서 왔는지 확인 (sessionStorage 기반)
    const isFromReminderModal = sessionStorage.getItem('onboarding_from_reminder') === 'true';

    // 선택한 영화 데이터는 store(movies)에서 직접 사용하므로 별도 로딩 필요 없음

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError("");

        try {
            // 1. 서버에 최종 완료 요청
            const response = await authAxiosInstance.post("/onboarding/complete");
            console.log("✅ 서버 온보딩 완료 처리 성공");

            // 2. localStorage의 user 데이터 업데이트 (온보딩 완료 상태 반영)
            const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
            if (userStr) {
                try {
                    const userData = JSON.parse(userStr);
                    userData.onboarding_completed = response.data.onboarding_completed;
                    const storage = localStorage.getItem("user") ? localStorage : sessionStorage;
                    storage.setItem("user", JSON.stringify(userData));

                    // AuthContext 등에 동기화 알림
                    window.dispatchEvent(new Event('storage'));
                } catch (e) {
                    console.error("user 데이터 업데이트 실패:", e);
                }
            }

            // 3. sessionStorage 플래그 정리
            sessionStorage.removeItem('onboarding_from_reminder');
            sessionStorage.removeItem('onboarding_in_progress');

            // 4. 온보딩 스토어 초기화
            reset();

            // 5. 메인 페이지로 이동 (뒤로가기 방지)
            navigate("/", { replace: true });

        } catch (err: any) {
            // console.error("온보딩 완료 처리 중 오류:", err);
            setError(err.response?.data?.message || "온보딩 완료 중 오류가 발생했습니다");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="max-w-screen-lg w-full">
                {/* 미니멀 헤더 */}
                <div className="text-center mb-12">
                    <div className="flex justify-center text-6xl mb-6 pointer-events-none">
                        <ChatbotButton isDark={true} />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
                        거의 다 왔어요!
                    </h1>
                    <p className="text-gray-400 text-base">
                        선택하신 정보를 확인하고 완료해주세요
                    </p>
                </div>

                {/* 요약 정보 */}
                <div className="space-y-6 mb-10">
                    {/* OTT 플랫폼 - 로고로 표시 (리마인더 진입 시 숨김) */}
                    {!isFromReminderModal && (
                        <div className="border border-gray-800 rounded-2xl p-6">
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                선택한 OTT 플랫폼
                            </h2>
                            {provider_ids.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {provider_ids.map((provider_id) => {
                                        const platform = OTT_PLATFORMS_MAP[provider_id];
                                        if (!platform) return null;

                                        return (
                                            <div
                                                key={provider_id}
                                                className={`${platform.bg} bg-white rounded-full w-16 h-16 flex items-center justify-center border border-gray-700 p-3`}
                                            >
                                                <img
                                                    src={platform.logo}
                                                    alt={platform.name}
                                                    className="max-w-full max-h-full w-auto h-auto object-contain opacity-90"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-gray-400">선택한 플랫폼이 없습니다</p>
                            )}
                        </div>
                    )}
                    {/* 좋아요한 영화 - 포스터로 표시 */}
                    <div className="border border-gray-800 rounded-2xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            선택한 영화
                        </h2>
                        {movie_ids.length > 0 ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                {movie_ids.map((movieId) => {
                                    const movie = movies.find(m => m.movie_id === movieId);
                                    if (!movie) return null;

                                    return (
                                        <div
                                            key={movieId}
                                            className="relative overflow-hidden rounded-lg aspect-[2/3] bg-gray-800"
                                        >
                                            {movie.poster_path ? (
                                                <img
                                                    src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                                                    alt={movie.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
                                                    <div className="text-2xl mb-1">🎬</div>
                                                    <p className="text-white text-xs font-semibold px-2 text-center">{movie.title}</p>
                                                </div>
                                            )}
                                            {/* 영화 제목 오버레이 */}
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                                                <p className="text-white text-xs font-medium truncate">{movie.title}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-gray-400">아직 선택한 영화가 없습니다</p>
                        )}
                    </div>
                </div>

                {/* 에러 메시지 */}
                {error && (
                    <div className="border border-red-500 rounded-xl p-4 mb-8">
                        <p className="text-red-300 text-center">{error}</p>
                    </div>
                )}

                {/* 버튼 - 미니멀 스타일 */}
                <div className="flex gap-4 justify-center">
                    {/* 재조사 팝업에서 온 경우 '다시 선택하기' 버튼 숨김 */}
                    {!isFromReminderModal && (
                        <button
                            onClick={async () => {
                                try {
                                    // 1. 백엔드 상태를 미완료(시간 NULL)로 초기화
                                    await skipOnboarding();

                                    // 2. 로컬 유저 상태 업데이트 (미완료로)
                                    const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
                                    if (userStr) {
                                        try {
                                            const userData = JSON.parse(userStr);
                                            userData.onboarding_completed = false;
                                            const storage = localStorage.getItem("user") ? localStorage : sessionStorage;
                                            storage.setItem("user", JSON.stringify(userData));
                                            window.dispatchEvent(new Event('storage'));
                                        } catch (e) {
                                            // console.error("user 데이터 업데이트 실패:", e);
                                        }
                                    }

                                    // 3. OTT 선택 페이지로 리셋 플래그와 함께 이동
                                    navigate("/onboarding/ott", { state: { resetOnEntry: true } });
                                } catch (e) {
                                    // console.error("초기화 실패:", e);
                                    navigate("/onboarding/ott", { state: { resetOnEntry: true } });
                                }
                            }}
                            className="px-8 py-3 border border-gray-700 text-gray-400 font-semibold rounded-xl hover:border-white hover:text-white transition-colors"
                        >
                            <RotateCcw size={20} className="sm:hidden" />
                            <span className="hidden sm:inline">
                                다시 선택하기
                            </span>
                        </button>
                    )}
                    <button
                        onClick={() => navigate("/onboarding/movies")}
                        className="px-8 py-3 border border-gray-700 text-gray-400 font-semibold rounded-xl hover:border-white hover:text-white transition-colors"
                    >
                        <Undo2 size={20} className="sm:hidden" />
                        <span className="hidden sm:inline">
                            이전 단계
                        </span>
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-8 py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            "처리 중..."
                        ) : (
                            <>
                                <Check size={20} className="sm:hidden" />
                                <span className="hidden sm:inline">
                                    완료하기
                                </span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
