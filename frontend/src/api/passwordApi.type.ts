// [용도] 비밀번호 재설정 API 타입 정의
// [사용법] import { PasswordResetRequest, PasswordReset } from "@/api/passwordApi.type";

export interface PasswordResetRequest {
    email: string;
    requestedAt: string;
}

export interface PasswordReset {
    id: string;
    userId: string;
    token: string;
    email: string;
    createdAt: string;
    expiresAt: string;
    used: boolean;
}
