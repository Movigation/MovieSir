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
};

export default function FloatingBubble({
    top,
    left,
    visible = true,
    float = false,
    children,
    className = "",
    onClick
}: Props) {
    // 1. 내부 콘텐츠 (디자인)
    const InnerContent = (
        <div
            className="
                relative
                bg-white
                shadow-lg
                rounded-2xl
                py-9 px-6
                text-sm
                text-blue-400
                border
                border-gray-200
                min-w-[290px]
                
                /* 말풍선 꼬리 - 데스크탑에서만 왼쪽 하단에 표시 */
                /* before: 테두리가 있는 삼각형 (회색) */
                before:content-['']
                before:absolute
                before:hidden
                sm:before:block
                before:bottom-[-4px]
                before:left-[-15px]
                before:w-0
                before:h-0
                before:border-[15px]
                before:border-transparent
                before:border-r-gray-200
                before:rotate-[45deg]
                
                /* after: 배경 삼각형 (흰색) - 테두리 안쪽 */
                after:content-['']
                after:absolute
                after:hidden
                sm:after:block
                after:bottom-[-4px]
                after:left-[-15px]
                after:w-0
                after:h-0
                after:border-[15px]
                after:border-transparent
                after:border-r-white
                after:rotate-[45deg]
            "
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
