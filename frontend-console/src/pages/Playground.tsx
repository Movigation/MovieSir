import { useState, useEffect } from 'react'
import { api } from '@/api'

interface ApiKey {
  key_id: number
  key_name: string
  key: string
  is_active: boolean
}

interface Movie {
  movie_id: number
  tmdb_id: number
  title: string
  runtime: number
  genres: string[]
  poster_path: string | null
  vote_average: number
}

interface TrackData {
  label: string
  movies: Movie[]
  total_runtime: number
}

interface ApiResponse {
  success: boolean
  data: {
    track_a: TrackData
    track_b: TrackData
    algorithm: string
  }
  meta: {
    latency_ms: number
    remaining_quota: number
    daily_limit: number
  }
}

const API_BASE_URL = import.meta.env.PROD
  ? 'https://api.moviesir.cloud'
  : 'http://localhost:8000'

const genres = ['액션', '드라마', '코미디', 'SF', '로맨스', '스릴러', '공포', '애니메이션', '범죄', '가족']
const timeOptions = [
  { value: 60, label: '1시간' },
  { value: 90, label: '1시간 30분' },
  { value: 120, label: '2시간' },
  { value: 150, label: '2시간 30분' },
  { value: 180, label: '3시간' },
  { value: 240, label: '4시간' },
  { value: 300, label: '5시간' },
]

export default function Playground() {
  // API Keys
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [selectedKeyId, setSelectedKeyId] = useState<number | null>(null)
  const [loadingKeys, setLoadingKeys] = useState(true)

  // Request Parameters
  const [availableTime, setAvailableTime] = useState(120)
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['액션'])
  const [allowAdult, setAllowAdult] = useState(false)
  const [userMovieIds] = useState<number[]>([1, 2, 3]) // 기본값 (온보딩 영화 ID)

  // Response State
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [responseTime, setResponseTime] = useState<number | null>(null)
  const [response, setResponse] = useState<ApiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch API Keys
  useEffect(() => {
    const fetchApiKeys = async () => {
      try {
        const { data } = await api.get('/b2b/api-keys')
        const activeKeys = data.filter((k: ApiKey) => k.is_active)
        setApiKeys(activeKeys)
        if (activeKeys.length > 0) {
          setSelectedKeyId(activeKeys[0].key_id)
        }
      } catch (err) {
        console.error('Failed to fetch API keys:', err)
      } finally {
        setLoadingKeys(false)
      }
    }
    fetchApiKeys()
  }, [])

  const selectedKey = apiKeys.find(k => k.key_id === selectedKeyId)

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    )
  }

  // Build request body
  const requestBody = {
    user_movie_ids: userMovieIds,
    available_time: availableTime,
    preferred_genres: selectedGenres.length > 0 ? selectedGenres : null,
    preferred_otts: null,
    allow_adult: allowAdult,
    excluded_ids_a: [],
    excluded_ids_b: [],
  }

  // Generate curl command
  const curlCommand = `curl -X POST "${API_BASE_URL}/v1/recommend" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${selectedKey?.key || 'sk-moviesir-xxx'}" \\
  -d '${JSON.stringify(requestBody, null, 2)}'`

  const sendRequest = async () => {
    if (!selectedKey) {
      setError('API 키를 선택해주세요')
      setStatus('error')
      return
    }

    setLoading(true)
    setStatus('loading')
    setError(null)
    setResponse(null)

    const startTime = Date.now()

    try {
      // Direct call to External API with API Key
      const res = await fetch(`${API_BASE_URL}/v1/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': selectedKey.key,
        },
        body: JSON.stringify(requestBody),
      })

      const elapsed = Date.now() - startTime
      setResponseTime(elapsed)

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.detail?.message || data.detail || `HTTP ${res.status}`)
      }

      setResponse(data)
      setStatus('success')
    } catch (err: any) {
      setError(err.message || 'API 호출 실패')
      setStatus('error')
      setResponseTime(Date.now() - startTime)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const allMovies = response?.data
    ? [...(response.data.track_a?.movies || []), ...(response.data.track_b?.movies || [])]
    : []

  if (loadingKeys) {
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
        <div>
          <h1 className="text-lg lg:text-xl font-semibold text-white">Playground</h1>
          <p className="text-xs lg:text-sm text-gray-500 mt-1">API를 직접 테스트해보세요</p>
        </div>
        <span
          className={`px-2.5 py-1 text-xs font-medium rounded-full ${
            status === 'idle'
              ? 'bg-white/5 text-gray-400'
              : status === 'loading'
              ? 'bg-yellow-500/10 text-yellow-400'
              : status === 'success'
              ? 'bg-green-500/10 text-green-400'
              : 'bg-red-500/10 text-red-400'
          }`}
        >
          {status === 'idle' && '대기 중'}
          {status === 'loading' && '요청 중...'}
          {status === 'success' && `200 OK · ${responseTime}ms`}
          {status === 'error' && 'Error'}
        </span>
      </div>

      {/* API Key Warning */}
      {apiKeys.length === 0 && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-sm text-yellow-400">
            활성화된 API 키가 없습니다. API 키 페이지에서 키를 발급받으세요.
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4 lg:gap-6 mb-6">
        {/* Request Panel */}
        <div className="bg-[#16161d] rounded-xl overflow-hidden">
          <div className="px-4 lg:px-5 py-3 lg:py-4 border-b border-white/5 flex justify-between items-center">
            <h3 className="text-sm font-medium text-white">Request</h3>
            <code className="text-xs text-blue-400 font-mono">POST /v1/recommend</code>
          </div>
          <div className="p-4 lg:p-5 space-y-4 lg:space-y-5">
            {/* API Key Selector */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">API Key</label>
              <select
                value={selectedKeyId || ''}
                onChange={e => setSelectedKeyId(Number(e.target.value))}
                className="w-full px-3 lg:px-4 py-2 lg:py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={apiKeys.length === 0}
              >
                {apiKeys.length === 0 ? (
                  <option value="">API 키 없음</option>
                ) : (
                  apiKeys.map(key => (
                    <option key={key.key_id} value={key.key_id}>
                      {key.key_name} ({key.key.slice(0, 20)}...)
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Available Time */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">시청 가능 시간</label>
              <select
                value={availableTime}
                onChange={e => setAvailableTime(Number(e.target.value))}
                className="w-full px-3 lg:px-4 py-2 lg:py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {timeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Genre Selection */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">선호 장르</label>
              <div className="flex flex-wrap gap-2">
                {genres.map(genre => (
                  <button
                    key={genre}
                    onClick={() => toggleGenre(genre)}
                    className={`px-2.5 lg:px-3 py-1 lg:py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      selectedGenres.includes(genre)
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* Allow Adult */}
            <div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowAdult}
                  onChange={e => setAllowAdult(e.target.checked)}
                  className="w-4 h-4 rounded bg-white/5 border-white/10 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-400">성인 콘텐츠 허용</span>
              </label>
            </div>

            {/* Send Button */}
            <button
              onClick={sendRequest}
              disabled={loading || apiKeys.length === 0}
              className="w-full py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  요청 중...
                </span>
              ) : (
                'Send Request'
              )}
            </button>
          </div>
        </div>

        {/* Response Panel */}
        <div className="bg-[#16161d] rounded-xl overflow-hidden">
          <div className="px-4 lg:px-5 py-3 lg:py-4 border-b border-white/5 flex justify-between items-center">
            <h3 className="text-sm font-medium text-white">Response</h3>
            <button
              onClick={() => response && copyToClipboard(JSON.stringify(response, null, 2))}
              disabled={!response}
              className="px-2.5 py-1 text-xs bg-white/5 text-gray-400 rounded hover:text-white disabled:opacity-50 transition-colors"
            >
              복사
            </button>
          </div>
          <div>
            <div className="px-4 py-2 bg-black/20 flex justify-between text-xs text-gray-500 border-b border-white/5">
              <span>application/json</span>
              {response?.meta && (
                <span className="text-gray-400">
                  남은 할당량: {response.meta.remaining_quota?.toLocaleString()} / {response.meta.daily_limit?.toLocaleString()}
                </span>
              )}
            </div>
            <pre className="p-4 font-mono text-xs text-gray-400 overflow-auto max-h-[280px] lg:max-h-[320px]">
              {error ? (
                <span className="text-red-400">{`{\n  "success": false,\n  "error": "${error}"\n}`}</span>
              ) : response ? (
                JSON.stringify(response, null, 2)
              ) : (
                <span className="text-gray-600">{`{\n  "message": "파라미터를 설정하고 Send Request를 클릭하세요"\n}`}</span>
              )}
            </pre>
          </div>
        </div>
      </div>

      {/* cURL Command */}
      <div className="bg-[#16161d] rounded-xl overflow-hidden mb-6">
        <div className="px-4 lg:px-5 py-3 lg:py-4 border-b border-white/5 flex justify-between items-center">
          <h3 className="text-sm font-medium text-white">cURL</h3>
          <button
            onClick={() => copyToClipboard(curlCommand)}
            className="px-2.5 py-1 text-xs bg-white/5 text-gray-400 rounded hover:text-white transition-colors"
          >
            복사
          </button>
        </div>
        <pre className="p-4 font-mono text-xs text-green-400 overflow-auto max-h-[200px]">
          {curlCommand}
        </pre>
      </div>

      {/* Movie Preview */}
      {allMovies.length > 0 && (
        <div className="bg-[#16161d] rounded-xl overflow-hidden">
          <div className="px-4 lg:px-5 py-3 lg:py-4 border-b border-white/5 flex justify-between items-center">
            <h3 className="text-sm font-medium text-white">추천 결과</h3>
            <span className="text-xs text-gray-500">{allMovies.length}개 영화</span>
          </div>
          <div className="p-4 lg:p-5">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 lg:gap-4">
              {allMovies.slice(0, 12).map((movie, i) => (
                <div key={i} className="bg-white/5 rounded-lg overflow-hidden">
                  <div className="aspect-[2/3] bg-white/5">
                    {movie.poster_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w300${movie.poster_path}`}
                        alt={movie.title}
                        className="w-full h-full object-cover"
                        onError={e => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="p-2 lg:p-3">
                    <p className="text-xs font-medium text-white truncate">{movie.title}</p>
                    <p className="text-[10px] lg:text-xs text-gray-500 mt-0.5 lg:mt-1">
                      {movie.runtime}분 · ⭐ {movie.vote_average?.toFixed(1)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
