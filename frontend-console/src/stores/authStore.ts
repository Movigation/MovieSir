import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Company {
  id: string
  name: string
  email: string
  plan: string
  oauth_provider?: string  // google, github (소셜 로그인 사용자)
  created_at?: string      // 가입일
}

interface AuthState {
  company: Company | null
  token: string | null
  login: (company: Company, token: string) => void
  logout: () => void
  setCompany: (company: Company) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      company: null,
      token: null,
      login: (company, token) => set({ company, token }),
      logout: () => {
        // Playground API 키도 함께 정리
        localStorage.removeItem('playground_api_key')
        sessionStorage.removeItem('playground_api_key_temp')
        set({ company: null, token: null })
      },
      setCompany: (company) => set({ company }),
    }),
    {
      name: 'b2b-auth',
    }
  )
)
