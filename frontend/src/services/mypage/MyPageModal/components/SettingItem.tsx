import React from 'react';

type SettingItemProps = {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    as?: 'div' | 'label';
};

/**
 * [용도] 마이페이지 내 설정 항목들을 감싸는 공통 카드 컴포넌트
 * [특징] 다크/라이트 모드 대응 및 호버 효과 포함
 */
export default function SettingItem({
    children,
    className = '',
    onClick,
    as: Component = 'div'
}: SettingItemProps) {
    // 뼈대가 되는 공통 스타일
    const baseStyles = "p-4 bg-gray-50 border border-gray-200 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors";

    // 클릭 가능하거나 label인 경우 커서 스타일 추가
    const cursorStyles = (onClick || Component === 'label') ? 'cursor-pointer' : '';

    return (
        <Component
            onClick={onClick}
            className={`${baseStyles} ${cursorStyles} ${className}`}
        >
            {children}
        </Component>
    );
}
