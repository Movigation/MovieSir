// [용도] 통계 카드 컴포넌트
// [사용법] 대시보드에서 통계 표시

interface StatCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    trend?: string;
    trendUp?: boolean;
}

export default function StatCard({ title, value, icon, trend, trendUp }: StatCardProps) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {title}
                </div>
                <div className="flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    {icon}
                </div>
            </div>

            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {value}
            </div>

            {trend && (
                <div className="flex items-center gap-1">
                    <span className={`text-sm font-medium ${trendUp
                            ? "text-green-500"
                            : "text-red-500"
                        }`}>
                        {trendUp ? "↑" : "↓"} {trend}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        지난주 대비
                    </span>
                </div>
            )}
        </div>
    );
}
