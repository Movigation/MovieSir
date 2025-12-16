// [용도] 피젯스피너 로딩 컴포넌트 - 3개 레이어 회전 애니메이션
// [사용법] <LoadingSpinner message="로딩 중" submessage="잠시만 기다려주세요" />
// [출처] Senior-OCR-Project LoadingSpinner를 moviesir 블랙 테마에 맞게 조정
// [특징] 3-레이어 피젯 스피너 (다른 속도/방향), 바운싱 점 애니메이션

interface LoadingSpinnerProps {
    message?: string;
    submessage?: string;
}

export default function LoadingSpinner({
    message = "로딩 중",
    submessage = "잠시만 기다려주세요...",
}: LoadingSpinnerProps) {
    return (
        <div className="text-center py-8 md:py-12 animate-fade-in">
            {/* 3-레이어 피젯 스피너 */}
            <div className="relative inline-block mb-5 md:mb-6">
                {/* 레이어 1: 기본 회색 원 (순방향 회전) */}
                <div className="animate-spin rounded-full h-14 w-14 md:h-16 md:w-16 border-4 border-gray-700"></div>

                {/* 레이어 2: 상단/우측 그레이 (역방향 회전, 1초) */}
                <div
                    className="absolute top-0 left-0 rounded-full h-14 w-14 md:h-16 md:w-16 border-4 border-transparent border-t-gray-400 border-r-gray-400"
                    style={{ animation: "spin 1s linear infinite reverse" }}
                ></div>

                {/* 레이어 3: 상단 화이트 (순방향 고속 회전, 0.6초) */}
                <div
                    className="absolute top-0 left-0 rounded-full h-14 w-14 md:h-16 md:w-16 border-4 border-transparent border-t-white"
                    style={{ animation: "spin 0.6s linear infinite" }}
                ></div>
            </div>

            {/* 메인 메시지 */}
            <p className="text-base md:text-xl text-white font-bold mb-1.5 md:mb-2 animate-pulse">
                {message}
            </p>

            {/* 서브 메시지 */}
            <p className="text-sm md:text-base text-gray-400 animate-fade-in">
                {submessage}
            </p>

            {/* 바운싱 점 3개 (순차 딜레이) */}
            <div className="flex justify-center gap-1.5 md:gap-2 mt-3 md:mt-4">
                <div
                    className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                ></div>
                <div
                    className="w-1.5 h-1.5 md:w-2 md:h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                ></div>
                <div
                    className="w-1.5 h-1.5 md:w-2 md:h-2 bg-gray-600 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                ></div>
            </div>
        </div>
    );
}

// [사용 예시]
// 
// import LoadingSpinner from '@/components/ui/LoadingSpinner';
// 
// // 기본 사용
// <LoadingSpinner />
//
// // 커스텀 메시지
// <LoadingSpinner 
//   message="영화를 불러오는 중..." 
//   submessage="추천 영화를 준비하고 있어요"
// />
//
// // 조건부 렌더링
// {isLoading && <LoadingSpinner message="데이터 로딩 중..." />}
//
// // 모달 내부에서 사용
// <Modal isOpen={isOpen}>
//   {isLoading ? <LoadingSpinner /> : <Content />}
// </Modal>
