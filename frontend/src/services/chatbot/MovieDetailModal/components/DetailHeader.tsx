import { Star } from 'lucide-react';

interface DetailHeaderProps {
    title: string;
    tagline?: string;
    genres: string[];
    runtime?: number;
    releaseDate?: string;
    voteAverage?: number;
}

export default function DetailHeader({ title, tagline, genres, runtime, releaseDate, voteAverage }: DetailHeaderProps) {
    const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : null;
    const metaItems = [
        releaseYear ? `${releaseYear}년` : null,
        runtime ? `${Math.floor(runtime / 60)}시간 ${runtime % 60}분` : null,
        ...genres,
    ].filter(Boolean);

    return (
        <div className="flex flex-col gap-1.5">
            {/* 1. 타이틀 */}
            <h2 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
                {title}
            </h2>

            {/* 2. 별점 (별도 줄, 배경 없음, 아이콘 축소) */}
            {voteAverage !== undefined && voteAverage > 0 && (
                <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-500" fill="currentColor" />
                    <span className="text-sm sm:text-base font-bold text-yellow-600 dark:text-yellow-500">
                        {voteAverage.toFixed(1)}
                    </span>
                </div>
            )}

            {/* 3. 메타 정보 (장르, 년도, 시간) */}
            <div className="flex flex-wrap items-center gap-y-1 text-[11px] sm:text-[13px] text-gray-600 dark:text-gray-400">
                {metaItems.map((item, index) => (
                    <div key={index} className="flex items-center">
                        {index > 0 && (
                            <span className="mx-1.5 opacity-40 select-none">•</span>
                        )}
                        <span>{item}</span>
                    </div>
                ))}
            </div>

            {/* 태그라인 (줄거리 위나 제목 아래 적절한 곳) */}
            {tagline && (
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 italic mt-0.5">
                    {tagline}
                </p>
            )}
        </div>
    );
}
