import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

type Section = 'intro' | 'features' | 'getting-started' | 'auth' | 'recommend' | 'recommend-single' | 'errors' | 'rate-limit'

// 각 섹션별 서브 목차 정의
const sectionToc: Record<Section, { id: string; label: string }[]> = {
  'intro': [
    { id: 'intro-overview', label: '개요' },
    { id: 'intro-algorithm', label: '추천 알고리즘' },
    { id: 'intro-spec', label: 'API 스펙' },
  ],
  'features': [],
  'getting-started': [],
  'auth': [
    { id: 'auth-header', label: 'API Key 헤더' },
    { id: 'auth-format', label: 'API Key 형식' },
    { id: 'auth-security', label: '보안 주의사항' },
  ],
  'recommend': [
    { id: 'recommend-endpoint', label: 'Endpoint' },
    { id: 'recommend-params', label: 'Request Parameters' },
    { id: 'recommend-genres', label: '지원 장르' },
    { id: 'recommend-example', label: '예시' },
    { id: 'recommend-response', label: 'Response Fields' },
  ],
  'recommend-single': [
    { id: 'single-endpoint', label: 'Endpoint' },
    { id: 'single-params', label: 'Request Parameters' },
    { id: 'single-example', label: '예시' },
    { id: 'single-response', label: 'Response Fields' },
  ],
  'errors': [
    { id: 'errors-table', label: '에러 코드 목록' },
    { id: 'errors-format', label: '에러 응답 형식' },
  ],
  'rate-limit': [
    { id: 'rate-plans', label: '플랜별 호출 한도' },
    { id: 'rate-headers', label: '응답 헤더' },
    { id: 'rate-exceeded', label: '한도 초과 시' },
  ],
}

// 코드 복사 버튼 컴포넌트
function CopyButton({ text, light = false }: { text: string; light?: boolean }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className={`absolute top-3 right-3 p-1.5 rounded-md transition-colors ${
        light
          ? 'hover:bg-gray-200 text-gray-400 hover:text-gray-600'
          : 'hover:bg-white/10 text-gray-400 hover:text-white'
      }`}
      title="복사"
    >
      {copied ? (
        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  )
}

// 코드 블록 컴포넌트
function CodeBlock({ code, language, showLineNumbers = false }: { code: string; language?: string; showLineNumbers?: boolean }) {
  return (
    <div className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-900">
      {language && (
        <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between bg-gray-900">
          <span className="text-xs text-gray-500 font-medium">{language}</span>
        </div>
      )}
      <pre className={`p-4 overflow-x-auto ${showLineNumbers ? 'pl-12' : ''}`}>
        <code className="text-sm font-mono text-gray-300 leading-relaxed whitespace-pre">{code}</code>
      </pre>
      <CopyButton text={code} />
    </div>
  )
}

// SDK 코드 탭 컴포넌트
function SdkCodeTabs({ curlCode, jsCode, pythonCode }: { curlCode: string; jsCode: string; pythonCode: string }) {
  const [activeTab, setActiveTab] = useState<'curl' | 'javascript' | 'python'>('curl')

  const tabs = [
    { id: 'curl', label: 'cURL' },
    { id: 'javascript', label: 'JavaScript' },
    { id: 'python', label: 'Python' },
  ] as const

  const code = activeTab === 'curl' ? curlCode : activeTab === 'javascript' ? jsCode : pythonCode

  return (
    <div className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-900">
      <div className="flex border-b border-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-white border-b-2 border-blue-400 bg-gray-800'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm font-mono text-gray-300 leading-relaxed whitespace-pre">{code}</code>
      </pre>
      <CopyButton text={code} />
    </div>
  )
}

// 하단 네비게이션 컴포넌트
function BottomNavigation({
  activeSection,
  setActiveSection,
  navigation
}: {
  activeSection: Section
  setActiveSection: (section: Section) => void
  navigation: { id: string; label: string }[]
}) {
  const currentIndex = navigation.findIndex(item => item.id === activeSection)
  const prevItem = currentIndex > 0 ? navigation[currentIndex - 1] : null
  const nextItem = currentIndex < navigation.length - 1 ? navigation[currentIndex + 1] : null

  return (
    <div className="flex justify-between items-center mt-12 pt-8 border-t border-gray-200">
      {prevItem ? (
        <button
          onClick={() => setActiveSection(prevItem.id as Section)}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <div className="text-left">
            <span className="text-xs text-gray-400 block">이전</span>
            <span className="text-sm font-medium">{prevItem.label}</span>
          </div>
        </button>
      ) : <div />}
      {nextItem ? (
        <button
          onClick={() => setActiveSection(nextItem.id as Section)}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors group"
        >
          <div className="text-right">
            <span className="text-xs text-gray-400 block">다음</span>
            <span className="text-sm font-medium">{nextItem.label}</span>
          </div>
          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      ) : <div />}
    </div>
  )
}

export default function Docs() {
  const [searchParams] = useSearchParams()
  const [activeSection, setActiveSection] = useState<Section>('intro')
  const [activeTab, setActiveTab] = useState<'request' | 'response'>('request')

  useEffect(() => {
    const section = searchParams.get('section')
    if (section && ['intro', 'features', 'getting-started', 'auth', 'recommend', 'recommend-single', 'errors', 'rate-limit'].includes(section)) {
      setActiveSection(section as Section)
    }
  }, [searchParams])

  // 섹션 변경 시 상단으로 스크롤
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activeSection])

  const navigation = [
    { id: 'intro', label: '무비서 API란', category: 'API 소개', method: null },
    { id: 'features', label: '주요 기능', category: 'API 소개', method: null },
    { id: 'getting-started', label: '시작하기', category: 'API 소개', method: null },
    { id: 'recommend', label: '/v1/recommend', category: 'Endpoints', method: 'POST' },
    { id: 'recommend-single', label: '/v1/recommend_single', category: 'Endpoints', method: 'POST' },
    { id: 'auth', label: '인증', category: 'API Reference', method: null },
    { id: 'errors', label: '에러 코드', category: 'API Reference', method: null },
    { id: 'rate-limit', label: 'Rate Limit', category: 'API Reference', method: null },
  ]

  const categories = ['API 소개', 'Endpoints', 'API Reference']

  // 현재 섹션의 서브 TOC
  const currentToc = useMemo(() => sectionToc[activeSection] || [], [activeSection])

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-6">
            <a href="https://api.moviesir.cloud" className="flex items-center gap-2">
              <img src="/favicon.svg" alt="무비서" className="w-8 h-8" />
              <span className="font-bold text-gray-900">무비서</span>
              <span className="text-xs font-medium text-blue-600 border border-blue-200 bg-blue-50 px-1.5 py-0.5 rounded">
                Docs
              </span>
            </a>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://api.moviesir.cloud"
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
            >
              API 홈
            </a>
            <Link
              to="/support"
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
            >
              문의
            </Link>
            <a
              href="https://console.moviesir.cloud/login"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 transition-colors"
            >
              콘솔로 이동
            </a>
          </div>
        </div>
      </header>

      <div className="flex pt-16">
        {/* Left Sidebar - Navigation */}
        <aside className="fixed left-0 top-16 w-64 h-[calc(100vh-64px)] bg-gray-50 border-r border-gray-200 overflow-y-auto">
          <nav className="p-4">
            {categories.map((category) => (
              <div key={category} className="mb-6">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">
                  {category}
                </span>
                <ul className="mt-2 space-y-1">
                  {navigation
                    .filter((item) => item.category === category)
                    .map((item) => (
                      <li key={item.id}>
                        <button
                          onClick={() => setActiveSection(item.id as Section)}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            activeSection === item.id
                              ? 'bg-blue-100 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {item.method ? (
                            <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                              item.method === 'POST' ? 'bg-emerald-100 text-emerald-700' :
                              item.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                              item.method === 'PUT' ? 'bg-amber-100 text-amber-700' :
                              item.method === 'DELETE' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {item.method}
                            </span>
                          ) : (
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                          <span className={`truncate ${item.method ? 'font-mono text-xs' : ''}`}>{item.label}</span>
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="ml-64 mr-56 flex-1 min-h-[calc(100vh-64px)]">
          <div className="max-w-3xl mx-auto px-8 py-12">
            {/* 무비서 API란 */}
            {activeSection === 'intro' && (
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-6">
                  무비서 API란
                </h1>
                <div className="prose prose-gray max-w-none">
                  <div id="intro-overview">
                    <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                      무비서 API는 AI 기반 영화 추천 기능을 여러분의 서비스에 쉽게
                      연동할 수 있도록 제공하는 RESTful API입니다. SBERT와
                      LightGCN을 결합한 하이브리드 추천 알고리즘으로 사용자의
                      취향에 맞는 최적의 영화를 추천합니다.
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-8">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3">
                      핵심 가치
                    </h3>
                    <ul className="space-y-2 text-blue-800">
                      <li className="flex items-start gap-2">
                        <svg
                          className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>
                          <strong>시간 맞춤 추천</strong> - 이동 시간에 딱 맞는
                          영화 조합 제공
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg
                          className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>
                          <strong>AI 개인화</strong> - 사용자 취향 분석 기반
                          맞춤 추천
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg
                          className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>
                          <strong>OTT 필터링</strong> - 구독 중인 플랫폼에서
                          바로 시청 가능한 영화만 추천
                        </span>
                      </li>
                    </ul>
                  </div>

                  <h2 id="intro-algorithm" className="text-xl font-bold text-gray-900 mb-4">
                    추천 알고리즘
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4 mb-8">
                    <div className="border border-gray-200 rounded-xl p-6">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        SBERT
                      </h4>
                      <p className="text-sm text-gray-600">
                        Sentence-BERT를 활용한 콘텐츠 기반 추천으로 영화의
                        줄거리, 장르, 키워드를 분석하여 유사한 영화를 찾습니다.
                      </p>
                    </div>
                    <div className="border border-gray-200 rounded-xl p-6">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        LightGCN
                      </h4>
                      <p className="text-sm text-gray-600">
                        그래프 신경망 기반 협업 필터링으로 사용자의 시청 이력과
                        평점을 분석하여 취향을 파악합니다.
                      </p>
                    </div>
                  </div>

                  <h2 id="intro-spec" className="text-xl font-bold text-gray-900 mb-4">
                    API 스펙
                  </h2>
                  <div className="overflow-hidden border border-gray-200 rounded-xl">
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b border-gray-200">
                          <td className="px-4 py-3 bg-gray-50 font-medium text-gray-700 w-40">
                            Base URL
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                              https://api.moviesir.cloud
                            </code>
                          </td>
                        </tr>
                        <tr className="border-b border-gray-200">
                          <td className="px-4 py-3 bg-gray-50 font-medium text-gray-700">
                            인증 방식
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            API Key (X-API-Key 헤더)
                          </td>
                        </tr>
                        <tr className="border-b border-gray-200">
                          <td className="px-4 py-3 bg-gray-50 font-medium text-gray-700">
                            응답 형식
                          </td>
                          <td className="px-4 py-3 text-gray-600">JSON</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 bg-gray-50 font-medium text-gray-700">
                            평균 응답 속도
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {"< 100ms"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <BottomNavigation activeSection={activeSection} setActiveSection={setActiveSection} navigation={navigation} />
              </div>
            )}

            {/* 주요 기능 */}
            {activeSection === 'features' && (
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-6">
                  주요 기능
                </h1>
                <p className="text-lg text-gray-600 mb-8">
                  무비서 API가 제공하는 핵심 기능들을 소개합니다.
                </p>

                <div className="space-y-6">
                  {[
                    {
                      icon: (
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
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      ),
                      title: "시간 기반 추천",
                      desc: "이동 시간을 입력하면 해당 시간에 딱 맞는 영화 조합을 추천합니다. 장거리 이동, 출퇴근, 점심시간 등 다양한 상황에 맞는 영화를 제안합니다.",
                      example:
                        '{ "runtime_limit": 180 } → 3시간 내로 볼 수 있는 영화 조합',
                    },
                    {
                      icon: (
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
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                          />
                        </svg>
                      ),
                      title: "AI 개인화 추천",
                      desc: "사용자의 시청 이력과 평점 데이터를 분석하여 취향에 맞는 영화를 추천합니다. 사용할수록 더 정확한 추천이 가능합니다.",
                      example: "user_id 기반 개인화된 추천 결과 제공",
                    },
                    {
                      icon: (
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
                            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                          />
                        </svg>
                      ),
                      title: "장르 필터링",
                      desc: "원하는 장르만 선택하여 추천받을 수 있습니다. 복수 장르 선택 시 해당 장르들이 포함된 영화를 우선 추천합니다.",
                      example: '{ "genres": ["액션", "SF"] }',
                    },
                    {
                      icon: (
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
                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      ),
                      title: "OTT 필터링",
                      desc: "구독 중인 OTT 플랫폼을 지정하면 해당 플랫폼에서 바로 시청 가능한 영화만 추천합니다. Netflix, 티빙, Watcha, Disney+ 등을 지원합니다.",
                      example: '{ "ott_providers": ["netflix", "tving"] }',
                    },
                    {
                      icon: (
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
                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                          />
                        </svg>
                      ),
                      title: "성인 콘텐츠 제외",
                      desc: "성인 등급 영화를 제외하고 추천받을 수 있습니다. 가족 친화적인 서비스 구현에 활용할 수 있습니다.",
                      example: '{ "exclude_adult": true }',
                    },
                  ].map((feature, i) => (
                    <div
                      key={i}
                      className="border border-gray-200 rounded-xl p-6"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0">
                          {feature.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {feature.title}
                          </h3>
                          <p className="text-gray-600 mb-3">{feature.desc}</p>
                          <code className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg inline-block">
                            {feature.example}
                          </code>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <BottomNavigation activeSection={activeSection} setActiveSection={setActiveSection} navigation={navigation} />
              </div>
            )}

            {/* 시작하기 */}
            {activeSection === 'getting-started' && (
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-6">
                  시작하기
                </h1>
                <p className="text-lg text-gray-600 mb-8">
                  무비서 API를 연동하는 방법을 단계별로 안내합니다.
                </p>

                {/* Step by Step */}
                <div className="space-y-8 mb-12">
                  {[
                    {
                      step: 1,
                      title: "회원가입 및 로그인",
                      desc: "콘솔에서 회원가입 후 로그인합니다.",
                      action: { label: "콘솔 바로가기", link: "https://console.moviesir.cloud/login" },
                    },
                    {
                      step: 2,
                      title: "API 키 발급",
                      desc: "콘솔의 API 키 메뉴에서 새 API 키를 발급받습니다. 발급된 키는 안전하게 보관하세요.",
                      code: "sk-moviesir-xxxxxxxxxxxxxxxxxxxx",
                    },
                    {
                      step: 3,
                      title: "API 호출 테스트",
                      desc: "발급받은 API 키로 추천 API를 호출해보세요.",
                      sdkCode: true,
                    },
                    {
                      step: 4,
                      title: "서비스에 연동",
                      desc: "테스트가 완료되면 실제 서비스에 API를 연동합니다. 자세한 연동 방법은 아래 API Reference를 참고하세요.",
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                          {item.step}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {item.title}
                        </h3>
                        <p className="text-gray-600 mb-3">{item.desc}</p>
                        {item.code && (
                          <code className="block bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm mb-3">
                            {item.code}
                          </code>
                        )}
                        {item.sdkCode && (
                          <div className="mb-3">
                            <SdkCodeTabs
                              curlCode={`curl -X POST https://api.moviesir.cloud/v1/recommend \\
  -H "X-API-Key: your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"runtime_limit": 180, "genres": ["액션"]}'`}
                              jsCode={`const response = await fetch('https://api.moviesir.cloud/v1/recommend', {
  method: 'POST',
  headers: {
    'X-API-Key': 'your_api_key',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    runtime_limit: 180,
    genres: ['액션'],
  }),
});

const data = await response.json();
console.log(data);`}
                              pythonCode={`import requests

response = requests.post(
    'https://api.moviesir.cloud/v1/recommend',
    headers={
        'X-API-Key': 'your_api_key',
        'Content-Type': 'application/json',
    },
    json={
        'runtime_limit': 180,
        'genres': ['액션'],
    }
)

data = response.json()
print(data)`}
                            />
                          </div>
                        )}
                        {item.action && (
                          <a
                            href={item.action.link}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-500 font-medium text-sm"
                          >
                            {item.action.label}
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
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Links */}
                <div className="grid md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setActiveSection('auth')}
                    className="flex items-center gap-4 p-5 border border-gray-200 rounded-xl hover:border-blue-200 hover:shadow-lg transition-all group text-left"
                  >
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
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
                          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">인증 방법</h4>
                      <p className="text-sm text-gray-500">
                        API 키 발급 및 사용법
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveSection('recommend')}
                    className="flex items-center gap-4 p-5 border border-gray-200 rounded-xl hover:border-blue-200 hover:shadow-lg transition-all group text-left"
                  >
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
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
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        /v1/recommend API
                      </h4>
                      <p className="text-sm text-gray-500">
                        추천 API 상세 문서
                      </p>
                    </div>
                  </button>
                </div>
                <BottomNavigation activeSection={activeSection} setActiveSection={setActiveSection} navigation={navigation} />
              </div>
            )}

            {/* Auth Section */}
            {activeSection === 'auth' && (
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">인증</h1>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  모든 API 요청에는 API 키가 필요합니다. API 키는 콘솔에서 발급받을 수 있습니다.
                </p>

                <div className="space-y-8">
                  {/* API Key Header */}
                  <div id="auth-header">
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">API Key 헤더</h2>
                    <p className="text-gray-600 mb-4">
                      모든 요청의 헤더에 <code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm">X-API-Key</code>를 포함해야 합니다.
                    </p>
                    <div className="bg-gray-900 rounded-xl overflow-hidden relative">
                      <pre className="p-4 font-mono text-sm text-gray-300 pr-12">
                        <code>
                          <span className="text-gray-500">X-API-Key:</span> <span className="text-sky-300">sk-moviesir-xxxxxxxxxxxxxxxx</span>
                        </code>
                      </pre>
                      <CopyButton text="X-API-Key: sk-moviesir-xxxxxxxxxxxxxxxx" />
                    </div>
                  </div>

                  {/* Key Format */}
                  <div id="auth-format">
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">API Key 형식</h2>
                    <table className="w-full">
                      <tbody className="divide-y divide-gray-200">
                        <tr>
                          <td className="py-3 text-sm font-medium text-gray-900 w-32">접두사</td>
                          <td className="py-3 text-sm text-gray-600">
                            <code className="px-2 py-0.5 bg-gray-100 rounded">sk-moviesir-</code>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 text-sm font-medium text-gray-900">길이</td>
                          <td className="py-3 text-sm text-gray-600">총 64자</td>
                        </tr>
                        <tr>
                          <td className="py-3 text-sm font-medium text-gray-900">예시</td>
                          <td className="py-3 text-sm text-gray-600">
                            <code className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                              sk-moviesir-a1b2c3d4e5f6...
                            </code>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Security */}
                  <div id="auth-security" className="p-5 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="flex gap-3">
                      <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className="font-medium text-amber-800">보안 주의사항</p>
                        <ul className="text-sm text-amber-700 mt-2 space-y-1">
                          <li>- API 키를 클라이언트 코드에 직접 노출하지 마세요</li>
                          <li>- 서버 사이드에서만 API를 호출하세요</li>
                          <li>- API 키가 유출된 경우 즉시 콘솔에서 비활성화하세요</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Steps */}
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">API 키 발급 방법</h2>
                    <div className="space-y-4">
                      {[
                        { step: 1, title: '콘솔 로그인', desc: '콘솔에서 계정으로 로그인합니다.' },
                        { step: 2, title: 'API Keys 메뉴', desc: '좌측 메뉴에서 API Keys를 클릭합니다.' },
                        { step: 3, title: '키 발급', desc: '키 이름을 입력하고 "발급" 버튼을 클릭합니다.' },
                        { step: 4, title: '키 복사', desc: '발급된 키를 안전한 곳에 저장합니다. 키는 발급 시에만 확인 가능합니다.' },
                      ].map((item) => (
                        <div key={item.step} className="flex gap-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                            {item.step}
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{item.title}</h3>
                            <p className="text-sm text-gray-600">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <BottomNavigation activeSection={activeSection} setActiveSection={setActiveSection} navigation={navigation} />
              </div>
            )}

            {/* Recommend Endpoint Section */}
            {activeSection === 'recommend' && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold">
                    POST
                  </span>
                  <h1 className="text-3xl font-bold text-gray-900">/v1/recommend</h1>
                </div>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  사용자의 선호도와 가용 시간을 기반으로 최적의 영화 조합을 추천합니다.
                </p>

                <div className="space-y-8">
                  {/* Endpoint */}
                  <div id="recommend-endpoint">
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">Endpoint</h2>
                    <div className="bg-gray-900 rounded-xl p-4 relative">
                      <code className="text-sm">
                        <span className="text-emerald-400">POST</span>
                        <span className="text-gray-300"> https://api.moviesir.cloud</span>
                        <span className="text-amber-300">/v1/recommend</span>
                      </code>
                      <CopyButton text="POST https://api.moviesir.cloud/v1/recommend" />
                    </div>
                    <Link
                      to="/playground"
                      className="inline-flex items-center gap-1.5 mt-3 text-sm text-blue-600 hover:text-blue-500 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Playground에서 테스트하기
                    </Link>
                  </div>

                  {/* Request Parameters */}
                  <div id="recommend-params">
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">Request Parameters</h2>
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">파라미터</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">타입</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">필수</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">설명</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          <tr>
                            <td className="px-4 py-3">
                              <code className="text-sm text-blue-600">runtime_limit</code>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">integer</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">필수</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">총 가용 시간 (분 단위)</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3">
                              <code className="text-sm text-blue-600">genres</code>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">string[]</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">선택</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">선호 장르 배열 (예: ["액션", "SF"])</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3">
                              <code className="text-sm text-blue-600">exclude_adult</code>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">boolean</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">선택</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">성인 콘텐츠 제외 여부 (기본값: true)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Available Genres */}
                  <div id="recommend-genres">
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">지원 장르</h2>
                    <div className="flex flex-wrap gap-2">
                      {['액션', 'SF', '드라마', '코미디', '로맨스', '스릴러', '공포', '애니메이션', '범죄', '모험', '판타지', '가족', '미스터리', '전쟁', '역사', '음악', '다큐멘터리', '서부'].map((genre) => (
                        <span
                          key={genre}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Request / Response Example */}
                  <div id="recommend-example">
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">예시</h2>
                    <div className="bg-gray-900 rounded-xl overflow-hidden relative">
                      <div className="flex border-b border-gray-800">
                        <button
                          onClick={() => setActiveTab('request')}
                          className={`px-5 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'request'
                              ? 'text-white border-b-2 border-blue-400'
                              : 'text-gray-400 hover:text-gray-300'
                          }`}
                        >
                          Request
                        </button>
                        <button
                          onClick={() => setActiveTab('response')}
                          className={`px-5 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'response'
                              ? 'text-white border-b-2 border-blue-400'
                              : 'text-gray-400 hover:text-gray-300'
                          }`}
                        >
                          Response
                        </button>
                      </div>
                      <div className="p-5 font-mono text-sm">
                        {activeTab === 'request' ? (
                          <pre className="text-gray-300 leading-relaxed overflow-x-auto">
                            <code>
                              <span className="text-emerald-400">POST</span> /v1/recommend HTTP/1.1{'\n'}
                              <span className="text-gray-500">Host:</span> api.moviesir.cloud{'\n'}
                              <span className="text-gray-500">Content-Type:</span> application/json{'\n'}
                              <span className="text-gray-500">X-API-Key:</span> sk-moviesir-xxx...{'\n\n'}
                              <span className="text-gray-500">{'{'}</span>{'\n'}
                              {'  '}<span className="text-sky-300">"runtime_limit"</span>: <span className="text-amber-300">360</span>,{'\n'}
                              {'  '}<span className="text-sky-300">"genres"</span>: [<span className="text-emerald-300">"액션"</span>, <span className="text-emerald-300">"SF"</span>],{'\n'}
                              {'  '}<span className="text-sky-300">"exclude_adult"</span>: <span className="text-amber-300">true</span>{'\n'}
                              <span className="text-gray-500">{'}'}</span>
                            </code>
                          </pre>
                        ) : (
                          <pre className="text-gray-300 leading-relaxed overflow-x-auto">
                            <code>
                              <span className="text-gray-500">{'{'}</span>{'\n'}
                              {'  '}<span className="text-sky-300">"success"</span>: <span className="text-amber-300">true</span>,{'\n'}
                              {'  '}<span className="text-sky-300">"data"</span>: <span className="text-gray-500">{'{'}</span>{'\n'}
                              {'    '}<span className="text-sky-300">"track_a"</span>: <span className="text-gray-500">{'{'}</span>{'\n'}
                              {'      '}<span className="text-sky-300">"movies"</span>: [{'\n'}
                              {'        '}{'{'}{'\n'}
                              {'          '}<span className="text-sky-300">"id"</span>: <span className="text-amber-300">550</span>,{'\n'}
                              {'          '}<span className="text-sky-300">"title"</span>: <span className="text-emerald-300">"파이트 클럽"</span>,{'\n'}
                              {'          '}<span className="text-sky-300">"poster_url"</span>: <span className="text-emerald-300">"https://..."</span>,{'\n'}
                              {'          '}<span className="text-sky-300">"runtime"</span>: <span className="text-amber-300">139</span>,{'\n'}
                              {'          '}<span className="text-sky-300">"genres"</span>: [<span className="text-emerald-300">"드라마"</span>],{'\n'}
                              {'          '}<span className="text-sky-300">"score"</span>: <span className="text-amber-300">0.95</span>{'\n'}
                              {'        '}{'}'},{'\n'}
                              {'        '}{'{'}{'\n'}
                              {'          '}<span className="text-sky-300">"id"</span>: <span className="text-amber-300">27205</span>,{'\n'}
                              {'          '}<span className="text-sky-300">"title"</span>: <span className="text-emerald-300">"인셉션"</span>,{'\n'}
                              {'          '}<span className="text-sky-300">"runtime"</span>: <span className="text-amber-300">148</span>,{'\n'}
                              {'          '}<span className="text-sky-300">"score"</span>: <span className="text-amber-300">0.92</span>{'\n'}
                              {'        '}{'}'}{'\n'}
                              {'      '}],{'\n'}
                              {'      '}<span className="text-sky-300">"total_runtime"</span>: <span className="text-amber-300">287</span>{'\n'}
                              {'    '}<span className="text-gray-500">{'}'}</span>,{'\n'}
                              {'    '}<span className="text-sky-300">"track_b"</span>: <span className="text-gray-500">{'{ ... }'}</span>{'\n'}
                              {'  '}<span className="text-gray-500">{'}'}</span>{'\n'}
                              <span className="text-gray-500">{'}'}</span>
                            </code>
                          </pre>
                        )}
                      </div>
                      <CopyButton text={activeTab === 'request'
                        ? `POST /v1/recommend HTTP/1.1
Host: api.moviesir.cloud
Content-Type: application/json
X-API-Key: sk-moviesir-xxx...

{
  "runtime_limit": 360,
  "genres": ["액션", "SF"],
  "exclude_adult": true
}`
                        : `{
  "success": true,
  "data": {
    "track_a": {
      "movies": [
        {
          "id": 550,
          "title": "파이트 클럽",
          "poster_url": "https://...",
          "runtime": 139,
          "genres": ["드라마"],
          "score": 0.95
        },
        {
          "id": 27205,
          "title": "인셉션",
          "runtime": 148,
          "score": 0.92
        }
      ],
      "total_runtime": 287
    },
    "track_b": { ... }
  }
}`} />
                    </div>
                  </div>

                  {/* Response Fields */}
                  <div id="recommend-response">
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">Response Fields</h2>
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">필드</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">타입</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">설명</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          <tr>
                            <td className="px-4 py-3">
                              <code className="text-sm text-blue-600">success</code>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">boolean</td>
                            <td className="px-4 py-3 text-sm text-gray-600">요청 성공 여부</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3">
                              <code className="text-sm text-blue-600">data.track_a</code>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">object</td>
                            <td className="px-4 py-3 text-sm text-gray-600">선호 장르 기반 추천 결과</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3">
                              <code className="text-sm text-blue-600">data.track_b</code>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">object</td>
                            <td className="px-4 py-3 text-sm text-gray-600">장르 확장 다양성 추천 결과</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3">
                              <code className="text-sm text-blue-600">movies[].id</code>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">integer</td>
                            <td className="px-4 py-3 text-sm text-gray-600">영화 ID (TMDB 기준)</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3">
                              <code className="text-sm text-blue-600">movies[].title</code>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">string</td>
                            <td className="px-4 py-3 text-sm text-gray-600">영화 제목</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3">
                              <code className="text-sm text-blue-600">movies[].score</code>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">number</td>
                            <td className="px-4 py-3 text-sm text-gray-600">추천 점수 (0~1)</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3">
                              <code className="text-sm text-blue-600">total_runtime</code>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">integer</td>
                            <td className="px-4 py-3 text-sm text-gray-600">추천된 영화들의 총 러닝타임 (분)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <BottomNavigation activeSection={activeSection} setActiveSection={setActiveSection} navigation={navigation} />
              </div>
            )}

            {/* Error Codes Section */}
            {activeSection === 'errors' && (
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">에러 코드</h1>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  API 응답에서 발생할 수 있는 에러 코드와 대응 방법입니다.
                </p>

                <div className="space-y-8">
                  {/* Error Table */}
                  <div id="errors-table" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">상태</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">코드</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">설명</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">해결 방법</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {[
                          { status: '400', code: 'INVALID_REQUEST', desc: '잘못된 요청', solution: '요청 파라미터를 확인하세요', color: 'amber' },
                          { status: '401', code: 'INVALID_API_KEY', desc: '유효하지 않은 API 키', solution: '올바른 API 키를 사용하세요', color: 'red' },
                          { status: '401', code: 'MISSING_API_KEY', desc: 'API 키 누락', solution: 'X-API-Key 헤더를 추가하세요', color: 'red' },
                          { status: '403', code: 'FORBIDDEN', desc: '접근 권한 없음', solution: 'API 키 권한을 확인하세요', color: 'red' },
                          { status: '429', code: 'RATE_LIMIT_EXCEEDED', desc: '호출 한도 초과', solution: '플랜 업그레이드 또는 내일 재시도', color: 'orange' },
                          { status: '500', code: 'INTERNAL_ERROR', desc: '서버 내부 오류', solution: '잠시 후 다시 시도하세요', color: 'gray' },
                          { status: '503', code: 'SERVICE_UNAVAILABLE', desc: '서비스 일시 중단', solution: '서비스 상태를 확인하세요', color: 'gray' },
                        ].map((error, i) => (
                          <tr key={i}>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                                error.color === 'red' ? 'bg-red-100 text-red-700' :
                                error.color === 'amber' ? 'bg-amber-100 text-amber-700' :
                                error.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {error.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <code className="text-sm font-mono text-gray-900">{error.code}</code>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{error.desc}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{error.solution}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Error Response Example */}
                  <div id="errors-format">
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">에러 응답 형식</h2>
                    <div className="bg-gray-900 rounded-xl overflow-hidden relative">
                      <div className="px-4 py-2 border-b border-gray-800 flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs font-medium">401</span>
                        <span className="text-sm text-gray-400">Unauthorized</span>
                      </div>
                      <pre className="p-4 font-mono text-sm text-gray-300 leading-relaxed overflow-x-auto">
                        <code>
                          <span className="text-gray-500">{'{'}</span>{'\n'}
                          {'  '}<span className="text-sky-300">"success"</span>: <span className="text-red-400">false</span>,{'\n'}
                          {'  '}<span className="text-sky-300">"error"</span>: <span className="text-gray-500">{'{'}</span>{'\n'}
                          {'    '}<span className="text-sky-300">"code"</span>: <span className="text-amber-300">"INVALID_API_KEY"</span>,{'\n'}
                          {'    '}<span className="text-sky-300">"message"</span>: <span className="text-amber-300">"유효하지 않은 API 키입니다"</span>{'\n'}
                          {'  '}<span className="text-gray-500">{'}'}</span>{'\n'}
                          <span className="text-gray-500">{'}'}</span>
                        </code>
                      </pre>
                      <CopyButton text={`{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "유효하지 않은 API 키입니다"
  }
}`} />
                    </div>
                  </div>
                </div>
                <BottomNavigation activeSection={activeSection} setActiveSection={setActiveSection} navigation={navigation} />
              </div>
            )}

            {/* Rate Limit Section */}
            {activeSection === 'rate-limit' && (
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">Rate Limit</h1>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  API 호출 한도는 플랜에 따라 다르며, 일일 기준으로 초기화됩니다.
                </p>

                <div className="space-y-8">
                  {/* Plan Limits */}
                  <div id="rate-plans">
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">플랜별 호출 한도</h2>
                    <div className="grid md:grid-cols-4 gap-4">
                      {[
                        { plan: 'FREE', limit: '1,000', desc: '테스트 및 개발용' },
                        { plan: 'BASIC', limit: '10,000', desc: '소규모 서비스' },
                        { plan: 'PRO', limit: '100,000', desc: '대규모 서비스' },
                        { plan: 'ENTERPRISE', limit: '무제한', desc: '엔터프라이즈' },
                      ].map((item) => (
                        <div key={item.plan} className="p-6 bg-gray-50 rounded-xl border border-gray-200 text-center">
                          <span className="text-sm font-medium text-blue-600">{item.plan}</span>
                          <div className="text-3xl font-bold text-gray-900 mt-2">{item.limit}</div>
                          <div className="text-sm text-gray-500 mt-1">calls/day</div>
                          <p className="text-xs text-gray-400 mt-3">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rate Limit Headers */}
                  <div id="rate-headers">
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">응답 헤더</h2>
                    <p className="text-gray-600 mb-4">모든 API 응답에는 Rate Limit 관련 헤더가 포함됩니다.</p>
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">헤더</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">설명</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          <tr>
                            <td className="px-4 py-3">
                              <code className="text-sm text-blue-600">X-RateLimit-Limit</code>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">일일 최대 호출 횟수</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3">
                              <code className="text-sm text-blue-600">X-RateLimit-Remaining</code>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">남은 호출 횟수</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3">
                              <code className="text-sm text-blue-600">X-RateLimit-Reset</code>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">한도 초기화 시간 (Unix timestamp)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Rate Limit Error */}
                  <div id="rate-exceeded">
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">한도 초과 시</h2>
                    <div className="bg-gray-900 rounded-xl overflow-hidden relative">
                      <div className="px-4 py-2 border-b border-gray-800 flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs font-medium">429</span>
                        <span className="text-sm text-gray-400">Too Many Requests</span>
                      </div>
                      <pre className="p-4 font-mono text-sm text-gray-300 leading-relaxed overflow-x-auto">
                        <code>
                          <span className="text-gray-500">{'{'}</span>{'\n'}
                          {'  '}<span className="text-sky-300">"success"</span>: <span className="text-red-400">false</span>,{'\n'}
                          {'  '}<span className="text-sky-300">"error"</span>: <span className="text-gray-500">{'{'}</span>{'\n'}
                          {'    '}<span className="text-sky-300">"code"</span>: <span className="text-amber-300">"RATE_LIMIT_EXCEEDED"</span>,{'\n'}
                          {'    '}<span className="text-sky-300">"message"</span>: <span className="text-amber-300">"일일 호출 한도를 초과했습니다"</span>,{'\n'}
                          {'    '}<span className="text-sky-300">"limit"</span>: <span className="text-amber-300">1000</span>,{'\n'}
                          {'    '}<span className="text-sky-300">"reset_at"</span>: <span className="text-amber-300">"2025-01-08T00:00:00Z"</span>{'\n'}
                          {'  '}<span className="text-gray-500">{'}'}</span>{'\n'}
                          <span className="text-gray-500">{'}'}</span>
                        </code>
                      </pre>
                      <CopyButton text={`{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "일일 호출 한도를 초과했습니다",
    "limit": 1000,
    "reset_at": "2025-01-08T00:00:00Z"
  }
}`} />
                    </div>
                  </div>

                  {/* Best Practices */}
                  <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl">
                    <h3 className="font-medium text-blue-800 mb-2">Rate Limit 관리 팁</h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>- 응답 캐싱을 통해 불필요한 호출을 줄이세요</li>
                      <li>- X-RateLimit-Remaining 헤더를 모니터링하세요</li>
                      <li>- 한도 초과 시 지수 백오프(exponential backoff)를 적용하세요</li>
                      <li>- 필요한 경우 플랜 업그레이드를 검토하세요</li>
                    </ul>
                  </div>
                </div>
                <BottomNavigation activeSection={activeSection} setActiveSection={setActiveSection} navigation={navigation} />
              </div>
            )}

            {/* /v1/recommend_single Section */}
            {activeSection === 'recommend-single' && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold">
                    POST
                  </span>
                  <h1 className="text-3xl font-bold text-gray-900">/v1/recommend_single</h1>
                </div>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  단일 영화를 새로 추천받을 때 사용합니다. 기존 추천 결과에서 마음에 들지 않는 영화를 교체할 수 있습니다.
                </p>

                <div className="space-y-8">
                  {/* Endpoint */}
                  <div id="single-endpoint">
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">Endpoint</h2>
                    <div className="bg-gray-900 rounded-xl p-4 relative">
                      <code className="text-sm">
                        <span className="text-emerald-400">POST</span>
                        <span className="text-gray-300"> https://api.moviesir.cloud</span>
                        <span className="text-amber-300">/v1/recommend_single</span>
                      </code>
                      <CopyButton text="POST https://api.moviesir.cloud/v1/recommend_single" />
                    </div>
                    <Link
                      to="/playground"
                      className="inline-flex items-center gap-1.5 mt-3 text-sm text-blue-600 hover:text-blue-500 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Playground에서 테스트하기
                    </Link>
                  </div>

                  {/* Request Parameters */}
                  <div id="single-params">
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">Request Parameters</h2>
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">파라미터</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">타입</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">필수</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">설명</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          <tr>
                            <td className="px-4 py-3">
                              <code className="text-sm text-blue-600">runtime_limit</code>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">integer</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">필수</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">총 가용 시간 (분 단위)</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3">
                              <code className="text-sm text-blue-600">genres</code>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">string[]</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">선택</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">선호 장르 배열</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3">
                              <code className="text-sm text-blue-600">excluded_ids</code>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">integer[]</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">선택</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">제외할 영화 ID 목록</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3">
                              <code className="text-sm text-blue-600">track</code>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">string</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">선택</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">"A" (장르 중심) 또는 "B" (다양성)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Example */}
                  <div id="single-example">
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">예시</h2>
                    <CodeBlock
                      language="bash"
                      code={`curl -X POST https://api.moviesir.cloud/v1/recommend_single \\
  -H "X-API-Key: sk-moviesir-xxx..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "runtime_limit": 360,
    "genres": ["액션"],
    "excluded_ids": [550, 27205],
    "track": "A"
  }'`}
                    />
                  </div>

                  {/* Response */}
                  <div id="single-response">
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">Response</h2>
                    <CodeBlock
                      language="json"
                      code={`{
  "success": true,
  "data": {
    "movie": {
      "id": 157336,
      "title": "인터스텔라",
      "poster_url": "https://image.tmdb.org/t/p/w500/...",
      "runtime": 169,
      "genres": ["SF", "모험", "드라마"],
      "score": 0.94
    }
  }
}`}
                    />
                  </div>

                  {/* Response Fields */}
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">Response Fields</h2>
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">필드</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">타입</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">설명</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          <tr>
                            <td className="px-4 py-3">
                              <code className="text-sm text-blue-600">success</code>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">boolean</td>
                            <td className="px-4 py-3 text-sm text-gray-600">요청 성공 여부</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3">
                              <code className="text-sm text-blue-600">data.movie</code>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">object</td>
                            <td className="px-4 py-3 text-sm text-gray-600">새로 추천된 단일 영화 정보</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3">
                              <code className="text-sm text-blue-600">movie.id</code>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">integer</td>
                            <td className="px-4 py-3 text-sm text-gray-600">영화 ID (TMDB 기준)</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3">
                              <code className="text-sm text-blue-600">movie.score</code>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">number</td>
                            <td className="px-4 py-3 text-sm text-gray-600">추천 점수 (0~1)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <BottomNavigation activeSection={activeSection} setActiveSection={setActiveSection} navigation={navigation} />
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar - On This Page */}
        {currentToc.length > 0 && (
          <aside className="fixed right-0 top-16 w-56 h-[calc(100vh-64px)] border-l border-gray-200 overflow-y-auto hidden lg:block">
            <nav className="p-4">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                On this page
              </span>
              <ul className="mt-3 space-y-2">
                {currentToc.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="text-sm text-gray-600 hover:text-blue-600 transition-colors block py-1"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        )}
      </div>
    </div>
  )
}
