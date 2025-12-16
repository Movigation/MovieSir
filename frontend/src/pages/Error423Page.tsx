import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';

export default function Error423Page() {
    const navigate = useNavigate();

    const handlePasswordRecovery = () => {
        // Navigate to home and trigger password recovery modal
        navigate('/?forgot-password=true');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-900 to-red-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center">
                {/* Chatbot with sweat */}
                <div className="mb-8 flex justify-center">
                    <div className="relative">
                        {/* Chatbot body */}
                        <div className="w-32 h-32 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-3xl shadow-2xl flex items-center justify-center transform hover:scale-105 transition-transform">
                            {/* Worried eyes */}
                            <div className="flex gap-6">
                                <div className="text-3xl">😰</div>
                            </div>
                        </div>
                        {/* Sweat drops */}
                        <div className="absolute top-2 right-2 text-2xl animate-bounce">💧</div>
                        <div className="absolute top-8 right-0 text-xl animate-bounce" style={{ animationDelay: '0.2s' }}>💧</div>
                        <div className="absolute top-4 left-2 text-lg animate-bounce" style={{ animationDelay: '0.4s' }}>💧</div>
                        {/* Antenna */}
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-1 h-6 bg-orange-400"></div>
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    </div>
                </div>

                {/* Error code */}
                <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-red-500 mb-4">
                    423
                </h1>

                {/* Error message */}
                <h2 className="text-3xl font-bold text-white mb-2">
                    계정이 잠겼습니다
                </h2>
                <p className="text-gray-200 mb-8">
                    비밀번호를 5회 이상 잘못 입력하여<br />
                    계정이 일시적으로 잠겼어요.
                </p>

                {/* Action buttons */}
                <div className="space-y-3">
                    <button
                        onClick={handlePasswordRecovery}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
                    >
                        <KeyRound size={20} />
                        비밀번호 찾기
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full px-6 py-3 bg-gray-700 text-white font-medium rounded-xl hover:bg-gray-600 transition-colors"
                    >
                        홈으로 돌아가기
                    </button>
                </div>

                <p className="mt-6 text-sm text-gray-400">
                    계정 보호를 위해 잠시 후 다시 시도해주세요.
                </p>
            </div>
        </div>
    );
}
