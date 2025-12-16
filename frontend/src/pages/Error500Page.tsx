import { useNavigate } from 'react-router-dom';
import { RefreshCw, Home } from 'lucide-react';
import Chatbot from '@/services/chatbot/components/Chatbot';

export default function Error500Page() {
    const navigate = useNavigate();

    const handleRetry = () => {
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center">
                <Chatbot />
                {/* Error code */}
                <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-purple-600 mb-4 animate-pulse">
                    500
                </h1>

                {/* Error message */}
                <h2 className="text-3xl font-bold text-white mb-2">
                    Server Error
                </h2>
                <p className="text-gray-400 mb-8">
                    서버에서 문제가 발생했어요.<br />
                    잠시 후 다시 시도해주세요.
                </p>

                {/* Action buttons */}
                <div className="space-y-3">
                    <button
                        onClick={handleRetry}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
                    >
                        <RefreshCw size={20} />
                        다시 시도
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 text-white font-medium rounded-xl hover:bg-gray-600 transition-colors"
                    >
                        <Home size={20} />
                        홈으로 돌아가기
                    </button>
                </div>

                <p className="mt-6 text-sm text-gray-500">
                    문제가 지속되면 고객센터로 문의해주세요.
                </p>
            </div>
        </div>
    );
}
