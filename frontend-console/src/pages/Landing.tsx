import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { flushSync } from "react-dom";

export default function Landing() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isTransitioning, setIsTransitioning] = useState(true);

  const [showScrollBottom, setShowScrollBottom] = useState(true);

  // Scroll position tracking for scroll buttons
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;

      setShowScrollTop(scrollTop > 500);
      setShowScrollBottom(!isNearBottom && scrollTop < 500);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  };

  // Scroll Animation with Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-in");
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: "0px 0px -100px 0px",
      }
    );

    const animatedElements = document.querySelectorAll(
      ".animate-fade-up, .animate-fade-down, .animate-fade-left, .animate-fade-right, .animate-scale-up, .animate-scale-down, .animate-rotate-in, .animate-blur-in, .animate-flip-up, .animate-bounce-up, .stagger-up, .stagger-scale, .stagger-sides, .stagger-rotate"
    );
    animatedElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);


  const features = [
    {
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      title: "시간 기반 추천",
      desc: "이동시간을 입력하면 러닝타임에 딱 맞는 영화 조합을 추천해드립니다",
    },
    {
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      ),
      title: "AI 개인화 추천",
      desc: "두 개의 AI 하이브리드 추천 시스템으로 당신의 취향을 파악하고 맞춤 영화를 찾아드립니다",
    },
    {
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      ),
      title: "OTT 연동",
      desc: "구독 중인 OTT 플렛폼에서 바로 시청할 수 있는 영화만 보여드립니다",
    },
    {
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      title: "듀얼 트랙 추천",
      desc: "개인 취향 맞춤 추천과 인기 영화 추천을 동시에 제공해 선택의 폭을 넓혀드립니다",
    },
  ];

  const steps = [
    {
      num: "01",
      title: "회원가입",
      desc: "간편한 이메일 인증",
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
    {
      num: "02",
      title: "취향 조사",
      desc: "좋아하는 영화 선택",
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      ),
    },
    {
      num: "03",
      title: "조건 설정",
      desc: "시간, 장르 필터",
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          />
        </svg>
      ),
    },
    {
      num: "04",
      title: "AI 추천",
      desc: "맞춤 영화 추천",
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      ),
    },
    {
      num: "05",
      title: "바로 시청",
      desc: "OTT 원클릭 이동",
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  ];

  const faqItems = [
    { q: "무비서는 무료인가요?", a: "네, 무비서는 완전 무료입니다! 회원가입만 하면 모든 기능을 제한 없이 이용할 수 있습니다" },
    { q: "어떤 OTT를 지원하나요?", a: "현재 Netflix, 티빙, Watcha, Disney+, Apple TV+ 등 주요 OTT 플랫폼을 지원합니다" },
    { q: "앱을 설치해야 하나요?", a: "아니요! 무비서는 PWA로 제작되어 앱스토어 설치 없이 웹에서 바로 사용할 수 있습니다" },
    { q: "추천 알고리즘은 어떻게 작동하나요?", a: "SBERT와 LightGCN을 결합한 하이브리드 추천 시스템으로 최적의 영화를 추천합니다" },
  ];

  const ottPlatforms = [
    { name: "Netflix", logo: "/logos/NETFLEX_Logo.svg" },
    { name: "티빙", logo: "/logos/TVING_Logo.svg" },
    { name: "Watcha", logo: "/logos/WATCHA_Logo_Main.svg" },
    { name: "Disney+", logo: "/logos/Disney+_logo.svg" },
    { name: "Apple TV+", logo: "/logos/Apple_TV_logo.svg" },
  ];

  // Hero 섹션 영화 포스터 - 최신 영화들 (Preview 섹션과 겹치지 않음)
  const heroPosters = [
    { title: "듄", year: 2021, runtime: "2시간 35분", poster: "https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg" },
    { title: "에브리씽 에브리웨어", year: 2022, runtime: "2시간 19분", poster: "https://image.tmdb.org/t/p/w500/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg" },
    { title: "탑건: 매버릭", year: 2022, runtime: "2시간 11분", poster: "https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg" },
    { title: "더 배트맨", year: 2022, runtime: "2시간 56분", poster: "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg" },
    { title: "스파이더맨: 노 웨이 홈", year: 2021, runtime: "2시간 28분", poster: "https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg" },
    { title: "아바타: 물의 길", year: 2022, runtime: "3시간 12분", poster: "https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg" },
  ];
  const mainPoster = { title: "오펜하이머", year: 2023, runtime: "3시간", poster: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg" };

  // Hero 포스터 자동 스와이프
  const allPosters = [mainPoster, ...heroPosters];
  // 무한 루프를 위해 포스터 3배로 복제
  const infinitePosters = [...allPosters, ...allPosters, ...allPosters];
  const totalOriginal = allPosters.length;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => prev + 1);
    }, 3000); // 3초마다 자동 스와이프

    return () => clearInterval(interval);
  }, []);

  // 무한 루프: 끝에 도달하면 처음으로 리셋 (애니메이션 없이)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (currentSlide >= totalOriginal * 2) {
      // 애니메이션 완료 후(550ms) 리셋
      timeoutId = setTimeout(() => {
        // flushSync로 트랜지션 끄기를 즉시 렌더링
        flushSync(() => {
          setIsTransitioning(false);
        });
        // 트랜지션이 꺼진 상태에서 위치 변경
        flushSync(() => {
          setCurrentSlide(currentSlide - totalOriginal);
        });
        // 다음 프레임에서 transition 복원
        requestAnimationFrame(() => {
          setIsTransitioning(true);
        });
      }, 550);
    } else if (currentSlide < totalOriginal) {
      timeoutId = setTimeout(() => {
        flushSync(() => {
          setIsTransitioning(false);
        });
        flushSync(() => {
          setCurrentSlide(currentSlide + totalOriginal);
        });
        requestAnimationFrame(() => {
          setIsTransitioning(true);
        });
      }, 550);
    }

    return () => clearTimeout(timeoutId);
  }, [currentSlide, totalOriginal]);

  // 초기 위치를 중간으로 설정
  useLayoutEffect(() => {
    flushSync(() => {
      setIsTransitioning(false);
    });
    flushSync(() => {
      setCurrentSlide(totalOriginal);
    });
    requestAnimationFrame(() => {
      setIsTransitioning(true);
    });
  }, [totalOriginal]);



  return (
    <div className="min-h-screen overflow-x-hidden text-gray-900 bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="grid grid-cols-3 items-center px-6 py-4 mx-auto max-w-7xl">
          {/* 로고 - 왼쪽 */}
          <a href="/" className="flex items-center gap-3 justify-self-start">
            <img src="/favicon.svg" alt="무비서" className="w-10 h-10" />
            <span className="text-2xl font-bold text-gray-900">무비서</span>
          </a>

          {/* 네비게이션 메뉴 - 중앙 */}
          <ul className="hidden gap-6 justify-self-center lg:flex">
            <li>
              <a
                href="#features"
                className="text-base font-bold text-gray-600 transition-colors hover:text-accent-600 whitespace-nowrap"
              >
                핵심 기능
              </a>
            </li>
            <li>
              <a
                href="#how-it-works"
                className="text-base font-bold text-gray-600 transition-colors hover:text-accent-600 whitespace-nowrap"
              >
                이용 방법
              </a>
            </li>
            <li>
              <a
                href="#faq"
                className="text-base font-bold text-gray-600 transition-colors hover:text-accent-600 whitespace-nowrap"
              >
                자주 묻는 질문
              </a>
            </li>
            <li>
              <a
                href="https://api.moviesir.cloud"
                className="text-base font-bold text-gray-600 transition-colors hover:text-accent-600 whitespace-nowrap"
              >
                API
              </a>
            </li>
          </ul>

          {/* 오른쪽 영역 */}
          <div className="flex items-center gap-3 justify-self-end">
            <a
              href="https://demo.moviesir.cloud"
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2 bg-accent-600 text-white text-sm font-semibold rounded-full hover:bg-accent-500 hover:shadow-lg hover:shadow-accent-500/30 transition-all whitespace-nowrap"
            >
              무비서 이용하기
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen relative pt-20 overflow-hidden">
        {/* Film Strip Background - 앞뒤 원근감 */}
        <div className="absolute inset-0 overflow-hidden">
          {/* 베이스 + 멀티 글로우 효과 */}
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse 70% 60% at 80% 10%, rgba(165, 180, 252, 0.7) 0%, transparent 55%),
                radial-gradient(ellipse 50% 50% at 15% 85%, rgba(199, 210, 254, 0.5) 0%, transparent 45%),
                radial-gradient(ellipse 60% 40% at 50% 50%, rgba(224, 231, 255, 0.35) 0%, transparent 50%),
                linear-gradient(135deg, rgb(255, 255, 255) 0%, rgb(248, 250, 252) 50%, rgb(255, 255, 255) 100%)
              `
            }}
          />

          {/* 뒤쪽 필름 스트립 - 작고 흐릿하게 (상단) */}
          <div
            className="absolute top-16 -left-10 w-[200%] opacity-60"
            style={{
              transform: 'rotate(-8deg)',
              zIndex: 1,
            }}
          >
            <div className="relative bg-gray-800 py-3 flex items-center shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
              {/* 필름 구멍 - 상단 */}
              <div className="absolute top-0.5 left-0 right-0 h-2.5 flex gap-2 px-1">
                {Array.from({ length: 200 }).map((_, i) => (
                  <div key={i} className="w-2 h-2 bg-gray-600 rounded-sm flex-shrink-0" />
                ))}
              </div>

              {/* 포스터들 - 작은 사이즈 (2023-2024 최신 영화 - 앞쪽 필름과 중복 없음) */}
              <div className="flex gap-2 px-3 py-1.5">
                {[
                  "https://image.tmdb.org/t/p/w300/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg", // 아바타: 물의 길
                  "https://image.tmdb.org/t/p/w300/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg", // 스파이더맨: 어크로스 더 스파이더버스
                  "https://image.tmdb.org/t/p/w300/sv1xJUazXeYqALzczSZ3O6nkH75.jpg", // 블랙 팬서: 와칸다 포에버
                  "https://image.tmdb.org/t/p/w300/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg", // 스파이더맨: 노 웨이 홈
                  "https://image.tmdb.org/t/p/w300/d5NXSklXo0qyIYkgV94XAgMIckC.jpg", // 듄 2
                  "https://image.tmdb.org/t/p/w300/74xTEgt7R36Fpooo50r9T25onhq.jpg", // 더 배트맨
                  "https://image.tmdb.org/t/p/w300/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg", // 존 윅 4
                  "https://image.tmdb.org/t/p/w300/mBaXZ95R2OxueZhvQbcEWy2DqyO.jpg", // 가디언즈 Vol. 3
                  "https://image.tmdb.org/t/p/w300/r2J02Z2OpNTctfOSN1Ydgii51I3.jpg", // 바비
                  "https://image.tmdb.org/t/p/w300/pThyQovXQrw2m0s9x82twj48Jq4.jpg", // 나이브스 아웃
                  "https://image.tmdb.org/t/p/w300/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg", // 타이타닉
                  "https://image.tmdb.org/t/p/w300/gPbM0MK8CP8A174rmUwGsADNYKD.jpg", // 스즈메의 문단속
                  "https://image.tmdb.org/t/p/w300/fiVW06jE7z9YnO4trhaMEdclSiC.jpg", // 록키 vs 드라고
                  "https://image.tmdb.org/t/p/w300/4m1Au3YkjqsxF8iwQy0fPYSxE0h.jpg", // 슈렉
                  "https://image.tmdb.org/t/p/w300/k68nPLbIST6NP96JmTxmZijEvCA.jpg", // 테넷
                  "https://image.tmdb.org/t/p/w300/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg", // 인터스텔라
                  "https://image.tmdb.org/t/p/w300/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg", // 오징어 게임 시즌2
                  "https://image.tmdb.org/t/p/w300/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg", // 어벤져스: 인피니티 워
                  "https://image.tmdb.org/t/p/w300/gGEsBPAijhVUFoiNpgZXqRVWJt2.jpg", // 코코
                  "https://image.tmdb.org/t/p/w300/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg", // 조커
                  "https://image.tmdb.org/t/p/w300/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg", // 토이 스토리 4
                  "https://image.tmdb.org/t/p/w300/3bhkrj58Vtu7enYsRolD1fZdja1.jpg", // 겨울왕국 2
                  "https://image.tmdb.org/t/p/w300/tnAuB8q5vv7Ax9UAEje5Xi4BXik.jpg", // 주토피아
                  "https://image.tmdb.org/t/p/w300/hziiv14OpD73u9gAak4XDDfBKa2.jpg", // 인크레더블 2
                ].map((poster, i) => (
                  <div key={i} className="w-16 md:w-20 aspect-[2/3] overflow-hidden rounded flex-shrink-0">
                    <img src={poster} alt="" className="object-cover w-full h-full" />
                  </div>
                ))}
              </div>

              {/* 필름 구멍 - 하단 */}
              <div className="absolute bottom-0.5 left-0 right-0 h-2.5 flex gap-2 px-1">
                {Array.from({ length: 200 }).map((_, i) => (
                  <div key={i} className="w-2 h-2 bg-gray-600 rounded-sm flex-shrink-0" />
                ))}
              </div>
            </div>
          </div>

          {/* 앞쪽 필름 스트립 - 크고 선명하게 (중앙~하단) */}
          <div
            className="absolute top-[35%] -left-20 w-[200%]"
            style={{
              transform: 'rotate(-15deg)',
              zIndex: 2,
            }}
          >
            <div className="relative bg-gray-900 py-5 flex items-center shadow-[0_15px_50px_rgba(0,0,0,0.5)]">
              {/* 필름 구멍 - 상단 */}
              <div className="absolute top-1.5 left-0 right-0 h-4 flex gap-3 px-2">
                {Array.from({ length: 150 }).map((_, i) => (
                  <div key={i} className="w-3 h-3 bg-gray-700 rounded-sm flex-shrink-0" />
                ))}
              </div>

              {/* 포스터들 - 큰 사이즈 (2024-2025 최신 영화 - 뒤쪽 필름/히어로와 중복 없음) */}
              <div className="flex gap-3 px-6 py-3">
                {[
                  "https://image.tmdb.org/t/p/w300/hhiR6uUbTYYvKoACkdAIQPS5c6f.jpg", // 크레이븐 더 헌터 (2024)
                  "https://image.tmdb.org/t/p/w300/5gzzkR7y3hnY8AD1wXjCnVlHba5.jpg", // 아가일 (2024)
                  "https://image.tmdb.org/t/p/w300/wWba3TaojhK7NdycRhoQpsG0FaH.jpg", // 퓨리오사 (2024)
                  "https://image.tmdb.org/t/p/w300/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg", // 오징어 게임 시즌2 (2024)
                  "https://image.tmdb.org/t/p/w300/kKgQzkUCnQmeTPkyIwHly2t6ZFI.jpg", // 비틀쥬스 비틀쥬스 (2024)
                  "https://image.tmdb.org/t/p/w300/ulzhLuWrPK07P1YkdWQLZnQh1JL.jpg", // 어벤져스: 엔드게임 (2019)
                  "https://image.tmdb.org/t/p/w300/pnXLFioDeftqjlCVlRmXvIdMsdP.jpg", // 캡틴 아메리카: 브레이브 뉴 월드 (2025)
                  "https://image.tmdb.org/t/p/w300/wTnV3PCVW5O92JMrFvvrRcV39RU.jpg", // 어바웃 타임 (2013)
                  "https://image.tmdb.org/t/p/w300/npHNjldbeTHdKKw28bJKs7lzqzj.jpg", // 라따뚜이
                  "https://image.tmdb.org/t/p/w300/pjnD08FlMAIXsfOLKQbvmO0f0MD.jpg", // 트위스터스 (2024)
                  "https://image.tmdb.org/t/p/w300/xDGbZ0JJ3mYaGKy4Nzd9Kph6M9L.jpg", // 위키드 (2024)
                  "https://image.tmdb.org/t/p/w300/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg", // 라이온 킹 (2024)
                ].map((poster, i) => (
                  <div key={i} className="w-28 md:w-36 aspect-[2/3] overflow-hidden rounded-md flex-shrink-0 shadow-lg">
                    <img src={poster} alt="" className="object-cover w-full h-full" />
                  </div>
                ))}
              </div>

              {/* 필름 구멍 - 하단 */}
              <div className="absolute bottom-1.5 left-0 right-0 h-4 flex gap-3 px-2">
                {Array.from({ length: 150 }).map((_, i) => (
                  <div key={i} className="w-3 h-3 bg-gray-700 rounded-sm flex-shrink-0" />
                ))}
              </div>
            </div>
          </div>

          {/* 오버레이 - 왼쪽 텍스트 가독성 + 글로우 */}
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              background: `
                linear-gradient(to right, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.9) 40%, rgba(255,255,255,0.55) 55%, transparent 70%),
                radial-gradient(ellipse 50% 70% at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 60%)
              `
            }}
          />
        </div>

        <div className="relative z-30 px-6 mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-80px)]">
            {/* Left Content */}
            <div className="pt-10 text-center lg:text-left lg:pt-0">
              <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-sm border rounded-full bg-accent-50 border-accent-100 text-accent-600">
                <span className="relative flex w-2 h-2">
                  <span className="absolute inline-flex w-full h-full bg-green-400 rounded-full opacity-75 animate-ping"></span>
                  <span className="relative inline-flex w-2 h-2 bg-green-500 rounded-full"></span>
                </span>
                이동 시간 맞춤형 콘텐츠 추천 서비스
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-6xl font-black leading-[1.1] mb-6">
                <span className="block text-gray-900">시간만</span>
                <span className="block text-gray-900">알려주세요</span>
                <span className="block mt-2 text-accent-600">
                  영화는 <br />
                  제가 골라드릴게요
                </span>
              </h1>

              <p className="max-w-xl mx-auto mb-10 text-lg leading-relaxed text-gray-600 md:text-xl lg:mx-0">
                AI가 당신의 취향을 분석하고
                <br />
                구독 중인 OTT에서
                <span className="font-medium text-accent-600">
                  {" "}
                  바로 볼 수 있는 영화
                </span>
                만 추천합니다
              </p>

              <div className="flex flex-col justify-center gap-4 mb-12 sm:flex-row lg:justify-start">
                <a
                  href="https://demo.moviesir.cloud"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all rounded-full bg-accent-600 hover:bg-accent-500 hover:shadow-2xl hover:shadow-accent-500/30"
                >
                  무료로 시작하기
                </a>
                <a
                  href="https://api.moviesir.cloud"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 font-semibold text-gray-700 transition-all bg-white border border-gray-200 rounded-full hover:border-accent-300 hover:text-accent-600"
                >
                  무비서 API 이동
                </a>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center lg:text-left">
                  <div className="text-3xl font-black md:text-4xl text-accent-600">
                    10K+
                  </div>
                  <div className="mt-1 text-sm font-semibold text-gray-500">영화 데이터</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-3xl font-black md:text-4xl text-accent-600">
                    1초
                  </div>
                  <div className="mt-1 text-sm font-semibold text-gray-500">추천 속도</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-3xl font-black md:text-4xl text-accent-600">
                    6편
                  </div>
                  <div className="mt-1 text-sm font-semibold text-gray-500">맞춤 추천</div>
                </div>
              </div>
            </div>

            {/* Right - Movie Poster Carousel */}
            <div className="relative hidden lg:flex items-center justify-center">
              <div className="relative w-[650px]">
                {/* AI 영화 추천 헤더 박스 */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl pt-6 pb-4 px-2 shadow-2xl shadow-gray-400/30 border border-white/50">
                  {/* 헤더 */}
                  <div className="flex items-center gap-3 mb-5 px-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent-500 shadow-lg shadow-accent-500/30">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">AI 추천</h3>
                      <p className="text-sm text-gray-500">AI가 추천하는 영화</p>
                    </div>
                  </div>

                  {/* 포스터 캐러셀 */}
                  <div
                    ref={carouselRef}
                    className="overflow-hidden py-4 scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    <div
                      className="flex gap-4 ease-out pl-4"
                      style={{
                        transform: `translateX(-${currentSlide * (192 + 16)}px)`,
                        transitionProperty: 'transform',
                        transitionDuration: !isTransitioning ? '0ms' : '500ms',
                        transitionTimingFunction: 'cubic-bezier(0.25, 0.1, 0.25, 1)'
                      }}
                    >
                    {infinitePosters.map((movie, i) => {
                      // 같은 영화의 모든 복제본에 동일한 스타일 적용 (깜빡임 방지)
                      const isActive = (i % totalOriginal) === (currentSlide % totalOriginal);
                      return (
                      <div
                        key={i}
                        onClick={() => setCurrentSlide(i)}
                        className={`relative flex-shrink-0 w-48 h-72 overflow-hidden rounded-2xl cursor-pointer select-none ${
                          isActive ? 'scale-100 ring-4 ring-blue-500 animate-ring-glow' : 'scale-90 opacity-60'
                        }`}
                        style={{
                          transition: isTransitioning ? 'transform 500ms cubic-bezier(0.25, 0.1, 0.25, 1), opacity 400ms ease-out, box-shadow 400ms ease-out' : 'none'
                        }}
                      >
                        <img
                          src={movie.poster}
                          alt={movie.title}
                          className="object-cover w-full h-full pointer-events-none"
                          draggable={false}
                        />
                        {/* 영화 정보 - 하단 그라데이션 */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-12 pb-3 px-3">
                          <p className="text-sm font-bold text-white truncate">{movie.title}</p>
                          <p className="text-xs text-white/80">{movie.year} • {movie.runtime}</p>
                        </div>
                        {/* AI Badge - 현재 활성화된 포스터에만 */}
                        {isActive && (
                          <div className="absolute px-3 py-1.5 text-xs font-bold text-white rounded-full shadow-lg top-3 right-3 bg-accent-500 animate-pulse">
                            AI 추천
                          </div>
                        )}
                      </div>
                      );
                    })}
                    </div>
                  </div>

                  {/* 슬라이드 인디케이터 */}
                  <div className="flex items-center justify-center gap-2 mt-2 px-4">
                    {allPosters.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentSlide(totalOriginal + i)}
                        className={`transition-all duration-300 rounded-full ${
                          currentSlide % totalOriginal === i
                            ? 'w-6 h-2.5 bg-accent-500 shadow-sm'
                            : 'w-2.5 h-2.5 bg-gray-400/60 hover:bg-gray-500/80 border border-gray-400/30'
                        }`}
                        aria-label={`슬라이드 ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Glow Effect */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-accent-300/20 rounded-full blur-[120px] -z-10" />
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute flex flex-col items-center gap-2 -translate-x-1/2 bottom-8 left-1/2 z-30">
          <span className="text-xs text-gray-400">스크롤</span>
          <div className="flex justify-center w-6 h-10 pt-2 border-2 rounded-full border-accent-300">
            <div className="w-1 h-2 rounded-full bg-accent-500 animate-bounce" />
          </div>
        </div>
      </section>

      {/* OTT Platforms - stagger-scale 애니메이션 */}
      <section className="min-h-screen flex flex-col items-center justify-center py-16 md:py-24 bg-white">
        {/* 헤더 */}
        <div className="px-6 mx-auto text-center animate-fade-down max-w-7xl mb-12">
          <span className="inline-block px-5 py-2.5 bg-accent-50 border border-accent-100 text-accent-600 text-base font-medium rounded-full mb-6">
            연동 플랫폼
          </span>
          <h2 className="mb-4 text-4xl font-black text-gray-900 md:text-6xl">
            주요 OTT<span className="text-accent-600"> 연동 지원</span>
          </h2>
          <p className="max-w-2xl mx-auto text-xl text-gray-600">
            구독 중인 OTT에서 바로 시청 가능한 영화만 추천해드립니다
          </p>
        </div>
        {/* OTT 카드 */}
        <div className="flex flex-wrap items-center justify-center gap-4 px-6 stagger-scale md:gap-6">
          {ottPlatforms.map((platform) => (
            <div
              key={platform.name}
              className="flex items-center justify-center w-32 h-32 transition-all border border-gray-100 cursor-default sm:w-40 sm:h-40 md:w-48 md:h-48 bg-gray-50 rounded-2xl hover:border-accent-300 hover:shadow-2xl hover:bg-white hover:scale-105"
            >
              <img
                src={platform.logo}
                alt={platform.name}
                className="object-contain w-20 h-auto sm:w-24 md:w-28"
              />
            </div>
          ))}
        </div>
      </section>

      {/* PWA Section - stagger-up 애니메이션 */}
      <section className="min-h-screen flex items-center justify-center py-16 md:py-24 bg-gray-50">
        <div className="px-6 mx-auto max-w-7xl">
          <div className="mb-20 text-center animate-fade-up">
            <span className="inline-block px-5 py-2.5 bg-accent-50 border border-accent-100 text-accent-600 text-base font-medium rounded-full mb-8">
              PWA 지원
            </span>
            <h2 className="mb-6 text-4xl font-black text-gray-900 md:text-6xl">
              앱처럼 <span className="text-accent-600">사용하세요</span>
            </h2>
            <p className="max-w-2xl mx-auto text-xl text-gray-600">
              별도 설치 없이 홈 화면에 추가하면 네이티브 앱처럼 사용할 수 있습니다
            </p>
          </div>

          <div className="grid gap-8 stagger-up md:grid-cols-3">
            {/* 홈 화면에 추가 */}
            <div className="p-10 text-center transition-all bg-white border border-gray-100 rounded-3xl hover:bg-accent-50 hover:border-accent-100 hover:shadow-2xl">
              <div className="flex items-center justify-center w-20 h-20 mx-auto mb-8 shadow-lg bg-accent-600 rounded-2xl shadow-accent-500/30">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="mb-4 text-2xl font-bold text-gray-900">
                홈 화면에 추가
              </h3>
              <p className="text-lg text-gray-600">
                브라우저에서 홈 화면에 추가하면 앱처럼 바로 실행됩니다
              </p>
            </div>

            {/* 빠른 로딩 속도 */}
            <div className="p-10 text-center transition-all bg-white border border-gray-100 rounded-3xl hover:bg-accent-50 hover:border-accent-100 hover:shadow-2xl">
              <div className="flex items-center justify-center w-20 h-20 mx-auto mb-8 shadow-lg bg-accent-600 rounded-2xl shadow-accent-500/30">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="mb-4 text-2xl font-bold text-gray-900">
                빠른 로딩 속도
              </h3>
              <p className="text-lg text-gray-600">
                캐싱 기술로 네이티브 앱 수준의 빠른 속도를 제공합니다
              </p>
            </div>

            {/* 모든 기기 지원 */}
            <div className="p-10 text-center transition-all bg-white border border-gray-100 rounded-3xl hover:bg-accent-50 hover:border-accent-100 hover:shadow-2xl">
              <div className="flex items-center justify-center w-20 h-20 mx-auto mb-8 shadow-lg bg-accent-600 rounded-2xl shadow-accent-500/30">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="mb-4 text-2xl font-bold text-gray-900">
                모든 기기 지원
              </h3>
              <p className="text-lg text-gray-600">
                PC, 태블릿, 모바일 어디서든 동일한 경험을 제공합니다
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - stagger-sides 애니메이션 */}
      <section
        id="features"
        className="min-h-screen flex items-center justify-center py-20 relative bg-white"
      >
        <div className="relative max-w-6xl px-6 mx-auto">
          <div className="mb-16 text-center animate-scale-up">
            <span className="inline-block px-5 py-2.5 bg-accent-50 border border-accent-100 text-accent-600 text-base font-medium rounded-full mb-8">
              핵심 기능
            </span>
            <h2 className="mb-6 text-4xl font-black text-gray-900 md:text-6xl">
              무비서만의 <span className="text-accent-600">특별한 추천</span>
            </h2>
            <p className="text-xl text-gray-600 whitespace-nowrap">
              AI 기반 하이브리드 추천 시스템으로 당신에게 딱 맞는 영화를 찾아드립니다
            </p>
          </div>

          <div className="grid gap-6 stagger-sides md:grid-cols-2">
            {features.map((feature, i) => (
              <div
                key={i}
                className="relative p-8 overflow-hidden transition-all bg-white border border-gray-100 group rounded-2xl hover:border-accent-200 hover:shadow-xl hover:shadow-accent-100/50"
              >
                <div className="flex items-start gap-5">
                  <div className="w-[88px] h-[88px] bg-accent-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-accent-500/30 transition-all [&>svg]:w-16 [&>svg]:h-16 text-white flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-bold text-gray-900">
                      {feature.title}
                    </h3>
                    <p className="text-base leading-relaxed text-gray-600">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recommendation Preview Section */}
      <section className="min-h-screen flex items-center justify-center py-16 md:py-20 bg-gray-50">
        <div className="max-w-2xl px-6 mx-auto">
          <div className="mb-8 text-center animate-fade-up">
            <span className="inline-block px-4 py-2 bg-accent-50 border border-accent-100 text-accent-600 text-sm font-medium rounded-full mb-6">
              추천 결과 미리보기
            </span>
            <h2 className="mb-4 text-3xl font-black text-gray-900 md:text-4xl">
              이런 결과를 <span className="text-accent-600">받아보세요</span>
            </h2>
            <p className="text-lg text-gray-600">
              AI가 분석한 당신만의 맞춤 영화 추천
            </p>
          </div>

          <div className="space-y-4 animate-fade-up">
            {/* Personalized Recommendations */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 rounded-full bg-accent-500"></div>
                <h3 className="text-sm font-bold text-gray-900">취향 맞춤 추천</h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { title: "인터스텔라", year: "2014", runtime: "2시간 49분", poster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg" },
                  { title: "기생충", year: "2019", runtime: "2시간 12분", poster: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg" },
                  { title: "인셉션", year: "2010", runtime: "2시간 28분", poster: "https://image.tmdb.org/t/p/w500/ljsZTbVsrQSqZgWeep2B1QiDKuh.jpg" },
                ].map((movie, i) => (
                  <div key={i} className="relative overflow-hidden transition-all cursor-pointer group rounded-lg hover:scale-105 hover:shadow-lg">
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="object-cover w-full aspect-[2/3]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <h4 className="text-xs font-bold text-white truncate">{movie.title}</h4>
                      <div className="flex items-center gap-1 text-[10px] text-gray-300">
                        <span>{movie.year}</span>
                        <span>•</span>
                        <span>{movie.runtime}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Popular Recommendations */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 bg-yellow-500 rounded-full"></div>
                <h3 className="text-sm font-bold text-gray-900">인기 영화 추천</h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { title: "라라랜드", year: "2016", runtime: "2시간 8분", poster: "https://image.tmdb.org/t/p/w500/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg" },
                  { title: "다크 나이트", year: "2008", runtime: "2시간 32분", poster: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg" },
                  { title: "너의 이름은", year: "2016", runtime: "1시간 46분", poster: "https://image.tmdb.org/t/p/w500/q719jXXEzOoYaps6babgKnONONX.jpg" },
                ].map((movie, i) => (
                  <div key={i} className="relative overflow-hidden transition-all cursor-pointer group rounded-lg hover:scale-105 hover:shadow-lg">
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="object-cover w-full aspect-[2/3]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <h4 className="text-xs font-bold text-white truncate">{movie.title}</h4>
                      <div className="flex items-center gap-1 text-[10px] text-gray-300">
                        <span>{movie.year}</span>
                        <span>•</span>
                        <span>{movie.runtime}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Runtime */}
            <div className="p-3 border rounded-xl bg-accent-50 border-accent-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">총 러닝타임</span>
                <span className="text-lg font-black text-accent-600">13시간 55분</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section - stagger-rotate 애니메이션 */}
      <section
        id="how-it-works"
        className="min-h-screen flex items-center justify-center py-16 md:py-24 bg-gradient-to-br from-accent-600 to-accent-700 text-white"
      >
        <div className="px-6 mx-auto max-w-7xl">
          <div className="mb-24 text-center animate-fade-down">
            <span className="inline-block px-5 py-2.5 bg-white/10 text-white text-base font-medium rounded-full mb-8">
              이용 방법
            </span>
            <h2 className="mb-6 text-4xl font-black md:text-6xl">
              5단계로 완성되는
              <br />
              맞춤 추천
            </h2>
          </div>

          <div className="relative">
            {/* Connection Line */}
            <div className="hidden md:block absolute top-20 left-[10%] right-[10%] h-1 bg-white/20 rounded-full" />

            <div className="grid grid-cols-2 gap-10 stagger-rotate md:grid-cols-5">
              {steps.map((step, i) => (
                <div key={i} className="relative text-center group">
                  <div className="relative mx-auto mb-8 w-36 h-36">
                    <div className="absolute inset-0 transition-all rounded-full bg-white/10 group-hover:bg-white/20" />
                    <div className="absolute inset-2 bg-accent-600 rounded-full flex items-center justify-center text-white [&>svg]:w-[82px] [&>svg]:h-[82px] group-hover:bg-accent-500 transition-colors">
                      {step.icon}
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-white text-accent-600 rounded-full text-sm font-bold shadow-lg">
                      {step.num}
                    </div>
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-white">
                    {step.title}
                  </h3>
                  <p className="text-base text-accent-100">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section - animate-flip-up 애니메이션 */}
      <section
        id="faq"
        className="min-h-screen flex items-center justify-center py-16 md:py-24 bg-accent-50/50"
      >
        <div className="max-w-4xl px-6 mx-auto">
          <div className="mb-20 text-center animate-blur-in">
            <span className="inline-block px-5 py-2.5 bg-accent-50 border border-accent-100 text-accent-600 text-base font-medium rounded-full mb-8">
              자주 묻는 질문
            </span>
            <h2 className="mb-6 text-4xl font-black text-gray-900 md:text-6xl">
              FAQ
            </h2>
            <p className="max-w-2xl mx-auto text-xl text-gray-600">
              무비서 이용에 대해 궁금한 점을 확인하세요
            </p>
          </div>

          <div className="space-y-5 animate-flip-up">
            {faqItems.map((item, i) => (
              <div
                key={i}
                className="overflow-hidden transition-all bg-white border border-gray-100 rounded-3xl hover:border-accent-200 hover:shadow-xl"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="flex items-center justify-between w-full px-8 py-6 text-left"
                >
                  <span className="text-xl font-semibold text-gray-900">
                    {item.q}
                  </span>
                  <div
                    className={`w-10 h-10 bg-accent-50 rounded-full flex items-center justify-center transition-transform ${
                      activeFaq === i ? "rotate-180" : ""
                    }`}
                  >
                    <svg
                      className="w-6 h-6 text-accent-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>
                <div
                  className={`overflow-hidden transition-all ${
                    activeFaq === i ? "max-h-48" : "max-h-0"
                  }`}
                >
                  <p className="px-8 pb-6 text-lg leading-relaxed text-gray-600">
                    {item.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - animate-bounce-up 애니메이션 */}
      <section className="min-h-screen flex items-center justify-center py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-600 to-accent-700" />

        <div className="relative z-10 max-w-5xl px-6 mx-auto text-center">
          <div className="animate-bounce-up">
            <h2 className="mb-8 text-5xl font-black text-white md:text-7xl">
              지금 바로
              <br />
              시작하세요
            </h2>
            <p className="max-w-2xl mx-auto mb-16 text-2xl leading-relaxed text-white/80">
              더 이상 뭘 볼지 고민하지 마세요
              <br />
              무비서가 최적의 영화를 찾아드립니다
            </p>
          </div>
          <div className="flex flex-col justify-center gap-6 animate-fade-up sm:flex-row">
            <a
              href="https://demo.moviesir.cloud"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center px-12 py-6 text-xl font-bold transition-all bg-white rounded-full text-accent-600 hover:scale-105 hover:shadow-2xl"
            >
              무료로 시작하기
            </a>
            <a
              href="https://console.moviesir.cloud/login"
              className="inline-flex items-center gap-3 px-12 py-6 text-xl font-bold text-white transition-all bg-transparent border-2 border-white rounded-full hover:bg-white/10"
            >
              B2B 콘솔 접속
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 text-white bg-gray-900 border-t border-gray-800">
        <div className="px-6 mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-gray-500">© 2025 Team Movigation</p>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
              <a
                href="https://api.moviesir.cloud"
                className="transition-colors hover:text-white"
              >
                API 문서
              </a>
              <a href="#" className="transition-colors hover:text-white">
                서비스 약관
              </a>
              <a href="#" className="transition-colors hover:text-white">
                개인정보처리방침
              </a>
              <span className="hidden text-gray-700 md:inline">|</span>
              <span className="hidden md:inline">
                스나이퍼팩토리 카카오클라우드 마스터 클래스 AIaaS 2기 3팀 무비게이션
              </span>
              <a
                href="https://github.com/movigation"
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-white"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Scroll to Bottom Button */}
      <button
        onClick={scrollToBottom}
        className={`fixed bottom-8 right-8 w-12 h-12 bg-accent-600 text-white rounded-full shadow-lg shadow-accent-500/30 flex items-center justify-center hover:bg-accent-500 hover:scale-110 transition-all z-50 ${
          showScrollBottom
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        aria-label="맨 아래로"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Scroll to Top Button */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 w-12 h-12 bg-accent-600 text-white rounded-full shadow-lg shadow-accent-500/30 flex items-center justify-center hover:bg-accent-500 hover:scale-110 transition-all z-50 ${
          showScrollTop
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        aria-label="맨 위로 이동"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 15l7-7 7 7"
          />
        </svg>
      </button>
    </div>
  );
}
