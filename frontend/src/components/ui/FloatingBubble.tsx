// [용도] 화면 원하는 위치에 띄우는 말풍선 컴포넌트
// [사용법] <FloatingBubble top={100} left={150}>내용</FloatingBubble>
// [주의사항] position: absolute라 부모 요소보다 body 기준으로 두는 게 자연스러움

import React from "react";
import FadeIn from "@/components/transitions/FadeIn";
import FloatAnimation from "@/components/transitions/Float";

type Props = {
    top?: number;        // Y 위치(px)
    left?: number;       // X 위치(px)
    visible?: boolean;
    float?: boolean;
    children: React.ReactNode;
    className?: string;
    onClick?: () => void; // 클릭 이벤트 핸들러
    position?: 'left' | 'right'; // 말풍선 꼬리 방향 (기본값: 'left')
};

export default function FloatingBubble({
    top,
    left,
    visible = true,
    float = false,
    children,
    className = "",
    onClick,
    position = 'left' // 기본값: 왼쪽 (챗봇 오른쪽에 배치)
}: Props) {
    // 1. 내부 콘텐츠 (디자인)
    // 말풍선 꼬리 위치에 따른 스타일 분기
    // const tailStyles = position === 'left'
    //     ? {
    //         // 왼쪽 꼬리 (챗봇 오른쪽에 배치)
    //         before: `
    //             before:bottom-[-4px]
    //             before:left-[-15px]
    //             before:border-r-gray-200
    //             before:rotate-[45deg]
    //         `,
    //         after: `
    //             after:bottom-[-4px]
    //             after:left-[-15px]
    //             after:border-r-white
    //             after:rotate-[45deg]
    //         `
    //     }
    //     : {
    //     // 오른쪽 꼬리 (챗봇 왼쪽에 배치)
    //     before: `
    //             before:bottom-[-4px]
    //             before:right-[-15px]
    //             before:border-l-gray-200
    //             before:rotate-[-45deg]
    //         `,
    //         after: `
    //             after:bottom-[-4px]
    //             after:right-[-15px]
    //             after:border-l-white
    //             after:rotate-[-45deg]
    //         `
    // };

    const InnerContent = (
        <div
            className={`
                relative
                bg-white
                shadow-xl
                rounded-3xl
                ${position === 'left' ? 'rounded-bl-none sm:rounded-bl-none' : 'rounded-3xl sm:rounded-br-none'}
                py-9 px-6
                text-sm
                text-blue-400
                border
                border-gray-100
                
                /* 호버 효과 */
                transform transition-all duration-500
                hover:scale-105
                hover:shadow-2xl
                hover:border-blue-200
            `}
            onClick={onClick}
        >
            {children}
        </div>
    );

    // 2. 애니메이션 래퍼 (FadeIn -> Float)
    const AnimatedContent = (
        <FadeIn>
            {float ? <FloatAnimation>{InnerContent}</FloatAnimation> : InnerContent}
        </FadeIn>
    );

    // 3. 최상위 위치 래퍼 (absolute positioning)
    return (
        <div
            className={`
                absolute ${className} z-deco
                transition-opacity duration-200
                ${visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
            `}
            style={{ top, left }}
        >
            {AnimatedContent}
        </div>
    );
}
