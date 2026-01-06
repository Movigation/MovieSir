// [용도] API 응답 타입 정의
// [사용법] import { User } from "@/api/userApi.type";

export interface User {
    id: string;  // UUID (PostgreSQL user_id와 일치)
    name: string;
    age: number;
    data: string;
}