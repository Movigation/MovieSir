// [용도] 비밀번호 재설정 API 함수 정의
// [사용법] import { requestPasswordReset, resetPassword } from "@/api/passwordApi";

import axiosInstance from "@/api/axiosInstance";
import type { PasswordReset } from "@/api/passwordApi.type";

// 비밀번호 재설정 요청
export const requestPasswordReset = async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
        // [변경 필요 - 백엔드 이관 필수]
        // 비밀번호 재설정 요청은 클라이언트에서 사용자 조회 -> 토큰 생성 과정을 거치지 않고,
        // 이메일만 서버로 전송하면 서버가 내부적으로 처리해야 보안상 안전합니다.
        // 클라이언트에서 사용자를 조회하는 로직은 보안 위험이 있습니다.
        // 
        // 권장 구현:
        // const response = await axiosInstance.post("/auth/forgot-password", { email });
        // return response.data;

        // --- 아래 코드는 백엔드 이관 시 삭제하세요 ---
        // 사용자 존재 여부 확인
        const usersResponse = await axiosInstance.get(`/users?email=${email}`);
        const users = usersResponse.data;

        if (users.length === 0) {
            return {
                success: false,
                message: "해당 이메일로 등록된 계정이 없습니다."
            };
        }

        const user = users[0];

        // 토큰 생성 (실제로는 서버에서 생성하고 이메일로 전송)
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const resetData: Omit<PasswordReset, 'id'> = {
            userId: user.id,
            token,
            email,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1시간 후 만료
            used: false
        };

        await axiosInstance.post("/passwordResets", resetData);

        return {
            success: true,
            message: "비밀번호 재설정 링크가 이메일로 전송되었습니다."
        };
    } catch (error) {
        console.error("비밀번호 재설정 요청 오류:", error);
        return {
            success: false,
            message: "비밀번호 재설정 요청 중 오류가 발생했습니다."
        };
    }
};

// 비밀번호 재설정 (토큰 사용)
export const resetPassword = async (
    token: string,
    newPassword: string
): Promise<{ success: boolean; message: string }> => {
    try {
        // [변경 필요 - 백엔드 이관 필수]
        // 토큰 검증 및 비밀번호 변경 로직은 반드시 서버에서 원자적으로 처리되어야 합니다.
        // 클라이언트가 토큰을 조회하거나 직접 사용자를 패치(patch)하는 것은 매우 위험합니다.
        //
        // 권장 구현:
        // const response = await axiosInstance.post("/auth/reset-password", { token, newPassword });
        // return response.data;

        // --- 아래 코드는 백엔드 이관 시 삭제하세요 ---
        // 토큰 조회
        const resetResponse = await axiosInstance.get(`/passwordResets?token=${token}&used=false`);
        const resets = resetResponse.data;

        if (resets.length === 0) {
            return {
                success: false,
                message: "유효하지 않거나 만료된 토큰입니다."
            };
        }

        const reset = resets[0];

        // 만료 시간 확인
        if (new Date(reset.expiresAt) < new Date()) {
            return {
                success: false,
                message: "토큰이 만료되었습니다. 다시 요청해주세요."
            };
        }

        // 사용자 비밀번호 업데이트
        const userResponse = await axiosInstance.get(`/users/${reset.userId}`);
        const user = userResponse.data;

        await axiosInstance.patch(`/users/${reset.userId}`, {
            ...user,
            password: newPassword
        });

        // 토큰을 사용됨으로 표시
        await axiosInstance.patch(`/passwordResets/${reset.id}`, {
            used: true
        });

        return {
            success: true,
            message: "비밀번호가 성공적으로 변경되었습니다."
        };
    } catch (error) {
        console.error("비밀번호 재설정 오류:", error);
        return {
            success: false,
            message: "비밀번호 재설정 중 오류가 발생했습니다."
        };
    }
};
