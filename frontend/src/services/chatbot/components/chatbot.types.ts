// [용도] Chatbot 관련 컴포넌트의 타입 정의

export type ChatbotProps = {
    resetSignal?: number;  // 숫자로 주면 변경될 때 감지됨
    isOpen?: boolean;
    setIsOpen?: (value: boolean) => void;
};

// [용도] 챗봇 패널 Props
// [반응형] Tailwind CSS의 sm, lg breakpoint 사용
export type ChatbotPanelProps = {
    isOpen: boolean;
    onClose: () => void;
};

export type ChatbotButtonProps = {
    isDark: boolean;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

export type Offset = {
    x: number;
    y: number;
};
