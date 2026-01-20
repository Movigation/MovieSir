import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/api'

export default function Settings() {
  const { company, setCompany } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // 회사 정보 수정
  const [editMode, setEditMode] = useState(false)
  const [companyForm, setCompanyForm] = useState({ name: '', email: '' })
  const [companyLoading, setCompanyLoading] = useState(false)
  const [companyMessage, setCompanyMessage] = useState({ type: '', text: '' })

  // API 키 개수
  const [apiKeyCount, setApiKeyCount] = useState(0)

  // 알림 설정 (로컬 상태)
  const [notifications, setNotifications] = useState({
    dailyLimitAlert: true,
    weeklyReport: false,
  })

  // 실시간으로 회사 정보 가져오기
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const { data } = await api.get('/b2b/me')
        setCompany(data)
        setCompanyForm({ name: data.name || '', email: data.email || '' })
      } catch (err) {
        console.error('Failed to fetch company:', err)
      }
    }
    fetchCompany()
  }, [setCompany])

  // API 키 개수 조회
  useEffect(() => {
    const fetchApiKeyCount = async () => {
      try {
        const { data } = await api.get('/b2b/api-keys')
        setApiKeyCount(data.length)
      } catch (err) {
        console.error('Failed to fetch API keys:', err)
      }
    }
    fetchApiKeyCount()
  }, [])

  const handleCompanyUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCompanyLoading(true)
    setCompanyMessage({ type: '', text: '' })

    try {
      const { data } = await api.patch('/b2b/me', {
        name: companyForm.name !== company?.name ? companyForm.name : undefined,
        email: companyForm.email !== company?.email ? companyForm.email : undefined,
      })
      setCompany(data.company)
      setCompanyMessage({ type: 'success', text: '회사 정보가 수정되었습니다' })
      setEditMode(false)
    } catch (err: any) {
      setCompanyMessage({
        type: 'error',
        text: err.response?.data?.detail || '회사 정보 수정에 실패했습니다',
      })
    } finally {
      setCompanyLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setCompanyForm({ name: company?.name || '', email: company?.email || '' })
    setCompanyMessage({ type: '', text: '' })
    setEditMode(false)
  }

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
    { name: 'FREE', limit: '1,000', features: ['기본 API 접근', '일일 1,000회 호출', '커뮤니티 지원'] },
    { name: 'BASIC', limit: '10,000', features: ['모든 API 접근', '일일 10,000회 호출', '이메일 지원', '우선 처리'] },
    { name: 'PRO', limit: '100,000', features: ['모든 API 접근', '일일 100,000회 호출', '전담 지원', 'SLA 보장', '커스텀 모델'] },
    { name: 'ENTERPRISE', limit: '무제한', features: ['무제한 API 호출', '전용 인프라', '24/7 전담 지원', 'SLA 99.9%', '맞춤형 모델 학습', '온프레미스 배포'] },
  ]

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">계정 및 구독 정보를 관리하세요</p>
      </div>

      {/* Account Settings - 2 Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Company Info */}
      <div className="bg-[#16161d] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-white">기업 정보</h2>
          {!editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              수정
            </button>
          )}
        </div>

        {companyMessage.text && (
          <div
            className={`p-3 rounded-lg mb-4 text-xs flex items-center gap-2 ${
              companyMessage.type === 'error'
                ? 'bg-red-500/10 text-red-400'
                : 'bg-green-500/10 text-green-400'
            }`}
          >
            {companyMessage.type === 'error' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {companyMessage.text}
          </div>
        )}

        {editMode ? (
          <form onSubmit={handleCompanyUpdate}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-gray-500 mb-2">기업명</label>
                <input
                  type="text"
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2">
                  이메일
                  {company?.oauth_provider && (
                    <span className="ml-2 text-gray-600">(소셜 로그인 사용자는 변경 불가)</span>
                  )}
                </label>
                <input
                  type="email"
                  value={companyForm.email}
                  onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!!company?.oauth_provider}
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={companyLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {companyLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                    저장 중...
                  </span>
                ) : (
                  '저장'
                )}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-white/5 text-gray-400 rounded-lg text-xs font-medium hover:bg-white/10 transition-colors"
              >
                취소
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">기업명</p>
              <p className="text-sm font-medium text-white">{company?.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">이메일</p>
              <p className="text-sm font-medium text-white">{company?.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">로그인 방식</p>
              <span className="inline-flex items-center gap-2 text-sm font-medium text-white">
                {company?.oauth_provider === 'google' ? (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google
                  </>
                ) : company?.oauth_provider === 'github' ? (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    GitHub
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    이메일
                  </>
                )}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">현재 플랜</p>
              <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
                company?.plan === 'ENTERPRISE'
                  ? 'bg-amber-500/10 text-amber-400'
                  : company?.plan === 'PRO'
                  ? 'bg-blue-500/10 text-blue-400'
                  : company?.plan === 'BASIC'
                  ? 'bg-cyan-500/10 text-cyan-400'
                  : 'bg-gray-500/10 text-gray-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  company?.plan === 'ENTERPRISE'
                    ? 'bg-amber-400'
                    : company?.plan === 'PRO'
                    ? 'bg-blue-400'
                    : company?.plan === 'BASIC'
                    ? 'bg-cyan-400'
                    : 'bg-gray-400'
                }`} />
                {company?.plan}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">가입일</p>
              <p className="text-sm font-medium text-white">
                {company?.created_at
                  ? new Date(company.created_at).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">API 키</p>
              <p className="text-sm font-medium text-white">{apiKeyCount}개</p>
            </div>
          </div>
        )}
      </div>

      {/* Notification Settings */}
      <div className="bg-[#16161d] rounded-xl p-5">
        <h2 className="text-sm font-medium text-white mb-4">알림 설정</h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm text-white">일일 한도 알림</p>
              <p className="text-xs text-gray-500">사용량이 80%에 도달하면 이메일로 알려드립니다</p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={notifications.dailyLimitAlert}
                onChange={(e) => setNotifications({ ...notifications, dailyLimitAlert: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-blue-500 peer-focus:ring-2 peer-focus:ring-blue-500 transition-colors"></div>
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform"></div>
            </div>
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm text-white">주간 사용량 리포트</p>
              <p className="text-xs text-gray-500">매주 월요일 API 사용량 요약을 받아보세요</p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={notifications.weeklyReport}
                onChange={(e) => setNotifications({ ...notifications, weeklyReport: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-blue-500 peer-focus:ring-2 peer-focus:ring-blue-500 transition-colors"></div>
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform"></div>
            </div>
          </label>
        </div>
        <p className="text-xs text-gray-600 mt-4">* 알림 설정은 현재 준비 중입니다</p>
          </div>
        </div>

        {/* Right Column - Change Password */}
        {!company?.oauth_provider && (
          <div className="bg-[#16161d] rounded-xl p-5 h-fit">
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

        <form onSubmit={handlePasswordChange} className="space-y-4">
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
      )}
      </div>

      {/* Plan Upgrade */}
      <div className="bg-[#16161d] rounded-xl p-5">
        <h2 className="text-sm font-medium text-white mb-4">구독 플랜</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`p-4 rounded-xl transition-all flex flex-col ${
                company?.plan === plan.name
                  ? plan.name === 'ENTERPRISE'
                    ? 'bg-amber-500/10 ring-1 ring-amber-500/50'
                    : 'bg-blue-500/10 ring-1 ring-blue-500/50'
                  : plan.name === 'ENTERPRISE'
                  ? 'bg-gradient-to-br from-amber-500/5 to-orange-500/5 hover:from-amber-500/10 hover:to-orange-500/10'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-medium ${plan.name === 'ENTERPRISE' ? 'text-amber-400' : 'text-white'}`}>{plan.name}</h3>
                {company?.plan === plan.name && (
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    plan.name === 'ENTERPRISE'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    현재
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400 mb-4">{plan.name === 'ENTERPRISE' ? '무제한 호출' : `일일 ${plan.limit}회 호출`}</p>
              <ul className="space-y-2 mb-4 flex-grow">
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
                plan.name === 'FREE' ? (
                  <button
                    className="block w-full py-2 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-400 transition-colors text-center"
                  >
                    무료로 시작
                  </button>
                ) : (
                  <a
                    href="mailto:support@moviesir.cloud?subject=요금제 문의"
                    className="block w-full py-2 bg-white/5 text-gray-400 rounded-lg text-xs font-medium hover:bg-white/10 hover:text-white transition-colors text-center"
                  >
                    도입 문의
                  </a>
                )
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
