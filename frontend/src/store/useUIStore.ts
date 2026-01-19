import { create } from 'zustand';

interface UIState {
    isChatbotOpen: boolean;
    setIsChatbotOpen: (isOpen: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
    isChatbotOpen: false,
    setIsChatbotOpen: (isOpen) => set({ isChatbotOpen: isOpen }),
}));
