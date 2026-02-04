// [용도] 범용 확인/알림 모달 (confirm, alert 대체)
// [사용법]
//   확인 모달: <ConfirmModal isOpen={show} title="삭제" message="정말 삭제하시겠습니까?" onConfirm={fn} onCancel={fn} />
//   알림 모달: <ConfirmModal isOpen={show} title="완료" message="저장되었습니다." onConfirm={fn} type="alert" />

import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, AlertTriangle, Trash2, Info, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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

const typeConfig: Record<ModalType, { icon: LucideIcon; color: string; bgColor: string }> = {
    confirm: {
        icon: AlertTriangle,
        color: '#3B82F6',
        bgColor: 'bg-blue-500/20',
    },
    alert: {
        icon: CheckCircle,
        color: '#10B981',
        bgColor: 'bg-green-500/20',
    },
    danger: {
        icon: Trash2,
        color: '#EF4444',
        bgColor: 'bg-red-500/20',
    },
    info: {
        icon: Info,
        color: '#3B82F6',
        bgColor: 'bg-blue-500/20',
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
    const config = typeConfig[type];
    const Icon = CustomIcon || config.icon;

    // ESC 키로 모달 닫기
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            if (type === 'alert' || !onCancel) {
                onConfirm();
            } else {
                onCancel();
            }
        }
    }, [type, onCancel, onConfirm]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => {
                document.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [isOpen, handleKeyDown]);

    // 기본 확인 텍스트 설정
    const defaultConfirmText = type === 'alert' ? '확인' : type === 'danger' ? '삭제' : '확인';
    const finalConfirmText = confirmText || defaultConfirmText;

    // alert 타입은 취소 버튼 없음
    const showCancelButton = type !== 'alert' && onCancel;

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
            onClick={onCancel || onConfirm}
        >
            {/* 배경 오버레이 */}
            <div className="absolute inset-0 bg-black/70" />

            {/* 모달 본체 */}
            <div
                className="relative w-full max-w-[360px] rounded-2xl shadow-2xl overflow-hidden bg-[#1f1f28] border border-gray-700"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 닫기 버튼 */}
                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                        <X size={20} />
                    </button>
                )}

                {/* 상단 아이콘 영역 */}
                <div className="flex justify-center pt-8 pb-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${config.bgColor}`}>
                        <Icon size={32} style={{ color: config.color }} />
                    </div>
                </div>

                {/* 텍스트 영역 */}
                <div className="px-6 pb-6 text-center">
                    <h3 className="text-xl font-bold mb-3 text-white">
                        {title}
                    </h3>
                    <p className="text-sm whitespace-pre-line text-gray-400">
                        {message}
                    </p>
                </div>

                {/* 버튼 영역 */}
                <div className="flex gap-3 px-6 pb-6">
                    {showCancelButton && (
                        <button
                            onClick={onCancel}
                            className="flex-1 py-3 font-medium rounded-lg transition-colors bg-gray-700 text-gray-300 hover:bg-gray-600"
                        >
                            {cancelText}
                        </button>
                    )}

                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-3 font-bold rounded-lg transition-colors ${
                            type === 'danger'
                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                : type === 'alert'
                                ? 'bg-green-500 hover:bg-green-600 text-white'
                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                    >
                        {finalConfirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
