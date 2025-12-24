// [용도] 온보딩 영화 선택 페이지 (그리드 선택 방식)
// [사용법] /onboarding/movies 라우트에서 사용

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import type { OnboardingMovie } from "@/api/onboardingApi.type";
import { skipOnboarding } from "@/api/onboardingApi";
import axiosInstance from "@/api/axiosInstance";

export default function MovieSelectionPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const {
        addLikedMovie,
        removeLikedMovie,
        movie_ids,
        setMovies: setGlobalMovies,
        clearMovieSelection  // 영화 선택 초기화 함수
    } = useOnboardingStore();

    // 온보딩 재조사 팝업에서 왔는지 확인
    const isFromReminderModal = searchParams.get('fromReminder') === 'true';

    const [movies, setMovies] = useState<OnboardingMovie[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false); // 제출 중 상태
    const [error, setError] = useState("");
    const [isSkipModalOpen, setIsSkipModalOpen] = useState(false); // 건너뛰기 확인 모달

    // 영화 데이터 로드
    useEffect(() => {
        // 페이지 진입 시 이전 영화 선택 초기화
        clearMovieSelection();

        const loadMovies = async () => {
            setIsLoading(true);
            setError("");
            try {
                // 백엔드 API 호출: GET /onboarding/survey/movies
                const response = await axiosInstance.get("/onboarding/survey/movies");

                // 응답 데이터에서 movies 배열 추출
                const moviesData = response.data.movies || [];
                setMovies(moviesData);
                setGlobalMovies(moviesData); // 스토어에 저장
                console.log("✅ 영화 로딩 성공:", moviesData);
            } catch (err: any) {
                console.error("⚠️ 영화 로딩 에러 (백엔드 연결 실패, 임시 데이터 사용):", err);

                // 🔧 임시 데이터: 백엔드 연결 실패 시 사용
                const mockMovies: OnboardingMovie[] = [
                    { movie_id: 157336, mood_tag: "액션", title: "인터스텔라", poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg" },
                    { movie_id: 27205, mood_tag: "SF", title: "인셉션", poster_path: "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg" },
                    { movie_id: 155, mood_tag: "액션", title: "다크 나이트", poster_path: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg" },
                    { movie_id: 496243, mood_tag: "드라마", title: "기생충", poster_path: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg" },
                    { movie_id: 299534, mood_tag: "액션", title: "어벤져스: 엔드게임", poster_path: "/or06FN3Dka5tukK1e9sl16pB3iy.jpg" },
                    { movie_id: 597, mood_tag: "로맨스", title: "타이타닉", poster_path: "/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg" },
                    { movie_id: 603, mood_tag: "SF", title: "매트릭스", poster_path: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg" },
                    { movie_id: 313369, mood_tag: "로맨스", title: "라라랜드", poster_path: "/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg" },
                    { movie_id: 475557, mood_tag: "드라마", title: "조커", poster_path: "/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg" },
                    { movie_id: 19995, mood_tag: "SF", title: "아바타", poster_path: "/kyeqWdyUXW608qlYkRqosgbbJyK.jpg" }
                ];

                setMovies(mockMovies);
                setGlobalMovies(mockMovies); // 스토어에 저장 (임시 데이터도)
                // 에러는 표시하지 않고 임시 데이터로 진행
            } finally {
                setIsLoading(false);
            }
        };

        loadMovies();
    }, [clearMovieSelection, setGlobalMovies]);


    // 영화 선택/해제 토글
    const handleToggleMovie = (movieId: number) => {
        if (movie_ids.includes(movieId)) {
            removeLikedMovie(movieId);
        } else {
            addLikedMovie(movieId);
        }
    };

    const handleNext = async () => {
        if (movie_ids.length === 0) {
            alert("최소 1개 이상의 영화를 선택해주세요.");
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            // POST /onboarding/survey API 호출
            await axiosInstance.post("/onboarding/survey", {
                movie_ids: movie_ids
            });

            console.log("✅ 취향 영화 저장 성공:", movie_ids);

            // 성공 시 다음 페이지로 이동 (fromReminder 파라미터 전달)
            const nextUrl = isFromReminderModal
                ? "/onboarding/complete?fromReminder=true"
                : "/onboarding/complete";
            navigate(nextUrl);
        } catch (err: any) {
            console.error("❌ 취향 영화 저장 실패:", err);

            // 에러 메시지 표시
            const errorMessage = err.response?.data?.detail || "영화 저장에 실패했습니다. 다시 시도해주세요.";
            setError(errorMessage);
            alert(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    // 건너뛰기 버튼 클릭 시 모달 열기
    const handleSkip = () => {
        setIsSkipModalOpen(true);
    };

    // 건너뛰기 확인 (실제 스킵 로직)
    const confirmSkip = async () => {
        setIsSkipModalOpen(false);
        setIsSubmitting(true);
        setError("");

        try {
            // 1. 영화 선택 데이터 초기화 (건너뛰기이므로)
            clearMovieSelection();

            // 2. POST /onboarding/skip API 호출 (온보딩 완료 처리)
            // skip 엔드포인트가 영화 선택 없이 온보딩 완료 처리
            await skipOnboarding();
            console.log("✅ 온보딩 스킵 완료");

            // 온보딩 완료 페이지로 이동 (fromReminder 파라미터 전달)
            const nextUrl = isFromReminderModal
                ? "/onboarding/complete?fromReminder=true"
                : "/onboarding/complete";
            navigate(nextUrl);
        } catch (err: any) {
            console.error("❌ 온보딩 스킵 실패:", err);

            // 스킵이므로 실패해도 완료 페이지로 이동 (fromReminder 파라미터 전달)
            const nextUrl = isFromReminderModal
                ? "/onboarding/complete?fromReminder=true"
                : "/onboarding/complete";
            navigate(nextUrl);
        } finally {
            setIsSubmitting(false);
        }
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
                            disabled={isSubmitting}
                            className={`absolute right-0 top-0 px-4 md:px-8 py-2 md:py-3 border border-gray-700 font-semibold rounded-xl transition-colors text-sm md:text-base ${isSubmitting
                                ? 'text-gray-600 cursor-not-allowed'
                                : 'text-gray-400 hover:border-white hover:text-white'
                                }`}
                        >
                            {isSubmitting ? "처리 중..." : "건너뛰기"}
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
                        const isSelected = movie_ids.includes(movie.movie_id);

                        return (
                            <button
                                key={movie.movie_id}
                                onClick={() => handleToggleMovie(movie.movie_id)}
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
                                    {movie.poster_path ? (
                                        <img
                                            src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
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
                                {movie.poster_path && (
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
                        disabled={movie_ids.length === 0 || isSubmitting}
                        className={`px-8 py-3 font-semibold rounded-xl transition-colors ${movie_ids.length === 0 || isSubmitting
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-black hover:bg-gray-100'
                            }`}
                    >
                        {isSubmitting ? "저장 중..." : "다음 단계"}
                    </button>
                </div>
            </div>

            {/* 건너뛰기 확인 모달 */}
            {isSkipModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75 backdrop-blur-sm">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md mx-auto p-6 md:p-8 shadow-2xl transform transition-all">
                        {/* 아이콘 */}
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-yellow-500 bg-opacity-20 rounded-full flex items-center justify-center">
                                <svg
                                    className="w-8 h-8 text-yellow-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                            </div>
                        </div>

                        {/* 제목 */}
                        <h3 className="text-xl md:text-2xl font-bold text-white text-center mb-3">
                            영화 선택을 건너뛰시겠어요?
                        </h3>

                        {/* 설명 */}
                        <p className="text-gray-400 text-center mb-6 text-sm md:text-base">
                            영화를 선택하면 더 정확한 추천을 받을 수 있습니다.
                            <br />
                            나중에 다시 설정할 수 있습니다.
                        </p>

                        {/* 버튼 */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => setIsSkipModalOpen(false)}
                                className="flex-1 px-6 py-3 border border-gray-700 text-gray-300 font-semibold rounded-xl hover:border-white hover:text-white transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={confirmSkip}
                                disabled={isSubmitting}
                                className={`flex-1 px-6 py-3 font-semibold rounded-xl transition-colors ${isSubmitting
                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    : 'bg-white text-black hover:bg-gray-100'
                                    }`}
                            >
                                {isSubmitting ? "처리 중..." : "건너뛰기"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}