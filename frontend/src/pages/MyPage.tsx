// [용도] 마이페이지 - 모달 스타일 페이지
// [사용법] 라우트: /mypage

import { useNavigate } from 'react-router-dom';
import MyPageModal from '@/services/mypage/MyPageModal/MyPageModal';
import { useAuth } from '@/app/providers/AuthContext';

export default function MyPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const handleClose = () => {
        navigate('/'); // URL: 메인 페이지로 이동
    };

    return (
        <MyPageModal
            isOpen={true}
            onClose={handleClose}
            userName={user?.nickname || 'User'}
        />
    );
}
