// [용도] 마이페이지 - 반응형 페이지
// [사용법] 라우트: /mypage
// [모바일] 전체 화면 (헤더 위로 가득 채움)
// [데스크톱] 모달 형태 (헤더 뒤에 보임)

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MyPageModal from '@/services/mypage/MyPageModal/MyPageModal';
import { useAuth } from '@/app/providers/AuthContext';

export default function MyPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

    // 화면 크기 변경 감지
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleClose = () => {
        navigate('/'); // URL: 메인 페이지로 이동
    };

    // 모바일: 전체 화면 (헤더 위로 가득 채움)
    if (isMobile) {
        return (
            <div className="min-h-screen pb-20 bg-gray-900">
                <MyPageModal
                    isOpen={true}
                    onClose={handleClose}
                    userName={user?.nickname || 'User'}
                    fullScreen={true}
                />
            </div>
        );
    }

    // 데스크톱: 모달 형태
    return (
        <MyPageModal
            isOpen={true}
            onClose={handleClose}
            userName={user?.nickname || 'User'}
        />
    );
}
