import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Landing() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Scroll position tracking for scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      desc: (
        <>
          이동시간을 입력하면 러닝타임에
          <br />딱 맞는 영화 조합을 추천해드립니다
        </>
      ),
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
      desc: (
        <>
          두 개의 AI 하이브리드 추천 시스템으로
          <br />
          당신의 취향을 파악하고 맞춤 영화를 찾아드립니다
        </>
      ),
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
      desc: (
        <>
          구독 중인 OTT 플렛폼에서
          <br />
          바로 시청할 수 있는 영화만 보여드립니다
        </>
      ),
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
      desc: (
        <>
          개인 취향 맞춤 추천과 인기 영화 추천을
          <br />
          동시에 제공해 선택의 폭을 넓혀드립니다
        </>
      ),
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
    {
      q: "무비서는 무료인가요?",
      a: "네, 무비서는 완전 무료입니다! 회원가입만 하면 모든 기능을 제한 없이 이용할 수 있습니다",
    },
    {
      q: "어떤 OTT를 지원하나요?",
      a: "현재 Netflix, 티빙, Watcha, Disney+, Apple TV+ 등 주요 OTT 플랫폼을 지원합니다",
    },
    {
      q: "앱을 설치해야 하나요?",
      a: "아니요! 무비서는 PWA로 제작되어 앱스토어 설치 없이 웹에서 바로 사용할 수 있습니다",
    },
    {
      q: "추천 알고리즘은 어떻게 작동하나요?",
      a: "SBERT와 LightGCN을 결합한 하이브리드 추천 시스템으로 최적의 영화를 추천합니다",
    },
  ];

  const ottPlatforms = [
    { name: "Netflix", logo: "/logos/NETFLEX_Logo.svg" },
    { name: "티빙", logo: "/logos/TVING_Logo.svg" },
    { name: "Watcha", logo: "/logos/WATCHA_Logo_Main.svg" },
    { name: "Disney+", logo: "/logos/Disney+_logo.svg" },
    { name: "Apple TV+", logo: "/logos/Apple_TV_logo.svg" },
  ];

  const posterColors = [
    "from-accent-600 to-accent-400",
    "from-accent-700 to-accent-500",
    "from-accent-500 to-accent-300",
    "from-accent-700 to-accent-600",
    "from-accent-600 to-accent-500",
    "from-accent-700 to-accent-400",
  ];

  return (
    <div className="min-h-screen overflow-x-hidden text-gray-900 bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4 mx-auto max-w-7xl">
          <a href="/" className="flex items-center gap-3">
            <img src="/favicon.svg" alt="무비서" className="w-10 h-10" />
            <span className="text-2xl font-bold text-gray-900">무비서</span>
          </a>
          <ul className="hidden gap-8 md:flex">
            <li>
              <a
                href="#features"
                className="text-base font-medium text-gray-600 transition-colors hover:text-accent-600"
              >
                핵심 기능
              </a>
            </li>
            <li>
              <a
                href="#how-it-works"
                className="text-base font-medium text-gray-600 transition-colors hover:text-accent-600"
              >
                이용 방법
              </a>
            </li>
            <li>
              <a
                href="#faq"
                className="text-base font-medium text-gray-600 transition-colors hover:text-accent-600"
              >
                자주 묻는 질문
              </a>
            </li>
            <li>
              <Link
                to="/api"
                className="text-base font-medium text-gray-600 transition-colors hover:text-accent-600"
              >
                API
              </Link>
            </li>
          </ul>
          <div className="flex items-center gap-4">
            {/* 다국어 지원 버튼 */}
            <button className="flex items-center justify-center w-10 h-10 text-gray-500 transition-all rounded-full hover:text-accent-600 hover:bg-gray-100">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
            </button>
            <Link
              to="/login"
              className="px-6 py-2.5 bg-accent-600 text-white text-base font-semibold rounded-full hover:bg-accent-500 hover:shadow-lg hover:shadow-accent-500/30 transition-all"
            >
              무비서 이용하기
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="h-screen max-h-[1080px] min-h-[800px] relative pt-20 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-accent-50 via-white to-white" />
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-accent-100/50 rounded-full blur-[150px] animate-pulse" />
          <div
            className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-accent-200/30 rounded-full blur-[150px] animate-pulse"
            style={{ animationDelay: "1s" }}
          />
        </div>

        {/* Floating Movie Posters Background */}
        <div className="absolute inset-0 overflow-hidden opacity-30">
          <div className="absolute top-20 left-[5%] w-32 h-48 rounded-xl bg-gradient-to-br from-accent-600 to-accent-400 transform rotate-[-15deg] shadow-2xl" />
          <div className="absolute top-40 right-[10%] w-28 h-42 rounded-xl bg-gradient-to-br from-accent-700 to-accent-500 transform rotate-[10deg] shadow-2xl" />
          <div className="absolute bottom-40 left-[15%] w-24 h-36 rounded-xl bg-gradient-to-br from-accent-500 to-accent-300 transform rotate-[5deg] shadow-2xl" />
          <div className="absolute bottom-20 right-[20%] w-32 h-48 rounded-xl bg-gradient-to-br from-accent-700 to-accent-600 transform rotate-[-8deg] shadow-2xl" />
        </div>

        <div className="relative z-10 px-6 mx-auto max-w-7xl">
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
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 font-bold text-white transition-all rounded-full group bg-accent-600 hover:bg-accent-500 hover:shadow-2xl hover:shadow-accent-500/30"
                >
                  <span>무료로 시작하기</span>
                  <svg
                    className="w-5 h-5 transition-transform group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </a>
                <Link
                  to="/api"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 font-semibold text-gray-700 transition-all bg-white border border-gray-200 rounded-full hover:border-accent-300 hover:text-accent-600"
                >
                  API 문서 보기
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center lg:text-left">
                  <div className="text-3xl font-black md:text-4xl text-accent-600">
                    10K+
                  </div>
                  <div className="mt-1 text-sm text-gray-500">영화 데이터</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-3xl font-black md:text-4xl text-accent-600">
                    1초
                  </div>
                  <div className="mt-1 text-sm text-gray-500">추천 속도</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-3xl font-black md:text-4xl text-accent-600">
                    6편
                  </div>
                  <div className="mt-1 text-sm text-gray-500">맞춤 추천</div>
                </div>
              </div>
            </div>

            {/* Right - Movie Poster Grid */}
            <div className="relative hidden lg:block">
              <div className="relative w-full h-[600px]">
                {/* Main Poster */}
                <div className="absolute z-20 w-48 transition-transform transform -translate-x-1/2 -translate-y-1/2 shadow-2xl top-1/2 left-1/2 h-72 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-700 shadow-accent-500/40 hover:scale-105">
                  <div className="absolute inset-0 overflow-hidden rounded-2xl">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="w-20 h-2 mb-2 rounded bg-white/30" />
                      <div className="h-2 rounded w-14 bg-white/20" />
                    </div>
                  </div>
                  {/* AI Badge */}
                  <div className="absolute px-3 py-1 text-xs font-bold text-white rounded-full shadow-lg -top-3 -right-3 bg-accent-500">
                    AI 추천
                  </div>
                </div>

                {/* Surrounding Posters */}
                {[
                  {
                    top: "5%",
                    left: "10%",
                    rotate: "-12deg",
                    color: posterColors[0],
                  },
                  {
                    top: "10%",
                    right: "15%",
                    rotate: "8deg",
                    color: posterColors[1],
                  },
                  {
                    bottom: "15%",
                    left: "5%",
                    rotate: "6deg",
                    color: posterColors[2],
                  },
                  {
                    bottom: "10%",
                    right: "10%",
                    rotate: "-10deg",
                    color: posterColors[3],
                  },
                  {
                    top: "40%",
                    left: "0%",
                    rotate: "-5deg",
                    color: posterColors[4],
                  },
                  {
                    top: "35%",
                    right: "0%",
                    rotate: "12deg",
                    color: posterColors[5],
                  },
                ].map((pos, i) => (
                  <div
                    key={i}
                    className={`absolute w-32 h-48 rounded-xl bg-gradient-to-br ${pos.color} shadow-xl opacity-60 hover:opacity-100 hover:scale-110 transition-all cursor-pointer`}
                    style={{
                      top: pos.top,
                      left: pos.left,
                      right: pos.right,
                      bottom: pos.bottom,
                      transform: `rotate(${pos.rotate})`,
                    }}
                  >
                    <div className="absolute inset-0 overflow-hidden rounded-xl">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    </div>
                  </div>
                ))}

                {/* Glow Effects */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent-200/50 rounded-full blur-[100px]" />
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute flex flex-col items-center gap-2 -translate-x-1/2 bottom-8 left-1/2">
          <span className="text-xs text-gray-400">스크롤</span>
          <div className="flex justify-center w-6 h-10 pt-2 border-2 rounded-full border-accent-300">
            <div className="w-1 h-2 rounded-full bg-accent-500 animate-bounce" />
          </div>
        </div>
      </section>

      {/* OTT Platforms - stagger-scale 애니메이션 */}
      <section className="h-screen max-h-[1080px] min-h-[800px] relative bg-white">
        {/* 헤더 - 상단 고정 */}
        <div className="absolute left-0 right-0 top-44">
          <div className="px-6 mx-auto text-center animate-fade-down max-w-7xl">
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
        </div>
        {/* OTT 카드 - 중앙 배치 */}
        <div className="flex items-center justify-center h-full pt-28">
          <div className="flex items-center justify-center gap-5 stagger-scale md:gap-6">
            {ottPlatforms.map((platform) => (
              <div
                key={platform.name}
                className="flex items-center justify-center w-40 h-40 transition-all border border-gray-100 cursor-default md:w-52 md:h-52 bg-gray-50 rounded-2xl hover:border-accent-300 hover:shadow-2xl hover:bg-white hover:scale-105"
              >
                <img
                  src={platform.logo}
                  alt={platform.name}
                  className="object-contain w-24 h-auto md:w-32"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PWA Section - stagger-up 애니메이션 */}
      <section className="h-screen max-h-[1080px] min-h-[800px] flex items-center justify-center py-32 bg-gray-50">
        <div className="px-6 mx-auto max-w-7xl">
          <div className="mb-20 text-center animate-fade-up">
            <span className="inline-block px-5 py-2.5 bg-accent-50 border border-accent-100 text-accent-600 text-base font-medium rounded-full mb-8">
              PWA 지원
            </span>
            <h2 className="mb-6 text-4xl font-black text-gray-900 md:text-6xl">
              앱처럼 <span className="text-accent-600">사용하세요</span>
            </h2>
            <p className="max-w-2xl mx-auto text-xl text-gray-600">
              별도 설치 없이 홈 화면에 추가하면 네이티브 앱처럼 사용할 수
              있습니다
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
                브라우저에서 홈 화면에 추가하면 <br />
                앱처럼 바로 실행됩니다
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
                캐싱 기술로 네이티브 앱 수준의 <br />
                빠른 속도를 제공합니다
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
                PC, 태블릿, 모바일 어디서든 <br />
                동일한 경험을 제공합니다
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - stagger-sides 애니메이션 */}
      <section
        id="features"
        className="h-screen max-h-[1080px] min-h-[800px] flex items-center justify-center py-20 relative bg-white"
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
              AI 기반 하이브리드 추천 시스템으로 당신에게 딱 맞는 영화를
              찾아드립니다
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
      <section className="h-screen max-h-[1080px] min-h-[800px] flex items-center justify-center py-32 bg-gray-50">
        <div className="max-w-[600px] mx-auto px-6">
          <div className="mb-12 text-center animate-fade-up">
            <span className="inline-block px-5 py-2.5 bg-accent-50 border border-accent-100 text-accent-600 text-base font-medium rounded-full mb-8">
              추천 결과 미리보기
            </span>
            <h2 className="mb-6 text-4xl font-black text-gray-900 md:text-5xl">
              이런 결과를 <span className="text-accent-600">받아보세요</span>
            </h2>
            <p className="text-xl text-gray-600">
              영화 정보와 런타임이 한 번에 제공됩니다
            </p>
          </div>

          <div className="space-y-4 animate-fade-up">
            {[
              {
                title: "쇼생크 탈출",
                year: 1994,
                genres: ["드라마"],
                runtime: "2시간 22분",
                score: 95,
              },
              {
                title: "대부",
                year: 1972,
                genres: ["드라마", "범죄"],
                runtime: "2시간 55분",
                score: 92,
              },
            ].map((movie, i) => (
              <div
                key={i}
                className="flex gap-4 p-5 transition-all bg-white border border-gray-100 rounded-2xl hover:border-accent-200 hover:shadow-xl"
              >
                <div className="w-16 h-24 bg-gradient-to-br from-accent-500 to-accent-700 rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-accent-500/20 flex-shrink-0">
                  🎬
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-lg font-bold text-gray-900">{movie.title}</h4>
                    <span className="text-sm text-gray-400">{movie.year}</span>
                  </div>
                  <div className="flex gap-2 mb-2">
                    {movie.genres.map((g) => (
                      <span
                        key={g}
                        className="text-xs px-2 py-0.5 bg-accent-50 text-accent-600 rounded-full font-medium"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{movie.runtime}</span>
                    <span className="font-medium text-green-600">매칭 {movie.score}%</span>
                  </div>
                </div>
              </div>
            ))}
            <div className="p-5 border rounded-2xl bg-accent-50 border-accent-100">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">총 러닝타임</span>
                <span className="text-2xl font-black text-accent-600">5시간 17분</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section - stagger-rotate 애니메이션 */}
      <section
        id="how-it-works"
        className="h-screen max-h-[1080px] min-h-[800px] flex items-center justify-center py-32 bg-gradient-to-br from-accent-600 to-accent-700 text-white"
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
        className="h-screen max-h-[1080px] min-h-[800px] flex items-center justify-center py-32 bg-accent-50/50"
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

      {/* Team Section - animate-blur-in + stagger-scale 애니메이션 */}
      <section className="h-screen max-h-[1080px] min-h-[800px] flex items-center justify-center py-32 bg-gray-50">
        <div className="max-w-5xl px-6 mx-auto text-center">
          <div className="animate-rotate-in">
            <span className="inline-block px-5 py-2.5 bg-accent-50 border border-accent-100 text-accent-600 text-base font-medium rounded-full mb-8">
              팀 소개
            </span>
            <h2 className="mb-6 text-4xl font-black text-gray-900 md:text-6xl">
              Team Movigation
            </h2>
            <p className="mb-20 text-xl text-gray-500">
              스나이퍼팩토리 카카오클라우드 AIaaS 마스터 클래스 2기 3팀
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-12 stagger-scale">
            {[
              { role: "Database" },
              { role: "AI / ML" },
              { role: "Frontend" },
              { role: "Backend" },
              { role: "Cloud" },
            ].map((member, i) => (
              <div key={i} className="text-center group">
                <div className="flex items-center justify-center w-32 h-32 mx-auto mb-6 text-4xl font-bold text-white transition-transform rounded-full shadow-xl bg-accent-600 shadow-accent-500/30 group-hover:scale-110">
                  1
                </div>
                <p className="text-lg font-medium text-gray-600">
                  {member.role}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - animate-bounce-up 애니메이션 */}
      <section className="h-screen max-h-[1080px] min-h-[800px] flex items-center justify-center py-32 relative overflow-hidden">
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
              className="inline-flex items-center gap-3 px-12 py-6 text-xl font-bold transition-all bg-white rounded-full text-accent-600 hover:scale-105 hover:shadow-2xl"
            >
              무료로 시작하기
              <svg
                className="w-7 h-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </a>
            <Link
              to="/login"
              className="inline-flex items-center gap-3 px-12 py-6 text-xl font-bold text-white transition-all bg-transparent border-2 border-white rounded-full hover:bg-white/10"
            >
              B2B 콘솔 접속
            </Link>
          </div>
        </div>
      </section>

      {/* Footer - Clunix Style */}
      <footer className="py-12 text-white bg-gray-900">
        <div className="px-6 mx-auto max-w-7xl">
          <div className="grid gap-12 mb-12 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img src="/favicon.svg" alt="무비서" className="w-10 h-10" />
                <span className="text-xl font-bold">무비서</span>
              </div>
              <p className="max-w-md leading-relaxed text-gray-400">
                AI 기반 하이브리드 추천 시스템으로 <br />
                당신에게 딱 맞는 영화를 찾아드립니다
                <br />
                무비서와 함께 새로운 영화 발견의 여정을 시작하세요
              </p>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">제품</h4>
              <ul className="space-y-3 text-gray-400">
                <li>
                  <a
                    href="#features"
                    className="transition-colors hover:text-white"
                  >
                    핵심 기능
                  </a>
                </li>
                <li>
                  <a
                    href="#how-it-works"
                    className="transition-colors hover:text-white"
                  >
                    이용 방법
                  </a>
                </li>
                <li>
                  <Link
                    to="/api"
                    className="transition-colors hover:text-white"
                  >
                    API
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">리소스</h4>
              <ul className="space-y-3 text-gray-400">
                <li>
                  <Link
                    to="/login"
                    className="transition-colors hover:text-white"
                  >
                    콘솔
                  </Link>
                </li>
                <li>
                  <a href="#faq" className="transition-colors hover:text-white">
                    자주 묻는 질문
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/movigation"
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-white"
                  >
                    GitHub
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 pt-8 border-t border-gray-800 md:flex-row">
            <p className="text-sm text-gray-500">
              2025 Team Movigation. All rights reserved.
            </p>
            <p className="text-sm text-gray-500">
              스나이퍼팩토리 카카오클라우드 AIaaS 마스터 클래스 2기 3팀
            </p>
          </div>
        </div>
      </footer>

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
