// [용도] 챗봇 캐릭터 버튼 + 3단계 자연 반응 시스템 (Body → Head → Eye)
// [특징] 부드러운 보간 / 회전 포함 / 둥근 범위 안 자연 이동
// [최적화] 초기 렉 제거 / ref 사용 / 이벤트 지연 활성화

import { useEffect, useRef, useState } from "react";
import type { ChatbotButtonProps, Offset } from "@/services/chatbot/components/chatbot.types";

export default function ChatbotButton({
  isDark,
  onClick,
}: ChatbotButtonProps) {
  const botRef = useRef<HTMLButtonElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // ref로 변경하여 불필요한 리렌더링 방지
  const targetRef = useRef<Offset>({ x: 0, y: 0 });

  // 부드러운 보간값
  const [smooth, setSmooth] = useState<Offset>({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);

  // ==== 깜빡임 (3초 후 시작으로 초기 부담 감소) ====
  useEffect(() => {
    let timeoutId: number;

    const blinkNow = () => {
      setBlink(true);
      setTimeout(() => setBlink(false), 120);
    };

    const loop = () => {
      const delay = 6000 + Math.random() * 8000;
      timeoutId = window.setTimeout(() => {
        blinkNow();
        loop();
      }, delay);
    };

    // 3초 후 시작
    timeoutId = window.setTimeout(loop, 3000);

    return () => clearTimeout(timeoutId);
  }, []);

  // ==== 전역 마우스 이동 처리 (300ms 후 활성화) ====
  useEffect(() => {
    let isReady = false;

    const readyTimer = setTimeout(() => {
      isReady = true;
    }, 300);

    const handleMove = (e: MouseEvent) => {
      if (!isReady || !botRef.current) return;

      const rect = botRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const dx = e.clientX - cx;
      const dy = e.clientY - cy;

      // -1 ~ 1 사이 정규화
      const nx = Math.max(-1, Math.min(1, dx / (rect.width / 2)));
      const ny = Math.max(-1, Math.min(1, dy / (rect.height / 2)));

      // ref 사용으로 리렌더링 없이 값만 업데이트
      targetRef.current = { x: nx, y: ny };
    };

    window.addEventListener("mousemove", handleMove, { passive: true });

    return () => {
      clearTimeout(readyTimer);
      window.removeEventListener("mousemove", handleMove);
    };
  }, []);

  // ==== 보간 (lerp)으로 부드럽게 따라오기 ====
  useEffect(() => {
    let rafId: number;

    const animate = () => {
      setSmooth((prev) => {
        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
        const target = targetRef.current;

        return {
          x: lerp(prev.x, target.x, 0.1),
          y: lerp(prev.y, target.y, 0.1),
        };
      });

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(rafId);
  }, []); // 1회만 실행

  // ==== 레이어별 민감도 설정 ====
  const BODY_MOVE = 3;      // 둔하게
  const HEAD_MOVE = 6;      // 중간
  const HEAD_ROTATE = 8;    // 8deg 이하
  const EYE_MOVE = 10;      // 가장 민감

  const bodyX = smooth.x * BODY_MOVE;
  const bodyY = smooth.y * BODY_MOVE;

  const headX = smooth.x * HEAD_MOVE;
  const headY = smooth.y * HEAD_MOVE;

  const headRotate = smooth.x * HEAD_ROTATE; // 좌우 기울기

  const pupilX = smooth.x * EYE_MOVE;
  const pupilY = smooth.y * EYE_MOVE;

  // 챗봇 버튼 스크롤 방지 (passive: false 옵션)
  // 챗봇 버튼 스크롤 방지 (모바일에서만)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // 모바일(640px 미만)에서만 차단, 데스크탑/태블릿은 통과
      const isMobile = window.innerWidth < 640;
      if (isMobile) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);
  return (
    <div
      ref={containerRef}
      className="inline-block w-fit z-float select-none overscroll-none"
    >

      {/* 캐릭터 전체 (몸통) */}
      <button
        ref={botRef}
        onClick={onClick}
        className={`
          relative w-28 h-28 rounded-full shadow-xl
          flex items-center justify-center
          transition-all duration-200
          hover:scale-110 hover:brightness-110
          ${isDark
            ? "bg-gradient-to-br from-blue-400 via-blue-500 to-cyan-400"
            : "bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-500"
          }
        `}
        style={{
          transform: `translate(${bodyX}px, ${bodyY}px)`,
          transition: "transform 0.15s ease-out",
        }}
      >
        {/* Glow - 챗봇 버튼 기준으로 위치 */}
        <div
          className={`pointer-events-none absolute inset-0 rounded-full blur-2xl opacity-40 animate-pulse scale-125 transition-colors duration-500 ${isDark ? "bg-blue-400" : "bg-blue-500"
            }`}
        ></div>

        {/* === 얼굴 전체(head) === */}
        <div
          className="flex flex-col items-center gap-2 select-none"
          style={{
            transform: `
              translate(${headX}px, ${headY}px)
              rotate(${headRotate}deg)
            `,
            transition: "transform 0.12s ease-out",
          }}
        >
          {/* === 눈 === */}
          <div className="flex gap-4">
            <div
              className="w-3 h-3 bg-gray-900 rounded-full"
              style={{
                transform: `
                  translate(${pupilX}px, ${pupilY}px)
                  scaleY(${blink ? 0.1 : 1})
                `,
                transition: "transform 0.1s ease-out",
              }}
            />
            <div
              className="w-3 h-3 bg-gray-900 rounded-full"
              style={{
                transform: `
                  translate(${pupilX}px, ${pupilY}px)
                  scaleY(${blink ? 0.1 : 1})
                `,
                transition: "transform 0.1s ease-out",
              }}
            />
          </div>

          {/* === 홍조(cheeks) === */}
          <div className="flex gap-8">
            {/* 좌 */}
            <div className="w-5 h-1.5 bg-pink-400/80 rounded-full"></div>
            {/* 우 */}
            <div className="w-5 h-1.5 bg-pink-400/80 rounded-full"></div>
          </div>
        </div>
      </button>
    </div>
  );
}