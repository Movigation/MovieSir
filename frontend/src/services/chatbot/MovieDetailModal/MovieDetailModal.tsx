// ============================================================
// [용도] 영화 상세 정보 모달 - 풍부한 정보 표시
// [사용법] <MovieDetailModal /> (Zustand store의 detailMovieId 감지)
// ============================================================

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { useMovieStore } from '@/store/useMovieStore';
import {
    getMovieDetail,
} from '@/api/movieApi';
import type { MovieDetail, OTTPlatform, Cast } from '@/api/movieApi.type';
import { Clock, Star, Calendar, Heart, Bookmark, CheckCircle, Loader2 } from 'lucide-react';
import { getOttLogoWithFallback } from '@/utils/ottLogoMapper';

export default function MovieDetailModal() {
    const { detailMovieId, setDetailMovieId } = useMovieStore();
    const [movieDetail, setMovieDetail] = useState<MovieDetail | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 영화 상세 정보 로드
    useEffect(() => {
        console.log('🎞️ MovieDetailModal detailMovieId changed:', detailMovieId);

        if (!detailMovieId) {
            setMovieDetail(null);
            return;
        }

        const loadDetail = async () => {
            setIsLoading(true);
            setError(null);
            try {
                console.log('📡 Fetching movie detail for ID:', detailMovieId);
                const detail = await getMovieDetail(detailMovieId);
                console.log('✅ Movie detail loaded:', detail);
                console.log('🎬 OTT Providers:', detail.ott_providers);
                setMovieDetail(detail);
            } catch (err) {
                console.error('❌ 영화 상세 정보 로드 실패:', err);
                setError('영화 정보를 불러올 수 없습니다');
            } finally {
                setIsLoading(false);
            }
        };

        loadDetail();
    }, [detailMovieId]);

    // 모달 닫기
    const handleClose = () => {
        setDetailMovieId(null);
        setMovieDetail(null);
    };

    // 공통 토글 함수
    const handleToggleStatus = async (
        field: 'liked' | 'bookmarked' | 'watched',
        extraUpdates?: Record<string, any>
    ) => {
        if (!movieDetail) return;

        const currentValue = movieDetail.user_status?.[field] || false;
        const newValue = !currentValue;

        // 낙관적 UI 업데이트
        const updatedStatus = {
            liked: movieDetail.user_status?.liked || false,
            watched: movieDetail.user_status?.watched || false,
            bookmarked: movieDetail.user_status?.bookmarked || false,
            ...extraUpdates,
            [field]: newValue,
        };

        setMovieDetail({
            ...movieDetail,
            user_status: updatedStatus
        });

        try {
            // TODO: 백엔드 API 구현 시 활성화
            console.log(`${field} 토글 (UI만):`, movieDetail.movie_id, newValue);
        } catch (error) {
            // 실패 시 되돌리기
            setMovieDetail({
                ...movieDetail,
                user_status: {
                    ...updatedStatus,
                    [field]: currentValue,
                }
            });
        }
    };

    // 좋아요 토글
    const handleToggleLike = () => handleToggleStatus('liked');

    // 북마크 토글
    const handleToggleBookmark = () => handleToggleStatus('bookmarked');

    // 시청 완료 토글
    const handleToggleWatched = () => {
        const watchedDate = !movieDetail?.user_status?.watched
            ? new Date().toISOString().split('T')[0]
            : undefined;
        handleToggleStatus('watched', { watched_date: watchedDate });
    };

    return (
        <Modal isOpen={!!detailMovieId} onClose={handleClose}>
            {/* 로딩 상태 */}
            {isLoading && (
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="animate-spin text-blue-500" size={48} />
                </div>
            )}

            {/* 에러 상태 */}
            {error && !isLoading && (
                <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                    <p className="text-red-500 text-xl">{error}</p>
                    <button
                        onClick={handleClose}
                        className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                    >
                        닫기
                    </button>
                </div>
            )}

            {/* 영화 상세 정보 */}
            {movieDetail && !isLoading && (
                <div className="flex flex-col md:flex-row max-h-[90vh] overflow-y-auto">
                    {/* 왼쪽: 포스터 */}
                    <div className="w-full md:w-2/5 aspect-[2/3] relative flex-shrink-0">
                        <img
                            src={movieDetail.poster_url}
                            alt={movieDetail.title}
                            className="w-full h-full object-cover rounded-l-xl"
                        />
                    </div>

                    {/* 오른쪽: 상세 정보 */}
                    <div className="w-full md:w-3/5 p-6 flex flex-col gap-6">
                        {/* 제목 */}
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                                {movieDetail.title}
                            </h2>
                            {/* 원제목은 MovieDetail 타입에 없으므로 제거 또는 tagline 사용 */}
                            {movieDetail.tagline && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                                    {movieDetail.tagline}
                                </p>
                            )}
                        </div>

                        {/* 장르 */}
                        <div className="flex flex-wrap gap-2">
                            {movieDetail.genres.map((genre) => (
                                <span
                                    key={genre}
                                    className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-full"
                                >
                                    {genre}
                                </span>
                            ))}
                        </div>

                        {/* 평점, 시간, 연도 */}
                        <div className="grid grid-cols-3 gap-4 py-4 border-y border-gray-200 dark:border-gray-700">
                            <div className="flex flex-col items-center">
                                <Star className="text-yellow-400 mb-1" size={20} fill="currentColor" />
                                <span className="text-xs text-gray-500">평점</span>
                                <span className="font-bold text-gray-900 dark:text-white">
                                    {movieDetail.vote_average?.toFixed(1) || 'N/A'}
                                </span>
                            </div>
                            <div className="flex flex-col items-center">
                                <Clock className="text-blue-500 mb-1" size={20} />
                                <span className="text-xs text-gray-500">상영시간</span>
                                <span className="font-bold text-gray-900 dark:text-white">
                                    {movieDetail.runtime}분
                                </span>
                            </div>
                            <div className="flex flex-col items-center">
                                <Calendar className="text-green-500 mb-1" size={20} />
                                <span className="text-xs text-gray-500">개봉</span>
                                <span className="font-bold text-gray-900 dark:text-white">
                                    {new Date(movieDetail.release_date).getFullYear()}
                                </span>
                            </div>
                        </div>

                        {/* 줄거리 */}
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">줄거리</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                {movieDetail.overview}
                            </p>
                        </div>

                        {/* 감독 & 출연 */}
                        {(movieDetail.director || (movieDetail.cast && movieDetail.cast.length > 0)) && (
                            <div>
                                {movieDetail.director && (
                                    <div className="mb-3">
                                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">감독</h3>
                                        <p className="text-gray-600 dark:text-gray-300">{movieDetail.director}</p>
                                    </div>
                                )}
                                {movieDetail.cast && movieDetail.cast.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">출연</h3>
                                        <div className="flex gap-3 overflow-x-auto pb-2">
                                            {movieDetail.cast.slice(0, 5).map((actor: Cast, idx: number) => (
                                                <div key={idx} className="flex-shrink-0 text-center">
                                                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 mb-1 flex items-center justify-center">
                                                        <img
                                                            src={actor.profile_url}
                                                            alt={actor.name}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                e.currentTarget.style.display = 'none';
                                                                const parent = e.currentTarget.parentElement;
                                                                if (parent && !parent.querySelector('svg')) {
                                                                    parent.innerHTML = '<svg class="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path></svg>';
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">{actor.name}</p>
                                                    <p className="text-xs text-gray-500">{actor.character}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 태그 */}
                        {movieDetail.tags && movieDetail.tags.length > 0 && (
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">태그</h3>
                                <div className="flex flex-wrap gap-2">
                                    {movieDetail.tags.map((tag: string, idx: number) => (
                                        <span
                                            key={idx}
                                            className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* OTT 플랫폼 */}
                        {movieDetail.ott_providers && movieDetail.ott_providers.length > 0 && (
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">시청 가능 플랫폼</h3>
                                <div className="flex flex-wrap gap-3">
                                    {movieDetail.ott_providers.map((ott: OTTPlatform) => (
                                        <a
                                            key={ott.ott_id}
                                            href={ott.watch_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                                        >
                                            <img
                                                src={getOttLogoWithFallback(ott.ott_name, ott.ott_logo)}
                                                alt={ott.ott_name}
                                                className="h-5 w-auto"
                                            />
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">{ott.ott_name}</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 사용자 액션 버튼 - 백엔드 구현 전까지 임시 비활성화 */}
                        {false && (
                            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={handleToggleLike}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors ${movieDetail!.user_status?.liked
                                        ? 'bg-red-500 text-white hover:bg-red-600'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }`}
                                >
                                    <Heart size={20} fill={movieDetail!.user_status?.liked ? 'currentColor' : 'none'} />
                                    좋아요
                                </button>
                                <button
                                    onClick={handleToggleBookmark}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors ${movieDetail!.user_status?.bookmarked
                                        ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }`}
                                >
                                    <Bookmark size={20} fill={movieDetail!.user_status?.bookmarked ? 'currentColor' : 'none'} />
                                    북마크
                                </button>
                                <button
                                    onClick={handleToggleWatched}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors ${movieDetail!.user_status?.watched
                                        ? 'bg-green-500 text-white hover:bg-green-600'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }`}
                                >
                                    <CheckCircle size={20} fill={movieDetail!.user_status?.watched ? 'currentColor' : 'none'} />
                                    시청완료
                                </button>
                            </div>
                        )}

                        {/* 임시 안내 메시지 */}
                        <div className="text-center py-4 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                💡 좋아요, 북마크, 시청완료 기능은 준비 중입니다
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    );
}
