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

interface ActivityEntry {
  kind: string
  date: string
  time: string
  user_id: string
  user_nickname: string
  activity_type: string
  description: string
  movie_title: string
  session_id: number | null
}

interface ActivityResponse {
  items: ActivityEntry[]
}

type TabType = 'api' | 'activity' | 'livefeed'

// Live Feed 통합 엔트리 타입
interface LiveFeedEntry {
  id: string
  type: 'api' | 'activity'
  date: string
  time: string
  timestamp: number
  // API 로그 필드
  method?: string
  endpoint?: string
  status?: number
  latency?: number
  // 활동 필드
  user_nickname?: string
  activity_type?: string
  description?: string
}

export default function Logs() {
  const [activeTab, setActiveTab] = useState<TabType>('livefeed')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [liveFeed, setLiveFeed] = useState<LiveFeedEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [activityFilter, setActivityFilter] = useState<string>('all')
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

  const fetchActivities = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<ActivityResponse>('/b2b/live-feed?limit=100')
      setActivities(data.items || [])
    } catch (err) {
      console.error('Failed to fetch activities:', err)
      setActivities([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Live Feed: API 로그 + 유저 활동 통합
  const fetchLiveFeed = useCallback(async () => {
    setLoading(true)
    try {
      // 병렬로 두 데이터 소스 로드
      const [logsRes, activitiesRes] = await Promise.all([
        api.get<LogsResponse>('/b2b/logs?limit=50&offset=0'),
        api.get<ActivityResponse>('/b2b/live-feed?limit=50')
      ])

      const apiLogs = logsRes.data.logs || []
      const userActivities = activitiesRes.data.items || []

      // 통합 엔트리로 변환
      const combined: LiveFeedEntry[] = []

      // API 로그 변환
      apiLogs.forEach((log) => {
        const dateStr = log.date // "2025-01-23"
        const timeStr = log.time // "14:30:25"
        combined.push({
          id: `api-${log.id}`,
          type: 'api',
          date: log.date,
          time: log.time,
          timestamp: new Date(`${dateStr}T${timeStr}`).getTime(),
          method: log.method,
          endpoint: log.endpoint,
          status: log.status,
          latency: log.latency,
        })
      })

      // 유저 활동 변환
      userActivities.forEach((activity, idx) => {
        const dateStr = activity.date
        const timeStr = activity.time
        combined.push({
          id: `activity-${activity.user_id}-${idx}`,
          type: 'activity',
          date: activity.date,
          time: activity.time,
          timestamp: new Date(`${dateStr}T${timeStr}`).getTime(),
          user_nickname: activity.user_nickname,
          activity_type: activity.activity_type,
          description: activity.description,
        })
      })

      // 시간순 정렬 (최신순)
      combined.sort((a, b) => b.timestamp - a.timestamp)

      setLiveFeed(combined)
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
    } else if (activeTab === 'activity') {
      fetchActivities()
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
        } else if (activeTab === 'activity') {
          fetchActivities()
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

  const filteredActivities = activities.filter((activity) => {
    if (activityFilter === 'all') return true
    return activity.activity_type === activityFilter
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

  // 활동 타입 아이콘
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'recommendation':
        return '🎬'
      case 'ott_click':
        return '📺'
      case 'satisfaction_positive':
        return '👍'
      case 'satisfaction_negative':
        return '👎'
      case 're_recommendation':
        return '🔄'
      default:
        return '📋'
    }
  }

  // 활동 타입 라벨
  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'recommendation':
        return '추천'
      case 'ott_click':
        return 'OTT 클릭'
      case 'satisfaction_positive':
        return '좋아요'
      case 'satisfaction_negative':
        return '별로예요'
      case 're_recommendation':
        return '재추천'
      default:
        return type
    }
  }

  if (loading && logs.length === 0 && activities.length === 0 && liveFeed.length === 0) {
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
                : activeTab === 'activity'
                  ? '실시간 유저 활동을 확인하세요'
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
          <>
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
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${
                activeTab === 'activity'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              유저 활동
            </button>
          </>
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

      {/* User Activity Tab */}
      {activeTab === 'activity' && (
        <>
          {/* Activity Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4 mb-6">
            <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
              <p className="text-[10px] lg:text-xs text-gray-500 mb-2">전체 활동</p>
              <p className="text-xl lg:text-2xl font-semibold text-white">{activities.length}</p>
            </div>
            <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
              <p className="text-[10px] lg:text-xs text-gray-500 mb-2">추천</p>
              <p className="text-xl lg:text-2xl font-semibold text-blue-400">
                {activities.filter(a => a.activity_type === 'recommendation').length}
              </p>
            </div>
            <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
              <p className="text-[10px] lg:text-xs text-gray-500 mb-2">OTT 클릭</p>
              <p className="text-xl lg:text-2xl font-semibold text-purple-400">
                {activities.filter(a => a.activity_type === 'ott_click').length}
              </p>
            </div>
            <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
              <p className="text-[10px] lg:text-xs text-gray-500 mb-2">좋아요</p>
              <p className="text-xl lg:text-2xl font-semibold text-green-400">
                {activities.filter(a => a.activity_type === 'satisfaction_positive').length}
              </p>
            </div>
            <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
              <p className="text-[10px] lg:text-xs text-gray-500 mb-2">별로예요</p>
              <p className="text-xl lg:text-2xl font-semibold text-red-400">
                {activities.filter(a => a.activity_type === 'satisfaction_negative').length}
              </p>
            </div>
          </div>

          {/* Activity List */}
          <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium text-white">유저 활동</h2>
                <span className="text-xs text-gray-500">({filteredActivities.length}개 표시)</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <select
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value)}
                  className="px-2 lg:px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-[10px] lg:text-xs focus:ring-2 focus:ring-blue-500 flex-shrink-0"
                >
                  <option value="all">전체</option>
                  <option value="recommendation">추천</option>
                  <option value="ott_click">OTT 클릭</option>
                  <option value="satisfaction_positive">좋아요</option>
                  <option value="satisfaction_negative">별로예요</option>
                  <option value="re_recommendation">재추천</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
              <table className="w-full">
                <thead className="sticky top-0 bg-[#16161d]">
                  <tr className="text-left text-[10px] lg:text-xs text-gray-500 border-b border-white/5">
                    <th className="pb-3 font-medium">날짜</th>
                    <th className="pb-3 font-medium">시간</th>
                    <th className="pb-3 font-medium">유저</th>
                    <th className="pb-3 font-medium">타입</th>
                    <th className="pb-3 font-medium">내용</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredActivities.map((activity, idx) => (
                    <tr key={`${activity.user_id}-${idx}`} className="hover:bg-white/5 transition-colors">
                      <td className="py-2 lg:py-3 text-[10px] lg:text-sm text-gray-500 font-mono whitespace-nowrap">{activity.date}</td>
                      <td className="py-2 lg:py-3 text-[10px] lg:text-sm text-gray-400 font-mono whitespace-nowrap">{activity.time}</td>
                      <td className="py-2 lg:py-3 text-[10px] lg:text-sm text-gray-300 whitespace-nowrap">{activity.user_nickname}</td>
                      <td className="py-2 lg:py-3">
                        <span className="flex items-center gap-1 text-[10px] lg:text-xs">
                          <span>{getActivityIcon(activity.activity_type)}</span>
                          <span className="text-gray-400">{getActivityLabel(activity.activity_type)}</span>
                        </span>
                      </td>
                      <td className="py-2 lg:py-3 text-[10px] lg:text-sm text-gray-300 truncate max-w-[150px] lg:max-w-[300px]">
                        {activity.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredActivities.length === 0 && !loading && (
              <div className="py-8 text-center text-gray-500 text-sm">
                {activities.length === 0 ? '아직 유저 활동 기록이 없습니다' : '필터에 맞는 활동이 없습니다'}
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
              <p className="text-[10px] lg:text-xs text-gray-500 mb-2">전체 로그</p>
              <p className="text-xl lg:text-2xl font-semibold text-white">{liveFeed.length}</p>
            </div>
            <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
              <p className="text-[10px] lg:text-xs text-gray-500 mb-2">API 호출</p>
              <p className="text-xl lg:text-2xl font-semibold text-blue-400">
                {liveFeed.filter(f => f.type === 'api').length}
              </p>
            </div>
            <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
              <p className="text-[10px] lg:text-xs text-gray-500 mb-2">유저 활동</p>
              <p className="text-xl lg:text-2xl font-semibold text-purple-400">
                {liveFeed.filter(f => f.type === 'activity').length}
              </p>
            </div>
            <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
              <p className="text-[10px] lg:text-xs text-gray-500 mb-2">OTT 클릭</p>
              <p className="text-xl lg:text-2xl font-semibold text-green-400">
                {liveFeed.filter(f => f.activity_type === 'ott_click').length}
              </p>
            </div>
          </div>

          {/* Live Feed List */}
          <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-medium text-white">실시간 로그</h2>
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-gray-500">({liveFeed.length}개)</span>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
              {liveFeed.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                    entry.type === 'api' ? 'bg-blue-500/5 hover:bg-blue-500/10' : 'bg-purple-500/5 hover:bg-purple-500/10'
                  }`}
                >
                  {/* 아이콘 */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    entry.type === 'api' ? 'bg-blue-500/20' : 'bg-purple-500/20'
                  }`}>
                    {entry.type === 'api' ? (
                      <span className="text-blue-400">
                        {entry.method === 'GET' ? '📥' : '📤'}
                      </span>
                    ) : (
                      <span>{getActivityIcon(entry.activity_type || '')}</span>
                    )}
                  </div>

                  {/* 내용 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {entry.type === 'api' ? (
                        <>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            entry.method === 'GET' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                          }`}>
                            {entry.method}
                          </span>
                          <span className="text-xs text-gray-400 font-mono truncate">{entry.endpoint}</span>
                          <span className={`text-[10px] font-medium ${
                            (entry.status || 0) < 400 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {entry.status}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-xs text-gray-300">{entry.user_nickname}</span>
                          <span className="text-[10px] text-gray-500">•</span>
                          <span className="text-[10px] text-gray-400">{getActivityLabel(entry.activity_type || '')}</span>
                        </>
                      )}
                    </div>
                    {entry.type === 'activity' && entry.description && (
                      <p className="text-[10px] lg:text-xs text-gray-500 truncate">{entry.description}</p>
                    )}
                  </div>

                  {/* 시간 */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-[10px] text-gray-500">{entry.date}</p>
                    <p className="text-[10px] text-gray-400">{entry.time}</p>
                  </div>
                </div>
              ))}
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
