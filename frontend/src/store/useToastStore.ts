import { create } from 'zustand';

interface ToastAction {
    label: string;
    onClick: () => void;
}

interface ToastState {
    message: string;
    isVisible: boolean;
    duration: number;
    action?: ToastAction;
    isPersistent: boolean;
    showToast: (message: string, duration?: number, action?: ToastAction, isPersistent?: boolean) => void;
    hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
    message: '',
    isVisible: false,
    duration: 3000,
    action: undefined,
    isPersistent: false,
    showToast: (message, duration = 3000, action, isPersistent = false) => {
        set({ message, isVisible: true, duration, action, isPersistent });
    },
    hideToast: () => set({ isVisible: false, action: undefined, isPersistent: false }),
}));
