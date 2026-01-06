// [용도] Transitions 컴포넌트의 타입 정의

export type FadeInProps = {
    isVisible: boolean;
    children: React.ReactNode;
};

export type FloatProps = {
    children: React.ReactNode;
    speed?: number;
};
