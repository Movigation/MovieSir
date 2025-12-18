// ============================================================
// [용도] 재사용 가능한 버튼 컴포넌트
// [사용법] <Button label="로그인" onClick={handleLogin} />
// ============================================================
// [스타일 수정 가이드]
//
// 1. 버튼 크기 조절
//    - px-3 py-1.5: 모바일 기본 패딩 (좌우 12px, 위아래 6px)
//    - sm:px-4 sm:py-2: 태블릿 이상 확대 패딩
//    - 더 크게: px-6 py-3 / 더 작게: px-2 py-1
//
// 2. 글자 크기
//    - text-sm: 모바일 14px
//    - sm:text-base: 태블릿 이상 16px
//    - 더 크게: text-lg / 더 작게: text-xs
//
// 3. 버튼 색상
//    - text-blue-400: 현재 파란색 텍스트
//    - 배경 추가: bg-blue-500 text-white
//    - 다른 색상: text-green-500, text-red-500 등
//
// 4. 모서리 둥글기
//    - rounded-lg: 8px 둥글기
//    - rounded-md: 6px / rounded-xl: 12px / rounded-full: 완전 원형
//
// 5. 호버/클릭 효과
//    - hover:scale-105: 마우스 올릴 때 5% 확대
//    - active:scale-95: 클릭 시 5% 축소
//    - 비활성화: hover:scale-100 active:scale-100
// ============================================================

import type { ButtonProps } from '@/components/ui/ui.types';

export default function Button({ label, onClick, className }: ButtonProps) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium transition-all duration-200
        text-l sm:text-base
        hover:scale-105 active:scale-95 text-blue-400
        ${className}`}
    >
      {label}
    </button>
  );
}