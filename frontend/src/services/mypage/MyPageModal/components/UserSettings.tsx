// [용도] 사용자 설정 및 회원 탈퇴 컴포넌트
// [사용법] <UserSettings onBack={() => setView('main')} />

import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthContext';
import { deleteUser } from '@/api/authApi';
import * as userApi from '@/api/userApi';

type UserSettingsProps = {
    onBack: () => void;
};

export default function UserSettings({ onBack }: UserSettingsProps) {
    const { user, logout, refreshUser } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [tempName, setTempName] = useState(user?.nickname || '');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setTempName(user.nickname);
        }
    }, [user]);

    const handleSaveName = async () => {
        if (!user) return;

        try {
            setIsLoading(true);
            await userApi.patchUser(user.id, { nickname: tempName } as any);
            await refreshUser();
            setIsEditing(false);
            alert('이름이 변경되었습니다');
        } catch (error) {
            console.error('이름 변경 실패:', error);
            alert('이름 변경에 실패했습니다');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!user) return;

        if (window.confirm('정말로 회원 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            if (window.confirm('모든 데이터가 삭제됩니다. 정말 진행하시겠습니까?')) {
                try {
                    await deleteUser(user.id);
                    alert('회원 탈퇴가 완료되었습니다');
                    logout();
                } catch (error) {
                    console.error('회원 탈퇴 실패:', error);
                    alert('회원 탈퇴에 실패했습니다');
                }
            }
        }
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
                <h2 className="text-xl font-bold text-white">사용자 설정</h2>
            </div>

            {/* 설정 내용 */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
                {/* 이름 변경 */}
                <div className="p-4 bg-gray-700 rounded-lg">
                    <h3 className="text-white font-medium mb-3">이름</h3>
                    {isEditing ? (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={tempName}
                                onChange={(e) => setTempName(e.target.value)}
                                disabled={isLoading}
                                className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                                autoFocus
                            />
                            <button
                                onClick={handleSaveName}
                                disabled={isLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-colors"
                            >
                                <Save size={18} />
                                {isLoading ? '저장 중...' : '저장'}
                            </button>
                            <button
                                onClick={() => {
                                    setIsEditing(false);
                                    setTempName(user?.nickname || '');
                                }}
                                disabled={isLoading}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-white rounded-lg transition-colors"
                            >
                                취소
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <span className="text-white text-lg">{user?.nickname}</span>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                            >
                                변경
                            </button>
                        </div>
                    )}
                </div>

                {/* 이메일 표시 */}
                <div className="p-4 bg-gray-700 rounded-lg">
                    <h3 className="text-white font-medium mb-3">이메일</h3>
                    <p className="text-gray-300">{user?.email}</p>
                    <p className="text-gray-500 text-sm mt-1">이메일은 변경할 수 없습니다</p>
                </div>

                {/* 회원 탈퇴 */}
                <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                    <h3 className="text-red-400 font-medium mb-2">위험 구역</h3>
                    <p className="text-gray-400 text-sm mb-3">
                        회원 탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.
                    </p>
                    <button
                        onClick={handleDeleteAccount}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                    >
                        <Trash2 size={18} />
                        회원 탈퇴
                    </button>
                </div>
            </div>
        </div>
    );
}
