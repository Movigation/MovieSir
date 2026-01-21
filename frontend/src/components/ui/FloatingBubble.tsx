// [용도] 화면 원하는 위치에 띄우는 말풍선 컴포넌트
// [사용법] <FloatingBubble top={100} left={150}>내용</FloatingBubble>
// [주의사항] position: absolute라 부모 요소보다 body 기준으로 두는 게 자연스러움

import React from "react";
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
                cursor-pointer
                
                /* 호버 효과 */
                transform transition-all duration-500
                hover:scale-105
                hover:shadow-2xl
                hover:border-blue-200
            `}
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
        >
            {children}
        </div>
    );


    // 3. 최상위 위치 래퍼 (정적 위치만 담당)
    return (
        <div
            className={`absolute ${className} z-deco`}
            style={{ top, left }}
        >
            {/* 4. 애니메이션 래퍼 (Scale + Opacity 담당) */}
            <div
                className={`
                    transition-all ease-out
                    ${position === 'left' ? 'origin-bottom-left' : 'origin-bottom-right'}
                    ${visible
                        ? 'opacity-100 scale-100 duration-500 pointer-events-auto'
                        : 'opacity-0 scale-0 duration-0 pointer-events-none'}
                `}
            >
                {float ? <FloatAnimation>{InnerContent}</FloatAnimation> : InnerContent}
            </div>
        </div>
    );
}
