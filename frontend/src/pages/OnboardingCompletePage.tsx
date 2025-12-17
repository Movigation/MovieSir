// [용도] 온보딩 완료 및 데이터 제출 페이지
// [사용법] /onboarding/complete 라우트에서 사용

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOnboardingStore } from "@/store/onboardingStore";
import { completeOnboarding, skipOnboarding } from "@/api/onboardingApi";
import ChatbotButton from '@/services/chatbot/components/ChatbotButton';
import type { OnboardingMovie } from "@/api/onboardingApi.type";
import axiosInstance from "@/api/axiosInstance";

// OTT 로고 SVG imports
import NetflixLogoSvg from "@/assets/logos/NETFLEX_Logo.svg";
import DisneyLogoSvg from "@/assets/logos/Disney+_logo.svg";
import PrimeLogoSvg from "@/assets/logos/Amazon_Prime_Logo.svg";
import WavveLogoSvg from "@/assets/logos/WAVVE_Logo.svg";
import TvingLogoSvg from "@/assets/logos/TVING_Logo.svg";
import WatchaLogoSvg from "@/assets/logos/WATCHA_Logo_Main.svg";
import AppleLogoSvg from "@/assets/logos/Apple_TV_logo.svg";

// OTT 플랫폼 정보 매핑
const OTT_PLATFORMS_MAP: Record<number, { name: string; logo: string; bg: string }> = {
    8: { name: "Netflix", logo: NetflixLogoSvg, bg: "bg-black" },
    97: { name: "Watcha", logo: WatchaLogoSvg, bg: "bg-[#1A1A1A]" },
    337: { name: "Disney+", logo: DisneyLogoSvg, bg: "bg-[#040714]" },
    356: { name: "Wavve", logo: WavveLogoSvg, bg: "bg-[#0A0E27]" },
    1883: { name: "TVING", logo: TvingLogoSvg, bg: "bg-black" },
    350: { name: "Apple TV+", logo: AppleLogoSvg, bg: "bg-black" },
    119: { name: "Prime Video", logo: PrimeLogoSvg, bg: "bg-[#00050D]" }
};

export default function OnboardingCompletePage() {
    const navigate = useNavigate();
    // const { loadUserFromStorage } = useAuth();
    const { provider_ids, movie_ids, reset } = useOnboardingStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [movies, setMovies] = useState<OnboardingMovie[]>([]);

    // 선택한 영화 데이터 로드
    useEffect(() => {
        const loadMovies = async () => {
            try {
                const data = await axiosInstance.get("/onboarding/survey", { params: { limit: 10 } });
                setMovies(data.data);
            } catch (err) {
                console.error("영화 로딩 에러 (백엔드 연결 실패, 임시 데이터 사용):", err);

                // 임시 데이터
                const mockMovies: OnboardingMovie[] = [
                    { id: 1, title: "인터스텔라", posterUrl: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg", genres: ["SF", "드라마"] },
                    { id: 2, title: "인셉션", posterUrl: "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg", genres: ["SF", "액션"] },
                    { id: 3, title: "다크 나이트", posterUrl: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg", genres: ["액션", "범죄"] },
                    { id: 4, title: "기생충", posterUrl: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg", genres: ["드라마", "스릴러"] },
                    { id: 5, title: "어벤져스: 엔드게임", posterUrl: "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg", genres: ["액션", "SF"] },
                    { id: 6, title: "타이타닉", posterUrl: "https://image.tmdb.org/t/p/w500/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg", genres: ["로맨스", "드라마"] },
                    { id: 7, title: "매트릭스", posterUrl: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg", genres: ["SF", "액션"] },
                    { id: 8, title: "라라랜드", posterUrl: "https://image.tmdb.org/t/p/w500/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg", genres: ["로맨스", "뮤지컬"] },
                    { id: 9, title: "조커", posterUrl: "https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg", genres: ["드라마", "범죄"] },
                    { id: 10, title: "아바타", posterUrl: "https://image.tmdb.org/t/p/w500/kyeqWdyUXW608qlYkRqosgbbJyK.jpg", genres: ["SF", "액션"] }
                ];
                setMovies(mockMovies);
            }
        };

        loadMovies();
    }, []);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError("");

        try {
            console.log("=== 온보딩 데이터 전송 ===");
            console.log("ottList:", provider_ids);
            console.log("likedMovieIds:", movie_ids);

            let response;

            // movie_ids가 비어있으면 건너뛰기로 처리
            if (movie_ids.length === 0) {
                console.log("영화 선택 없음 - skipOnboarding 호출");
                response = await skipOnboarding();
            } else {
                console.log("온보딩 데이터 전송:");
                console.log("  - provider_ids:", provider_ids);
                console.log("  - movie_ids:", movie_ids);

                // 백엔드에 온보딩 완료 요청
                // (이전 단계에서 이미 provider_ids와 movie_ids가 저장되었음)
                response = await completeOnboarding();
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
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="max-w-5xl w-full">
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
                    {/* OTT 플랫폼 - 로고로 표시 */}
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

                    {/* 좋아요한 영화 - 포스터로 표시 */}
                    <div className="border border-gray-800 rounded-2xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            선택한 영화
                        </h2>
                        {movie_ids.length > 0 ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                {movie_ids.map((movieId) => {
                                    const movie = movies.find(m => m.id === movieId);
                                    if (!movie) return null;

                                    return (
                                        <div
                                            key={movieId}
                                            className="relative overflow-hidden rounded-lg aspect-[2/3] bg-gray-800"
                                        >
                                            {movie.posterUrl ? (
                                                <img
                                                    src={movie.posterUrl}
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
                    <button
                        onClick={() => {
                            // 기존 조사 값 초기화
                            reset();
                            console.log("✅ 온보딩 데이터 초기화 완료");
                            // OTT 선택 페이지부터 다시 시작
                            navigate("/onboarding/ott");
                        }}
                        className="px-8 py-3 border border-gray-700 text-gray-400 font-semibold rounded-xl hover:border-white hover:text-white transition-colors"
                    >
                        다시 선택하기
                    </button>
                    <button
                        onClick={() => navigate("/onboarding/movies")}
                        className="px-8 py-3 border border-gray-700 text-gray-400 font-semibold rounded-xl hover:border-white hover:text-white transition-colors"
                    >
                        이전 단계
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-8 py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? "처리 중..." : "완료하기 🚀"}
                    </button>
                </div>
            </div>
        </div>
    );
}
