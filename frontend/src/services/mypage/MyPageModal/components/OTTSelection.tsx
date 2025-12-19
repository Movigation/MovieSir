// [용도] OTT 선택 컴포넌트 (마이페이지)
// [사용법] <OTTSelection onBack={() => setView('main')} />

import { useState, useEffect } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { authAxiosInstance } from '@/api/axiosInstance';

// OTT 로고 imports
import NetflixLogoSvg from "@/assets/logos/NETFLEX_Logo.svg";
import DisneyLogoSvg from "@/assets/logos/Disney+_logo.svg";
// import PrimeLogoSvg from "@/assets/logos/Amazon_Prime_Logo.svg";
import WavveLogoSvg from "@/assets/logos/WAVVE_Logo.svg";
import TvingLogoSvg from "@/assets/logos/TVING_Logo.svg";
import WatchaLogoSvg from "@/assets/logos/WATCHA_Logo_Main.svg";
import AppleLogoSvg from "@/assets/logos/Apple_TV_logo.svg";

// OTT 로고 컴포넌트 - 실제 SVG 파일 사용
const NetflixLogo = () => <img src={NetflixLogoSvg} alt="Netflix" className="h-8 w-auto" />;
const DisneyLogo = () => <img src={DisneyLogoSvg} alt="Disney+" className="h-5 w-auto" />;
// const googleMovieLogo = () => <img src={googleMovieLogoSvg} alt="google movie" className="h-8 w-auto" />;
const WavveLogo = () => <img src={WavveLogoSvg} alt="Wavve" className="h-3 w-auto" />;
const TvingLogo = () => <img src={TvingLogoSvg} alt="TVING" className="h-3 w-auto" />;
const WatchaLogo = () => <img src={WatchaLogoSvg} alt="Watcha" className="h-3 w-auto" />;
const AppleLogo = () => <img src={AppleLogoSvg} alt="Apple TV+" className="h-5 w-auto" />;
// const CoupangLogo = () => <img src={CoupangLogoSvg} alt="Coupang Play" className="h-16 w-auto" />;

// OTT 플랫폼 정의 (백엔드 DB와 일치)
const OTT_PLATFORMS = [
    { provider_id: 8, name: "Netflix", logo: NetflixLogo },
    { provider_id: 97, name: "Watcha", logo: WatchaLogo },
    { provider_id: 337, name: "Disney+", logo: DisneyLogo },
    { provider_id: 356, name: "Wavve", logo: WavveLogo },
    { provider_id: 1883, name: "TVING", logo: TvingLogo },
    { provider_id: 350, name: "Apple TV+", logo: AppleLogo },
    // { provider_id: 119, name: "Prime Video", logo: PrimeLogoSvg }
];

type OTTSelectionProps = {
    onBack: () => void;
};

export default function OTTSelection({ onBack }: OTTSelectionProps) {
    const [selectedProviderIds, setSelectedProviderIds] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // 사용자의 현재 OTT 선택 불러오기
    useEffect(() => {
        loadUserOTT();
    }, []);

    const loadUserOTT = async () => {
        setIsLoading(true);
        try {
            // 백엔드에서 사용자 OTT 목록 가져오기
            // TODO: 실제 API 엔드포인트가 있으면 사용
            // const response = await authAxiosInstance.get("/user/ott");
            // setSelectedProviderIds(response.data.provider_ids);

            // 임시: localStorage에서 로드 (개발 중)
            const saved = localStorage.getItem('userOttProviders');
            if (saved) {
                setSelectedProviderIds(JSON.parse(saved));
            }
        } catch (error) {
            console.error('OTT 불러오기 실패:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleOTT = (providerId: number) => {
        setSelectedProviderIds(prev =>
            prev.includes(providerId)
                ? prev.filter(id => id !== providerId)
                : [...prev, providerId]
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // POST /onboarding/ott 재사용 (Idempotent 패턴)
            await authAxiosInstance.post("/onboarding/ott", {
                provider_ids: selectedProviderIds
            });

            // 로컬 스토리지에도 저장 (캐싱)
            localStorage.setItem('userOttProviders', JSON.stringify(selectedProviderIds));

            alert('OTT 선택이 저장되었습니다!');
            onBack();
        } catch (error: any) {
            console.error('OTT 저장 실패:', error);
            const errorMsg = error?.response?.data?.detail || 'OTT 저장에 실패했습니다.';
            alert(errorMsg);
        } finally {
            setIsSaving(false);
        }
    };

    const selectedPlatforms = OTT_PLATFORMS.filter(p =>
        selectedProviderIds.includes(p.provider_id)
    );

    return (
        <div className="flex flex-col h-full">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="text-gray-400 hover:text-white transition-colors"
                        disabled={isSaving}
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h2 className="text-xl font-bold text-white">OTT 플랫폼 설정</h2>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                    <Save size={18} />
                    {isSaving ? '저장 중...' : '저장'}
                </button>
            </div>

            {/* 내용 */}
            <div className="flex-1 overflow-y-auto p-4">
                <p className="text-gray-400 text-sm mb-4">
                    구독 중인 OTT 플랫폼을 선택하면 맞춤 영화를 추천해드립니다.
                </p>

                {isLoading ? (
                    <div className="text-center text-gray-400 py-8">불러오는 중...</div>
                ) : (
                    <div className="space-y-3">
                        {OTT_PLATFORMS.map((platform) => (
                            <label
                                key={platform.provider_id}
                                className="flex items-center gap-4 p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedProviderIds.includes(platform.provider_id)}
                                    onChange={() => handleToggleOTT(platform.provider_id)}
                                    className="w-5 h-5 rounded border-gray-400 text-blue-500 focus:ring-blue-500"
                                />
                                <platform.logo />
                                <span className="text-white font-medium">{platform.name}</span>
                            </label>
                        ))}
                    </div>
                )}

                {selectedPlatforms.length > 0 && (
                    <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <h4 className="text-blue-400 font-medium mb-3">선택된 OTT ({selectedPlatforms.length}개)</h4>
                        <div className="flex flex-wrap gap-2">
                            {selectedPlatforms.map((platform) => (
                                <span
                                    key={platform.provider_id}
                                    className="px-3 py-1.5 bg-blue-500 text-white rounded-full text-sm flex items-center gap-2"
                                >
                                    <platform.logo />
                                    {platform.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
