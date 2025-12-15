// [용도] 부드럽게 나타나는 애니메이션 효과
// [사용법] <FadeIn isVisible={true}>내용</FadeIn>
// [주의사항] children 감싸는 wrapper로만 사용
// [isVisible] 선택적 prop으로, true일 때만 children을 렌더링 (기본값: true)

import React from "react";

interface FadeInProps {
  children: React.ReactNode;
  isVisible?: boolean;
}

export default function FadeIn({ children, isVisible = true }: FadeInProps) {
  if (!isVisible) return null;

  return (
    <div className="animate-fadeIn">
      {children}
    </div>
  );
}

