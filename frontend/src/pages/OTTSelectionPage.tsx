// [용도] OTT 플랫폼 선택 페이지 - 영화관 스타일
// [사용법] /onboarding/ott 라우트에서 사용

import { useNavigate } from "react-router-dom";
import { useOnboardingStore } from "@/store/onboardingStore";

// OTT 로고 SVG imports
import NetflixLogoSvg from "@/assets/logos/NETFLEX_Logo.svg";
import DisneyLogoSvg from "@/assets/logos/Disney+_logo.svg";
import PrimeLogoSvg from "@/assets/logos/Amazon_Prime_Logo.svg";
import WavveLogoSvg from "@/assets/logos/WAVVE_Logo.svg";
import TvingLogoSvg from "@/assets/logos/TVING_Logo.svg";
import WatchaLogoSvg from "@/assets/logos/WATCHA_Logo_Main.svg";
import AppleLogoSvg from "@/assets/logos/Apple_TV_logo.svg";
// import CoupangLogoSvg from "@/assets/logos/COUPANG_PLAY_Logo.svg";

// OTT 로고 컴포넌트 - 실제 SVG 파일 사용
const NetflixLogo = () => <img src={NetflixLogoSvg} alt="Netflix" className="h-32 w-auto" />;
const DisneyLogo = () => <img src={DisneyLogoSvg} alt="Disney+" className="h-16 w-auto" />;
const PrimeLogo = () => <img src={PrimeLogoSvg} alt="Prime Video" className="h-8 w-auto" />;
const WavveLogo = () => <img src={WavveLogoSvg} alt="Wavve" className="h-8 w-auto" />;
const TvingLogo = () => <img src={TvingLogoSvg} alt="TVING" className="h-8 w-auto" />;
const WatchaLogo = () => <img src={WatchaLogoSvg} alt="Watcha" className="h-8 w-auto" />;
const AppleLogo = () => <img src={AppleLogoSvg} alt="Apple TV+" className="h-8 w-auto" />;
// const CoupangLogo = () => <img src={CoupangLogoSvg} alt="Coupang Play" className="h-16 w-auto" />;

const OTT_PLATFORMS = [
    { provider_id: 8, name: "Netflix", Logo: NetflixLogo },
    { provider_id: 97, name: "Watcha", Logo: WatchaLogo },
    { provider_id: 337, name: "Disney+", Logo: DisneyLogo },
    { provider_id: 356, name: "Wavve", Logo: WavveLogo },
    { provider_id: 1883, name: "TVING", Logo: TvingLogo },
    // { provider_id: 0, name: "Coupang Play", Logo: CoupangLogo, bg: "bg-[#0D0D0D]" },
    { provider_id: 350, name: "Apple TV+", Logo: AppleLogo },
    { provider_id: 119, name: "Prime Video", Logo: PrimeLogo }
];

export default function OTTSelectionPage() {
    const navigate = useNavigate();
    const { provider_ids, toggleOTT } = useOnboardingStore();

    const handleNext = () => {
        // OTT 선택 완료 후 다음 단계로 이동
        navigate("/onboarding/movies");
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
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

                {/* 버튼 - 미니멀 스타일 */}
                <div className="flex gap-4 justify-center">
                    <button
                        onClick={handleNext}
                        className="px-8 py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        다음 단계
                    </button>
                </div>
            </div>
        </div>
    );
}
