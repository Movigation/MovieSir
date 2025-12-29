// [용도] 온보딩 리마인더 모달 - 건너뛴 사용자에게 재시도 기회 제공
// [사용법] showModal이 true일 때 자동으로 표시

import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthContext";

interface Props {
    visible: boolean;
    onClose: () => void;
    onPermanentDismiss: () => void; // "다시 보지 않기" 콜백
}

export default function OnboardingReminderModal({ visible, onClose, onPermanentDismiss }: Props) {
    const navigate = useNavigate();
    const { user } = useAuth(); // 사용자 정보 가져오기

    if (!visible) return null;

    const handleRedoSurvey = () => {
        onClose();

        // sessionStorage에 리마인더에서 진입했음을 표시 (완료 시까지 유지)
        sessionStorage.setItem('onboarding_from_reminder', 'true');

        // ⚠️ OTT는 선택사항이므로 재조사 불필요
        // 장르 선호도 조사만 다시 진행
        // 항상 장르 스와이프 페이지로 이동
        console.log("재조사 시작 - 장르 선호도 페이지로 이동");
        navigate("/onboarding/movies");
    };

    const handleSkip = () => {
        // 모달만 닫고 메인 페이지 유지 (다음 로그인 시 다시 표시됨)
        onClose();
    };

    const handlePermanentDismiss = () => {
        // 영구적으로 모달을 보지 않음
        onPermanentDismiss();
    };

    // 장르만 중요하므로 메시지 간소화
    const getSkippedMessage = () => {
        return "지난번에 장르 선호도 조사를 건너뛰셨어요.";
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
                <button
                    onClick={handleSkip}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                    aria-label="닫기"
                >
                    <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>

                {/* 아이콘 */}
                {/* <div className="flex justify-center mb-6">
                    <div className="text-7xl">🎯</div>
                </div> */}

                {/* 제목 */}
                <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
                    정확한 추천을 위해서는<br />
                    {user?.nickname || '당신'}님의 취향 정보가 필요해요
                </h2>

                {/* 설명 - 스킵 항목에 따라 동적으로 표시 */}
                <p className="text-gray-300 text-center mb-8 leading-relaxed">
                    {getSkippedMessage()}<br />
                    지금 완료하시겠어요?
                </p>

                {/* 버튼 */}
                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleRedoSurvey}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all shadow-lg hover:scale-105"
                    >
                        다시 설문하기 🚀
                    </button>
                    <button
                        onClick={handleSkip}
                        className="w-full py-3 bg-gray-700 text-gray-300 font-medium rounded-lg hover:bg-gray-600 hover:text-white transition-colors"
                    >
                        건너뛰기
                    </button>
                </div>

                {/* 하단: 다시 보지 않기 & 안내 */}
                <div className="flex justify-between items-center mt-6">
                    {/* 왼쪽: 다시 보지 않기 */}
                    <button
                        onClick={handlePermanentDismiss}
                        className="text-xs text-gray-500 hover:text-gray-300 transition-colors underline"
                    >
                        다시 보지 않기
                    </button>

                    {/* 오른쪽: 부가 안내 */}
                    <p className="text-xs text-gray-500 text-right">
                        언제든 마이페이지에서 취향 정보를 업데이트할 수 있습니다
                    </p>
                </div>
            </div>
        </div>
    );
}
