import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    allowScroll?: boolean;  // 모달 내부 스크롤 허용 여부 (기본: false)
}

export default function Modal({ isOpen, onClose, children, allowScroll = false }: ModalProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-0 md:p-4"
            style={{ zIndex: 99999 }}
            onClick={onClose}
        >
            <div
                className={`bg-white dark:bg-gray-800 w-full h-full md:w-full md:max-w-4xl md:max-h-[calc(100vh-100px)] md:rounded-xl shadow-2xl relative ${allowScroll ? 'overflow-y-auto' : 'overflow-y-auto md:overflow-hidden'
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white z-50 bg-white/80 dark:bg-gray-800/80 rounded-full p-1 backdrop-blur-sm"
                >
                    <X size={24} />
                </button>
                {children}
            </div>
        </div>,
        document.body
    );
}
