import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Company {
  id: string
  name: string
  email: string
  plan: string
  oauth_provider?: string  // google, github (소셜 로그인 사용자)
}

interface AuthState {
  company: Company | null
  token: string | null
  login: (company: Company, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      company: null,
      token: null,
      login: (company, token) => set({ company, token }),
      logout: () => set({ company: null, token: null }),
    }),
    {
      name: 'b2b-auth',
    }
  )
)
