// 이 파일은 영화 상세 정보의 태그 부분을 보여주는 컴포넌트입니다.
export default function DetailTags({ tags }: { tags: string[] }) {
    if (!tags || tags.length === 0) return null;

    return (
        <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-[13px] sm:text-sm mb-2">태그</h3>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {tags.map((tag, index) => (
                    <span
                        key={index}
                        className="px-2 py-0.5 sm:px-3 sm:py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[11px] sm:text-sm rounded-full"
                    >
                        #{tag}
                    </span>
                ))}
            </div>
        </div>
    );
}
