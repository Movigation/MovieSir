import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Api() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-white/10 ${
          isScrolled ? "bg-gray-950/80 backdrop-blur-md" : "bg-transparent"
        }`}
      >
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-10">
              <Link to="/api" className="flex items-center gap-2">
                <img src="/favicon.svg" alt="무비서" className="w-10 h-10" />
                <span className="text-xl font-semibold text-white">무비서</span>
                <span className="text-xs font-semibold text-white border border-white/30 bg-white/10 px-1.5 py-0.5 rounded">
                  API
                </span>
              </Link>
              <ul className="hidden md:flex items-center gap-1">
                {/* 소개 드롭다운 */}
                <li className="relative group">
                  <button className="px-4 py-2 text-sm font-semibold text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1">
                    소개
                    <svg
                      className="w-3 h-3 transition-transform group-hover:rotate-180"
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
                  <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <div className="bg-white rounded-xl shadow-xl border border-gray-100 py-2 min-w-[200px]">
                      <Link
                        to="/docs?section=intro"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                      >
                        무비서 API란
                      </Link>
                      <Link
                        to="/docs?section=features"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                      >
                        주요 기능
                      </Link>
                      <Link
                        to="/docs?section=getting-started"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                      >
                        시작하기
                      </Link>
                    </div>
                  </div>
                </li>
                {/* API 문서 드롭다운 */}
                <li className="relative group">
                  <button className="px-4 py-2 text-sm font-semibold text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1">
                    API 문서
                    <svg
                      className="w-3 h-3 transition-transform group-hover:rotate-180"
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
                  <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <div className="bg-white rounded-xl shadow-xl border border-gray-100 py-2 min-w-[200px]">
                      <Link
                        to="/docs?section=auth"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                      >
                        인증
                      </Link>
                      <Link
                        to="/docs?section=recommend"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                      >
                        /recommend
                      </Link>
                      <Link
                        to="/docs?section=errors"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                      >
                        에러 코드
                      </Link>
                      <Link
                        to="/docs?section=rate-limit"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                      >
                        Rate Limit
                      </Link>
                    </div>
                  </div>
                </li>
                <li>
                  <a
                    href="mailto:support@moviesir.cloud"
                    className="px-4 py-2 text-sm font-semibold text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    문의
                  </a>
                </li>
              </ul>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="https://demo.moviesir.cloud"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 text-sm font-semibold text-white/80 hover:text-white transition-colors"
              >
                무비서 이용하기
              </a>
              <span className="text-white/30">|</span>
              <a
                href="https://console.moviesir.cloud/login"
                className="px-4 py-2 text-sm font-semibold text-white/80 hover:text-white transition-colors"
              >
                콘솔
              </a>
              <span className="text-white/30">|</span>
              <a
                href="https://console.moviesir.cloud/register"
                className="px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-400 transition-colors"
              >
                회원가입
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with extended background */}
      <section className="pt-16 relative overflow-hidden text-white">
        {/* Black Background */}
        <div className="absolute inset-0 bg-gray-950" />

        {/* Blue Glow Effects - shared across all sections */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Top center glow */}
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/25 rounded-full blur-[120px]" />
          {/* Top left accent */}
          <div className="absolute -top-20 left-1/4 w-[300px] h-[300px] bg-blue-600/20 rounded-full blur-[80px]" />
          {/* Top right accent */}
          <div className="absolute -top-10 right-1/4 w-[250px] h-[250px] bg-blue-400/15 rounded-full blur-[90px]" />
          {/* Use Cases section glow */}
          <div className="absolute top-[800px] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/25 rounded-full blur-[120px]" />
        </div>

        {/* Content wrapper with relative positioning */}
        <div className="relative">
          {/* Hero Content */}
          <div className="max-w-[1200px] mx-auto px-6 py-20">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-sm mb-6">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-white/80">
                    이동 시간 맞춤형 콘텐츠 추천 서비스
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
                  무비서 API
                </h1>
                <p className="text-lg text-white/80 mb-8 leading-relaxed">
                  SBERT + LightGCN 하이브리드 추천 엔진을 REST API로 연동하세요
                  <br />
                  시간 맞춤 추천부터 OTT 필터링까지, 한 번의 호출로 해결합니다
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="https://console.moviesir.cloud/login"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-400 transition-colors shadow-lg shadow-blue-500/25"
                  >
                    시작하기
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </a>
                  <Link
                    to="/docs"
                    className="inline-flex items-center gap-2 px-6 py-3 border border-white/30 text-white font-medium rounded-lg hover:bg-white/10 transition-colors"
                  >
                    API 문서 보기
                  </Link>
                </div>
              </div>

              {/* Code Preview */}
              <div className="hidden md:block">
                <div className="bg-gray-900/80 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm">
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                  </div>
                  <pre className="p-5 font-mono text-sm text-gray-300 leading-relaxed overflow-x-auto">
                    <code>
                      <span className="text-gray-500"># 영화 추천 요청</span>
                      {"\n"}
                      <span className="text-emerald-400">curl</span> -X POST \
                      {"\n"}
                      {"  "}https://api.moviesir.cloud/recommend \{"\n"}
                      {"  "}-H{" "}
                      <span className="text-amber-300">
                        "X-API-Key: your_key"
                      </span>{" "}
                      \{"\n"}
                      {"  "}-d <span className="text-sky-300">'{`{`}</span>
                      {"\n"}
                      {"    "}
                      <span className="text-sky-300">
                        "runtime_limit"
                      </span>: <span className="text-amber-300">180</span>,
                      {"\n"}
                      {"    "}
                      <span className="text-sky-300">"genres"</span>: [
                      <span className="text-emerald-300">"액션"</span>]{"\n"}
                      {"  "}
                      <span className="text-sky-300">{`}`}</span>'
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="relative">
            <div className="max-w-[1200px] mx-auto px-6 py-10">
              <div className="flex justify-center gap-16 md:gap-24">
                {[
                  { value: "10,000+", label: "영화 데이터" },
                  { value: "< 100ms", label: "평균 응답 속도" },
                  { value: "REST API", label: "API 제공" },
                ].map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className="text-2xl md:text-3xl font-bold text-white mb-1">
                      {stat.value}
                    </div>
                    <div className="text-sm text-blue-300/60">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Use Cases */}
          <div className="relative py-20">
            <div className="max-w-[1000px] mx-auto px-6">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-white mb-4">
                  다양한 서비스에서 활용할 수 있습니다
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {[
                  {
                    icon: (
                      <svg
                        className="w-12 h-12"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    ),
                    title: "스트리밍 서비스",
                    desc: (
                      <>
                        자체 OTT나 VOD 서비스에 AI 추천을 연동해
                        <br />
                        시청 완료율과 재방문율을 높이세요
                      </>
                    ),
                  },
                  {
                    icon: (
                      <svg
                        className="w-12 h-12"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                    ),
                    title: "AI 챗봇 연동",
                    desc: (
                      <>
                        ChatGPT, Claude 등 LLM 기반 챗봇에
                        <br />
                        영화 추천 기능을 Function Call로 연결하세요
                      </>
                    ),
                  },
                  {
                    icon: (
                      <svg
                        className="w-12 h-12"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                        />
                      </svg>
                    ),
                    title: "콘텐츠 큐레이션",
                    desc: (
                      <>
                        뉴스레터, 블로그, 매거진에 맞춤형
                        <br />
                        영화 추천 콘텐츠를 자동 생성하세요
                      </>
                    ),
                  },
                  {
                    icon: (
                      <svg
                        className="w-12 h-12"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                        />
                      </svg>
                    ),
                    title: "기내 엔터테인먼트",
                    desc: (
                      <>
                        비행 시간에 딱 맞는 영화 조합을 추천해
                        <br />
                        승객 만족도와 서비스 품질을 높이세요
                      </>
                    ),
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex gap-4 p-6 bg-white/5 backdrop-blur-sm rounded-xl hover:bg-blue-500/10 transition-all group"
                  >
                    <div className="w-[68px] h-[68px] bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-300 flex-shrink-0 group-hover:bg-blue-500/30 transition-colors">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">
                        {item.title}
                      </h3>
                      <p className="text-sm text-white/70">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="relative py-6 border-t border-white/10">
            <div className="max-w-[1200px] mx-auto px-6">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-sm text-white/50">© 2025 Team Movigation</p>
                <div className="flex items-center gap-6 text-sm text-white/50">
                  <Link
                    to="/docs"
                    className="hover:text-white transition-colors"
                  >
                    API 문서
                  </Link>
                  <a href="#" className="hover:text-white transition-colors">
                    서비스 약관
                  </a>
                  <a href="#" className="hover:text-white transition-colors">
                    개인정보처리방침
                  </a>
                  <span className="text-white/30">|</span>
                  <span>
                    스나이퍼팩토리 카카오클라우드 마스터 클래스 AIaaS 2기 3팀
                    무비게이션
                  </span>
                  <a
                    href="https://github.com/movigation"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
}
