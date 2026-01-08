import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'

interface User {
  id: string
  name: string
  email: string
  calls: number
  lastActive: string
  status: 'active' | 'away' | 'offline'
  createdAt: string
}

const mockUsers: User[] = [
  { id: '1', name: '김철수', email: 'kim@company.com', calls: 1234, lastActive: '방금 전', status: 'active', createdAt: '2025-01-01' },
  { id: '2', name: '이영희', email: 'lee@company.com', calls: 987, lastActive: '5분 전', status: 'active', createdAt: '2025-01-02' },
  { id: '3', name: '박민수', email: 'park@company.com', calls: 756, lastActive: '1시간 전', status: 'away', createdAt: '2025-01-03' },
  { id: '4', name: '정수진', email: 'jung@company.com', calls: 543, lastActive: '3시간 전', status: 'away', createdAt: '2025-01-04' },
  { id: '5', name: '최동현', email: 'choi@company.com', calls: 321, lastActive: '1일 전', status: 'offline', createdAt: '2025-01-05' },
  { id: '6', name: '강미라', email: 'kang@company.com', calls: 234, lastActive: '2일 전', status: 'offline', createdAt: '2025-01-06' },
  { id: '7', name: '윤서연', email: 'yoon@company.com', calls: 189, lastActive: '3일 전', status: 'offline', createdAt: '2025-01-07' },
  { id: '8', name: '임재혁', email: 'lim@company.com', calls: 145, lastActive: '5일 전', status: 'offline', createdAt: '2025-01-08' },
]

export default function Users() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const { token } = useAuthStore()

  useEffect(() => {
    if (token === 'test-token-12345') {
      setTimeout(() => {
        setUsers(mockUsers)
        setLoading(false)
      }, 300)
      return
    }
    setUsers(mockUsers)
    setLoading(false)
  }, [token])

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
  )

  const activeCount = users.filter((u) => u.status === 'active').length
  const awayCount = users.filter((u) => u.status === 'away').length
  const offlineCount = users.filter((u) => u.status === 'offline').length

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
          <h1 className="text-lg lg:text-xl font-semibold text-white">Users</h1>
          <p className="text-xs lg:text-sm text-gray-500 mt-1 truncate">API를 사용하는 사용자를 관리하세요</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
          <p className="text-[10px] lg:text-xs text-gray-500 mb-2">전체 사용자</p>
          <p className="text-xl lg:text-2xl font-semibold text-white">{users.length}</p>
        </div>
        <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
          <p className="text-[10px] lg:text-xs text-gray-500 mb-2">활성</p>
          <p className="text-xl lg:text-2xl font-semibold text-green-400">{activeCount}</p>
        </div>
        <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
          <p className="text-[10px] lg:text-xs text-gray-500 mb-2">자리 비움</p>
          <p className="text-xl lg:text-2xl font-semibold text-yellow-400">{awayCount}</p>
        </div>
        <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
          <p className="text-[10px] lg:text-xs text-gray-500 mb-2">오프라인</p>
          <p className="text-xl lg:text-2xl font-semibold text-gray-400">{offlineCount}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-medium text-white">사용자 목록</h2>
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
              placeholder="검색..."
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
                <th className="pb-3 font-medium hidden sm:table-cell">NO</th>
                <th className="pb-3 font-medium">이름</th>
                <th className="pb-3 font-medium hidden md:table-cell">이메일</th>
                <th className="pb-3 font-medium">호출</th>
                <th className="pb-3 font-medium hidden lg:table-cell">가입일</th>
                <th className="pb-3 font-medium hidden sm:table-cell">마지막 활동</th>
                <th className="pb-3 font-medium text-right">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map((user, i) => (
                <tr key={user.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 lg:py-4 text-xs lg:text-sm text-gray-500 hidden sm:table-cell">#{String(i + 1).padStart(2, '0')}</td>
                  <td className="py-3 lg:py-4">
                    <div className="flex items-center gap-2 lg:gap-3">
                      <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-[10px] lg:text-sm font-medium flex-shrink-0">
                        {user.name.charAt(0)}
                      </div>
                      <span className="text-xs lg:text-sm font-medium text-white truncate max-w-[80px] lg:max-w-none">{user.name}</span>
                    </div>
                  </td>
                  <td className="py-3 lg:py-4 text-xs lg:text-sm text-blue-400 hidden md:table-cell truncate max-w-[120px]">{user.email}</td>
                  <td className="py-3 lg:py-4 text-xs lg:text-sm text-gray-400">{user.calls.toLocaleString()}</td>
                  <td className="py-3 lg:py-4 text-xs lg:text-sm text-gray-500 hidden lg:table-cell whitespace-nowrap">{user.createdAt}</td>
                  <td className="py-3 lg:py-4 text-xs lg:text-sm text-gray-500 hidden sm:table-cell whitespace-nowrap">{user.lastActive}</td>
                  <td className="py-3 lg:py-4 text-right">
                    <span
                      className={`inline-flex items-center gap-1 lg:gap-1.5 px-1.5 lg:px-2.5 py-0.5 lg:py-1 rounded-full text-[10px] lg:text-xs ${
                        user.status === 'active'
                          ? 'bg-green-500/10 text-green-400'
                          : user.status === 'away'
                          ? 'bg-yellow-500/10 text-yellow-400'
                          : 'bg-gray-500/10 text-gray-400'
                      }`}
                    >
                      <span
                        className={`w-1 h-1 lg:w-1.5 lg:h-1.5 rounded-full ${
                          user.status === 'active'
                            ? 'bg-green-400'
                            : user.status === 'away'
                            ? 'bg-yellow-400'
                            : 'bg-gray-400'
                        }`}
                      />
                      <span className="hidden sm:inline">{user.status === 'active' ? 'Active' : user.status === 'away' ? 'Away' : 'Offline'}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="py-8 text-center text-gray-500 text-sm">검색 결과가 없습니다</div>
        )}
      </div>
    </div>
  )
}
