import React from 'react';
import { X } from 'lucide-react';

interface CloseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    onClose: () => void;
    size?: number;
    iconClassName?: string;
}

/**
 * A reusable close button component that rotates 45 degrees on hover.
 * Commonly used for modals, popups, and sidebars.
 */
const CloseButton: React.FC<CloseButtonProps> = ({
    onClose,
    size = 24,
    className = "",
    iconClassName = "",
    ...props
}) => {
    return (
        <button
            onClick={onClose}
            className={`group transition-colors duration-200 outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1 ${className}`}
            aria-label="닫기"
            {...props}
        >
            <X
                size={size}
                className={`transition-transform duration-300 ease-in-out group-hover:rotate-45 ${iconClassName}`}
            />
        </button>
    );
};

export default CloseButton;
