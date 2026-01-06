// [용도] 무비 캘린더 컴포넌트 - 월별 시청 기록 및 날짜별 영화 기록 관리
// [사용법] <MovieCalendar onBack={() => setView('main')} />

import { useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Edit, Trash2 } from 'lucide-react';

type MovieRecord = {
    id: string;
    date: string; // YYYY-MM-DD
    movieTitle: string;
    review?: string;
    rating?: number;
};

type MovieCalendarProps = {
    onBack: () => void;
};

export default function MovieCalendar({ onBack }: MovieCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingRecord, setEditingRecord] = useState<MovieRecord | null>(null);

    // TODO: 실제 API 연동 시 수정 필요
    // GET /api/user/movie-records?month=YYYY-MM
    // POST /api/user/movie-records
    // PUT /api/user/movie-records/:id
    // DELETE /api/user/movie-records/:id
    const [movieRecords, setMovieRecords] = useState<MovieRecord[]>([
        { id: '1', date: '2024-12-01', movieTitle: '인터스텔라', review: '정말 감동적이었어요!', rating: 5 },
        { id: '2', date: '2024-12-15', movieTitle: '인셉션', review: '복잡하지만 재미있었습니다.', rating: 4 },
    ]);

    const [formData, setFormData] = useState({
        movieTitle: '',
        review: '',
        rating: 0,
    });

    // 캘린더 생성
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) {
        days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    const handlePrevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const handleDateClick = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setSelectedDate(dateStr);
        setShowAddForm(false);
        setEditingRecord(null);
    };

    const getRecordsForDate = (dateStr: string) => {
        return movieRecords.filter(record => record.date === dateStr);
    };

    const hasRecordOnDay = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return movieRecords.some(record => record.date === dateStr);
    };

    const handleAddRecord = () => {
        if (!selectedDate || !formData.movieTitle) return;

        const newRecord: MovieRecord = {
            id: Date.now().toString(),
            date: selectedDate,
            movieTitle: formData.movieTitle,
            review: formData.review || undefined,
            rating: formData.rating || undefined,
        };

        // TODO: 실제 API 호출로 교체
        setMovieRecords([...movieRecords, newRecord]);
        setFormData({ movieTitle: '', review: '', rating: 0 });
        setShowAddForm(false);
    };

    const handleUpdateRecord = () => {
        if (!editingRecord) return;

        // TODO: 실제 API 호출로 교체
        setMovieRecords(movieRecords.map(record =>
            record.id === editingRecord.id
                ? { ...record, ...formData }
                : record
        ));
        setFormData({ movieTitle: '', review: '', rating: 0 });
        setEditingRecord(null);
    };

    const handleDeleteRecord = (id: string) => {
        if (!window.confirm('이 기록을 삭제하시겠습니까?')) return;

        // TODO: 실제 API 호출로 교체
        setMovieRecords(movieRecords.filter(record => record.id !== id));
    };

    const handleEditRecord = (record: MovieRecord) => {
        setEditingRecord(record);
        setFormData({
            movieTitle: record.movieTitle,
            review: record.review || '',
            rating: record.rating || 0,
        });
        setShowAddForm(false);
    };

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
                <h2 className="text-xl font-bold text-white">무비 캘린더</h2>
            </div>

            {/* 캘린더 */}
            <div className="flex-1 overflow-y-auto p-4">
                {/* 월 네비게이션 */}
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={handlePrevMonth}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <ChevronLeft className="text-white" size={20} />
                    </button>
                    <h3 className="text-white font-medium text-lg">
                        {year}년 {month + 1}월
                    </h3>
                    <button
                        onClick={handleNextMonth}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <ChevronRight className="text-white" size={20} />
                    </button>
                </div>

                {/* 요일 헤더 */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                        <div key={day} className={`text-center text-sm font-medium ${idx === 0 ? 'text-red-400' : idx === 6 ? 'text-blue-400' : 'text-gray-400'}`}>
                            {day}
                        </div>
                    ))}
                </div>

                {/* 날짜 그리드 */}
                <div className="grid grid-cols-7 gap-1 mb-4">
                    {days.map((day, idx) => {
                        if (day === null) {
                            return <div key={`empty-${idx}`} className="aspect-square" />;
                        }

                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const isSelected = selectedDate === dateStr;
                        const hasRecord = hasRecordOnDay(day);

                        return (
                            <button
                                key={day}
                                onClick={() => handleDateClick(day)}
                                className={`aspect-square flex items-center justify-center rounded-lg text-sm transition-colors relative
                  ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'}
                  ${hasRecord ? 'ring-2 ring-green-500' : ''}
                `}
                            >
                                {day}
                                {hasRecord && (
                                    <div className="absolute bottom-1 w-1 h-1 bg-green-400 rounded-full" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* 선택된 날짜의 기록 */}
                {selectedDate && (
                    <div className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-white font-medium">{selectedDate} 기록</h4>
                            {!showAddForm && !editingRecord && (
                                <button
                                    onClick={() => setShowAddForm(true)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
                                >
                                    <Plus size={16} />
                                    추가
                                </button>
                            )}
                        </div>

                        {/* 기록 추가/수정 폼 */}
                        {(showAddForm || editingRecord) && (
                            <div className="mb-4 p-3 bg-gray-600 rounded-lg">
                                <input
                                    type="text"
                                    placeholder="영화 제목"
                                    value={formData.movieTitle}
                                    onChange={(e) => setFormData({ ...formData, movieTitle: e.target.value })}
                                    className="w-full px-3 py-2 mb-2 bg-gray-700 text-white rounded-lg border border-gray-500 focus:outline-none focus:border-blue-500"
                                />
                                <textarea
                                    placeholder="감상평 (선택사항)"
                                    value={formData.review}
                                    onChange={(e) => setFormData({ ...formData, review: e.target.value })}
                                    className="w-full px-3 py-2 mb-2 bg-gray-700 text-white rounded-lg border border-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                                    rows={3}
                                />
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-gray-400 text-sm">평점:</span>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => setFormData({ ...formData, rating: star })}
                                            className={`text-2xl ${formData.rating >= star ? 'text-yellow-400' : 'text-gray-600'}`}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={editingRecord ? handleUpdateRecord : handleAddRecord}
                                        className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                                    >
                                        {editingRecord ? '수정' : '저장'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowAddForm(false);
                                            setEditingRecord(null);
                                            setFormData({ movieTitle: '', review: '', rating: 0 });
                                        }}
                                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                                    >
                                        취소
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 기록 목록 */}
                        <div className="space-y-2">
                            {getRecordsForDate(selectedDate).length === 0 ? (
                                <p className="text-gray-400 text-sm text-center py-4">기록이 없습니다</p>
                            ) : (
                                getRecordsForDate(selectedDate).map((record) => (
                                    <div key={record.id} className="p-3 bg-gray-600 rounded-lg">
                                        <div className="flex items-start justify-between mb-2">
                                            <h5 className="text-white font-medium">{record.movieTitle}</h5>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => handleEditRecord(record)}
                                                    className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteRecord(record.id)}
                                                    className="p-1 text-red-400 hover:text-red-300 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        {record.rating && (
                                            <div className="flex items-center gap-1 mb-1">
                                                {[...Array(5)].map((_, idx) => (
                                                    <span key={idx} className={`text-sm ${idx < record.rating! ? 'text-yellow-400' : 'text-gray-600'}`}>
                                                        ★
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {record.review && (
                                            <p className="text-gray-300 text-sm">{record.review}</p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
