// [용도] 마이페이지 메뉴 리스트
// [사용법] <MenuList onMenuClick={handleMenuClick} />

import { BarChart3, Film, Tv, Calendar, Settings } from 'lucide-react';
import MenuItem from '@/services/mypage/MyPageModal/components/MenuItem';
import type { MyPageView } from '@/services/mypage/MyPageModal/myPage.types';

type MenuListProps = {
    onMenuClick: (view: MyPageView) => void;
};

export default function MenuList({ onMenuClick }: MenuListProps) {
    return (
        <div
            /* [디자인] 메뉴 리스트 컨테이너 */
            /* flex flex-col: 세로 방향 플렉스 레이아웃 */
            /* gap-2: 메뉴 아이템 사이 간격 8px (간격 조절 가능: gap-1, gap-3 등) */
            /* px-4: 좌우 여백 16px */
            /* pb-4: 하단 여백 16px */
            className="flex flex-col gap-2 px-4 pb-4"
        >
            {/* 각 메뉴 아이템 - 아이콘과 텍스트 변경 가능 */}
            {/* <MenuItem
                label="내 통계"
                icon={<BarChart3 size={20} />}
                onClick={() => onMenuClick('stats')}
            /> */}
            <MenuItem
                label="내가 본 영화 조회"
                icon={<Film size={20} />}
                onClick={() => onMenuClick('watched')}
            />
            <MenuItem
                label="구독 OTT 변경"
                icon={<Tv size={20} />}
                onClick={() => onMenuClick('ott')}
            />
            {/* <MenuItem
                label="무비 캘린더"
                icon={<Calendar size={20} />}
                onClick={() => onMenuClick('calendar')}
            /> */}
            <MenuItem
                label="사용자 설정"
                icon={<Settings size={20} />}
                onClick={() => onMenuClick('settings')}
            />
        </div>
    );
}
