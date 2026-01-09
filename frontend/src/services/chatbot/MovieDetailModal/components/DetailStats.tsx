// 이 파일은 영화 상세 정보의 통계 부분을 보여주는 컴포넌트입니다.
import { Star } from 'lucide-react';

interface DetailStatsProps {
    voteAverage?: number;
}

export default function DetailStats({ voteAverage }: DetailStatsProps) {
    return (
        <div className="grid grid-cols-3 gap-2 sm:gap-4 py-2 sm:py-4 border-y sm:border-none border-gray-200 dark:border-gray-700">
            <div className="flex flex-col items-center">
                <Star className="text-yellow-400 mb-0.5 sm:mb-1 w-3.5 h-3.5 sm:w-[18px] sm:h-[18px]" fill="currentColor" />
                <span className="text-[9px] sm:text-xs text-gray-500">평점</span>
                <span className="text-xs sm:text-base font-bold text-gray-900 dark:text-white">
                    {voteAverage?.toFixed(1) || 'N/A'}
                </span>
            </div>
        </div>
    );
}
