import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import ChatbotErrorButton from '@/services/chatbot/components/ChatbotErrorButton';

export default function Error400Page() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center">
                {/* Chatbot with X eyes */}
                <div className="mb-8 flex justify-center">
                    <ChatbotErrorButton isDark={true} />
                </div>

                {/* Error code */}
                <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 mb-4">
                    400
                </h1>

                {/* Error message */}
                <h2 className="text-3xl font-bold text-white mb-2">
                    Bad Request
                </h2>
                <p className="text-gray-400 mb-8">
                    요청을 이해할 수 없어요. 다시 시도해주세요.
                </p>

                {/* Action button */}
                <button
                    onClick={() => navigate('/')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
                >
                    <Home size={20} />
                    홈으로 돌아가기
                </button>
            </div>
        </div>
    );
}
