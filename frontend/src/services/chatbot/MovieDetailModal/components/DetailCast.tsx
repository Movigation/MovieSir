// 이 파일은 영화 상세 정보의 출연진 부분을 보여주는 컴포넌트입니다.
import { type Cast } from '@/api/movieApi.type';

interface DetailCastProps {
    director?: string;
    cast?: Cast[];
}

export default function DetailCast({ director, cast }: DetailCastProps) {
    if (!director && (!cast || cast.length === 0)) return null;

    return (
        <div className="flex flex-col gap-4">
            {director && (
                <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-[13px] sm:text-sm mb-1">감독</h3>
                    <p className="text-[12px] sm:text-sm text-gray-600 dark:text-gray-300">{director}</p>
                </div>
            )}

            {cast && cast.length > 0 && (
                <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-[13px] sm:text-sm mb-2">출연</h3>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {cast.slice(0, 5).map((actor, idx) => (
                            <div key={idx} className="flex-shrink-0 text-center w-16 sm:w-20">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 mb-1.5 flex items-center justify-center border border-black/5 dark:border-white/5">
                                    <img
                                        src={actor.profile_url}
                                        alt={actor.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            const parent = e.currentTarget.parentElement;
                                            if (parent && !parent.querySelector('svg')) {
                                                parent.innerHTML = '<svg class="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path></svg>';
                                            }
                                        }}
                                    />
                                </div>
                                <p className="text-[10px] sm:text-[11px] text-gray-800 dark:text-gray-200 font-medium truncate px-0.5">
                                    {actor.name}
                                </p>
                                <p className="text-[9px] sm:text-[10px] text-gray-500 truncate px-0.5">
                                    {actor.character}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
