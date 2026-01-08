import { useState } from 'react'
import { api } from '@/api'
import { useAuthStore } from '@/stores/authStore'

interface Movie {
  tmdb_id: number
  title: string
  release_year: number
  rating: number
  poster_url: string
  runtime: number
}

interface TrackData {
  label: string
  movies: Movie[]
}

interface ApiResponse {
  success: boolean
  data: {
    track_a: TrackData
    track_b: TrackData
  }
  meta: {
    request_id: string
    processing_time_ms: number
  }
}

const genres = ['액션', '드라마', '코미디', 'SF', '로맨스', '스릴러', '공포', '애니메이션']
const runtimeOptions = [
  { value: 60, label: '1시간' },
  { value: 90, label: '1시간 30분' },
  { value: 120, label: '2시간' },
  { value: 150, label: '2시간 30분' },
  { value: 180, label: '3시간' },
  { value: 240, label: '4시간 이상' },
]

// Mock response for test mode
const mockResponse: ApiResponse = {
  success: true,
  data: {
    track_a: {
      label: '인기 영화',
      movies: [
        { tmdb_id: 1, title: '인터스텔라', release_year: 2014, rating: 8.6, poster_url: '', runtime: 169 },
        { tmdb_id: 2, title: '다크 나이트', release_year: 2008, rating: 9.0, poster_url: '', runtime: 152 },
        { tmdb_id: 3, title: '인셉션', release_year: 2010, rating: 8.8, poster_url: '', runtime: 148 },
      ],
    },
    track_b: {
      label: '추천 영화',
      movies: [
        { tmdb_id: 4, title: '매드맥스: 분노의 도로', release_year: 2015, rating: 8.1, poster_url: '', runtime: 120 },
        { tmdb_id: 5, title: '존 윅', release_year: 2014, rating: 7.4, poster_url: '', runtime: 101 },
        { tmdb_id: 6, title: '미션 임파서블', release_year: 2018, rating: 7.7, poster_url: '', runtime: 147 },
      ],
    },
  },
  meta: {
    request_id: 'test-req-123',
    processing_time_ms: 234,
  },
}

export default function Playground() {
  const [runtimeLimit, setRuntimeLimit] = useState(120)
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['액션'])
  const [excludeAdult, setExcludeAdult] = useState(true)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [responseTime, setResponseTime] = useState<number | null>(null)
  const [response, setResponse] = useState<ApiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { token } = useAuthStore()

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    )
  }

  const sendRequest = async () => {
    setLoading(true)
    setStatus('loading')
    setError(null)

    const startTime = Date.now()

    if (token === 'test-token-12345') {
      setTimeout(() => {
        setResponseTime(234)
        setResponse(mockResponse)
        setStatus('success')
        setLoading(false)
      }, 500)
      return
    }

    try {
      const { data } = await api.post('/b2b/recommend', {
        runtime_limit: runtimeLimit,
        genres: selectedGenres,
        exclude_adult: excludeAdult,
      })

      const elapsed = Date.now() - startTime
      setResponseTime(elapsed)
      setResponse(data)
      setStatus('success')
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'API 호출 실패')
      setStatus('error')
      setResponseTime(Date.now() - startTime)
    } finally {
      setLoading(false)
    }
  }

  const copyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response, null, 2))
    }
  }

  const allMovies = response?.data
    ? [...response.data.track_a.movies, ...response.data.track_b.movies]
    : []

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-white">Playground</h1>
          <p className="text-sm text-gray-500 mt-1">API를 직접 테스트해보세요</p>
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
          {status === 'success' && '200 OK'}
          {status === 'error' && 'Error'}
        </span>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Request Panel */}
        <div className="bg-[#16161d] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex justify-between items-center">
            <h3 className="text-sm font-medium text-white">Request</h3>
            <code className="text-xs text-blue-400 font-mono">POST /v1/recommend</code>
          </div>
          <div className="p-5 space-y-5">
            <div>
              <label className="block text-xs text-gray-500 mb-2">시간 제한</label>
              <select
                value={runtimeLimit}
                onChange={e => setRuntimeLimit(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {runtimeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-2">장르 선택</label>
              <div className="flex flex-wrap gap-2">
                {genres.map(genre => (
                  <button
                    key={genre}
                    onClick={() => toggleGenre(genre)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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

            <div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={excludeAdult}
                  onChange={e => setExcludeAdult(e.target.checked)}
                  className="w-4 h-4 rounded bg-white/5 border-white/10 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-400">성인 콘텐츠 제외</span>
              </label>
            </div>

            <button
              onClick={sendRequest}
              disabled={loading || selectedGenres.length === 0}
              className="w-full py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  요청 중...
                </span>
              ) : (
                'API 호출'
              )}
            </button>
          </div>
        </div>

        {/* Response Panel */}
        <div className="bg-[#16161d] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex justify-between items-center">
            <h3 className="text-sm font-medium text-white">Response</h3>
            <button
              onClick={copyResponse}
              disabled={!response}
              className="px-2.5 py-1 text-xs bg-white/5 text-gray-400 rounded hover:text-white disabled:opacity-50 transition-colors"
            >
              복사
            </button>
          </div>
          <div>
            <div className="px-4 py-2 bg-black/20 flex justify-between text-xs text-gray-500 border-b border-white/5">
              <span>application/json</span>
              {responseTime && <span className="text-green-400">{responseTime}ms</span>}
            </div>
            <pre className="p-4 font-mono text-xs text-gray-400 overflow-auto max-h-[300px]">
              {error ? (
                <span className="text-red-400">{`{\n  "error": "${error}"\n}`}</span>
              ) : response ? (
                JSON.stringify(response, null, 2)
              ) : (
                <span className="text-gray-600">{`{\n  "message": "파라미터를 설정하고 API 호출 버튼을 클릭하세요"\n}`}</span>
              )}
            </pre>
          </div>
        </div>
      </div>

      {/* Movie Preview */}
      <div className="bg-[#16161d] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <h3 className="text-sm font-medium text-white">추천 결과 미리보기</h3>
        </div>
        <div className="p-5">
          {allMovies.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {allMovies.map((movie, i) => (
                <div
                  key={i}
                  className="bg-white/5 rounded-lg overflow-hidden"
                >
                  <div className="aspect-[2/3] bg-white/5">
                    {movie.poster_url ? (
                      <img
                        src={movie.poster_url}
                        alt={movie.title}
                        className="w-full h-full object-cover"
                        onError={e => {
                          ;(e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-medium text-white truncate">{movie.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {movie.release_year} · ⭐ {movie.rating}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-xs text-center py-8">
              API 호출 후 추천된 영화가 여기에 표시됩니다
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
