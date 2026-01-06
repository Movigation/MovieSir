// [용도] MyPage 모달 컴포넌트의 타입 정의

export type MyPageModalProps = {
    isOpen: boolean;
    onClose: () => void;
    userName?: string;
};

export type MyPageView =
    | 'main'
    | 'watched'
    | 'excluded'
    | 'stats'
    | 'settings'
    | 'calendar'
    | 'ott';

export type MenuItem = {
    id: string;
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
};

export type Movie = {
    id: string;
    title: string;
    genre: string;
    releaseYear?: number;
    watchedDate?: string;
    posterUrl?: string;
};

export type UserStats = {
    totalWatchTime: number; // 분 단위
    genreStats: GenreStat[];
    favoriteGenre?: string;
};

export type GenreStat = {
    genre: string;
    count: number;
    percentage: number;
};

export type UserSettings = {
    nickname: string;
    selectedOTT: string[];
};

export type OTTPlatform = {
    id: string;
    name: string;
    logo?: string;
};
