import { useEffect, useState } from 'react'
import { api } from '@/api'
import { useAuthStore } from '@/stores/authStore'

interface LogEntry {
  id: string
  time: string
  method: string
  endpoint: string
  status: number
  latency: number
}

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const { token } = useAuthStore()

  const fetchLogs = async () => {
    try {
      const { data } = await api.get('/b2b/logs?limit=100')
      setLogs(data)
    } catch (err) {
      console.error('Failed to fetch logs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [token])

  // 5초마다 로그 갱신
  useEffect(() => {
    const interval = setInterval(fetchLogs, 5000)
    return () => clearInterval(interval)
  }, [])

  const filteredLogs = logs.filter((log) => {
    if (filter === 'success' && log.status >= 400) return false
    if (filter === 'error' && log.status < 400) return false
    if (methodFilter !== 'all' && log.method !== methodFilter) return false
    return true
  })

  const successCount = logs.filter((l) => l.status < 400).length
  const errorCount = logs.filter((l) => l.status >= 400).length
  const avgLatency = logs.length > 0 ? Math.round(logs.reduce((sum, l) => sum + l.latency, 0) / logs.length) : 0

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 lg:mb-8">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg lg:text-xl font-semibold text-white">Logs</h1>
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          </div>
          <p className="text-xs lg:text-sm text-gray-500 mt-1 truncate">실시간 API 로그를 확인하세요</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
          <p className="text-[10px] lg:text-xs text-gray-500 mb-2">전체 로그</p>
          <p className="text-xl lg:text-2xl font-semibold text-white">{logs.length}</p>
        </div>
        <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
          <p className="text-[10px] lg:text-xs text-gray-500 mb-2">성공</p>
          <p className="text-xl lg:text-2xl font-semibold text-green-400">{successCount}</p>
        </div>
        <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
          <p className="text-[10px] lg:text-xs text-gray-500 mb-2">에러</p>
          <p className="text-xl lg:text-2xl font-semibold text-red-400">{errorCount}</p>
        </div>
        <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
          <p className="text-[10px] lg:text-xs text-gray-500 mb-2">평균 응답시간</p>
          <p className="text-xl lg:text-2xl font-semibold text-blue-400">{avgLatency}ms</p>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-medium text-white">로그 목록</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {/* Status Filter */}
            <div className="flex gap-1 bg-white/5 rounded-lg p-1 flex-shrink-0">
              {(['all', 'success', 'error'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2 lg:px-3 py-1 text-[10px] lg:text-xs rounded-md transition-colors whitespace-nowrap ${
                    filter === f ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {f === 'all' ? '전체' : f === 'success' ? '성공' : '에러'}
                </button>
              ))}
            </div>
            {/* Method Filter */}
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-2 lg:px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-[10px] lg:text-xs focus:ring-2 focus:ring-blue-500 flex-shrink-0"
            >
              <option value="all">All</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
          <table className="w-full">
            <thead className="sticky top-0 bg-[#16161d]">
              <tr className="text-left text-[10px] lg:text-xs text-gray-500 border-b border-white/5">
                <th className="pb-3 font-medium">시간</th>
                <th className="pb-3 font-medium">메소드</th>
                <th className="pb-3 font-medium">엔드포인트</th>
                <th className="pb-3 font-medium">상태</th>
                <th className="pb-3 font-medium hidden sm:table-cell">응답</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-2 lg:py-3 text-[10px] lg:text-sm text-gray-500 font-mono whitespace-nowrap">{log.time}</td>
                  <td className="py-2 lg:py-3">
                    <span
                      className={`px-1.5 lg:px-2 py-0.5 rounded text-[10px] lg:text-xs font-medium ${
                        log.method === 'GET'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}
                    >
                      {log.method}
                    </span>
                  </td>
                  <td className="py-2 lg:py-3 text-[10px] lg:text-sm text-gray-300 font-mono truncate max-w-[100px] lg:max-w-[200px]">{log.endpoint}</td>
                  <td className="py-2 lg:py-3">
                    <span
                      className={`text-[10px] lg:text-sm font-medium ${
                        log.status < 300
                          ? 'text-green-400'
                          : log.status < 400
                          ? 'text-blue-400'
                          : log.status < 500
                          ? 'text-yellow-400'
                          : 'text-red-400'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="py-2 lg:py-3 text-[10px] lg:text-sm text-gray-400 hidden sm:table-cell whitespace-nowrap">{log.latency}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="py-8 text-center text-gray-500 text-sm">
            {logs.length === 0 ? '아직 API 호출 기록이 없습니다' : '필터에 맞는 로그가 없습니다'}
          </div>
        )}
      </div>
    </div>
  )
}
