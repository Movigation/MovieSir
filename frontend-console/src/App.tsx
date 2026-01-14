// Deploy trigger: 2025-01-14 - Remove mock data, connect real B2B API
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

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
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
            <Layout />
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

export default App
