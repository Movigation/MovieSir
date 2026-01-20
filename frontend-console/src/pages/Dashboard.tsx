import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api'
import { useAuthStore } from '@/stores/authStore'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface DashboardData {
  today: number
  total: number
  daily_limit: number
  plan: string
  api_key_count: number
  chart_data: { date: string; count: number; success: number; error: number }[]
}

interface LogEntry {
  id: string
  time: string
  method: string
  endpoint: string
  status: number
  latency: number
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const { token, company } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardRes, logsRes] = await Promise.all([
          api.get('/b2b/dashboard'),
          api.get('/b2b/logs?limit=10'),
        ])
        setData(dashboardRes.data)
        setLogs(logsRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [token])

  // Live Logs 5초 폴링
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data } = await api.get('/b2b/logs?limit=10')
        setLogs(data)
      } catch (err) {
        console.error('Failed to fetch logs:', err)
      }
    }

    const interval = setInterval(fetchLogs, 5000)
    return () => clearInterval(interval)
  }, [token])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        데이터를 불러올 수 없습니다
      </div>
    )
  }

  const isEnterprise = data.plan === 'ENTERPRISE'
  const usagePercent = isEnterprise ? 0 : Math.round((data.today / data.daily_limit) * 100)

  // chart_data에서 성공/에러 비율 계산
  const totalSuccess = data.chart_data.reduce((sum, d) => sum + d.success, 0)
  const totalError = data.chart_data.reduce((sum, d) => sum + d.error, 0)
  const totalCalls = totalSuccess + totalError
  const successPercent = totalCalls > 0 ? Math.round((totalSuccess / totalCalls) * 100) : 0
  const errorPercent = totalCalls > 0 ? Math.round((totalError / totalCalls) * 100) : 0
  const limitPercent = 100 - successPercent - errorPercent

  const usageOverviewData = [
    { name: '성공', value: successPercent, color: '#3b82f6' },
    { name: '에러', value: errorPercent, color: '#ef4444' },
    { name: '제한', value: limitPercent, color: '#f59e0b' },
  ]

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="min-w-0">
          <h1 className="text-lg lg:text-xl font-semibold text-white truncate">Hello, {company?.name || 'User'}</h1>
          <p className="text-sm text-gray-500">Welcome back</p>
        </div>
        <div className="text-xs lg:text-sm text-gray-500 hidden sm:block whitespace-nowrap">
          Reports: <span className="text-gray-400">{new Date().toLocaleDateString('ko-KR')}</span>
        </div>
      </div>

      {/* Stats Cards with Icons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        {/* 오늘 호출 */}
        <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 lg:w-10 lg:h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="flex items-center gap-1 text-green-400 text-xs font-medium">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              12%
            </div>
          </div>
          <p className="text-xl lg:text-2xl font-bold text-white mt-3">{data.today.toLocaleString()}</p>
          <p className="text-xs lg:text-sm text-gray-500 mt-1">오늘 호출</p>
        </div>

        {/* 총 호출 */}
        <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 lg:w-10 lg:h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="flex items-center gap-1 text-green-400 text-xs font-medium">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              148%
            </div>
          </div>
          <p className="text-xl lg:text-2xl font-bold text-white mt-3">{data.total >= 1000 ? `${(data.total / 1000).toFixed(1)}k` : data.total.toLocaleString()}</p>
          <p className="text-xs lg:text-sm text-gray-500 mt-1">총 호출</p>
        </div>

        {/* 성공률 */}
        <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 lg:w-10 lg:h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex items-center gap-1 text-green-400 text-xs font-medium">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              0.2%
            </div>
          </div>
          <p className="text-xl lg:text-2xl font-bold text-white mt-3">{successPercent > 0 ? `${successPercent}%` : '-'}</p>
          <p className="text-xs lg:text-sm text-gray-500 mt-1">성공률</p>
        </div>

        {/* 남은 호출 */}
        <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 lg:w-10 lg:h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xs text-gray-500 font-medium">{isEnterprise ? '무제한' : `${usagePercent}% 사용`}</span>
          </div>
          <p className="text-xl lg:text-2xl font-bold text-white mt-3">{isEnterprise ? '∞' : (data.daily_limit - data.today).toLocaleString()}</p>
          <p className="text-xs lg:text-sm text-gray-500 mt-1">남은 호출</p>
        </div>
      </div>

      {/* Middle Section: Profile + Chart + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 mb-6">
        {/* Company Profile Card */}
        <div className="lg:col-span-3 bg-[#16161d] rounded-xl p-4 lg:p-5 order-2 lg:order-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-lg lg:text-xl font-bold flex-shrink-0">
              {company?.name?.charAt(0) || 'M'}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-white text-sm lg:text-base truncate">{company?.name || 'MovieSir'}</p>
              <p className="text-[10px] lg:text-xs text-blue-400 truncate">{company?.email || 'contact@moviesir.cloud'}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/console/docs')}
            className="w-full py-2 bg-blue-500 text-white rounded-lg text-xs lg:text-sm font-medium hover:bg-blue-400 transition-colors mb-4"
          >
            API 문서 보기
          </button>
          <div className="grid grid-cols-2 gap-3 lg:gap-4">
            <div className="text-center">
              <p className="text-[10px] lg:text-xs text-gray-500">플랜</p>
              <p className="font-semibold text-white text-sm lg:text-base">{data.plan}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] lg:text-xs text-gray-500">일일 한도</p>
              <p className="font-semibold text-white text-sm lg:text-base">{isEnterprise ? '∞' : data.daily_limit.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] lg:text-xs text-gray-500">API 키</p>
              <p className="font-semibold text-white text-sm lg:text-base">{data.api_key_count}개</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] lg:text-xs text-gray-500">사용률</p>
              <p className="font-semibold text-blue-400 text-sm lg:text-base">{isEnterprise ? '-' : `${usagePercent}%`}</p>
            </div>
          </div>
        </div>

        {/* Main Chart */}
        <div className="lg:col-span-6 bg-[#16161d] rounded-xl p-4 lg:p-5 order-1 lg:order-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-white">API Calls</h2>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-gray-500">성공</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-gray-500">에러</span>
              </div>
            </div>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chart_data}>
                <defs>
                  <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="errorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#374151" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#374151" fontSize={11} tickLine={false} axisLine={false} width={35} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f1f28', border: 'none', borderRadius: '8px' }}
                  labelStyle={{ color: '#9ca3af', fontSize: '12px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="success" stroke="#3b82f6" strokeWidth={2} fill="url(#successGradient)" name="성공" />
                <Area type="monotone" dataKey="error" stroke="#ef4444" strokeWidth={2} fill="url(#errorGradient)" name="에러" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Usage Overview Donut */}
        <div className="lg:col-span-3 bg-[#16161d] rounded-xl p-4 lg:p-5 order-3">
          <h2 className="text-sm font-medium text-white mb-4">Usage Overview</h2>
          <div className="h-36 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={usageOverviewData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="rgba(59, 130, 246, 0.7)" />
                  <Cell fill="rgba(239, 68, 68, 0.7)" />
                  <Cell fill="rgba(245, 158, 11, 0.7)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {usageOverviewData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-400">{item.name}</span>
                </div>
                <span className="font-medium text-white">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Table + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        {/* API Usage Summary */}
        <div className="lg:col-span-8 bg-[#16161d] rounded-xl p-4 lg:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-white">API 사용 요약</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <p className="text-2xl font-bold text-blue-400">{data.today}</p>
              <p className="text-xs text-gray-500 mt-1">오늘 호출</p>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <p className="text-2xl font-bold text-green-400">{data.total}</p>
              <p className="text-xs text-gray-500 mt-1">총 호출</p>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <p className="text-2xl font-bold text-cyan-400">{successPercent}%</p>
              <p className="text-xs text-gray-500 mt-1">성공률</p>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <p className="text-2xl font-bold text-purple-400">{isEnterprise ? '∞' : data.daily_limit - data.today}</p>
              <p className="text-xs text-gray-500 mt-1">남은 호출</p>
            </div>
          </div>
          {!isEnterprise && (
          <div className="mt-4 p-4 bg-white/5 rounded-lg">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>일일 사용량</span>
              <span>{usagePercent}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
          </div>
          )}
        </div>

        {/* Recent Logs */}
        <div className="lg:col-span-4 bg-[#16161d] rounded-xl p-4 lg:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium text-white">Live Logs</h2>
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            </div>
            <button onClick={() => navigate('/console/logs')} className="text-xs text-blue-400 hover:text-blue-300">View all</button>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-1.5 lg:gap-2 text-[10px] lg:text-xs py-1.5 border-b border-white/5 last:border-0">
                <span className="text-gray-500 w-12 lg:w-14 flex-shrink-0">{log.time}</span>
                <span className={`w-10 lg:w-12 px-1 lg:px-1.5 py-0.5 rounded text-center font-medium flex-shrink-0 ${
                  log.method === 'GET' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                }`}>{log.method}</span>
                <span className="flex-1 text-gray-300 font-mono truncate min-w-0">{log.endpoint}</span>
                <span className={`w-7 lg:w-8 text-right flex-shrink-0 ${
                  log.status === 200 ? 'text-green-400' : log.status === 429 ? 'text-yellow-400' : 'text-red-400'
                }`}>{log.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
