// [용도] 본 영화 조회 컴포넌트
// [사용법] <WatchedMovies onBack={() => setView('main')} />

import { useState, useEffect } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthContext';
import { getWatchHistory } from '@/api/movieApi';
import type { WatchHistoryWithMovie } from '@/api/movieApi.type';
import SettingItem from './SettingItem';

type WatchedMoviesProps = {
    onBack: () => void;
};

export default function WatchedMovies({ onBack }: WatchedMoviesProps) {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [movies, setMovies] = useState<WatchHistoryWithMovie[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string>('');

    // 시청 기록 불러오기
    useEffect(() => {
        const fetchWatchHistory = async () => {
            if (!user) return;

            try {
                setIsLoading(true);
                const history = await getWatchHistory(user.id);
                setMovies(history);
            } catch (err) {
                setError('시청 기록을 불러오는데 실패했습니다');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchWatchHistory();
    }, [user]);

    const filteredMovies = movies.filter(item =>
        item.movie.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                <h2 className="text-xl font-bold text-white">본 영화 조회</h2>
            </div>

            {/* 검색 */}
            <div className="p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="영화 제목 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
                    />
                </div>
            </div>

            {/* 영화 목록 */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
                {isLoading ? (
                    <div className="text-center text-gray-400 py-8">
                        로딩 중...
                    </div>
                ) : error ? (
                    <div className="text-center text-red-400 py-8">
                        {error}
                    </div>
                ) : filteredMovies.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                        {searchQuery ? '검색 결과가 없습니다' : '본 영화가 없습니다'}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredMovies.map((item) => (
                            <SettingItem
                                key={item.id}
                                className="p-4"
                            >
                                <div className="flex justify-between items-start">
                                    <h3 className="text-black dark:text-white font-medium">{item.movie.title}</h3>
                                    <div className="flex items-center gap-1">
                                        {[...Array(5)].map((_, i) => (
                                            <span key={i} className={i < item.rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}>
                                                ★
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    <span>{item.movie.genres.join(', ')}</span>
                                    <span>•</span>
                                    <span>{item.movie.year}</span>
                                    <span>•</span>
                                    <span>시청일: {new Date(item.watchedAt).toLocaleDateString('ko-KR')}</span>
                                </div>
                            </SettingItem>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
