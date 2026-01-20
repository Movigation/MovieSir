// [용도] 사용자 통계 컴포넌트
// [사용법] <UserStats onBack={() => setView('main')} />

import { useState, useEffect } from 'react';
import { ArrowLeft, Film, Star, TrendingUp } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthContext';
import { getUserStats } from '@/api/movieApi';
import type { UserStats as UserStatsType } from '@/api/movieApi.type';
import SettingItem from './SettingItem';

type UserStatsProps = {
    onBack: () => void;
};

export default function UserStats({ onBack }: UserStatsProps) {
    const { user } = useAuth();
    const [stats, setStats] = useState<UserStatsType | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            if (!user) return;

            try {
                setIsLoading(true);
                const userStats = await getUserStats(user.id);
                setStats(userStats);
            } catch (err) {
                console.error('통계 조회 실패:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, [user]);

    return (
        <div className="flex flex-col h-full">
            {/* 헤더 */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-700">
                <button
                    onClick={onBack}
                    className="text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <h2 className="text-xl font-bold text-white">나의 통계</h2>
            </div>

            {/* 통계 내용 */}
            <div className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                    <div className="text-center text-gray-400 py-8">
                        로딩 중...
                    </div>
                ) : !stats ? (
                    <div className="text-center text-gray-400 py-8">
                        통계 정보를 불러올 수 없습니다
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* 총 시청 횟수 */}
                        <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Film size={32} className="text-white" />
                                <div>
                                    <p className="text-blue-200 text-sm">총 시청 횟수</p>
                                    <p className="text-white text-2xl font-bold">{stats.totalWatched}편</p>
                                </div>
                            </div>
                        </div>

                        {/* 평균 평점 */}
                        <div className="p-4 bg-gradient-to-r from-yellow-600 to-yellow-700 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Star size={32} className="text-white" />
                                <div>
                                    <p className="text-yellow-200 text-sm">평균 평점</p>
                                    <p className="text-white text-2xl font-bold">{stats.averageRating.toFixed(1)} / 5.0</p>
                                </div>
                            </div>
                        </div>

                        {/* 선호 장르 */}
                        <div className="p-4 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg">
                            <div className="flex items-center gap-3">
                                <TrendingUp size={32} className="text-white" />
                                <div>
                                    <p className="text-purple-200 text-sm">가장 좋아하는 장르</p>
                                    <p className="text-white text-2xl font-bold">{stats.favoriteGenre}</p>
                                </div>
                            </div>
                        </div>

                        {/* 장르별 시청 횟수 */}
                        <SettingItem>
                            <h3 className="text-black dark:text-white font-medium mb-3">장르별 시청 횟수</h3>
                            <div className="space-y-2">
                                {Object.entries(stats.watchedByGenre).length === 0 ? (
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">데이터가 없습니다</p>
                                ) : (
                                    Object.entries(stats.watchedByGenre)
                                        .sort(([, a], [, b]) => b - a)
                                        .map(([genre, count]) => (
                                            <div key={genre} className="flex justify-between items-center">
                                                <span className="text-gray-700 dark:text-gray-300">{genre}</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-32 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-500 rounded-full"
                                                            style={{
                                                                width: `${(count / stats.totalWatched) * 100}%`
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-gray-600 dark:text-gray-400 text-sm w-8 text-right">{count}편</span>
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>
                        </SettingItem>
                    </div>
                )}
            </div>
        </div>
    );
}
