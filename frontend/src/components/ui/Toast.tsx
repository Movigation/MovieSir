import { useEffect, useState } from 'react';
import { useToastStore } from '@/store/useToastStore';

export default function Toast() {
    const { isVisible, message, duration, action, isPersistent, hideToast } = useToastStore();
    const [shouldRender, setShouldRender] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setShouldRender(true);
            setTimeout(() => setIsAnimating(true), 10);

            let timer: NodeJS.Timeout;
            if (!isPersistent) {
                timer = setTimeout(() => {
                    setIsAnimating(false);
                    setTimeout(() => {
                        setShouldRender(false);
                        hideToast();
                    }, 300);
                }, duration);
            }

            // 전역 클릭 리스너 (persistent 모드이거나 아니거나 클릭 시 닫기 가능)
            const handleGlobalClick = () => {
                setIsAnimating(false);
                setTimeout(() => {
                    setShouldRender(false);
                    hideToast();
                }, 300);
            };

            // 약간의 지연 후 리스너 등록 (토스트를 띄운 클릭에 바로 닫히지 않도록)
            const clickTimer = setTimeout(() => {
                window.addEventListener('click', handleGlobalClick);
            }, 100);

            return () => {
                if (timer) clearTimeout(timer);
                clearTimeout(clickTimer);
                window.removeEventListener('click', handleGlobalClick);
            };
        } else {
            setIsAnimating(false);
            setShouldRender(false);
        }
    }, [isVisible, message, duration, isPersistent, hideToast]);

    if (!shouldRender) return null;

    return (
        <div className="fixed inset-x-0 bottom-10 flex justify-center z-[90010] pointer-events-none p-4">
            <div
                className={`
                    px-6 py-3 bg-gray-900/90 backdrop-blur-md border border-white/10 
                    text-white text-sm font-medium rounded-2xl shadow-2xl 
                    transition-all duration-300 ease-out transform
                    pointer-events-auto
                    ${isAnimating ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'}
                `}
                style={{ maxWidth: '90vw' }}
            >
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-blue-400">ℹ️</span>
                        <p className="whitespace-pre-line">{message}</p>
                    </div>

                    {action && (
                        <button
                            onClick={() => {
                                action.onClick();
                                hideToast();
                            }}
                            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
                        >
                            {action.label}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
