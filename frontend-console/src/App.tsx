// Deploy trigger: 2025-01-14 v2 - Add frontend-console CI/CD workflow
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import Landing from '@/pages/Landing'
import Api from '@/pages/Api'
import Docs from '@/pages/Docs'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import ForgotPassword from '@/pages/ForgotPassword'
import Dashboard from '@/pages/Dashboard'
import ApiKeys from '@/pages/ApiKeys'
import Usage from '@/pages/Usage'
import Users from '@/pages/Users'
import Logs from '@/pages/Logs'
import ApiDocs from '@/pages/ApiDocs'
import Playground from '@/pages/Playground'
import Settings from '@/pages/Settings'
import Support from '@/pages/Support'
import Contact from '@/pages/Contact'
import OAuthCallback from '@/pages/OAuthCallback'
import { useAuthStore } from '@/stores/authStore'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

// 도메인에 따라 루트 경로 동작 결정
function RootRoute() {
  const hostname = window.location.hostname
  const { token } = useAuthStore()

  // api.moviesir.cloud → Api 페이지
  if (hostname === 'api.moviesir.cloud') {
    return <Api />
  }
  // console.moviesir.cloud → 로그인 여부에 따라 분기
  if (hostname === 'console.moviesir.cloud') {
    return token ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
  }
  // localhost:3001 (로컬 개발) → 로그인 여부에 따라 분기
  if (hostname === 'localhost') {
    return token ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
  }
  // 그 외 (moviesir.cloud 등) → Landing 페이지
  return <Landing />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRoute />} />
      <Route path="/api" element={<Api />} />
      <Route path="/about" element={<Navigate to="/docs" replace />} />
      <Route path="/docs" element={<Docs />} />
      <Route path="/support" element={<Support />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/auth/google/callback" element={<OAuthCallback provider="google" />} />
      <Route path="/auth/github/callback" element={<OAuthCallback provider="github" />} />
      {/* Protected Routes - /dashboard, /api-keys, etc. */}
      <Route
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/api-keys" element={<ApiKeys />} />
        <Route path="/usage" element={<Usage />} />
        <Route path="/users" element={<Users />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/api-docs" element={<ApiDocs />} />
        <Route path="/playground" element={<Playground />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
