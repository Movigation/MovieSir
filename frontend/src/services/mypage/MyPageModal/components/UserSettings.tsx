// [용도] 사용자 설정 및 회원 탈퇴 컴포넌트
// [사용법] <UserSettings onBack={() => setView('main')} />

import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Trash2, Eye, EyeOff, X } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthContext';
import { deleteUser } from '@/api/authApi';
import * as userApi from '@/api/userApi';
import SettingItem from './SettingItem';
import ConfirmModal from '@/components/ui/ConfirmModal';

type UserSettingsProps = {
    onBack: () => void;
};

export default function UserSettings({ onBack }: UserSettingsProps) {
    const { user, updateUser, logout } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [tempName, setTempName] = useState(user?.nickname || '');
    const [isLoading, setIsLoading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const [modalState, setModalState] = useState<{ type: 'success' | 'error'; message: string; action?: () => void } | null>(null);

    useEffect(() => {
        if (user) {
            setTempName(user.nickname);
        }
    }, [user]);

    const handleSaveName = async () => {
        if (!user) return;

        try {
            setIsLoading(true);
            const response = await userApi.updateNickname(tempName);
            const newNickname = response.data.nickname;

            updateUser({ nickname: newNickname });
            setIsEditing(false);
            setModalState({ type: 'success', message: '닉네임이 변경되었습니다' });
        } catch (error: any) {
            const msg = error.response?.data?.detail || '닉네임 변경에 실패했습니다';
            setModalState({ type: 'error', message: msg });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!user || !deletePassword) return;

        try {
            setIsLoading(true);
            setDeleteError('');

            await deleteUser(deletePassword);

            setShowDeleteModal(false);
            setModalState({
                type: 'success',
                message: '회원 탈퇴가 완료되었습니다.\n그동안 이용해주셔서 감사합니다.',
                action: async () => {
                    await logout();
                    window.location.href = '/';
                }
            });
        } catch (error: any) {
            const errorMsg = error.response?.data?.detail || error.message || '회원 탈퇴에 실패했습니다.\n비밀번호를 확인해주세요.';
            setDeleteError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleModalClose = () => {
        if (modalState?.action) {
            modalState.action();
        }
        setModalState(null);
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
                {/* 닉네임 변경 */}
                <SettingItem>
                    <h3 className="text-black dark:text-white font-medium mb-3">닉네임</h3>
                    {isEditing ? (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={tempName}
                                onChange={(e) => setTempName(e.target.value)}
                                disabled={isLoading}
                                className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-600 text-black dark:text-white rounded-lg border border-gray-200 dark:border-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
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
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 text-black dark:text-white rounded-lg transition-colors"
                            >
                                취소
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <span className="text-black dark:text-white text-lg">{user?.nickname}</span>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                            >
                                변경
                            </button>
                        </div>
                    )}
                </SettingItem>

                {/* 이메일 표시 */}
                <SettingItem>
                    <h3 className="text-black dark:text-white font-medium mb-3">이메일</h3>
                    <p className="text-gray-700 dark:text-gray-300">{user?.email}</p>
                    <p className="text-gray-500 text-sm mt-1">이메일은 변경할 수 없습니다</p>
                </SettingItem>

                {/* 회원 탈퇴 */}
                <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                    <h3 className="text-red-400 font-medium mb-2">위험 구역</h3>
                    <p className="text-gray-400 text-sm mb-3">
                        회원 탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.
                    </p>
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                    >
                        <Trash2 size={18} />
                        회원 탈퇴
                    </button>
                </div>
            </div>

            {/* 회원 탈퇴 확인 모달 */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
                    <div className="bg-gray-800 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden border border-gray-700">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-white">회원 탈퇴 확인</h3>
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="text-gray-400 hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                                보안을 위해 비밀번호를 입력해주세요.<br />
                                탈퇴 시 모든 데이터가 즉시 삭제됩니다.
                            </p>

                            <div className="space-y-4">
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={deletePassword}
                                        onChange={(e) => setDeletePassword(e.target.value)}
                                        placeholder="비밀번호"
                                        className="w-full px-4 py-2.5 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-red-500 pr-10"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>

                                {deleteError && (
                                    <p className="text-red-400 text-xs">{deleteError}</p>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setShowDeleteModal(false)}
                                        className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                                    >
                                        취소
                                    </button>
                                    <button
                                        onClick={handleDeleteAccount}
                                        disabled={!deletePassword || isLoading}
                                        className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
                                    >
                                        {isLoading ? '처리 중...' : '탈퇴하기'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 결과 모달 */}
            <ConfirmModal
                isOpen={!!modalState}
                type={modalState?.type === 'success' ? 'alert' : 'info'}
                title={modalState?.type === 'success' ? '완료' : '오류'}
                message={modalState?.message || ''}
                onConfirm={handleModalClose}
            />
        </div>
    );
}
