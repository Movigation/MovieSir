import { useState, useEffect } from 'react';
import TimeFilterStep from '@/services/chatbot/FilterBlock/TimeFilterStep';
import GenreFilterStep from '@/services/chatbot/FilterBlock/GenreFilterStep';

interface FilterChatBlockProps {
    onApply: () => void;
    reset?: boolean;  // 챗봇 닫힐 때 초기화 플래그
}

export default function FilterChatBlock({ onApply, reset }: FilterChatBlockProps) {
    const [currentStep, setCurrentStep] = useState(1);

    // reset prop이 true로 변경되면 Step 1로 초기화
    useEffect(() => {
        if (reset) {
            setCurrentStep(1);
        }
    }, [reset]);

    const handleNext = () => {
        setCurrentStep(2);
    };

    const handleBack = () => {
        setCurrentStep(1);
    };

    const handleRecommend = () => {
        onApply();
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 md:p-6 shadow-sm border-2 border-gray-900 dark:border-gray-700 w-full max-w-md overflow-hidden">
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
                {[1, 2].map((step) => (
                    <div
                        key={step}
                        className={`h-2 rounded-full transition-all duration-300 ${step === currentStep
                            ? 'w-8 bg-gradient-to-r from-blue-600 to-indigo-600'
                            : step < currentStep
                                ? 'w-2 bg-green-500'
                                : 'w-2 bg-gray-300 dark:bg-gray-600'
                            }`}
                    />
                ))}
            </div>

            {/* Step Content with Slide Animation */}
            <div className="relative">
                {currentStep === 1 && (
                    <TimeFilterStep onNext={handleNext} />
                )}
                {currentStep === 2 && (
                    <GenreFilterStep onBack={handleBack} onRecommend={handleRecommend} />
                )}
            </div>
        </div>
    );
}
