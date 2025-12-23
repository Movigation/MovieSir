// [용도] OTT 플랫폼 선택 페이지 - 영화관 스타일
// [사용법] /onboarding/ott 라우트에서 사용

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { authAxiosInstance } from "@/api/axiosInstance";

// OTT 로고 컴포넌트 - public 폴더의 SVG URL 사용
const NetflixLogo = () => <img src="/logos/NETFLEX_Logo.svg" alt="Netflix" className="h-9 w-auto" />;
const DisneyLogo = () => <img src="/logos/Disney+_logo.svg" alt="Disney+" className="h-16 w-auto" />;
const WavveLogo = () => <img src="/logos/WAVVE_Logo.svg" alt="Wavve" className="h-8 w-auto" />;
const TvingLogo = () => <img src="/logos/TVING_Logo.svg" alt="TVING" className="h-8 w-auto" />;
const WatchaLogo = () => <img src="/logos/WATCHA_Logo_Main.svg" alt="Watcha" className="h-12 w-auto" />;
const AppleLogo = () => <img src="/logos/Apple_TV_logo.svg" alt="Apple TV+" className="h-10 w-auto" />;

const OTT_PLATFORMS = [
    { provider_id: 8, name: "Netflix", Logo: NetflixLogo },
    { provider_id: 97, name: "Watcha", Logo: WatchaLogo },
    { provider_id: 337, name: "Disney+", Logo: DisneyLogo },
    { provider_id: 356, name: "Wavve", Logo: WavveLogo },
    { provider_id: 1883, name: "TVING", Logo: TvingLogo },
    // { provider_id: 0, name: "Coupang Play", Logo: CoupangLogo, bg: "bg-[#0D0D0D]" },
    { provider_id: 350, name: "Apple TV+", Logo: AppleLogo },
    // { provider_id: 3, name: "google movie", Logo: googleMovieLogo }
];

export default function OTTSelectionPage() {
    const navigate = useNavigate();
    const { provider_ids, toggleOTT } = useOnboardingStore();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleNext = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // OTT 선택 데이터를 백엔드에 저장
            await authAxiosInstance.post('/onboarding/ott', {
                provider_ids: provider_ids
            });

            // 저장 성공 후 다음 단계로 이동
            navigate("/onboarding/movies");
        } catch (err: any) {
            console.error('OTT 선택 저장 실패:', err);
            setError(err.response?.data?.message || 'OTT 선택 저장에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="max-w-5xl w-full">
                {/* 미니멀 헤더 */}
                <div className="mb-12">
                    {/* 제목을 포함하는 컨테이너 */}
                    <div className="relative mb-4">

                        {/* 제목 - 중앙 정렬 */}
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight text-center">
                            서비스 선택
                        </h1>
                    </div>

                    <p className="text-gray-400 text-base text-center">구독 중인 스트리밍 서비스를 선택해주세요</p>
                </div>

                {/* OTT 그리드 - 미니멀 스타일 */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
                    {OTT_PLATFORMS.map((platform) => {
                        const isSelected = provider_ids.includes(platform.provider_id);
                        const { Logo } = platform;

                        return (
                            <button
                                key={platform.provider_id}
                                onClick={() => toggleOTT(platform.provider_id)}
                                className={`
                                    group relative overflow-hidden
                                    bg-white
                                    border transition-all duration-200
                                    rounded-2xl p-6 h-32
                                    ${isSelected
                                        ? "border-white shadow-[0_0_0_2px_white]"
                                        : "border-gray-800 hover:border-gray-600"
                                    }
                                `}
                            >
                                {/* 체크 마크 */}
                                {isSelected && (
                                    <div className="absolute top-3 right-3 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                                        <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}

                                {/* 로고 */}
                                <div className="relative z-10 flex items-center justify-center h-full opacity-90">
                                    <Logo />
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* 선택 개수 */}
                <div className="text-center mb-8">
                    <p className="text-gray-400 text-sm">
                        <span className="text-white font-semibold text-lg">{provider_ids.length}</span>개 선택됨
                    </p>
                </div>

                {/* 에러 메시지 */}
                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
                        <p className="text-red-400 text-sm text-center">{error}</p>
                    </div>
                )}

                {/* 버튼 - 미니멀 스타일 */}
                <div className="flex gap-4 justify-center">
                    <button
                        onClick={handleNext}
                        disabled={isLoading}
                        className={`px-8 py-3 font-semibold rounded-xl transition-colors ${isLoading
                            ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                            : "bg-white text-black hover:bg-gray-100"
                            }`}
                    >
                        {isLoading ? "저장 중..." : "다음 단계"}
                    </button>
                </div>
            </div>
        </div>
    );
}
