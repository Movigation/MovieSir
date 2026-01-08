import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import Api from '@/pages/Api'
import Docs from '@/pages/Docs'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Dashboard from '@/pages/Dashboard'
import ApiKeys from '@/pages/ApiKeys'
import Usage from '@/pages/Usage'
import Users from '@/pages/Users'
import Logs from '@/pages/Logs'
import ApiDocs from '@/pages/ApiDocs'
import Playground from '@/pages/Playground'
import Settings from '@/pages/Settings'
import { useAuthStore } from '@/stores/authStore'

const hostname = window.location.hostname
const isConsole = hostname === 'console.moviesir.cloud'
const isApi = hostname === 'api.moviesir.cloud'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

// console.moviesir.cloud 전용 라우트
function ConsoleApp() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <PrivateRoute>
            <Layout basePath="" />
          </PrivateRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/api-keys" element={<ApiKeys />} />
        <Route path="/usage" element={<Usage />} />
        <Route path="/users" element={<Users />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/docs" element={<ApiDocs />} />
        <Route path="/playground" element={<Playground />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

// api.moviesir.cloud 전용 라우트
function ApiApp() {
  return (
    <Routes>
      <Route path="/" element={<Api />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

// moviesir.cloud 메인 라우트
function MainApp() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/api" element={<Api />} />
      <Route path="/about" element={<Navigate to="/docs" replace />} />
      <Route path="/docs" element={<Docs />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/console"
        element={
          <PrivateRoute>
            <Layout basePath="/console" />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/console/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="api-keys" element={<ApiKeys />} />
        <Route path="usage" element={<Usage />} />
        <Route path="users" element={<Users />} />
        <Route path="logs" element={<Logs />} />
        <Route path="docs" element={<ApiDocs />} />
        <Route path="playground" element={<Playground />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

function App() {
  if (isApi) return <ApiApp />
  if (isConsole) return <ConsoleApp />
  return <MainApp />
}

export default App
