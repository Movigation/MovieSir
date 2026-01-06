// [용도] 에러 페이지용 챗봇 버튼 (눈이 X로 표시, 반응 없음)
// [사용법] <ChatbotErrorButton isDark={true} />

interface ChatbotErrorButtonProps {
    isDark?: boolean;
}

export default function ChatbotErrorButton({ isDark = false }: ChatbotErrorButtonProps) {
    return (
        <div className="relative z-float">
            {/* Glow */}
            <div
                className={`pointer-events-none absolute inset-0 rounded-full blur-2xl opacity-40 animate-pulse scale-125 transition-colors duration-500 ${isDark ? "bg-red-400" : "bg-red-500"
                    }`}
            ></div>

            {/* 캐릭터 전체 (몸통) - 클릭 불가 */}
            <div
                className={`
          relative w-28 h-28 rounded-full shadow-xl
          flex items-center justify-center
          transition-all duration-200
          ${isDark
                        ? "bg-gradient-to-br from-red-400 via-red-500 to-orange-400"
                        : "bg-gradient-to-br from-red-500 via-red-600 to-orange-500"
                    }
        `}
            >
                {/* === 얼굴 전체(head) === */}
                <div className="flex flex-col items-center gap-2 select-none">
                    {/* === 눈 (X 모양) === */}
                    <div className="flex gap-4">
                        {/* 왼쪽 눈 - X */}
                        <div className="relative w-3 h-3">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-0.5 bg-gray-900 rotate-45"></div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-0.5 bg-gray-900 -rotate-45"></div>
                        </div>
                        {/* 오른쪽 눈 - X */}
                        <div className="relative w-3 h-3">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-0.5 bg-gray-900 rotate-45"></div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-0.5 bg-gray-900 -rotate-45"></div>
                        </div>
                    </div>

                    {/* === 홍조(cheeks) - 약간 흐려진 느낌 === */}
                    <div className="flex gap-8">
                        {/* 좌 */}
                        <div className="w-5 h-1.5 bg-pink-400/50 rounded-full"></div>
                        {/* 우 */}
                        <div className="w-5 h-1.5 bg-pink-400/50 rounded-full"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
