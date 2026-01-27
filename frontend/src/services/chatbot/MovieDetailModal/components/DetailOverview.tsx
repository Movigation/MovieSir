// 이 파일은 영화 상세 정보의 줄거리 부분을 보여주는 컴포넌트입니다.
interface DetailOverviewProps {
    overview: string;
}

export default function DetailOverview({ overview }: DetailOverviewProps) {
    if (!overview) return null;

    return (
        <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-[13px] sm:text-sm">줄거리</h3>
            <p className="text-[11px] sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {overview}
            </p>
        </div>
    );
}
