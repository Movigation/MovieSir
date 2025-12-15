// [용도] SignupModal 컴포넌트의 타입 정의
// [사용법] import type { SignupModalProps } from '@/services/auth/components/SignupModal/signupModal.types';

export type SignupModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

export type SignupFormData = {
    email: string;
    password: string;
    passwordConfirm: string;
    name: string;
};

export interface SignupErrors {
    email: string;
    nickname: string;
    password: string;
    passwordConfirm: string;
    code: string;
    general: string;
}

// 필드별 검증 상태
export type ValidationStatus = 'idle' | 'checking' | 'valid' | 'invalid' | 'duplicate';
