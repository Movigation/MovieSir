import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { useMovieStore } from '@/store/useMovieStore';
import { getMovieDetail } from '@/api/movieApi';
import type { MovieDetail } from '@/api/movieApi.type';
import { Loader2 } from 'lucide-react';

// 서브 컴포넌트 임포트
import DetailHeader from './components/DetailHeader';
import DetailOTTSection from './components/DetailOTTSection';
import DetailOverview from './components/DetailOverview';
import DetailCast from './components/DetailCast';
import DetailTags from './components/DetailTags';
// import DetailActionButtons from './components/DetailActionButtons';

export default function MovieDetailModal() {
    const { detailMovieId, setDetailMovieId } = useMovieStore();
    const [movieDetail, setMovieDetail] = useState<MovieDetail | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPosterExpanded, setIsPosterExpanded] = useState(false);

    // 모달 닫기
    const handleClose = () => {
        setDetailMovieId(null);
        setMovieDetail(null);
        setIsPosterExpanded(false);
    };

    // ESC 키로 모달 닫기
    useEffect(() => {
        if (!detailMovieId) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [detailMovieId]);

    // 영화 상세 정보 로드
    useEffect(() => {
        if (!detailMovieId) {
            setMovieDetail(null);
            return;
        }

        const loadDetail = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const detail = await getMovieDetail(detailMovieId);
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

    return (
        <Modal isOpen={!!detailMovieId} onClose={handleClose}>
            {/* 1. 로딩 상태 */}
            {isLoading && (
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="animate-spin text-blue-500" size={48} />
                </div>
            )}

            {/* 2. 에러 상태 */}
            {error && !isLoading && (
                <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                    <p className="text-red-500 text-xl font-medium">{error}</p>
                    <button
                        onClick={handleClose}
                        className="px-6 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-xl transition-colors"
                    >
                        닫기
                    </button>
                </div>
            )}

            {/* 3. 영화 상세 정보 (조립) */}
            {movieDetail && !isLoading && (
                <div className="flex flex-col md:flex-row md:h-[calc(100vh-100px)] md:overflow-hidden overflow-y-auto">
                    {/* [왼쪽/상단] 포스터 영역 */}
                    <div
                        className={`w-full md:w-[40%] flex-shrink-0 relative cursor-pointer md:cursor-default transition-all duration-500 ease-in-out md:h-full ${isPosterExpanded ? 'h-[500px] sm:h-[600px]' : 'h-[200px] sm:h-[250px]'
                            } md:h-auto`}
                        onClick={() => setIsPosterExpanded(!isPosterExpanded)}
                    >
                        <img
                            src={movieDetail.poster_url}
                            alt={movieDetail.title}
                            className={`w-full h-full object-cover md:rounded-l-xl sm:rounded-none transition-all duration-500 ease-in-out ${!isPosterExpanded ? 'object-[center_30%]' : 'object-center'
                                }`}
                        />
                        {/* 모바일 확장 유도 오버레이 (축소 상태일 때만) */}
                        {!isPosterExpanded && (
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center md:hidden pointer-events-none">
                                {/* <span className="text-white/80 text-xs bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
                                    터치하여 크게 보기
                                </span> */}
                            </div>
                        )}
                    </div>

                    {/* [오른쪽/하단] 정보 영역 */}
                    <div className="w-full md:w-[60%] flex flex-col overflow-y-auto bg-white dark:bg-black md:bg-transparent">
                        <div className="p-5 sm:p-8 flex flex-col gap-6 sm:gap-2">
                            {/* 헤더 (제목, 장르, 시간, 개봉) */}
                            <DetailHeader
                                title={movieDetail.title}
                                tagline={movieDetail.tagline}
                                genres={movieDetail.genres}
                                runtime={movieDetail.runtime}
                                releaseDate={movieDetail.release_date}
                                voteAverage={movieDetail.vote_average}
                            />

                            {/* OTT 정보 */}
                            <DetailOTTSection
                                movieId={movieDetail.movie_id}
                                movieTitle={movieDetail.title}
                                posterUrl={movieDetail.poster_url}
                                ottProviders={movieDetail.ott_providers || []}
                            />

                            {/* 줄거리 */}
                            <DetailOverview overview={movieDetail.overview} />

                            {/* 출연진 및 감독 */}
                            <DetailCast
                                director={movieDetail.director}
                                cast={movieDetail.cast}
                            />

                            {/* 태그 */}
                            <DetailTags tags={movieDetail.tags || []} />

                            {/* 액션 버튼 */}
                            {/* <DetailActionButtons
                                userStatus={movieDetail.user_status}
                                onToggleLike={handleToggleLike}
                                onToggleBookmark={handleToggleBookmark}
                                onToggleWatched={handleToggleWatched}
                            /> */}
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    );
}
