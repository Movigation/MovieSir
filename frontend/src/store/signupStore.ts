// [용도] 회원가입 플로우 상태 관리
// [사용법] import { useSignupStore } from '@/store/signupStore';

import { create } from 'zustand';

interface SignupState {
    // 사용자 입력 데이터
    nickname: string;
    email: string;
    password: string;
    verificationCode: string;

    // 현재 단계 (1-4)
    currentStep: 1 | 2 | 3 | 4;

    // 로딩 상태
    isLoading: boolean;
    error: string;

    // Actions
    setNickname: (nickname: string) => void;
    setEmail: (email: string) => void;
    setPassword: (password: string) => void;
    setVerificationCode: (code: string) => void;
    setCurrentStep: (step: 1 | 2 | 3 | 4) => void;
    setIsLoading: (loading: boolean) => void;
    setError: (error: string) => void;
    nextStep: () => void;
    previousStep: () => void;
    reset: () => void;
}

export const useSignupStore = create<SignupState>((set, get) => ({
    // Initial state
    nickname: '',
    email: '',
    password: '',
    verificationCode: '',
    currentStep: 1,
    isLoading: false,
    error: '',

    // Setters
    setNickname: (nickname) => set({ nickname }),
    setEmail: (email) => set({ email }),
    setPassword: (password) => set({ password }),
    setVerificationCode: (code) => set({ verificationCode: code }),
    setCurrentStep: (step) => set({ currentStep: step }),
    setIsLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),

    // Navigation
    nextStep: () => {
        const { currentStep } = get();
        if (currentStep < 4) {
            set({ currentStep: (currentStep + 1) as 1 | 2 | 3 | 4 });
        }
    },

    previousStep: () => {
        const { currentStep } = get();
        if (currentStep > 1) {
            set({ currentStep: (currentStep - 1) as 1 | 2 | 3 | 4 });
        }
    },

    // Reset all state
    reset: () => set({
        nickname: '',
        email: '',
        password: '',
        verificationCode: '',
        currentStep: 1,
        isLoading: false,
        error: '',
    }),
}));
