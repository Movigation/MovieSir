// [용도] 요소가 위아래로 둥둥 떠다니는 애니메이션
// [사용법] <Float>내용</Float>
// [주의사항] 반복 애니메이션이며 속도 조절 가능

import type { FloatProps } from '@/components/transitions/transitions.types';

export default function Float({ children }: FloatProps) {
    return (
        <div className="animate-float">
            {children}
        </div>
    );
}
