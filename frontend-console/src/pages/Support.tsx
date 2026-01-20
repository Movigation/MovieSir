import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, MessageSquare, Clock, ArrowLeft, Send, CheckCircle } from 'lucide-react'

export default function Support() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    subject: '',
    message: ''
  })
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // mailto 링크로 이메일 클라이언트 열기
    const mailtoLink = `mailto:support@moviesir.cloud?subject=${encodeURIComponent(`[문의] ${formData.subject}`)}&body=${encodeURIComponent(
      `이름: ${formData.name}\n이메일: ${formData.email}\n회사: ${formData.company}\n\n${formData.message}`
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

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="text-white font-semibold">MovieSir</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link to="/docs" className="text-sm text-gray-400 hover:text-white transition-colors">
              API 문서
            </Link>
            <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
              로그인
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 transition-colors"
            >
              시작하기
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Back Button */}
        <Link
          to="/docs"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          문서로 돌아가기
        </Link>

        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">문의하기</h1>
          <p className="text-gray-400 text-lg">
            MovieSir API에 관한 질문이나 기술 지원이 필요하시면 언제든지 연락주세요.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Info Cards */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-[#16161d] rounded-xl p-6 border border-white/5">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">이메일</h3>
              <p className="text-gray-400 text-sm mb-3">기술 문의 및 일반 문의</p>
              <a
                href="mailto:support@moviesir.cloud"
                className="text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium"
              >
                support@moviesir.cloud
              </a>
            </div>

            <div className="bg-[#16161d] rounded-xl p-6 border border-white/5">
              <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">문의 유형</h3>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>- API 기술 지원</li>
                <li>- 요금제 및 결제 문의</li>
                <li>- 엔터프라이즈 도입 상담</li>
                <li>- 기타 문의</li>
              </ul>
            </div>

            <div className="bg-[#16161d] rounded-xl p-6 border border-white/5">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">응답 시간</h3>
              <p className="text-gray-400 text-sm">
                영업일 기준 24시간 이내 답변 드립니다.
              </p>
              <p className="text-gray-500 text-xs mt-2">
                운영시간: 평일 09:00 - 18:00 (KST)
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-[#16161d] rounded-xl p-8 border border-white/5">
              {isSubmitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">이메일 클라이언트가 열렸습니다</h3>
                  <p className="text-gray-400 mb-6">
                    이메일 앱에서 메시지를 확인하고 전송해주세요.
                  </p>
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
                  >
                    다시 작성하기
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        이름 <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-[#0a0a0f] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="홍길동"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        이메일 <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-[#0a0a0f] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="example@company.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      회사명
                    </label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-[#0a0a0f] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="회사명 (선택사항)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      문의 유형 <span className="text-red-400">*</span>
                    </label>
                    <select
                      name="subject"
                      required
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-[#0a0a0f] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="">문의 유형을 선택해주세요</option>
                      <option value="기술 지원">API 기술 지원</option>
                      <option value="요금제 문의">요금제 및 결제 문의</option>
                      <option value="엔터프라이즈 도입">엔터프라이즈 도입 상담</option>
                      <option value="버그 리포트">버그 리포트</option>
                      <option value="기능 제안">기능 제안</option>
                      <option value="기타">기타 문의</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      메시지 <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      name="message"
                      required
                      rows={6}
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-[#0a0a0f] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                      placeholder="문의 내용을 상세히 작성해주세요."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    문의 보내기
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="mt-12 flex flex-col md:flex-row items-center justify-center gap-8">
          <div className="text-center">
            <p className="text-gray-400 mb-2 text-sm">엔터프라이즈 도입을 검토하고 계신가요?</p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors font-medium"
            >
              도입 문의하기
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </Link>
          </div>
          <div className="text-center">
            <p className="text-gray-400 mb-2 text-sm">자주 묻는 질문을 먼저 확인해보세요</p>
            <Link
              to="/docs?section=faq"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors font-medium"
            >
              FAQ 보러가기
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-20">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              © 2025 Team Movigation. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link to="/docs" className="text-gray-400 hover:text-white text-sm transition-colors">
                API 문서
              </Link>
              <a
                href="mailto:support@moviesir.cloud"
                className="text-gray-400 hover:text-white text-sm transition-colors"
              >
                support@moviesir.cloud
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
