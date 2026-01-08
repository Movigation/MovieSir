import { useState } from 'react';
import { type OTTPlatform } from '@/api/movieApi.type';
import { getOttLogoWithFallback } from '@/utils/ottLogoMapper';

interface DetailOTTSectionProps {
    ottProviders: OTTPlatform[];
}

export default function DetailOTTSection({ ottProviders }: DetailOTTSectionProps) {
    const [activeTab, setActiveTab] = useState<'SUBSCRIPTION' | 'OTHERS'>('SUBSCRIPTION');

    if (!ottProviders || ottProviders.length === 0) return null;

    const subscriptions = ottProviders.filter(ott => ott.payment_type === 'SUBSCRIPTION');
    const others = ottProviders.filter(ott => ott.payment_type !== 'SUBSCRIPTION');

    // 탭 정보 구성
    const tabs = [
        { id: 'SUBSCRIPTION', label: '구독', count: subscriptions.length, data: subscriptions },
        { id: 'OTHERS', label: '대여/구매', count: others.length, data: others },
    ] as const;

    // 만약 한쪽 탭에만 데이터가 있다면 자동으로 그 탭을 선택하게 할 수도 있지만, 
    // 기본적으로 'SUBSCRIPTION'을 보게 하거나 데이터가 있는 첫 탭을 잡는 것이 좋습니다.

    const activeData = activeTab === 'SUBSCRIPTION' ? subscriptions : others;

    return (
        <div className="flex flex-col gap-3">
            {/* 탭 헤더 */}
            <div className="flex border-b border-gray-100 dark:border-white/10">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative px-4 py-2.5 text-[14px] sm:text-[15px] transition-all ${activeTab === tab.id
                            ? 'font-bold text-gray-900 dark:text-white'
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}
                    >
                        {tab.label}
                        <span className="ml-1 text-[11px] sm:text-xs opacity-60">
                            {tab.count}
                        </span>
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                        )}
                    </button>
                ))}
            </div>

            {/* 탭 콘텐츠 */}
            <div className="min-h-[50px]">
                {activeData.length > 0 ? (
                    <div className="flex flex-wrap gap-2.5 sm:gap-4">
                        {activeData.map((ott) => (
                            <OTTLink key={ott.ott_id} ott={ott} />
                        ))}
                    </div>
                ) : (
                    <div className="py-4 text-center">
                        <p className="text-gray-400 text-sm">제공되는 플랫폼이 없습니다.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function OTTLink({ ott }: { ott: OTTPlatform }) {
    return (
        <a
            href={ott.watch_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center p-1.5 sm:p-2 w-[90px] sm:w-[120px] h-[35px] sm:h-[45px] bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors border border-black/5 dark:border-white/5"
        >
            <div className="w-12 sm:w-16 h-6 sm:h-8 flex items-center justify-center">
                <img
                    src={getOttLogoWithFallback(ott.ott_name, ott.ott_logo)}
                    alt={ott.ott_name}
                    className="max-h-full max-w-full object-contain"
                />
            </div>
        </a>
    );
}
