import { useEffect, useState } from 'react';
import { useToastStore } from '@/store/useToastStore';

export default function Toast() {
    const { isVisible, message, duration, hideToast } = useToastStore();
    const [shouldRender, setShouldRender] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setShouldRender(true);
            // 등장 애니메이션을 위한 딜레이
            setTimeout(() => setIsAnimating(true), 10);

            const timer = setTimeout(() => {
                setIsAnimating(false);
                // 퇴장 애니메이션(300ms) 후 렌더링 종료
                setTimeout(() => {
                    setShouldRender(false);
                    hideToast();
                }, 300);
            }, duration);

            return () => clearTimeout(timer);
        } else {
            setIsAnimating(false);
            setShouldRender(false);
        }
    }, [isVisible, message, duration, hideToast]);

    if (!shouldRender) return null;

    return (
        <div className="fixed inset-x-0 bottom-10 flex justify-center z-[9999] pointer-events-none p-4">
            <div
                className={`
                    px-6 py-3 bg-gray-900/90 backdrop-blur-md border border-white/10 
                    text-white text-sm font-medium rounded-2xl shadow-2xl 
                    transition-all duration-300 ease-out transform
                    ${isAnimating ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'}
                `}
                style={{ maxWidth: '90vw' }}
            >
                <div className="flex items-center gap-2">
                    <span className="text-blue-400">ℹ️</span>
                    <p className="whitespace-pre-line text-center">{message}</p>
                </div>
            </div>
        </div>
    );
}
