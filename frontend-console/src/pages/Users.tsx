import { useEffect, useState, useCallback } from 'react'
import { api } from '@/api'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from 'react-router-dom'

interface B2CUser {
  user_id: string
  email: string
  nickname: string
  role: string
  is_email_verified: boolean
  onboarding_completed: boolean
  created_at: string | null
  deleted_at: string | null
}

interface OttSubscription {
  provider_name: string
  logo_path: string | null
}

interface B2CUserDetail extends B2CUser {
  ott_subscriptions: OttSubscription[]
  recommendation_count: number
  last_recommendation_at: string | null
}

interface B2CStats {
  total_users: number
  active_users: number
  deleted_users: number
  verified_users: number
  onboarded_users: number
  today_signups: number
  weekly_signups: number
  monthly_signups: number
}

interface UserActivity {
  type: string
  description: string
  movie_title: string | null
  movie_poster: string | null
  created_at: string
}

// OTT 로고 매핑 (로컬 파일 사용)
const OTT_LOGOS: Record<string, string> = {
  'Netflix': '/logos/NETFLEX_Logo.svg',
  '넷플릭스': '/logos/NETFLEX_Logo.svg',
  'Apple TV+': '/logos/Apple_TV_logo.svg',
  'Apple TV': '/logos/Apple_TV_logo.svg',
  '애플 TV+': '/logos/Apple_TV_logo.svg',
  'Disney+': '/logos/Disney+_logo.svg',
  'Disney Plus': '/logos/Disney+_logo.svg',
  '디즈니+': '/logos/Disney+_logo.svg',
  'TVING': '/logos/TVING_Logo.svg',
  'Tving': '/logos/TVING_Logo.svg',
  '티빙': '/logos/TVING_Logo.svg',
  'Watcha': '/logos/WATCHA_Logo_Main.svg',
  'WATCHA': '/logos/WATCHA_Logo_Main.svg',
  '왓챠': '/logos/WATCHA_Logo_Main.svg',
}

// OTT 로고 URL 가져오기
const getOttLogoUrl = (providerName: string): string | null => {
  return OTT_LOGOS[providerName] || null
}

export default function Users() {
  const { company } = useAuthStore()
  const navigate = useNavigate()
  const [users, setUsers] = useState<B2CUser[]>([])
  const [stats, setStats] = useState<B2CStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [selectedUser, setSelectedUser] = useState<B2CUserDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activities, setActivities] = useState<UserActivity[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'activities'>('info')
  const pageSize = 20

  // 어드민 권한 체크
  useEffect(() => {
    if (!company?.is_admin) {
      navigate('/dashboard')
    }
  }, [company, navigate])

  // 통계 가져오기
  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/b2b/admin/b2c-stats')
      setStats(data)
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }, [])

  // 유저 목록 가져오기
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      })
      if (search) {
        params.append('search', search)
      }
      const { data } = await api.get(`/b2b/admin/b2c-users?${params}`)
      setUsers(data.users)
      setTotalUsers(data.total)
      setHasMore(data.has_more)
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    if (company?.is_admin) {
      fetchStats()
      fetchUsers()
    }
  }, [company, fetchStats, fetchUsers])

  // 검색 디바운스
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // 유저 상세 정보 가져오기
  const fetchUserDetail = async (userId: string) => {
    try {
      setDetailLoading(true)
      setActiveTab('info')
      setActivities([])
      const { data } = await api.get(`/b2b/admin/b2c-users/${userId}`)
      setSelectedUser(data)
    } catch (err) {
      console.error('Failed to fetch user detail:', err)
    } finally {
      setDetailLoading(false)
    }
  }

  // 유저 활동 내역 가져오기
  const fetchUserActivities = async (userId: string) => {
    try {
      setActivitiesLoading(true)
      const { data } = await api.get(`/b2b/admin/b2c-users/${userId}/activities?limit=30`)
      setActivities(data.activities)
    } catch (err) {
      console.error('Failed to fetch user activities:', err)
    } finally {
      setActivitiesLoading(false)
    }
  }

  // 탭 변경 시 활동 내역 로드
  const handleTabChange = (tab: 'info' | 'activities') => {
    setActiveTab(tab)
    if (tab === 'activities' && selectedUser && activities.length === 0) {
      fetchUserActivities(selectedUser.user_id)
    }
  }

  // 유저 비활성화
  const handleDeactivate = async (userId: string) => {
    if (!confirm('정말 이 유저를 비활성화하시겠습니까?')) return
    try {
      setActionLoading(userId)
      await api.patch(`/b2b/admin/b2c-users/${userId}/deactivate`)
      fetchUsers()
      fetchStats()
      if (selectedUser?.user_id === userId) {
        fetchUserDetail(userId)
      }
    } catch (err) {
      console.error('Failed to deactivate user:', err)
      alert('유저 비활성화에 실패했습니다.')
    } finally {
      setActionLoading(null)
    }
  }

  // 유저 활성화
  const handleActivate = async (userId: string) => {
    if (!confirm('이 유저를 다시 활성화하시겠습니까?')) return
    try {
      setActionLoading(userId)
      await api.patch(`/b2b/admin/b2c-users/${userId}/activate`)
      fetchUsers()
      fetchStats()
      if (selectedUser?.user_id === userId) {
        fetchUserDetail(userId)
      }
    } catch (err) {
      console.error('Failed to activate user:', err)
      alert('유저 활성화에 실패했습니다.')
    } finally {
      setActionLoading(null)
    }
  }

  // 날짜 포맷
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 권한 없을 때
  if (!company?.is_admin) {
    return null
  }

  if (loading && !users.length) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  const totalPages = Math.ceil(totalUsers / pageSize)

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 lg:mb-8">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg lg:text-xl font-semibold text-white">B2C 유저 관리</h1>
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">Admin</span>
          </div>
          <p className="text-xs lg:text-sm text-gray-500 mt-1">무비서 B2C 앱 사용자를 조회하고 관리합니다</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
          <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
            <p className="text-[10px] lg:text-xs text-gray-500 mb-2">전체 유저</p>
            <p className="text-xl lg:text-2xl font-semibold text-white">{stats.total_users.toLocaleString()}</p>
          </div>
          <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
            <p className="text-[10px] lg:text-xs text-gray-500 mb-2">활성 유저</p>
            <p className="text-xl lg:text-2xl font-semibold text-green-400">{stats.active_users.toLocaleString()}</p>
          </div>
          <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
            <p className="text-[10px] lg:text-xs text-gray-500 mb-2">이메일 인증</p>
            <p className="text-xl lg:text-2xl font-semibold text-blue-400">{stats.verified_users.toLocaleString()}</p>
          </div>
          <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
            <p className="text-[10px] lg:text-xs text-gray-500 mb-2">온보딩 완료</p>
            <p className="text-xl lg:text-2xl font-semibold text-cyan-400">{stats.onboarded_users.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* 가입 통계 */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 lg:gap-4 mb-6">
          <div className="bg-[#16161d] rounded-xl p-4 lg:p-5 text-center">
            <p className="text-[10px] lg:text-xs text-gray-500 mb-1">오늘 가입</p>
            <p className="text-lg lg:text-xl font-semibold text-white">{stats.today_signups}</p>
          </div>
          <div className="bg-[#16161d] rounded-xl p-4 lg:p-5 text-center">
            <p className="text-[10px] lg:text-xs text-gray-500 mb-1">이번 주</p>
            <p className="text-lg lg:text-xl font-semibold text-white">{stats.weekly_signups}</p>
          </div>
          <div className="bg-[#16161d] rounded-xl p-4 lg:p-5 text-center">
            <p className="text-[10px] lg:text-xs text-gray-500 mb-1">이번 달</p>
            <p className="text-lg lg:text-xl font-semibold text-white">{stats.monthly_signups}</p>
          </div>
        </div>
      )}

      {/* User List */}
      <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-medium text-white">유저 목록 ({totalUsers.toLocaleString()}명)</h2>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="이메일 또는 닉네임 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-48 lg:w-64 pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[10px] lg:text-xs text-gray-500 border-b border-white/5">
                <th className="pb-3 font-medium">닉네임</th>
                <th className="pb-3 font-medium hidden md:table-cell">이메일</th>
                <th className="pb-3 font-medium hidden lg:table-cell">가입일</th>
                <th className="pb-3 font-medium">인증</th>
                <th className="pb-3 font-medium hidden sm:table-cell">온보딩</th>
                <th className="pb-3 font-medium text-right">상태</th>
                <th className="pb-3 font-medium text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((user) => (
                <tr key={user.user_id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 lg:py-4">
                    <button
                      onClick={() => fetchUserDetail(user.user_id)}
                      className="flex items-center gap-2 lg:gap-3 hover:underline"
                    >
                      <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-[10px] lg:text-sm font-medium flex-shrink-0">
                        {user.nickname?.charAt(0) || '?'}
                      </div>
                      <span className="text-xs lg:text-sm font-medium text-white truncate max-w-[80px] lg:max-w-none">
                        {user.nickname || '(없음)'}
                      </span>
                    </button>
                  </td>
                  <td className="py-3 lg:py-4 text-xs lg:text-sm text-blue-400 hidden md:table-cell truncate max-w-[150px]">
                    {user.email}
                  </td>
                  <td className="py-3 lg:py-4 text-xs lg:text-sm text-gray-500 hidden lg:table-cell whitespace-nowrap">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="py-3 lg:py-4">
                    {user.is_email_verified ? (
                      <span className="inline-flex items-center gap-1 text-green-400 text-xs">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </span>
                    ) : (
                      <span className="text-gray-500 text-xs">-</span>
                    )}
                  </td>
                  <td className="py-3 lg:py-4 hidden sm:table-cell">
                    {user.onboarding_completed ? (
                      <span className="inline-flex items-center gap-1 text-cyan-400 text-xs">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </span>
                    ) : (
                      <span className="text-gray-500 text-xs">-</span>
                    )}
                  </td>
                  <td className="py-3 lg:py-4 text-right">
                    <span
                      className={`inline-flex items-center gap-1 lg:gap-1.5 px-1.5 lg:px-2.5 py-0.5 lg:py-1 rounded-full text-[10px] lg:text-xs ${
                        user.deleted_at
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-green-500/10 text-green-400'
                      }`}
                    >
                      <span
                        className={`w-1 h-1 lg:w-1.5 lg:h-1.5 rounded-full ${
                          user.deleted_at ? 'bg-red-400' : 'bg-green-400'
                        }`}
                      />
                      <span className="hidden sm:inline">{user.deleted_at ? '탈퇴' : '활성'}</span>
                    </span>
                  </td>
                  <td className="py-3 lg:py-4 text-right">
                    {user.deleted_at ? (
                      <button
                        onClick={() => handleActivate(user.user_id)}
                        disabled={actionLoading === user.user_id}
                        className="px-2 py-1 text-xs bg-green-500/10 text-green-400 rounded hover:bg-green-500/20 disabled:opacity-50"
                      >
                        {actionLoading === user.user_id ? '...' : '복구'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDeactivate(user.user_id)}
                        disabled={actionLoading === user.user_id}
                        className="px-2 py-1 text-xs bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 disabled:opacity-50"
                      >
                        {actionLoading === user.user_id ? '...' : '비활성화'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && !loading && (
          <div className="py-8 text-center text-gray-500 text-sm">
            {search ? '검색 결과가 없습니다' : '유저가 없습니다'}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-white/5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            <span className="text-xs text-gray-500">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={!hasMore}
              className="px-3 py-1.5 text-xs bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#16161d] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
            {detailLoading ? (
              <div className="p-8 flex items-center justify-center">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
              </div>
            ) : (
              <>
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 lg:p-6 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-lg font-medium">
                      {selectedUser.nickname?.charAt(0) || '?'}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{selectedUser.nickname || '(없음)'}</h3>
                      <p className="text-sm text-gray-500">{selectedUser.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/5">
                  <button
                    onClick={() => handleTabChange('info')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'info'
                        ? 'text-blue-400 border-b-2 border-blue-400'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    기본 정보
                  </button>
                  <button
                    onClick={() => handleTabChange('activities')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'activities'
                        ? 'text-blue-400 border-b-2 border-blue-400'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    활동 내역
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-4 lg:p-6 space-y-4">
                  {activeTab === 'info' ? (
                    <>
                      {/* Status Badges */}
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs ${
                            selectedUser.deleted_at
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-green-500/10 text-green-400'
                          }`}
                        >
                          {selectedUser.deleted_at ? '탈퇴' : '활성'}
                        </span>
                        {selectedUser.is_email_verified && (
                          <span className="px-2.5 py-1 rounded-full text-xs bg-blue-500/10 text-blue-400">
                            이메일 인증 완료
                          </span>
                        )}
                        {selectedUser.onboarding_completed && (
                          <span className="px-2.5 py-1 rounded-full text-xs bg-cyan-500/10 text-cyan-400">
                            온보딩 완료
                          </span>
                        )}
                        <span className="px-2.5 py-1 rounded-full text-xs bg-gray-500/10 text-gray-400">
                          {selectedUser.role}
                        </span>
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-1">가입일</p>
                          <p className="text-sm text-white">{formatDateTime(selectedUser.created_at)}</p>
                        </div>
                        {selectedUser.deleted_at && (
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">탈퇴일</p>
                            <p className="text-sm text-red-400">{formatDateTime(selectedUser.deleted_at)}</p>
                          </div>
                        )}
                        <div className="bg-white/5 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-1">추천 받은 횟수</p>
                          <p className="text-sm text-white">{selectedUser.recommendation_count}회</p>
                        </div>
                        {selectedUser.last_recommendation_at && (
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">마지막 추천</p>
                            <p className="text-sm text-white">{formatDateTime(selectedUser.last_recommendation_at)}</p>
                          </div>
                        )}
                      </div>

                      {/* OTT Subscriptions */}
                      {selectedUser.ott_subscriptions.length > 0 && (
                        <div className="bg-white/5 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-2">구독 중인 OTT</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedUser.ott_subscriptions.map((ott) => {
                              const logoUrl = getOttLogoUrl(ott.provider_name)
                              return (
                                <div
                                  key={ott.provider_name}
                                  className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded"
                                >
                                  {logoUrl ? (
                                    <img
                                      src={logoUrl}
                                      alt={ott.provider_name}
                                      className="w-5 h-5 rounded object-contain"
                                    />
                                  ) : (
                                    <div className="w-5 h-5 rounded bg-purple-500/20 flex items-center justify-center text-[10px] text-purple-400">
                                      {ott.provider_name.charAt(0)}
                                    </div>
                                  )}
                                  <span className="text-xs text-gray-300">{ott.provider_name}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="pt-4 border-t border-white/5 flex gap-3">
                        {selectedUser.deleted_at ? (
                          <button
                            onClick={() => handleActivate(selectedUser.user_id)}
                            disabled={actionLoading === selectedUser.user_id}
                            className="flex-1 py-2.5 bg-green-500/10 text-green-400 rounded-lg text-sm font-medium hover:bg-green-500/20 disabled:opacity-50"
                          >
                            {actionLoading === selectedUser.user_id ? '처리 중...' : '계정 복구'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDeactivate(selectedUser.user_id)}
                            disabled={actionLoading === selectedUser.user_id}
                            className="flex-1 py-2.5 bg-red-500/10 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/20 disabled:opacity-50"
                          >
                            {actionLoading === selectedUser.user_id ? '처리 중...' : '계정 비활성화'}
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedUser(null)}
                          className="flex-1 py-2.5 bg-white/5 text-gray-400 rounded-lg text-sm font-medium hover:bg-white/10"
                        >
                          닫기
                        </button>
                      </div>
                    </>
                  ) : (
                    /* Activities Tab */
                    <div className="space-y-3">
                      {activitiesLoading ? (
                        <div className="py-8 flex items-center justify-center">
                          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                        </div>
                      ) : activities.length === 0 ? (
                        <div className="py-8 text-center text-gray-500 text-sm">
                          활동 내역이 없습니다
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                          {activities.map((activity, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-3 p-3 bg-white/5 rounded-lg"
                            >
                              {/* Activity Icon */}
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                activity.type === 'recommendation'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : activity.type === 'ott_click'
                                  ? 'bg-purple-500/20 text-purple-400'
                                  : activity.type === 'satisfaction_positive'
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {activity.type === 'recommendation' ? (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                  </svg>
                                ) : activity.type === 'ott_click' ? (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                ) : activity.type === 'satisfaction_positive' ? (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                                  </svg>
                                )}
                              </div>

                              {/* Activity Content */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white">{activity.description}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatDateTime(activity.created_at)}
                                </p>
                              </div>

                              {/* Movie Poster */}
                              {activity.movie_poster && (
                                <img
                                  src={`https://image.tmdb.org/t/p/w92${activity.movie_poster}`}
                                  alt={activity.movie_title || ''}
                                  className="w-10 h-14 rounded object-cover flex-shrink-0"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Close Button */}
                      <div className="pt-4 border-t border-white/5">
                        <button
                          onClick={() => setSelectedUser(null)}
                          className="w-full py-2.5 bg-white/5 text-gray-400 rounded-lg text-sm font-medium hover:bg-white/10"
                        >
                          닫기
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
