// [용도] 온보딩 리마인더 모달 - 건너뛴 사용자에게 재시도 기회 제공
// [사용법] showModal이 true일 때 자동으로 표시

import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/app/providers/AuthContext";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import axiosInstance from "@/api/axiosInstance";
import CloseButton from "@/components/ui/CloseButton";

interface Props {
    visible: boolean;
    onClose: () => void;
}

export default function OnboardingReminderModal({ visible, onClose }: Props) {
    const navigate = useNavigate();
    const { user } = useAuth(); // 사용자 정보 가져오기

    // [추가] 모달이 뜰 때 영화 데이터 및 이미지 프리페칭
    useEffect(() => {
        if (!visible) return;

        const prefetchMovies = async () => {
            try {
                // 이미 데이터가 있으면 중복 호출 방지
                const storedMovies = useOnboardingStore.getState().movies;
                if (storedMovies && storedMovies.length > 0) return;

                const response = await axiosInstance.get("/onboarding/survey/movies");
                const movies = response.data.movies || [];

                // 1. 데이터 저장
                useOnboardingStore.getState().setMovies(movies);

                // 2. 이미지 미리 로드 (브라우저 캐시 활용)
                movies.forEach((movie: any) => {
                    if (movie.poster_path) {
                        const img = new Image();
                        img.src = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
                    }
                });

                console.log("리마인더 시점: 영화 데이터 및 이미지 프리페칭 완료");
            } catch (err) {
                console.warn("⚠️ 리마인더 프리페칭 실패:", err);
            }
        };

        prefetchMovies();
    }, [visible]);

    if (!visible) return null;

    const handleRedoSurvey = () => {
        onClose();

        // sessionStorage에 플래그 설정
        sessionStorage.setItem('onboarding_from_reminder', 'true');
        sessionStorage.setItem('onboarding_in_progress', 'true');
        console.log("🎬 온보딩 플로우 시작 (리마인더)");

        // 항상 장르 스와이프 페이지로 이동
        console.log("재조사 시작 - 장르 선호도 페이지로 이동");
        navigate("/onboarding/movies");
    };

    const handleSkip = () => {
        // 모달만 닫고 메인 페이지 유지 (다음 로그인 시 다시 표시됨)
        onClose();
    };

    // 장르만 중요하므로 메시지 간소화
    const getSkippedMessage = () => {
        return "";
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* 배경 오버레이 */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={handleSkip}
            />

            {/* 모달 컨텐츠 */}
            <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 max-w-md w-full border border-gray-700 shadow-2xl">
                {/* 닫기 버튼 */}
                <CloseButton
                    onClose={handleSkip}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                    aria-label="닫기"
                />
                {/* 제목 */}
                <h2 className="text-xl md:text-[28px] font-bold text-white text-center mb-5">
                    아직 추천 정보가 부족해요!<br />
                </h2>
                {/* 설명 - 스킵 항목에 따라 동적으로 표시 */}
                <p className="text-gray-300 text-center mb-5 leading-relaxed text-[10px] md:text-base">
                    {getSkippedMessage()}
                    {user?.nickname || '당신'}님의 취향을 알면 더 좋은 영화를 찾을 수 있어요!<br />
                    어떤 영화를 좋아하시나요?
                </p>

                {/* 버튼 */}
                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleRedoSurvey}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-600 text-white font-bold rounded-lg hover:from-blue-500 hover:to-blue-500 transition-all shadow-lg hover:scale-105"
                    >
                        추천 정확도 높이기
                    </button>
                    <button
                        onClick={handleSkip}
                        className="w-full py-3 bg-gray-700 text-gray-300 font-medium rounded-lg hover:bg-gray-600 hover:text-white transition-colors"
                    >
                        건너뛰기
                    </button>
                </div>
                <p className="text-[8px] sm:text-sm text-gray-500 text-right">
                    취향 영화 조사를 완료해야 더 정확한 추천을 받을 수 있어요.
                </p>
            </div>
        </div>
    );
}
