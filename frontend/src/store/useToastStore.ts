import { create } from 'zustand';

interface ToastState {
    message: string;
    isVisible: boolean;
    duration: number;
    showToast: (message: string, duration?: number) => void;
    hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
    message: '',
    isVisible: false,
    duration: 3000,
    showToast: (message: string, duration = 3000) => {
        set({ message, isVisible: true, duration });

        // 이전 타이머가 있을 경우를 대비해 초기화 로직은 컴포넌트에서 처리하거나 
        // 여기서 관리할 수 있지만, 단순함을 위해 상태만 변경합니다.
    },
    hideToast: () => set({ isVisible: false }),
}));
