// [용도] 인증 관련 API 타입 정의
// [사용법] import { User, LoginRequest, SignupRequest } from "@/api/authApi.type";

// 사용자 프로필
export interface UserProfile {
    favoriteGenres: string[];
    ottServices: string[];
    onboarding_completed_at?: string | null;  // 온보딩 완료 시간 (완료 여부 판단)
}

// 사용자 정보
export interface User {
    id: string;  // UUID (PostgreSQL user_id와 일치)
    email: string;
    password: string;
    nickname: string;
    createdAt: string;
    profile: UserProfile;
}

// 로그인 요청
export interface LoginRequest {
    email: string;
    password: string;
}

// 로그인 응답
export interface LoginResponse {
    user: Omit<User, 'password'>;
    message: string;
}

// 회원가입 요청
export interface SignupRequest {
    email: string;
    password: string;
    nickname: string;  // name → nickname으로 변경 (백엔드 스키마와 일치)
}

// 회원가입 응답
export interface SignupResponse {
    user: Omit<User, 'password'>;
    message: string;
}

// 이메일 인증 코드 전송 요청
export interface SendCodeRequest {
    email: string;
}

// 이메일 인증 코드 전송 응답
export interface SendCodeResponse {
    message: string;
    expiresIn: number; // 초 단위 (예: 300 = 5분)
}

// 이메일 인증 코드 확인 요청
export interface VerifyCodeRequest {
    email: string;
    code: string;
}

// 이메일 인증 코드 확인 응답
export interface VerifyCodeResponse {
    valid: boolean;
    message: string;
}
