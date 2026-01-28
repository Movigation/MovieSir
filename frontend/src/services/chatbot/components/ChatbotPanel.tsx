import { useState, useEffect, useRef } from 'react';
import type { ChatbotPanelProps } from "@/services/chatbot/components/chatbot.types";
import FilterChatBlock from '@/services/chatbot/FilterBlock/FilterChatBlock';
import RecommendedMoviesSection from '@/services/chatbot/components/RecommendedMoviesSection';
import PopularMoviesSection from '@/services/chatbot/components/PopularMoviesSection';
import { useMovieStore } from '@/store/useMovieStore';

// [컴포넌트] 필터 요약 표시
function FilterSummary() {
  const { filters } = useMovieStore();

  // 시간 포맷: "02:30" → "2시간 30분"
  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);

    if (hours === 0 && minutes === 0) return "제한 없이";
    if (hours === 0) return `${minutes}분`;
    if (minutes === 0) return `${hours}시간`;
    return `${hours}시간 ${minutes}분`;
  };

  // 장르 포맷: ["액션", "스릴러"] → "액션, 스릴러"
  const formatGenres = (genres: string[]): string => {
    if (genres.length === 0) return "전체";
    return genres.join(", ");
  };

  const timeText = formatTime(filters.time);
  const genreText = formatGenres(filters.genres);

  return (
    <div className="text-center mb-4">
      <p className="text-base text-gray-700 dark:text-gray-300 font-bold">
        <span className="font-semibold text-blue-600 dark:text-blue-400">{timeText}</span>동안 볼 수 있는{" "}
        <span className="font-semibold text-blue-600 dark:text-blue-400">{genreText}</span> 장르의 영화를 추천하였습니다.
      </p>
    </div>
  );
}

// [타입] 메시지 인터페이스
export interface Message {
  id: string;
  type: 'bot' | 'user';
  content: string | React.ReactNode;
  position?: 'left' | 'center' | 'right';
}

export default function ChatbotPanel({
  isOpen,
  onRecommended
}: ChatbotPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasRecommended, setHasRecommended] = useState(false);  // 추천 완료 플래그
  const { loadRecommended, resetFilters } = useMovieStore();
  const scrollRef = useRef<HTMLDivElement>(null);

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

    // 맨 위로 스크롤 (useRef 사용)
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
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

    // 1. 필터 블록 제거 + 로딩 메시지 추가 (첫 번째)
    setMessages([
      {
        id: 'welcome',
        type: 'bot',
        content: '영화 추천을 받으시려면 아래 필터를 선택해주세요!'
      },
      {
        id: `loading-${Date.now()}`,
        type: 'bot',
        content: '선택하신 조건을 분석하고 있어요...'
      }
    ]);

    // 2. 프로그레시브 메시지 타이머 설정
    const timer1 = setTimeout(() => {
      setMessages(prev => {
        // 이미 결과가 나왔거나 에러가 났다면 업데이트 하지 않음
        if (prev.some(m => m.id.startsWith('result-') || m.id.startsWith('error-'))) return prev;

        // 로딩 메시지 업데이트
        return prev.map(msg =>
          msg.id.startsWith('loading-')
            ? { ...msg, content: '영화 데이터베이스를 탐색 중입니다...' }
            : msg
        );
      });
    }, 1500); // 1.5초 후 메시지 변경

    // 3. 추천 API 호출
    loadRecommended().then(() => {
      console.log('✅ 추천 완료');

      // 타이머 정리 (혹시 아직 실행 안 됐으면 취소)
      clearTimeout(timer1);

      // "딱 맞는 영화를 발견했습니다!" 메시지를 잠깐 보여주고 결과를 띄울지, 
      // 아니면 바로 결과를 띄울지 선택 가능. 
      // 여기서는 자연스러운 흐름을 위해 "발견했습니다!" 메시지로 잠시 변경 후 결과 표시
      setMessages(prev => prev.map(msg =>
        msg.id.startsWith('loading-')
          ? { ...msg, content: '딱 맞는 영화를 발견했습니다!' }
          : msg
      ));

      // 약간의 딜레이(0.8초) 후 최종 결과 표시 (발견했다는 메시지를 읽을 시간 주기)
      setTimeout(() => {
        // 부모 컴포넌트에 추천 완료 알림
        onRecommended?.(true);

        // 초기 메시지(welcome)와 로딩 메시지 모두 제거 후 추천 결과만 표시
        setMessages([
          {
            id: `result-${Date.now()}`,
            type: 'bot',
            content: (
              <div className="w-full mx-auto space-y-6 overflow-visible">
                {/* 추천 완료 메시지 */}
                <div className="text-center mb-4">
                  <p className="text-lg font-semibold">추천이 완료되었습니다!</p>
                  <p className="text-sm mt-1">마음에 드는 영화를 선택해보세요</p>
                </div>

                {/* 필터 요약 */}
                <FilterSummary />

                {/* 맞춤 추천 섹션 */}
                <div className="flex flex-col items-center w-full">
                  <div className="w-full">
                    <RecommendedMoviesSection />
                  </div>
                </div>

                {/* 인기 영화 섹션 */}
                <div className="flex flex-col items-center w-full">
                  <div className="w-full">
                    <PopularMoviesSection />
                  </div>
                </div>

                {/* 다시 추천받기 버튼 */}
                <div className="flex justify-center mt-6">
                  <button
                    onClick={() => handleResetFilters()}
                    aria-label="필터 초기화 및 다시 추천받기"
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-500 hover:to-blue-500 transition-all shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    처음으로
                  </button>
                </div>
              </div>
            )
          }
        ]);
      }, 800);

    }).catch((error) => {
      console.error('❌ 추천 실패:', error);
      clearTimeout(timer1);
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
          top-0 sm:top-[70px] left-0 right-0 bottom-[64px]
          z-chatbot-backdrop
          transition-opacity duration-300
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
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
          top-0 sm:top-[70px]
          left-0
          right-0
          h-[calc(100dvh-64px)] sm:h-[calc(100vh-70px)]
          bg-transparent
          z-chatbot-panel
          flex flex-col
          max-w-screen-lg mx-auto
          transition-all duration-200 ease-in-out
          ${isOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-8 pointer-events-none invisible'}
        `}
        role="dialog"
        aria-label="영화 추천 챗봇 패널"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header - 시맨틱 구조를 위해 sr-only로 노출 */}
        <div className="sr-only">
          <h2 className="text-sm font-bold text-gray-900 dark:text-blue-400 capitalize text-center flex-1">
            무비서 추천 패널
          </h2>
        </div>

        {/* Chat Messages */}
        {/* [반응형] 메시지 영역 - 기본 padding 사용 */}
        {/* [모바일] pb-24: 하단 네비게이션 바(헤더)가 버튼을 가리지 않도록 96px 패딩 추가 */}
        {/* [데스크톱] sm:pb-4: 상단 헤더이므로        {/* 메시지 컨테이너 */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide bg-transparent p-4 pb-24 sm:pb-4 space-y-4 overscroll-contain"
        >
          {messages.map((msg) => (
            // [메시지 컨테이너] 메시지 정렬 위치
            // [수정 가이드]
            // - justify-start: 왼쪽 정렬 (현재 봇 메시지)
            // - justify-center: 중앙 정렬
            // - justify-end: 오른쪽 정렬 (현재 사용자 메시지)
            <div
              key={msg.id}
              className={`flex w-full ${msg.type === 'bot' ? 'w-full flex justify-center' : 'justify-end'}`}
            >
              {typeof msg.content === 'string' ? (
                <div
                  className={`
                    rounded-[15px] p-3 border shadow-sm
                    w-full sm:w-auto
                    ${msg.type === 'bot'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-700 dark:border-gray-700 sm:mr-[105px]'
                      : 'bg-blue-100 dark:bg-blue-900/50 text-gray-900 dark:text-white border-gray-900 dark:border-blue-700 max-w-[75%] sm:max-w-[80%]'
                    }
                  `}
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


