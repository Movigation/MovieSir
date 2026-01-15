import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await api.post('/b2b/auth/forgot-password', { email })
      setSent(true)
    } catch (err: any) {
      const message = err.response?.data?.detail || '요청 처리 중 오류가 발생했습니다'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 relative overflow-hidden flex flex-col">
      {/* Blue Glow Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -left-32 w-[400px] h-[400px] bg-blue-600/15 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 -right-32 w-[350px] h-[350px] bg-blue-400/10 rounded-full blur-[90px]" />
      </div>

      {/* Main Content */}
      <main className="relative flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          {/* Logo */}
          <Link to="/login" className="flex items-center justify-center gap-2 mb-10">
            <img src="/favicon.svg" alt="무비서" className="w-12 h-12" />
            <span className="text-2xl font-bold text-white">무비서</span>
            <span className="text-sm font-semibold text-blue-400 border border-blue-400/50 px-2 py-0.5 rounded">
              API
            </span>
          </Link>

          {/* Form Card - Glass Effect */}
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
            {/* Error Message */}
            {error && (
              <div className="bg-red-500/20 backdrop-blur-sm border-b border-red-500/30 px-6 py-3 text-sm text-red-300 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <div className="p-6">
              {sent ? (
                /* Success State */
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-2">이메일을 확인하세요</h2>
                  <p className="text-white/60 text-sm mb-6">
                    <span className="text-blue-400">{email}</span>으로<br />
                    임시 비밀번호를 발송했습니다.
                  </p>
                  <p className="text-white/40 text-xs mb-6">
                    이메일이 오지 않으면 스팸 폴더를 확인해 주세요.
                  </p>
                  <Link
                    to="/login"
                    className="inline-block w-full py-3.5 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-400 transition-colors text-center"
                  >
                    로그인 페이지로 이동
                  </Link>
                </div>
              ) : (
                /* Form State */
                <>
                  <h2 className="text-xl font-semibold text-white text-center mb-2">비밀번호 찾기</h2>
                  <p className="text-white/50 text-sm text-center mb-6">
                    가입한 이메일을 입력하시면<br />
                    임시 비밀번호를 보내드립니다.
                  </p>

                  <form onSubmit={handleSubmit}>
                    {/* Email Input */}
                    <div className="mb-5">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="이메일"
                        className="w-full px-4 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                        required
                        autoFocus
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-500/25"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          발송 중...
                        </span>
                      ) : (
                        '임시 비밀번호 받기'
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-white/50 hover:text-white/80 text-sm transition-colors inline-flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              로그인으로 돌아가기
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
