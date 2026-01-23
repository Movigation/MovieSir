import { useEffect, useState, useRef, useCallback } from 'react'
import { api } from '@/api'
import { useAuthStore } from '@/stores/authStore'

interface LogEntry {
  id: string
  date: string
  time: string
  method: string
  endpoint: string
  status: number
  latency: number
}

interface LogsResponse {
  logs: LogEntry[]
  total: number
  has_more: boolean
}

type TabType = 'api' | 'livefeed'

// 통합 피드 아이템 (Dashboard와 동일)
interface UnifiedFeedItem {
  kind: 'api' | 'b2c'
  date: string
  time: string
  // API 로그 전용
  log_id?: string
  method?: string
  endpoint?: string
  status?: number
  latency?: number
  // B2C 활동 전용
  user_id?: string
  user_nickname?: string
  activity_type?: string
  description?: string
  movie_title?: string | null
  session_id?: number | null
}

export default function Logs() {
  const [activeTab, setActiveTab] = useState<TabType>('livefeed')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [liveFeed, setLiveFeed] = useState<UnifiedFeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const { token, company } = useAuthStore()
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const startDateRef = useRef<HTMLInputElement | null>(null)
  const endDateRef = useRef<HTMLInputElement | null>(null)
  const [startPickerOpen, setStartPickerOpen] = useState(false)
  const [endPickerOpen, setEndPickerOpen] = useState(false)

  const isAdmin = company?.is_admin

  const handleStartDateToggle = () => {
    if (startPickerOpen) {
      startDateRef.current?.blur()
      setStartPickerOpen(false)
    } else {
      startDateRef.current?.showPicker()
      setStartPickerOpen(true)
    }
  }

  const handleEndDateToggle = () => {
    if (endPickerOpen) {
      endDateRef.current?.blur()
      setEndPickerOpen(false)
    } else {
      endDateRef.current?.showPicker()
      setEndPickerOpen(true)
    }
  }

  const fetchLogs = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const offset = reset ? 0 : logs.length
      const params = new URLSearchParams({
        limit: '50',
        offset: String(offset),
      })
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)

      const { data } = await api.get<LogsResponse>(`/b2b/logs?${params}`)

      if (reset) {
        setLogs(data.logs)
      } else {
        setLogs(prev => [...prev, ...data.logs])
      }
      setTotal(data.total)
      setHasMore(data.has_more)
    } catch (err) {
      console.error('Failed to fetch logs:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [logs.length, startDate, endDate])

  // Live Feed: 통합 피드 (대시보드와 동일)
  const fetchLiveFeed = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<{ items: UnifiedFeedItem[] }>('/b2b/live-feed?limit=100')
      console.log('[Live Feed] 응답:', data.items?.length || 0, '개')
      setLiveFeed(data.items || [])
    } catch (err) {
      console.error('Failed to fetch live feed:', err)
      setLiveFeed([])
    } finally {
      setLoading(false)
    }
  }, [])

  // 탭 변경 시 데이터 로드
  useEffect(() => {
    if (activeTab === 'api') {
      fetchLogs(true)
    } else if (activeTab === 'livefeed') {
      fetchLiveFeed()
    }
  }, [activeTab, token, startDate, endDate])

  // 무한 스크롤 Observer 설정 (API 로그만)
  useEffect(() => {
    if (activeTab !== 'api') return

    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchLogs(false)
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [activeTab, hasMore, loadingMore, loading, fetchLogs])

  // 5초마다 최신 로그 갱신 (첫 페이지만)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!startDate && !endDate) {
        if (activeTab === 'api') {
          fetchLogs(true)
        } else if (activeTab === 'livefeed') {
          fetchLiveFeed()
        }
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [activeTab, startDate, endDate])

  const filteredLogs = logs.filter((log) => {
    if (filter === 'success' && log.status >= 400) return false
    if (filter === 'error' && log.status < 400) return false
    if (methodFilter !== 'all' && log.method !== methodFilter) return false
    return true
  })


  const successCount = logs.filter((l) => l.status < 400).length
  const errorCount = logs.filter((l) => l.status >= 400).length
  const avgLatency = logs.length > 0 ? Math.round(logs.reduce((sum, l) => sum + l.latency, 0) / logs.length) : 0

  // 날짜 필터 초기화
  const clearDateFilter = () => {
    setStartDate('')
    setEndDate('')
  }

  // 오늘 날짜
  const today = new Date().toISOString().split('T')[0]

  if (loading && logs.length === 0 && liveFeed.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg lg:text-xl font-semibold text-white">Logs</h1>
            {!startDate && !endDate && (
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            )}
          </div>
          <p className="text-xs lg:text-sm text-gray-500 mt-1 truncate">
            {startDate || endDate
              ? `${startDate || '~'} ~ ${endDate || '~'} 기간 로그`
              : activeTab === 'api'
                ? '실시간 API 로그를 확인하세요'
                : '전체 로그를 실시간으로 확인하세요'
            }
          </p>
        </div>

        {/* Date Filter (API 탭에서만) */}
        {activeTab === 'api' && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-[#16161d] rounded-lg p-2">
              <div className="relative">
                <input
                  ref={startDateRef}
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  onBlur={() => setStartPickerOpen(false)}
                  max={endDate || today}
                  className="px-2 py-1.5 pr-8 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:ring-2 focus:ring-blue-500 [&::-webkit-calendar-picker-indicator]:hidden"
                />
                <button
                  type="button"
                  onClick={handleStartDateToggle}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
              <span className="text-gray-500 text-xs">~</span>
              <div className="relative">
                <input
                  ref={endDateRef}
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  onBlur={() => setEndPickerOpen(false)}
                  min={startDate}
                  max={today}
                  className="px-2 py-1.5 pr-8 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:ring-2 focus:ring-blue-500 [&::-webkit-calendar-picker-indicator]:hidden"
                />
                <button
                  type="button"
                  onClick={handleEndDateToggle}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={clearDateFilter}
                  className="p-1.5 text-gray-400 hover:text-white transition-colors"
                  title="초기화"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#16161d] rounded-lg p-1 mb-6 w-fit">
        <button
          onClick={() => setActiveTab('livefeed')}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${
            activeTab === 'livefeed'
              ? 'bg-blue-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Live Feed
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('api')}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              activeTab === 'api'
                ? 'bg-blue-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            API 로그
          </button>
        )}
      </div>

      {/* API Logs Tab */}
      {activeTab === 'api' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
            <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
              <p className="text-[10px] lg:text-xs text-gray-500 mb-2">전체 로그</p>
              <p className="text-xl lg:text-2xl font-semibold text-white">{total.toLocaleString()}</p>
            </div>
            <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
              <p className="text-[10px] lg:text-xs text-gray-500 mb-2">성공</p>
              <p className="text-xl lg:text-2xl font-semibold text-green-400">{successCount.toLocaleString()}</p>
            </div>
            <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
              <p className="text-[10px] lg:text-xs text-gray-500 mb-2">에러</p>
              <p className="text-xl lg:text-2xl font-semibold text-red-400">{errorCount.toLocaleString()}</p>
            </div>
            <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
              <p className="text-[10px] lg:text-xs text-gray-500 mb-2">평균 응답시간</p>
              <p className="text-xl lg:text-2xl font-semibold text-blue-400">{avgLatency}ms</p>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium text-white">로그 목록</h2>
                <span className="text-xs text-gray-500">({filteredLogs.length.toLocaleString()}개 표시)</span>
              </div>
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

            <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
              <table className="w-full">
                <thead className="sticky top-0 bg-[#16161d]">
                  <tr className="text-left text-[10px] lg:text-xs text-gray-500 border-b border-white/5">
                    <th className="pb-3 font-medium">날짜</th>
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
                      <td className="py-2 lg:py-3 text-[10px] lg:text-sm text-gray-500 font-mono whitespace-nowrap">{log.date}</td>
                      <td className="py-2 lg:py-3 text-[10px] lg:text-sm text-gray-400 font-mono whitespace-nowrap">{log.time}</td>
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

              {/* Load More Trigger */}
              {hasMore && (
                <div ref={loadMoreRef} className="py-4 flex items-center justify-center">
                  {loadingMore ? (
                    <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                  ) : (
                    <span className="text-xs text-gray-500">스크롤하여 더 불러오기</span>
                  )}
                </div>
              )}
            </div>

            {filteredLogs.length === 0 && !loading && (
              <div className="py-8 text-center text-gray-500 text-sm">
                {logs.length === 0 ? '아직 API 호출 기록이 없습니다' : '필터에 맞는 로그가 없습니다'}
              </div>
            )}
          </div>
        </>
      )}

      {/* Live Feed Tab - 전체 로그 통합 뷰 */}
      {activeTab === 'livefeed' && (
        <>
          {/* Live Feed Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
            <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
              <p className="text-[10px] lg:text-xs text-gray-500 mb-2">전체</p>
              <p className="text-xl lg:text-2xl font-semibold text-white">{liveFeed.length}</p>
            </div>
            <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
              <p className="text-[10px] lg:text-xs text-gray-500 mb-2">API 호출</p>
              <p className="text-xl lg:text-2xl font-semibold text-purple-400">
                {liveFeed.filter(f => f.kind === 'api').length}
              </p>
            </div>
            <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
              <p className="text-[10px] lg:text-xs text-gray-500 mb-2">B2C 추천</p>
              <p className="text-xl lg:text-2xl font-semibold text-cyan-400">
                {liveFeed.filter(f => f.kind === 'b2c' && f.activity_type === 'recommendation').length}
              </p>
            </div>
            <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
              <p className="text-[10px] lg:text-xs text-gray-500 mb-2">B2C 기타</p>
              <p className="text-xl lg:text-2xl font-semibold text-green-400">
                {liveFeed.filter(f => f.kind === 'b2c' && f.activity_type !== 'recommendation').length}
              </p>
            </div>
          </div>

          {/* Live Feed List */}
          <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-medium text-white">Live Feed</h2>
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              {isAdmin && (
                <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">+B2C</span>
              )}
              <span className="text-xs text-gray-500">({liveFeed.length}개)</span>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
              {liveFeed.map((item, index) => {
                // API 로그인 경우
                if (item.kind === 'api') {
                  return (
                    <div key={`api-${item.log_id}-${index}`} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                      <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          item.method === 'GET' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                        }`}>{item.method}</span>
                        <span className="text-xs text-gray-300 font-mono truncate">{item.endpoint}</span>
                        <span className={`text-[10px] font-medium ${
                          item.status === 200 ? 'text-green-400' : item.status === 429 ? 'text-yellow-400' : 'text-red-400'
                        }`}>{item.status}</span>
                        {item.latency && <span className="text-[10px] text-gray-500">{item.latency}ms</span>}
                      </div>
                      <span className="text-[10px] text-gray-500 flex-shrink-0">{item.date}<br/>{item.time}</span>
                    </div>
                  )
                }

                // B2C 활동인 경우
                const endpointMap: Record<string, string> = {
                  'recommendation': '/v1/recommend',
                  're_recommendation': '/v1/recommend_single',
                  'ott_click': '/ott-click',
                  'satisfaction_positive': '/feedback',
                  'satisfaction_negative': '/feedback',
                }
                const endpoint = endpointMap[item.activity_type || ''] || '/api'

                return (
                  <div
                    key={`b2c-${item.user_id}-${item.time}-${index}`}
                    className="flex items-center gap-2 p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    {/* 유저 아이콘 */}
                    <div className="w-7 h-7 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    {/* 내용 */}
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="text-xs font-medium text-cyan-400 flex-shrink-0">{item.user_nickname}</span>
                      <span className="text-[10px] text-gray-400 truncate">
                        {item.movie_title || item.description}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-green-500/20 text-green-400 flex-shrink-0">POST</span>
                      <span className="text-xs text-gray-300 font-mono truncate">{endpoint}</span>
                      <span className="text-[10px] font-medium text-green-400 flex-shrink-0">200</span>
                    </div>
                    {/* 시간 */}
                    <span className="text-[10px] text-gray-500 flex-shrink-0">{item.date}<br/>{item.time}</span>
                  </div>
                )
              })}
            </div>

            {liveFeed.length === 0 && !loading && (
              <div className="py-8 text-center text-gray-500 text-sm">
                아직 로그가 없습니다
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
