// [용도] 마이페이지 개별 메뉴 아이템 컴포넌트
// [사용법] <MenuItem label="본 영화 조회" icon={<Film />} onClick={handleClick} />

import { ChevronRight } from 'lucide-react';

type MenuItemProps = {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
};

export default function MenuItem({ label, icon, onClick }: MenuItemProps) {
    return (
        <button
            onClick={onClick}
            /* [디자인] 메뉴 아이템 버튼 */
            /* w-full: 전체 너비 */
            /* flex items-center justify-between: 좌우 양쪽 정렬 (아이콘+텍스트 왼쪽, 화살표 오른쪽) */
            /* px-4 py-4: 좌우 여백 16px, 위아래 여백 16px (버튼 크기 조절 가능) */
            /* bg-gray-700: 다크 그레이 배경 */
            /* dark:bg-gray-700: 다크모드에서도 동일한 배경 */
            /* hover:bg-gray-600: 마우스 올리면 조금 밝은 그레이로 변경 */
            /* dark:hover:bg-gray-600: 다크모드에서도 동일한 hover 효과 */
            /* transition-colors: 색상 변화 애니메이션 */
            /* rounded-lg: 모서리를 둥글게 */
            /* group: 자식 요소에서 부모의 hover 상태를 감지할 수 있게 함 */
            className="w-full flex items-center justify-between px-4 py-4 bg-gray-700 dark:bg-gray-700 hover:bg-gray-600 dark:hover:bg-gray-600 transition-colors rounded-lg group"
        >
            <div
                /* [디자인] 왼쪽 영역 (아이콘 + 텍스트) */
                /* flex items-center gap-3: 가로 방향으로 배치하고 간격 유지 */
                className="flex items-center gap-3"
            >
                {icon && (
                    <span
                        /* [디자인] 아이콘 색상 */
                        /* text-gray-400: 기본 회색 아이콘 */
                        /* group-hover:text-gray-300: 버튼에 마우스 올리면 조금 밝은 회색으로 변경 */
                        className="text-gray-400 group-hover:text-gray-300"
                    >
                        {icon}
                    </span>
                )}
                <span
                    /* [디자인] 메뉴 텍스트 */
                    /* text-white: 흰색 텍스트 */
                    /* font-medium: 중간 굵기 */
                    className="text-white font-medium"
                >
                    {label}
                </span>
            </div>
            <ChevronRight
                /* [디자인] 우측 화살표 아이콘 */
                /* text-gray-400: 기본 회색 */
                /* group-hover:text-gray-300: 버튼에 마우스 올리면 조금 밝은 회색으로 변경 */
                className="text-gray-400 group-hover:text-gray-300"
                size={20} /* 아이콘 크기 20px */
            />
        </button>
    );
}
