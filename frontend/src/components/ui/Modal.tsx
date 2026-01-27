import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import CloseButton from './CloseButton';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    allowScroll?: boolean;  // 모달 내부 스크롤 허용 여부 (기본: false)
}

export default function Modal({ isOpen, onClose, children, allowScroll = false }: ModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    // 스크롤 락 및 포커스 관리
    useEffect(() => {
        if (isOpen) {
            // 1. 배경 스크롤 차단
            document.body.style.overflow = 'hidden';

            // 2. 현재 포커스 저장 및 모달로 포커스 이동
            previousFocusRef.current = document.activeElement as HTMLElement;

            // 모달이 렌더링된 후 포커스 이동을 위해 약간의 지연
            const timer = setTimeout(() => {
                modalRef.current?.focus();
            }, 50);

            return () => clearTimeout(timer);
        } else {
            document.body.style.overflow = 'unset';
            // 3. 모달이 닫힐 때 이전 포커스 복구
            previousFocusRef.current?.focus();
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // 키보드 이벤트 핸들러 (포커스 트랩 및 스크롤 제어)
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Tab') {
            if (!modalRef.current) return;

            const focusableElements = modalRef.current.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0] as HTMLElement;
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

            if (e.shiftKey) { // Shift + Tab
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else { // Tab
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        }

        // 방향키 및 스페이스바 입력 시 모달 내부 스크롤 보장 (배경 스크롤 방지 보조)
        if (['ArrowUp', 'ArrowDown', 'Space', 'PageUp', 'PageDown'].includes(e.key)) {
            // 포커스가 모달 내부에 있다면 기본 동작 허용 (이미 body overflow hidden이라 배경은 안 움직임)
            e.stopPropagation();
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-0 md:p-4"
            style={{ zIndex: 99999 }}
            onClick={onClose}
        >
            <div
                ref={modalRef}
                tabIndex={-1} // 스크립트로 포커스 가능하게 설정
                onKeyDown={handleKeyDown}
                className={`bg-white dark:bg-gray-800 w-full h-full md:w-full md:max-w-4xl md:max-h-[calc(100vh-100px)] md:rounded-xl shadow-2xl relative outline-none ${allowScroll ? 'overflow-y-auto' : 'overflow-y-auto md:overflow-hidden'
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                <CloseButton
                    onClose={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white z-50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
                    aria-label="모달 닫기"
                />
                {children}
            </div>
        </div>,
        document.body
    );
}
