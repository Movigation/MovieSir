// [용도] 아래에서 위로 부드럽게 등장하는 트랜지션
// [사용법] <SlideUp isVisible={isOpen}>내용</SlideUp>
import type { SlideUpProps } from '@/components/transitions/transitions.types';

export default function SlideUp({ isVisible, children }: SlideUpProps) {
  return (
    <div
      className={`
        transform transition-all duration-500
        ${isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}
      `}
    >
      {children}
    </div>
  );
}
