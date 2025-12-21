// [용도] 그라디언트 효과가 적용된 텍스트 컴포넌트
// [사용법] <GradientText variant="dark">무비서</GradientText>가 맞춰주는

import React from "react";

type Props = {
    children: React.ReactNode;
    className?: string;
    variant?: 'normal' | 'dark'; // dark: 진한 그라디언트
};

export default function GradientText({ children, className = "", variant = 'normal' }: Props) {
    // variant에 따라 다른 그라디언트 색상 사용
    const gradientClass = variant === 'dark'
        ? 'bg-gradient-to-r from-[#0052CC] via-[#0080FF] to-[#0080FF]' // 더 진한 파랑
        : 'bg-gradient-to-r from-[#006AFF] via-[#00E6FF] to-[#00E6FF]'; // 밝은 파랑

    return (
        <span
            className={`
                font-jua
                ${gradientClass}
                bg-clip-text text-transparent
                ${className}
            `}
            style={{
                // Webkit 브라우저 호환성
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
            }}
        >
            {children}
        </span>
    );
}
