// 이 파일은 영화 상세 정보의 액션 버튼 부분을 보여주는 컴포넌트입니다.
// 사용 예정이나 당장 미사용으로 주석 처리했습니다.
import { Heart, Bookmark, CheckCircle } from 'lucide-react';
import { type MovieDetail } from '@/api/movieApi.type';

interface DetailActionButtonsProps {
    userStatus?: MovieDetail['user_status'];
    onToggleLike: () => void;
    onToggleBookmark: () => void;
    onToggleWatched: () => void;
}

export default function DetailActionButtons({
    userStatus,
    onToggleLike,
    onToggleBookmark,
    onToggleWatched
}: DetailActionButtonsProps) {
    const isLiked = userStatus?.liked || false;
    const isBookmarked = userStatus?.bookmarked || false;
    const isWatched = userStatus?.watched || false;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex gap-2 sm:gap-3">
                <button
                    onClick={onToggleLike}
                    className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 rounded-xl font-medium text-xs sm:text-sm transition-all active:scale-95 ${isLiked
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                >
                    <Heart className="w-4 h-4 sm:w-[18px] sm:h-[18px]" fill={isLiked ? 'currentColor' : 'none'} />
                    좋아요
                </button>
                <button
                    onClick={onToggleBookmark}
                    className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 rounded-xl font-medium text-xs sm:text-sm transition-all active:scale-95 ${isBookmarked
                        ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/20'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                >
                    <Bookmark className="w-4 h-4 sm:w-[18px] sm:h-[18px]" fill={isBookmarked ? 'currentColor' : 'none'} />
                    북마크
                </button>
                <button
                    onClick={onToggleWatched}
                    className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 rounded-xl font-medium text-xs sm:text-sm transition-all active:scale-95 ${isWatched
                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                >
                    <CheckCircle className="w-4 h-4 sm:w-[18px] sm:h-[18px]" fill={isWatched ? 'currentColor' : 'none'} />
                    시청완료
                </button>
            </div>

            <div className="text-center py-3 sm:py-4 border-t border-gray-100 dark:border-gray-700/50">
                <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1">
                    <span className="text-blue-400/80">💡</span>
                    좋아요, 북마크, 시청완료 기능은 준비 중입니다
                </p>
            </div>
        </div>
    );
}
