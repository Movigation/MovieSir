// [용도] 범용 확인/알림 모달 (confirm, alert 대체)
// [사용법]
//   확인 모달: <ConfirmModal isOpen={show} title="로그아웃" message="정말 로그아웃 하시겠습니까?" onConfirm={fn} onCancel={fn} />
//   알림 모달: <ConfirmModal isOpen={show} title="완료" message="저장되었습니다." onConfirm={fn} type="alert" />

import { createPortal } from 'react-dom';
import { LogOut, CheckCircle, Info, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTheme } from '@/app/providers/ThemeContext';

type ModalType = 'confirm' | 'alert' | 'danger' | 'info';

type ConfirmModalProps = {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    type?: ModalType;
    confirmText?: string;
    cancelText?: string;
    icon?: LucideIcon;
};

const typeConfig: Record<ModalType, { icon: LucideIcon; color: string; bgColor: string; darkBgColor: string }> = {
    confirm: {
        icon: LogOut,
        color: '#3B82F6',
        bgColor: 'bg-blue-50',
        darkBgColor: 'bg-blue-500/20',
    },
    alert: {
        icon: CheckCircle,
        color: '#10B981',
        bgColor: 'bg-green-50',
        darkBgColor: 'bg-green-500/20',
    },
    danger: {
        icon: Trash2,
        color: '#EF4444',
        bgColor: 'bg-red-50',
        darkBgColor: 'bg-red-500/20',
    },
    info: {
        icon: Info,
        color: '#3B82F6',
        bgColor: 'bg-blue-50',
        darkBgColor: 'bg-blue-500/20',
    },
};

export default function ConfirmModal({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    type = 'confirm',
    confirmText,
    cancelText = '취소',
    icon: CustomIcon,
}: ConfirmModalProps) {
    const { isDark } = useTheme();
    const config = typeConfig[type];
    const Icon = CustomIcon || config.icon;

    // 기본 확인 텍스트 설정
    const defaultConfirmText = type === 'alert' ? '확인' : type === 'danger' ? '삭제' : '확인';
    const finalConfirmText = confirmText || defaultConfirmText;

    // alert 타입은 취소 버튼 없음
    const showCancelButton = type !== 'alert' && onCancel;

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-max flex items-center justify-center p-4"
            onClick={onCancel || onConfirm}
        >
            {/* 배경 오버레이 */}
            <div className={`absolute inset-0 ${isDark ? 'bg-black/70' : 'bg-black/40'}`} />

            {/* 모달 본체 */}
            <div
                className={`relative w-full max-w-[320px] rounded-2xl shadow-2xl overflow-hidden transform transition-all
                    ${isDark
                        ? 'bg-gray-800 border border-gray-700'
                        : 'bg-white border border-gray-200'
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* 상단 아이콘 영역 */}
                <div className="flex justify-center pt-6 pb-2">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center
                        ${isDark ? config.darkBgColor : config.bgColor}`}
                    >
                        <Icon size={32} style={{ color: config.color }} />
                    </div>
                </div>

                {/* 텍스트 영역 */}
                <div className="px-6 pb-4 text-center">
                    <h3 className={`text-lg font-bold mb-2
                        ${isDark ? 'text-white' : 'text-gray-900'}`}
                    >
                        {title}
                    </h3>
                    <p className={`text-sm whitespace-pre-line
                        ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                    >
                        {message}
                    </p>
                </div>

                {/* 버튼 영역 */}
                <div className={`flex border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    {showCancelButton && (
                        <>
                            {/* 취소 버튼 */}
                            <button
                                onClick={onCancel}
                                className={`flex-1 py-3.5 font-medium transition-colors
                                    ${isDark
                                        ? 'text-gray-400 hover:bg-gray-700'
                                        : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                {cancelText}
                            </button>

                            {/* 구분선 */}
                            <div className={`w-px ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
                        </>
                    )}

                    {/* 확인 버튼 */}
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-3.5 font-bold transition-colors hover:opacity-80"
                        style={{ color: config.color }}
                    >
                        {finalConfirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
