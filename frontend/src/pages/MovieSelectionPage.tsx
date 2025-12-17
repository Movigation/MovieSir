// [용도] 온보딩 영화 선택 페이지 (그리드 선택 방식)
// [사용법] /onboarding/movies 라우트에서 사용

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOnboardingStore } from "@/store/onboardingStore";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import type { OnboardingMovie } from "@/api/onboardingApi.type";
import axiosInstance from "@/api/axiosInstance";

export default function MovieSelectionPage() {
    const navigate = useNavigate();
    const { addLikedMovie, removeLikedMovie, movie_ids } = useOnboardingStore();

    const [movies, setMovies] = useState<OnboardingMovie[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    // 영화 데이터 로드
    useEffect(() => {
        const loadMovies = async () => {
            setIsLoading(true);
            setError("");
            try {
                const data = await axiosInstance.get("/onboarding/survey", { params: { limit: 10 } });
                setMovies(data.data);
            } catch (err: any) {
                console.error("영화 로딩 에러 (백엔드 연결 실패, 임시 데이터 사용):", err);

                // 🔧 임시 데이터: 백엔드 연결 실패 시 사용
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
                // 에러는 표시하지 않고 임시 데이터로 진행
            } finally {
                setIsLoading(false);
            }
        };

        loadMovies();
    }, []);

    // 영화 선택/해제 토글
    const handleToggleMovie = (movieId: number) => {
        if (movie_ids.includes(movieId)) {
            removeLikedMovie(movieId);
        } else {
            addLikedMovie(movieId);
        }
    };

    const handleNext = () => {
        navigate("/onboarding/complete");
    };

    const handleSkip = () => {
        navigate("/onboarding/complete");
    };

    const handlePrevious = () => {
        navigate("/onboarding/ott");
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <LoadingSpinner message="영화를 불러오는 중..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-500 mb-4">{error}</p>
                    <button
                        onClick={() => navigate("/onboarding/ott")}
                        className="px-6 py-2 bg-white text-black rounded-lg"
                    >
                        이전으로
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="max-w-6xl w-full">
                {/* 헤더 */}
                <div className="mb-12">
                    {/* 제목과 건너뛰기 버튼을 포함하는 컨테이너 */}
                    <div className="relative mb-4">
                        {/* 건너뛰기 버튼 - 오른쪽 상단에 고정 */}
                        <button
                            onClick={handleSkip}
                            className="absolute right-0 top-0 px-4 md:px-8 py-2 md:py-3 border border-gray-700 text-gray-400 font-semibold rounded-xl hover:border-white hover:text-white transition-colors text-sm md:text-base"
                        >
                            건너뛰기
                        </button>

                        {/* 제목 - 중앙 정렬 */}
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight text-center">
                            영화 선택
                        </h1>
                    </div>

                    <p className="text-gray-400 text-base text-center">좋아하는 영화를 선택해주세요</p>
                </div>

                {/* 영화 그리드 - 2줄 5개씩 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-10">
                    {movies.map((movie) => {
                        const isSelected = movie_ids.includes(movie.id);

                        return (
                            <button
                                key={movie.id}
                                onClick={() => handleToggleMovie(movie.id)}
                                className={`
                                    group relative overflow-hidden
                                    bg-[#1A1A1A]
                                    border-2 transition-all duration-200
                                    rounded-xl
                                    aspect-[2/3]
                                    ${isSelected
                                        ? "border-white shadow-[0_0_0_2px_white]"
                                        : "border-gray-800 hover:border-gray-600"
                                    }
                                `}
                            >
                                {/* 체크 마크 */}
                                {isSelected && (
                                    <div className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center z-10">
                                        <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}

                                {/* 포스터 이미지 */}
                                <div className="relative w-full h-full">
                                    {movie.posterUrl ? (
                                        <img
                                            src={movie.posterUrl}
                                            alt={movie.title}
                                            className="w-full h-full object-cover rounded-xl"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl">
                                            <div className="text-4xl mb-2">🎬</div>
                                            <p className="text-white text-sm font-semibold px-2 text-center">{movie.title}</p>
                                        </div>
                                    )}

                                    {/* 선택 오버레이 */}
                                    {isSelected && (
                                        <div className="absolute inset-0 bg-white/10 rounded-xl" />
                                    )}
                                </div>

                                {/* 영화 제목 (포스터가 있을 때만 하단에 표시) */}
                                {movie.posterUrl && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3">
                                        <p className="text-white text-xs font-semibold truncate">{movie.title}</p>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* 선택 개수 */}
                <div className="text-center mb-8">
                    <p className="text-gray-400 text-sm">
                        <span className="text-white font-semibold text-lg">{movie_ids.length}</span>개 선택됨
                    </p>
                </div>

                {/* 버튼 */}
                <div className="flex gap-4 justify-center">
                    <button
                        onClick={handlePrevious}
                        className="px-8 py-3 border border-gray-700 text-gray-400 font-semibold rounded-xl hover:border-white hover:text-white transition-colors"
                    >
                        이전 단계
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={movie_ids.length === 0}
                        className={`px-8 py-3 font-semibold rounded-xl transition-colors ${movie_ids.length === 0
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-black hover:bg-gray-100'
                            }`}
                    >
                        다음 단계
                    </button>
                </div>
            </div>
        </div>
    );
}