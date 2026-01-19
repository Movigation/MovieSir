// [용도] 마이페이지 사용자 프로필 섹션
// [사용법] <UserProfile userName="User" />

import { User } from 'lucide-react';

type UserProfileProps = {
    userName?: string;
};

export default function UserProfile({ userName = 'User' }: UserProfileProps) {
    return (
        <div
            /* [디자인] 프로필 컨테이너 */
            /* flex flex-col: 세로 방향 플렉스 레이아웃 */
            /* items-center: 가로 중앙 정렬 */
            /* py-6: 위아래 여백 */
            className="flex flex-col items-center py-6"
        >
            {/* 사용자 아이콘 */}
            <div
                /* [디자인] 사용자 아이콘 배경 (원형) */
                /* w-20 h-20: 너비와 높이 80px (크기 조절 가능) */
                /* rounded-full: 완전한 원형 */
                /* bg-purple-200: 밝은 보라색 배경 (라이트 모드) */
                /* dark:bg-purple-300: 다크모드에서 조금 더 밝은 보라색 */
                /* flex items-center justify-center: 아이콘을 중앙에 배치 */
                /* mb-3: 아래 여백 */
                className="w-20 h-20 rounded-full bg-blue-300 dark:bg-gray-300 flex items-center justify-center mb-3"
            >
                <User
                    size={40} /* 아이콘 크기 40px (배경 크기에 맞춰 조절 가능) */
                    /* [디자인] 아이콘 색상 */
                    /* text-purple-600: 진한 보라색 아이콘 (라이트 모드) */
                    /* dark:text-purple-700: 다크모드에서 더 진한 보라색 */
                    className="text-black dark:text-white"
                />
            </div>

            {/* 사용자 이름 */}
            <div
                /* [디자인] 사용자 이름 컨테이너 */
                /* flex items-center gap-2: 가로 방향으로 요소 배치하고 간격 유지 */
                className="flex items-center gap-2"
            >
                <span
                    /* [디자인] 사용자 이름 텍스트 */
                    /* text-white: 흰색 텍스트 */
                    /* font-medium: 중간 굵기 */
                    /* text-lg: 큰 글씨 크기 */
                    className="text-black dark:text-white font-medium text-lg"
                >
                    {userName}
                </span>
                <span
                    /* [디자인] 장식용 점 */
                    /* text-gray-400: 회색 */
                    /* text-sm: 작은 글씨 */
                    className="text-gray-400 text-sm"
                >
                    ●
                </span>
            </div>
        </div>
    );
}
