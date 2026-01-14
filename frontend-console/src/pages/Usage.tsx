import { useEffect, useState } from 'react'
import { api } from '@/api'
import { useAuthStore } from '@/stores/authStore'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface UsageData {
  date: string
  count: number
  success: number
  error: number
}

// 테스트용 mock 데이터
const generateMockData = (days: number): UsageData[] => {
  const data: UsageData[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const count = Math.floor(Math.random() * 400) + 100
    const errorRate = Math.random() * 0.05
    data.push({
      date: `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`,
      count,
      success: Math.floor(count * (1 - errorRate)),
      error: Math.floor(count * errorRate),
    })
  }
  return data
}

const mock7DayData = generateMockData(7)
const mock30DayData = generateMockData(30)

export default function Usage() {
  const [data, setData] = useState<UsageData[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'7d' | '30d'>('7d')
  const { token } = useAuthStore()

  useEffect(() => {
    setLoading(true)
    api
      .get(`/b2b/usage?period=${period}`)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [period, token])

  const totalCalls = data.reduce((sum, d) => sum + d.count, 0)
  const totalSuccess = data.reduce((sum, d) => sum + d.success, 0)
  const totalError = data.reduce((sum, d) => sum + d.error, 0)
  const avgCalls = data.length > 0 ? Math.round(totalCalls / data.length) : 0
  const successRate = totalCalls > 0 ? ((totalSuccess / totalCalls) * 100).toFixed(1) : '0'

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-white">Usage</h1>
          <p className="text-sm text-gray-500 mt-1">API 호출 내역을 분석하세요</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('7d')}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
              period === '7d'
                ? 'bg-blue-500 text-white'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            7D
          </button>
          <button
            onClick={() => setPeriod('30d')}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
              period === '30d'
                ? 'bg-blue-500 text-white'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            30D
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#16161d] rounded-xl p-5">
          <p className="text-xs text-gray-500 mb-2">총 호출</p>
          <p className="text-2xl font-semibold text-white">{totalCalls.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-2">{period === '7d' ? '최근 7일' : '최근 30일'}</p>
        </div>
        <div className="bg-[#16161d] rounded-xl p-5">
          <p className="text-xs text-gray-500 mb-2">일 평균</p>
          <p className="text-2xl font-semibold text-white">{avgCalls.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-2">calls/day</p>
        </div>
        <div className="bg-[#16161d] rounded-xl p-5">
          <p className="text-xs text-gray-500 mb-2">성공률</p>
          <p className="text-2xl font-semibold text-green-400">{successRate}%</p>
          <p className="text-xs text-green-500 mt-2">+0.2% from avg</p>
        </div>
        <div className="bg-[#16161d] rounded-xl p-5">
          <p className="text-xs text-gray-500 mb-2">에러 수</p>
          <p className="text-2xl font-semibold text-red-400">{totalError.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-2">{((totalError / totalCalls) * 100).toFixed(2)}% error rate</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-[#16161d] rounded-xl p-5 mb-6">
        <h2 className="text-sm font-medium text-white mb-6">Daily API Calls</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
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
              <XAxis
                dataKey="date"
                stroke="#374151"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#374151"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={35}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f1f28',
                  border: 'none',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#9ca3af', fontSize: '12px' }}
                itemStyle={{ fontSize: '12px' }}
              />
              <Area type="monotone" dataKey="success" stroke="#3b82f6" strokeWidth={2} fill="url(#successGradient)" name="성공" />
              <Area type="monotone" dataKey="error" stroke="#ef4444" strokeWidth={2} fill="url(#errorGradient)" name="에러" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <span className="text-xs text-gray-500">성공</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <span className="text-xs text-gray-500">에러</span>
          </div>
        </div>
      </div>

      {/* Usage by Endpoint */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-[#16161d] rounded-xl p-5">
          <h2 className="text-sm font-medium text-white mb-4">Top Endpoints</h2>
          <div className="space-y-3">
            {[
              { endpoint: '/v1/recommend', calls: 8234, percent: 85 },
              { endpoint: '/v1/movies/:id', calls: 1123, percent: 12 },
              { endpoint: '/v1/genres', calls: 287, percent: 3 },
            ].map((ep, i) => (
              <div key={ep.endpoint}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-gray-300 font-mono">{ep.endpoint}</span>
                  <span className="text-xs text-gray-500">{ep.calls.toLocaleString()} calls</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-cyan-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${ep.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#16161d] rounded-xl p-5">
          <h2 className="text-sm font-medium text-white mb-4">Response Time</h2>
          <div className="space-y-3">
            {[
              { label: 'Average', value: '234ms', color: 'text-white' },
              { label: 'P50', value: '189ms', color: 'text-green-400' },
              { label: 'P95', value: '456ms', color: 'text-yellow-400' },
              { label: 'P99', value: '892ms', color: 'text-red-400' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-sm text-gray-400">{stat.label}</span>
                <span className={`text-sm font-medium ${stat.color}`}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
