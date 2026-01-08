import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Company {
  id: string
  name: string
  email: string
  plan: string
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
