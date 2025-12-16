// [용도] 화면 전체에 흐릿하게 퍼지는 글로우 배경 효과
// [사용법] <GlowBackground isDark={isDark} /> 형태로 사용
// [주의사항] 부모 요소가 relative여야 정상적으로 위치됨

import type { GlowBackgroundProps } from '@/components/effects/effects.types';

export default function GlowBackground({ isDark }: GlowBackgroundProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-base">
      {/* 왼쪽 상단 블러 구름 */}
      <div
        className={`absolute top-1/4 left-1/4 w-1/3 max-w-72 aspect-square rounded-full blur-3xl animate-pulse transition-colors duration-500 ${isDark ? "bg-blue-500/10" : "bg-blue-500/20"
          }`}
      ></div>

      {/* 오른쪽 하단 블러 구름 */}
      <div
        className={`absolute bottom-1/3 right-1/4 w-1/2 max-w-96 aspect-square rounded-full blur-3xl animate-pulse delay-1000 transition-colors duration-500 ${isDark ? "bg-cyan-500/10" : "bg-cyan-500/20"
          }`}
      ></div>
    </div>
  );
}
