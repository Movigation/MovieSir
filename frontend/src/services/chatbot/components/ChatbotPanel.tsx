import { useState, useEffect } from 'react';
import type { ChatbotPanelProps } from "@/services/chatbot/components/chatbot.types";
import FilterChatBlock from '@/services/chatbot/FilterBlock/FilterChatBlock';
import RecommendedMoviesSection from '@/services/chatbot/components/RecommendedMoviesSection';
import PopularMoviesSection from '@/services/chatbot/components/PopularMoviesSection';
import { useMovieStore } from '@/store/useMovieStore';

// [타입] 메시지 인터페이스
export interface Message {
  id: string;
  type: 'bot' | 'user';
  content: string | React.ReactNode;
  position?: 'left' | 'center' | 'right';
}

export default function ChatbotPanel({ isOpen, onClose, isMobile, isTablet }: ChatbotPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasRecommended, setHasRecommended] = useState(false);  // 추천 완료 플래그
  const { loadRecommended, resetFilters } = useMovieStore();

  // [반응형] 메시지 버블 최대 너비 계산
  // [수정 가이드] 버블 크기 조정 시 여기 수정
  // - 데스크탑: 85% (기본값)
  // - 타블렛: 80%
  // - 모바일: 75%
  const getBubbleMaxWidth = () => {
    if (isMobile) {
      return '75%';
    }
    if (isTablet) {
      return '80%';
    }
    return '85%';
  };

  // [반응형] 봇 메시지 왼쪽 여백 계산 (단순 고정값)
  // [용도] 봇 메시지 버블에 marginLeft를 직접 적용
  // [수정 가이드]
  // - 모바일: 0 (왼쪽 붙음)
  // - 타블렛: 150px (챗봇 버튼 공간 확보)
  // - 데스크탑: 130px (챗봇 버튼 + 간격)
  const getBotMessageMarginLeft = () => {
    if (isMobile) {
      return '70px';  // 모바일: 여백 없음
    }

    if (isTablet) {
      return '150px';  // 타블렛: 고정 150px
    }

    // 데스크탑: 고정 130px
    // 챗봇 버튼(112px) + 여백(18px) = 약 130px
    return '320px';
  };

  // 챗봇이 열릴 때 초기 메시지 표시
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Initialize messages when panel opens for the first time
      const initialMessages: Message[] = [
        {
          id: '1',
          type: 'bot',
          content: '영화 추천을 받으시려면 아래 필터를 선택해주세요!'
        },
        {
          id: '2',
          type: 'bot',
          content: <FilterChatBlock key={Date.now()} onApply={handleApplyFilters} />
        }
      ];
      setMessages(initialMessages);
    }
  }, [isOpen]);

  // 챗봇이 닫힐 때 모든 상태 초기화 (transition 완료 후)
  useEffect(() => {
    if (!isOpen) {
      // transition-opacity duration-200이 끝난 후 초기화 (부드러운 닫힘 효과)
      const timer = setTimeout(() => {
        setMessages([]);
        setHasRecommended(false);
        resetFilters();  // 필터 상태도 초기화 (시간, 장르 선택 초기화)
        console.log('🔄 챗봇 닫힘 - 상태 초기화 완료');
      }, 200); // transition duration과 동일

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // 필터 다시 설정 함수
  const handleResetFilters = () => {
    console.log('🔄 필터 다시 설정');
    setHasRecommended(false);
    resetFilters();

    // 초기 메시지로 되돌림
    const initialMessages: Message[] = [
      {
        id: '1',
        type: 'bot',  // ✅ 'user'에서 'bot'으로 수정
        content: '영화 추천을 받으시려면 아래 필터를 선택해주세요!'
      },
      {
        id: '2',
        type: 'bot',
        content: <FilterChatBlock key={Date.now()} onApply={handleApplyFilters} />
      }
    ];
    setMessages(initialMessages);

    // 맨 위로 스크롤
    setTimeout(() => {
      const messagesContainer = document.querySelector('.overflow-y-auto');
      if (messagesContainer) {
        messagesContainer.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  const handleApplyFilters = () => {
    console.log('=== handleApplyFilters 호출 ===');

    // 중복 추천 방지
    if (hasRecommended) {
      console.log('⚠️ 이미 추천받았습니다.');
      return;
    }

    // 추천 완료 플래그 설정
    setHasRecommended(true);

    // 1. 필터 블록 제거 + 로딩 메시지 추가
    setMessages([
      {
        id: 'welcome',
        type: 'bot',
        content: '영화 추천을 받으시려면 아래 필터를 선택해주세요!'
      },
      {
        id: `loading-${Date.now()}`,
        type: 'bot',
        content: '영화를 찾고 있습니다... 🎬'
      }
    ]);

    // 2. 추천 API 호출
    loadRecommended().then(() => {
      console.log('✅ 추천 완료');

      // 초기 메시지(welcome)와 로딩 메시지 모두 제거 후 추천 결과만 표시
      setMessages([
        {
          id: `result-${Date.now()}`,
          type: 'bot',
          content: (
            <div className="w-full mx-auto space-y-6 overflow-visible">
              {/* 추천 완료 메시지 */}
              <div className="text-center mb-4">
                <p className="text-lg font-semibold">🎉 추천이 완료되었습니다!</p>
                <p className="text-sm mt-1">마음에 드는 영화를 선택해보세요</p>
              </div>

              {/* 맞춤 추천 섹션 */}
              <div className="flex flex-col items-center w-full">
                <div className="w-full max-w-fit">
                  <RecommendedMoviesSection />
                </div>
              </div>

              {/* 인기 영화 섹션 */}
              <div className="flex flex-col items-center w-full">
                <div className="w-full max-w-fit">
                  <PopularMoviesSection />
                </div>
              </div>

              {/* 다시 추천받기 버튼 */}
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => handleResetFilters()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all shadow-lg hover:shadow-xl hover:scale-105"
                >
                  다시 추천받기
                </button>
              </div>
            </div>
          )
        }
      ]);
    }).catch((error) => {
      console.error('❌ 추천 실패:', error);
      setMessages(prev => [
        ...prev.filter(m => !m.id.startsWith('loading-')),
        {
          id: `error-${Date.now()}`,
          type: 'bot',
          content: '영화 추천 중 오류가 발생했습니다. 다시 시도해주세요.'
        }
      ]);
    });
  };

  return (
    <>
      {/* 백드롭 (어두운 배경) - 헤더 아래부터 시작 */}
      <div
        className={`
          fixed
          top-[70px] left-0 right-0 bottom-0
          z-panel
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />

      {/* 챗봇 패널 */}
      <div
        // [스타일 수정 가이드]
        // 1. 패널 위치 및 크기
        // fixed: 화면에 고정
        // top-[70px]: 헤더 아래부터 시작 (헤더 높이 약 70px)
        // left-0 right-0: 좌우 전체 너비
        // h-[calc(100vh-70px)]: 헤더 제외한 화면 전체 높이
        //
        // 2. 배경 및 테두리 디자인
        // bg-white dark:bg-gray-800: 배경색 (라이트/다크 모드)
        // border-t-2: 상단 2px 테두리만
        // border-gray-900 dark:border-gray-600: 테두리 색상
        //
        // 3. 트랜지션 효과
        // transition-opacity duration-200: 0.2초 페이드 인 효과 (opacity만)
        // opacity-0/opacity-100: isOpen 상태에 따라 가시성 제어
        // pointer-events-none/auto: 닫혔을 때 클릭 방지
        className={`
          fixed
          top-[70px]
          left-0
          right-0
          h-[calc(100vh-70px)]
          bg-transparent
          z-panel
          flex flex-col
          transition-opacity duration-200
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        style={{ transition: 'opacity 0.2s ease-in-out' }}
      >
        {/* Header */}
        {/* <div className="flex justify-between items-center p-1">
          <h2 className="text-sm font-bold text-gray-900 dark:text-blue-400 capitalize text-center flex-1">
            무비서
          </h2>
        </div> */}

        {/* Chat Messages */}
        {/* [반응형] 메시지 영역 - 기본 padding 사용 */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-transparent p-4 space-y-4">
          {messages.map((msg) => (
            // [메시지 컨테이너] 메시지 정렬 위치
            // [수정 가이드]
            // - justify-start: 왼쪽 정렬 (현재 봇 메시지)
            // - justify-center: 중앙 정렬
            // - justify-end: 오른쪽 정렬 (현재 사용자 메시지)
            <div
              key={msg.id}
              className={`flex w-full ${msg.type === 'bot' ? 'justify-start' : 'justify-end'}`}
            >
              {typeof msg.content === 'string' ? (
                <div
                  className={`
                    rounded-[15px] p-3 border-2 shadow-sm
                    ${msg.type === 'bot'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-900 dark:border-gray-600'
                      : 'bg-blue-100 dark:bg-blue-900/50 text-gray-900 dark:text-white border-gray-900 dark:border-blue-700'
                    }
                  `}
                  style={{
                    // [반응형] 버블 최대 너비
                    maxWidth: getBubbleMaxWidth(),
                    // [반응형] 봇 메시지만 왼쪽 여백 적용
                    marginLeft: msg.type === 'bot' ? getBotMessageMarginLeft() : undefined
                  }}
                >
                  <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium">
                    {msg.content}
                  </p>
                </div>
              ) : (
                // [필터블럭/컴포넌트] 패널 전체 기준 중앙 배치
                // [수정 가이드]
                // - 현재: 단순 중앙 정렬
                // - 왼쪽 정렬로 바꾸려면: justify-start 사용
                // - 오른쪽 정렬로 바꾸려면: justify-end 사용
                <div className="text-gray-800 dark:text-white w-full flex justify-center">
                  {msg.content}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}


