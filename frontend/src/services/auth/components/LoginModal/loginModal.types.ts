// [용도] LoginModal 컴포넌트의 타입 정의
// [사용법] import type { LoginModalProps } from '@/services/auth/components/LoginModal/loginModal.types';

export type LoginModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSignupClick?: () => void;
};

export type LoginFormData = {
    email: string;
    password: string;
};

export type LoginFormErrors = {
    email?: string;
    password?: string;
};
