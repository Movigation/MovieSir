import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/api'

export default function Settings() {
  const { company } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: '',
  })

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordForm.new !== passwordForm.confirm) {
      setMessage({ type: 'error', text: '비밀번호가 일치하지 않습니다' })
      return
    }

    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      await api.post('/b2b/auth/change-password', {
        current_password: passwordForm.current,
        new_password: passwordForm.new,
      })
      setMessage({ type: 'success', text: '비밀번호가 변경되었습니다' })
      setPasswordForm({ current: '', new: '', confirm: '' })
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || '비밀번호 변경에 실패했습니다',
      })
    } finally {
      setLoading(false)
    }
  }

  const plans = [
    { name: 'FREE', limit: '1,000', price: '무료', features: ['기본 API 접근', '일일 1,000회 호출', '커뮤니티 지원'] },
    { name: 'BASIC', limit: '10,000', price: '₩99,000/월', features: ['모든 API 접근', '일일 10,000회 호출', '이메일 지원', '우선 처리'] },
    { name: 'PRO', limit: '100,000', price: '₩499,000/월', features: ['모든 API 접근', '일일 100,000회 호출', '전담 지원', 'SLA 보장', '커스텀 모델'] },
  ]

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">계정 및 구독 정보를 관리하세요</p>
      </div>

      {/* Company Info */}
      <div className="bg-[#16161d] rounded-xl p-5 mb-6">
        <h2 className="text-sm font-medium text-white mb-4">기업 정보</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-gray-500 mb-1">기업명</p>
            <p className="text-sm font-medium text-white">{company?.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">이메일</p>
            <p className="text-sm font-medium text-white">{company?.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">현재 플랜</p>
            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
              company?.plan === 'PRO'
                ? 'bg-blue-500/10 text-blue-400'
                : company?.plan === 'BASIC'
                ? 'bg-cyan-500/10 text-cyan-400'
                : 'bg-gray-500/10 text-gray-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                company?.plan === 'PRO'
                  ? 'bg-blue-400'
                  : company?.plan === 'BASIC'
                  ? 'bg-cyan-400'
                  : 'bg-gray-400'
              }`} />
              {company?.plan}
            </span>
          </div>
        </div>
      </div>

      {/* Plan Upgrade */}
      <div className="bg-[#16161d] rounded-xl p-5 mb-6">
        <h2 className="text-sm font-medium text-white mb-4">구독 플랜</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`p-4 rounded-xl transition-all ${
                company?.plan === plan.name
                  ? 'bg-blue-500/10 ring-1 ring-blue-500/50'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-white">{plan.name}</h3>
                {company?.plan === plan.name && (
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                    현재
                  </span>
                )}
              </div>
              <p className="text-xl font-semibold text-white mb-1">{plan.price}</p>
              <p className="text-xs text-gray-500 mb-4">일일 {plan.limit}회 호출</p>
              <ul className="space-y-2 mb-4">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-gray-400">
                    <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              {company?.plan !== plan.name && (
                <button className="w-full py-2 bg-white/5 text-gray-400 rounded-lg text-xs font-medium hover:bg-white/10 hover:text-white transition-colors">
                  {plan.name === 'FREE' ? '다운그레이드' : '업그레이드'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-[#16161d] rounded-xl p-5">
        <h2 className="text-sm font-medium text-white mb-4">비밀번호 변경</h2>

        {message.text && (
          <div
            className={`p-3 rounded-lg mb-4 text-xs flex items-center gap-2 ${
              message.type === 'error'
                ? 'bg-red-500/10 text-red-400'
                : 'bg-green-500/10 text-green-400'
            }`}
          >
            {message.type === 'error' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {message.text}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs text-gray-500 mb-2">현재 비밀번호</label>
            <input
              type="password"
              value={passwordForm.current}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, current: e.target.value })
              }
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-2">새 비밀번호</label>
            <input
              type="password"
              value={passwordForm.new}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, new: e.target.value })
              }
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-2">새 비밀번호 확인</label>
            <input
              type="password"
              value={passwordForm.confirm}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, confirm: e.target.value })
              }
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                변경 중...
              </span>
            ) : (
              '비밀번호 변경'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
