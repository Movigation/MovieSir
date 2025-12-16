// [용도] API 요청 함수 정의
// [사용법] import { getUsers } from "@/api/userApi";

import axiosInstance from "@/api/axiosInstance";
import type { User } from "@/api/userApi.type";

// 전체 유저 가져오기 (GET)
export const getUsers = () => {
    return axiosInstance.get("/users");
};

// 특정 유저 가져오기 (GET)
export const getUser = (id: User['id']) => {
    return axiosInstance.get(`/users/${id}`);
};

// 유저 추가하기 (POST)
export const addUser = (data: User['data']) => {
    return axiosInstance.post("/users", data);
};

// 유저 수정하기 (PUT)
export const updateUser = (id: User['id'], data: User['data']) => {
    return axiosInstance.put(`/users/${id}`, data);
};

// 유저 일부 수정하기 (PATCH)
export const patchUser = (id: User['id'], data: User['data']) => {
    return axiosInstance.patch(`/users/${id}`, data);
};

// 유저 삭제하기 (DELETE)
export const deleteUser = (id: User['id']) => {
    return axiosInstance.delete(`/users/${id}`);
};

// ------------------------------
// 온보딩 리마인더 관련 API
// ------------------------------

// 온보딩 리마인더 dismiss 상태 업데이트
export const dismissOnboardingReminder = async (userId: number, dismissed: boolean) => {
    try {
        const response = await axiosInstance.post(`/users/${userId}/onboarding-reminder/dismiss`, {
            dismissed
        });
        return response.data;
    } catch (error: any) {
        console.error('온보딩 리마인더 dismiss 업데이트 실패:', error);
        throw error;
    }
};

// 온보딩 리마인더 마지막 표시 시간 업데이트
export const updateOnboardingReminderLastShown = async (userId: number) => {
    try {
        const response = await axiosInstance.post(`/users/${userId}/onboarding-reminder/update-last-shown`);
        return response.data;
    } catch (error: any) {
        console.error('온보딩 리마인더 마지막 표시 시간 업데이트 실패:', error);
        throw error;
    }
};
