import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Users, Zap, Shield, ArrowLeft, Send, CheckCircle } from 'lucide-react'

export default function Contact() {
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    position: '',
    email: '',
    phone: '',
    expectedUsage: '',
    currentSystem: '',
    message: ''
  })
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const mailtoLink = `mailto:support@moviesir.cloud?subject=${encodeURIComponent(`[도입 문의] ${formData.companyName}`)}&body=${encodeURIComponent(
      `회사명: ${formData.companyName}
담당자: ${formData.contactName} (${formData.position})
이메일: ${formData.email}
연락처: ${formData.phone}

예상 월 API 호출량: ${formData.expectedUsage}
현재 사용 중인 추천 시스템: ${formData.currentSystem || '없음'}

문의 내용:
${formData.message}`
    )}`
    window.location.href = mailtoLink
    setIsSubmitted(true)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const benefits = [
    {
      icon: Zap,
      title: '무제한 API 호출',
      desc: '트래픽 걱정 없이 서비스 운영'
    },
    {
      icon: Shield,
      title: 'SLA 99.9% 보장',
      desc: '안정적인 서비스 품질 보장'
    },
    {
      icon: Users,
      title: '전담 기술 지원',
      desc: '24/7 우선 기술 지원 제공'
    },
    {
      icon: Building2,
      title: '맞춤형 솔루션',
      desc: '비즈니스에 최적화된 추천 모델'
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/favicon.svg" alt="무비서" className="w-10 h-10" />
            <span className="text-xl font-semibold text-gray-900">무비서</span>
            <span className="text-xs font-semibold text-blue-600 border border-blue-200 bg-blue-50 px-1.5 py-0.5 rounded">
              API
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link to="/docs" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              API 문서
            </Link>
            <Link to="/support" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              일반 문의
            </Link>
            <a
              href="https://console.moviesir.cloud"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 transition-colors"
            >
              콘솔
            </a>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Back Button */}
        <Link
          to="/docs"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          문서로 돌아가기
        </Link>

        {/* Hero Section */}
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-600 text-sm font-medium rounded-full mb-4">
            Enterprise
          </span>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">도입 문의</h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            대규모 서비스를 위한 엔터프라이즈 플랜을 검토하고 계신가요?<br />
            비즈니스에 맞는 맞춤형 솔루션을 제안해 드립니다.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-4 gap-4 mb-12">
          {benefits.map((benefit, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-5 border border-gray-200 text-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <benefit.icon className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-gray-900 font-medium text-sm mb-1">{benefit.title}</h3>
              <p className="text-gray-500 text-xs">{benefit.desc}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Form */}
          <div className="lg:col-span-3">
            <div className="bg-gray-50 rounded-xl p-8 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">문의 정보 입력</h2>

              {isSubmitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">이메일 클라이언트가 열렸습니다</h3>
                  <p className="text-gray-600 mb-6">
                    이메일 앱에서 메시지를 확인하고 전송해주세요.<br />
                    영업일 기준 24시간 이내 담당자가 연락드립니다.
                  </p>
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="text-blue-600 hover:text-blue-500 transition-colors text-sm"
                  >
                    다시 작성하기
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Company Info */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      회사명 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="companyName"
                      required
                      value={formData.companyName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="주식회사 OOO"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        담당자명 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="contactName"
                        required
                        value={formData.contactName}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="홍길동"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        직책
                      </label>
                      <input
                        type="text"
                        name="position"
                        value={formData.position}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="개발팀장"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        이메일 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="contact@company.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        연락처
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="010-0000-0000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      예상 월 API 호출량 <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="expectedUsage"
                      required
                      value={formData.expectedUsage}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="">선택해주세요</option>
                      <option value="10만 이하">10만 이하</option>
                      <option value="10만 ~ 50만">10만 ~ 50만</option>
                      <option value="50만 ~ 100만">50만 ~ 100만</option>
                      <option value="100만 ~ 500만">100만 ~ 500만</option>
                      <option value="500만 이상">500만 이상</option>
                      <option value="미정">미정 (상담 필요)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      현재 사용 중인 추천 시스템
                    </label>
                    <input
                      type="text"
                      name="currentSystem"
                      value={formData.currentSystem}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="예: 자체 개발 / AWS Personalize / 없음"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      문의 내용 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="message"
                      required
                      rows={5}
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                      placeholder="도입 목적, 예상 일정, 기타 요청사항 등을 자유롭게 작성해주세요."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    도입 문의하기
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Side Info */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Process */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h3 className="text-gray-900 font-semibold mb-4">도입 프로세스</h3>
              <div className="space-y-4">
                {[
                  { step: 1, title: '문의 접수', desc: '담당자 배정 (1영업일)' },
                  { step: 2, title: '요구사항 분석', desc: '비즈니스 니즈 파악' },
                  { step: 3, title: '솔루션 제안', desc: '맞춤형 플랜 및 견적' },
                  { step: 4, title: '계약 및 온보딩', desc: '기술 지원 및 연동' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 text-xs font-bold">{item.step}</span>
                    </div>
                    <div>
                      <p className="text-gray-900 text-sm font-medium whitespace-nowrap">{item.title}</p>
                      <p className="text-gray-500 text-xs whitespace-nowrap">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Direct Contact */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h3 className="text-gray-900 font-semibold mb-3">직접 연락</h3>
              <p className="text-gray-600 text-sm mb-4 whitespace-nowrap">빠른 상담이 필요하시면 직접 연락주세요.</p>
              <a
                href="mailto:support@moviesir.cloud?subject=[도입 문의]"
                className="block text-center py-2.5 border border-blue-500 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
              >
                support@moviesir.cloud
              </a>
            </div>

            {/* FAQ */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 flex-1">
              <h3 className="text-gray-900 font-semibold mb-3">자주 묻는 질문</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-700 font-medium whitespace-nowrap">커스텀 모델 학습이 가능한가요?</p>
                  <p className="text-gray-500">네, 자체 데이터로 모델 학습이 가능합니다.</p>
                </div>
                <div>
                  <p className="text-gray-700 font-medium whitespace-nowrap">API 호출 한도를 늘릴 수 있나요?</p>
                  <p className="text-gray-500">엔터프라이즈 플랜은 무제한입니다.</p>
                </div>
                <div>
                  <p className="text-gray-700 font-medium whitespace-nowrap">데이터 보안은 어떻게 되나요?</p>
                  <p className="text-gray-500">암호화 저장 및 전송을 지원합니다.</p>
                </div>
                <div>
                  <p className="text-gray-700 font-medium whitespace-nowrap">도입 비용은 어떻게 책정되나요?</p>
                  <p className="text-gray-500">사용량 기반 맞춤 견적을 제공합니다.</p>
                </div>
              </div>
              <Link
                to="/docs?section=faq"
                className="inline-block mt-4 text-blue-600 hover:text-blue-500 text-sm"
              >
                전체 FAQ 보기 →
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-20">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              © 2025 Team Movigation. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link to="/support" className="text-gray-500 hover:text-gray-900 text-sm transition-colors">
                일반 문의
              </Link>
              <Link to="/docs" className="text-gray-500 hover:text-gray-900 text-sm transition-colors">
                API 문서
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
