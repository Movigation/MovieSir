import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '@/api'
import { useAuthStore } from '@/stores/authStore'

interface OAuthCallbackProps {
  provider: 'google' | 'github'
}

export default function OAuthCallback({ provider }: OAuthCallbackProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuthStore()
  const [error, setError] = useState('')

  useEffect(() => {
    const code = searchParams.get('code')
    const errorParam = searchParams.get('error')

    if (errorParam) {
      setError(`${provider} 로그인이 취소되었습니다.`)
      setTimeout(() => navigate('/login'), 2000)
      return
    }

    if (!code) {
      setError('인증 코드가 없습니다.')
      setTimeout(() => navigate('/login'), 2000)
      return
    }

    // 백엔드로 코드 전송
    const handleOAuth = async () => {
      try {
        // 현재 페이지 URL을 redirect_uri로 전송 (localhost vs production 자동 처리)
        const redirectUri = `${window.location.origin}/auth/${provider}/callback`
        const { data } = await api.post(`/b2b/auth/${provider}/callback`, {
          code,
          redirect_uri: redirectUri
        })
        login(data.company, data.access_token)
        // api.moviesir.cloud에서 OAuth 로그인 시 console.moviesir.cloud로 리다이렉트
        if (window.location.hostname === 'api.moviesir.cloud') {
          window.location.href = 'https://console.moviesir.cloud/dashboard'
        } else {
          navigate('/dashboard')
        }
      } catch (err: any) {
        const message = err.response?.data?.detail || `${provider} 로그인에 실패했습니다.`
        setError(message)
        setTimeout(() => navigate('/login'), 3000)
      }
    }

    handleOAuth()
  }, [searchParams, provider, login, navigate])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        {error ? (
          <>
            {/* 에러 챗봇 (빨간색 + X 눈) */}
            <div className="relative mb-10 flex justify-center">
              <div className="pointer-events-none absolute inset-0 rounded-full blur-3xl opacity-40 animate-pulse scale-125 bg-red-400" />
              <div className="relative w-40 h-40 rounded-full shadow-xl flex items-center justify-center bg-gradient-to-br from-red-400 via-red-500 to-orange-400">
                <div className="flex flex-col items-center gap-4">
                  {/* X 눈 */}
                  <div className="flex gap-7">
                    <div className="relative w-5 h-5">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-1 bg-gray-900 rotate-45" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-1 bg-gray-900 -rotate-45" />
                    </div>
                    <div className="relative w-5 h-5">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-1 bg-gray-900 rotate-45" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-1 bg-gray-900 -rotate-45" />
                    </div>
                  </div>
                  {/* 홍조 */}
                  <div className="flex gap-14">
                    <div className="w-8 h-2.5 bg-pink-400/50 rounded-full" />
                    <div className="w-8 h-2.5 bg-pink-400/50 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
            <p className="text-red-400 text-2xl font-medium">{error}</p>
            <p className="text-white/50 text-base mt-3">잠시 후 로그인 페이지로 이동합니다...</p>
          </>
        ) : (
          <>
            {/* 로딩 챗봇 (파란색 + 펄스) */}
            <div className="relative mb-10 flex justify-center">
              <div className="pointer-events-none absolute inset-0 rounded-full blur-3xl opacity-40 animate-pulse scale-125 bg-blue-400" />
              <div className="relative w-40 h-40 rounded-full shadow-xl flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-cyan-400 animate-pulse">
                <div className="flex flex-col items-center gap-4">
                  {/* 눈 */}
                  <div className="flex gap-7">
                    <div className="w-5 h-5 bg-gray-900 rounded-full" />
                    <div className="w-5 h-5 bg-gray-900 rounded-full" />
                  </div>
                  {/* 홍조 */}
                  <div className="flex gap-14">
                    <div className="w-8 h-2.5 bg-pink-400/80 rounded-full" />
                    <div className="w-8 h-2.5 bg-pink-400/80 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
            <p className="text-white text-2xl font-medium">
              {provider === 'google' ? 'Google' : 'GitHub'} 로그인 처리 중...
            </p>
            <p className="text-white/50 text-base mt-3">잠시만 기다려주세요</p>
          </>
        )}
      </div>
    </div>
  )
}
