// [용도] 비밀번호 찾기 모달
// [사용법] <ForgotPasswordModal isOpen={isOpen} onClose={handleClose} />

import { useState } from 'react';
import CloseButton from '@/components/ui/CloseButton';

interface ForgotPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: 실제 API 연동
        console.log('Reset password for:', email);
        setIsSubmitted(true);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-modal flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="bg-white dark:bg-gray-800 w-[90%] max-w-md rounded-xl shadow-2xl relative p-6">
                <CloseButton
                    onClose={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                />

                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">비밀번호 찾기</h2>

                {!isSubmitted ? (
                    <>
                        <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
                            가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
                        </p>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    이메일
                                </label>
                                <input
                                    id="reset-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    placeholder="example@email.com"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                            >
                                재설정 링크 보내기
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="text-center py-4">
                        <div className="text-5xl mb-4">📧</div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">메일 발송 완료</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
                            {email}으로 재설정 링크를 보냈습니다.<br />메일함을 확인해주세요.
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium rounded-lg transition-colors"
                        >
                            닫기
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
