import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api'
import { useAuthStore } from '@/stores/authStore'

interface ApiKey {
  id: string
  name: string
  key: string
  daily_limit: number
  is_active: boolean
  created_at: string
}

export default function ApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [newKeyName, setNewKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const { token } = useAuthStore()
  const navigate = useNavigate()

  // 원본 키인지 확인 (마스킹되지 않은 키)
  const isRawKey = (key: string) => key.startsWith('sk-moviesir-') && !key.includes('*')

  // Playground에서 테스트
  const testInPlayground = (key: string) => {
    sessionStorage.setItem('playground_api_key_temp', key)
    navigate('/console/playground')
  }

  const loadKeys = async () => {
    try {
      const { data } = await api.get('/b2b/api-keys')
      setKeys(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadKeys()
  }, [token])

  const createKey = async () => {
    if (!newKeyName.trim()) return
    setCreating(true)

    try {
      const { data } = await api.post('/b2b/api-keys', { name: newKeyName })
      // 새로 발급된 키를 목록 맨 앞에 추가 (원본 키 포함)
      setKeys([data, ...keys])
      setNewKeyName('')
    } catch (err) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  const deactivateKey = async (id: string) => {
    if (!confirm('이 API 키를 비활성화하시겠습니까?')) return

    try {
      await api.delete(`/b2b/api-keys/${id}`)
      loadKeys()
    } catch (err) {
      console.error(err)
    }
  }

  const copyToClipboard = (key: string, id: string) => {
    navigator.clipboard.writeText(key)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

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
      <div className="mb-6 lg:mb-8">
        <h1 className="text-lg lg:text-xl font-semibold text-white">API Keys</h1>
        <p className="text-xs lg:text-sm text-gray-500 mt-1">API 호출에 사용할 키를 관리하세요</p>
      </div>

      {/* Create New Key */}
      <div className="bg-[#16161d] rounded-xl p-4 lg:p-5 mb-4 lg:mb-6">
        <h2 className="text-sm font-medium text-white mb-3 lg:mb-4">새 API 키 발급</h2>
        <div className="flex flex-col sm:flex-row gap-2 lg:gap-3">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="키 이름 (예: Production)"
            className="flex-1 px-3 lg:px-4 py-2 lg:py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={createKey}
            disabled={creating || !newKeyName.trim()}
            className="px-4 lg:px-5 py-2 lg:py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {creating ? '생성 중...' : '발급'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 lg:gap-4 mb-4 lg:mb-6">
        <div className="bg-[#16161d] rounded-xl p-3 lg:p-5">
          <p className="text-[10px] lg:text-xs text-gray-500 mb-1 lg:mb-2">전체 키</p>
          <p className="text-lg lg:text-2xl font-semibold text-white">{keys.length}</p>
        </div>
        <div className="bg-[#16161d] rounded-xl p-3 lg:p-5">
          <p className="text-[10px] lg:text-xs text-gray-500 mb-1 lg:mb-2">활성 키</p>
          <p className="text-lg lg:text-2xl font-semibold text-green-400">{keys.filter(k => k.is_active).length}</p>
        </div>
        <div className="bg-[#16161d] rounded-xl p-3 lg:p-5">
          <p className="text-[10px] lg:text-xs text-gray-500 mb-1 lg:mb-2">비활성 키</p>
          <p className="text-lg lg:text-2xl font-semibold text-gray-400">{keys.filter(k => !k.is_active).length}</p>
        </div>
      </div>

      {/* Keys Table */}
      <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
        <h2 className="text-sm font-medium text-white mb-3 lg:mb-4">발급된 API 키</h2>

        {keys.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-xs lg:text-sm">
            아직 API 키가 없습니다. 위에서 새 키를 발급하세요.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[10px] lg:text-xs text-gray-500 border-b border-white/5">
                  <th className="pb-3 font-medium">이름</th>
                  <th className="pb-3 font-medium">API 키</th>
                  <th className="pb-3 font-medium hidden sm:table-cell">일일 한도</th>
                  <th className="pb-3 font-medium hidden sm:table-cell">생성일</th>
                  <th className="pb-3 font-medium text-right">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {keys.map((key) => (
                  <tr key={key.id}>
                    <td className="py-3 lg:py-4">
                      <span className="text-xs lg:text-sm font-medium text-white">{key.name}</span>
                    </td>
                    <td className="py-3 lg:py-4">
                      <div className="flex items-center gap-1.5 lg:gap-2">
                        <code className="text-[10px] lg:text-xs bg-white/5 px-1.5 lg:px-2.5 py-1 lg:py-1.5 rounded font-mono text-gray-400">
                          <span className="lg:hidden">{key.key.substring(0, 16)}...</span>
                          <span className="hidden lg:inline">{key.key}</span>
                        </code>
                        <button
                          onClick={() => copyToClipboard(key.key, key.id)}
                          className={`p-1 lg:p-1.5 rounded transition-colors flex-shrink-0 ${
                            copiedId === key.id
                              ? 'text-green-400'
                              : 'text-gray-500 hover:text-white'
                          }`}
                          title="복사"
                        >
                          {copiedId === key.id ? (
                            <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                        {isRawKey(key.key) && (
                          <button
                            onClick={() => testInPlayground(key.key)}
                            className="p-1 lg:p-1.5 rounded transition-colors flex-shrink-0 text-blue-400 hover:text-blue-300"
                            title="Playground에서 테스트"
                          >
                            <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 lg:py-4 text-xs lg:text-sm text-gray-400 hidden sm:table-cell whitespace-nowrap">
                      {key.daily_limit.toLocaleString()}회
                    </td>
                    <td className="py-3 lg:py-4 text-xs lg:text-sm text-gray-400 hidden sm:table-cell whitespace-nowrap">
                      {new Date(key.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="py-3 lg:py-4 text-right">
                      <div className="flex items-center justify-end gap-2 lg:gap-3">
                        <span className={`inline-flex items-center gap-1 lg:gap-1.5 px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-full text-[10px] lg:text-xs ${
                          key.is_active
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-gray-500/10 text-gray-400'
                        }`}>
                          <span className={`w-1 h-1 lg:w-1.5 lg:h-1.5 rounded-full ${
                            key.is_active ? 'bg-green-400' : 'bg-gray-400'
                          }`} />
                          <span className="hidden sm:inline">{key.is_active ? '활성' : '비활성'}</span>
                        </span>
                        {key.is_active && (
                          <button
                            onClick={() => deactivateKey(key.id)}
                            className="text-[10px] lg:text-xs text-red-400 hover:text-red-300 hidden sm:inline"
                          >
                            비활성화
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* API Key Usage Guide */}
      <div className="mt-4 lg:mt-6 bg-[#16161d] rounded-xl p-4 lg:p-5">
        <h3 className="text-sm font-medium text-white mb-2 lg:mb-3">API 키 사용 방법</h3>
        <code className="block bg-white/5 p-3 lg:p-4 rounded-lg text-[9px] lg:text-xs font-mono text-gray-400 overflow-x-auto custom-scrollbar">
          curl -X POST https://api.moviesir.cloud/v1/recommend \<br />
          &nbsp;&nbsp;-H "X-API-Key: YOUR_API_KEY" \<br />
          &nbsp;&nbsp;-H "Content-Type: application/json" \<br />
          &nbsp;&nbsp;-d '&#123;"genres": ["액션"], "limit": 10&#125;'
        </code>
      </div>
    </div>
  )
}
