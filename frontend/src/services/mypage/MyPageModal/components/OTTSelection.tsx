// [용도] OTT 선택 컴포넌트 (마이페이지)
// [사용법] <OTTSelection onBack={() => setView('main')} />

import { useState, useEffect } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { authAxiosInstance } from '@/api/axiosInstance';
import SettingItem from './SettingItem';
import ConfirmModal from '@/components/ui/ConfirmModal';

// OTT 플랫폼 정의 (백엔드 DB와 일치) - public 폴더 URL 사용
const OTT_PLATFORMS = [
    { provider_id: 8, name: "Netflix", logo: "/logos/NETFLEX_Logo.svg", logoSize: "h-12" },
    { provider_id: 97, name: "Watcha", logo: "/logos/WATCHA_Logo_Main.svg", logoSize: "h-5" },
    { provider_id: 337, name: "Disney+", logo: "/logos/Disney+_logo.svg", logoSize: "h-12" },
    { provider_id: 356, name: "Wavve", logo: "/logos/WAVVE_Logo.svg", logoSize: "h-4" },
    { provider_id: 1883, name: "TVING", logo: "/logos/TVING_Logo.svg", logoSize: "h-4" },
    { provider_id: 350, name: "Apple TV+", logo: "/logos/Apple_TV_logo.svg", logoSize: "h-4" },
    // { provider_id: 119, name: "Prime Video", logo: "/logos/Amazon_Prime_Logo.svg", logoSize: "h-4" }
];

type OTTSelectionProps = {
    onBack: () => void;
};

export default function OTTSelection({ onBack }: OTTSelectionProps) {
    const [selectedProviderIds, setSelectedProviderIds] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [modalState, setModalState] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // 사용자의 현재 OTT 선택 불러오기
    useEffect(() => {
        loadUserOTT();
    }, []);

    const loadUserOTT = async () => {
        setIsLoading(true);
        try {
            const response = await authAxiosInstance.get("/mypage/ott");
            // 백엔드 응답: { current_ott_ids: number[] }
            const providerIds = response.data.current_ott_ids || [];
            setSelectedProviderIds(providerIds);
        } catch {
            setSelectedProviderIds([]);
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
            await authAxiosInstance.put("/mypage/ott", {
                ott_ids: selectedProviderIds
            });

            setModalState({ type: 'success', message: 'OTT 선택이 저장되었습니다!' });
        } catch (error: any) {
            const errorMsg = error?.response?.data?.detail || 'OTT 저장에 실패했습니다.';
            setModalState({ type: 'error', message: errorMsg });
        } finally {
            setIsSaving(false);
        }
    };

    const handleModalClose = () => {
        if (modalState?.type === 'success') {
            setModalState(null);
            onBack();
        } else {
            setModalState(null);
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
                            <SettingItem
                                key={platform.provider_id}
                                as="label"
                                className="flex items-center gap-4"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedProviderIds.includes(platform.provider_id)}
                                    onChange={() => handleToggleOTT(platform.provider_id)}
                                    className="w-5 h-5 rounded border-gray-400 text-blue-500 focus:ring-blue-500"
                                />
                                <div className="w-12 h-8 flex items-center justify-center">
                                    <img src={platform.logo} alt={platform.name} className={`${platform.logoSize} w-auto object-contain`} />
                                </div>
                                <span className="text-black dark:text-white font-medium">{platform.name}</span>
                            </SettingItem>
                        ))}
                    </div>
                )}

                {selectedPlatforms.length > 0 && (
                    <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <h3 className="text-blue-400 font-medium mb-3">선택된 OTT ({selectedPlatforms.length}개)</h3>
                        <div className="flex flex-wrap gap-2">
                            {selectedPlatforms.map((platform) => (
                                <span
                                    key={platform.provider_id}
                                    className="px-3 py-1.5 bg-blue-500 text-white rounded-full text-sm flex items-center gap-2"
                                >
                                    <img src={platform.logo} alt={platform.name} className="h-3 w-auto object-contain" />
                                    {platform.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* 결과 모달 */}
            <ConfirmModal
                isOpen={!!modalState}
                type={modalState?.type === 'success' ? 'alert' : 'info'}
                title={modalState?.type === 'success' ? '저장 완료' : '오류'}
                message={modalState?.message || ''}
                onConfirm={handleModalClose}
            />
        </div>
    );
}
