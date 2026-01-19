import { useState } from 'react'

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

const genres = ['드라마', '코미디', '스릴러', '로맨스', '액션', '다큐멘터리', '공포', '범죄', '모험', '가족', 'SF', '미스터리', 'TV 영화', '애니메이션', '판타지', '음악']

// 지원 언어 목록
type Language = 'curl' | 'python' | 'javascript' | 'nodejs' | 'go' | 'java' | 'php' | 'ruby'

const languages: { id: Language; name: string; color: string }[] = [
  { id: 'curl', name: 'cURL', color: 'text-green-400' },
  { id: 'python', name: 'Python', color: 'text-yellow-400' },
  { id: 'javascript', name: 'JavaScript', color: 'text-yellow-300' },
  { id: 'nodejs', name: 'Node.js', color: 'text-green-500' },
  { id: 'go', name: 'Go', color: 'text-cyan-400' },
  { id: 'java', name: 'Java', color: 'text-orange-400' },
  { id: 'php', name: 'PHP', color: 'text-purple-400' },
  { id: 'ruby', name: 'Ruby', color: 'text-red-400' },
]

export default function Playground() {
  // API Key (수동 입력 필수, localStorage에 저장 가능)
  const [manualApiKey, setManualApiKey] = useState(() => {
    // 1. API Keys 페이지에서 넘어온 임시 키 확인 (sessionStorage)
    const tempKey = sessionStorage.getItem('playground_api_key_temp')
    if (tempKey) {
      sessionStorage.removeItem('playground_api_key_temp') // 사용 후 삭제
      return tempKey
    }
    // 2. 저장된 키 확인 (localStorage)
    return localStorage.getItem('playground_api_key') || ''
  })
  const [rememberKey, setRememberKey] = useState(() => {
    return localStorage.getItem('playground_api_key') !== null
  })

  // API 키 저장/삭제
  const handleApiKeyChange = (value: string) => {
    setManualApiKey(value)
    if (rememberKey) {
      localStorage.setItem('playground_api_key', value)
    }
  }

  const handleRememberChange = (checked: boolean) => {
    setRememberKey(checked)
    if (checked && manualApiKey) {
      localStorage.setItem('playground_api_key', manualApiKey)
    } else {
      localStorage.removeItem('playground_api_key')
    }
  }

  // Request Parameters
  const [hours, setHours] = useState(2)
  const [minutes, setMinutes] = useState(0)
  const availableTime = hours * 60 + minutes
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['액션'])
  const [allowAdult, setAllowAdult] = useState(false)
  const [userMovieIds] = useState<number[]>([1, 2, 3]) // 기본값 (온보딩 영화 ID)

  // Response State
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [responseTime, setResponseTime] = useState<number | null>(null)
  const [response, setResponse] = useState<ApiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Code Example Language
  const [selectedLang, setSelectedLang] = useState<Language>('curl')

  // API 키는 보안상 마스킹되어 저장되므로 수동 입력 필수
  const effectiveApiKey = manualApiKey.trim()

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

  // Generate code example for each language
  const getCodeExample = (lang: Language): string => {
    const apiKey = effectiveApiKey || 'sk-moviesir-xxx'
    const bodyJson = JSON.stringify(requestBody, null, 2)
    const bodyJsonIndented = JSON.stringify(requestBody, null, 4)

    switch (lang) {
      case 'curl':
        return `curl -X POST "${API_BASE_URL}/v1/recommend" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey}" \\
  -d '${bodyJson}'`

      case 'python':
        return `import requests

url = "${API_BASE_URL}/v1/recommend"
headers = {
    "Content-Type": "application/json",
    "X-API-Key": "${apiKey}"
}
data = ${bodyJson.replace(/null/g, 'None').replace(/true/g, 'True').replace(/false/g, 'False')}

response = requests.post(url, json=data, headers=headers)
print(response.json())`

      case 'javascript':
        return `fetch("${API_BASE_URL}/v1/recommend", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "${apiKey}"
  },
  body: JSON.stringify(${bodyJson})
})
  .then(res => res.json())
  .then(data => console.log(data));`

      case 'nodejs':
        return `const axios = require('axios');

axios.post('${API_BASE_URL}/v1/recommend', ${bodyJson}, {
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': '${apiKey}'
  }
})
  .then(res => console.log(res.data))
  .catch(err => console.error(err));`

      case 'go':
        return `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "io"
)

func main() {
    data := map[string]interface{}{
        "user_movie_ids":   []int{${userMovieIds.join(', ')}},
        "available_time":   ${availableTime},
        "preferred_genres": ${selectedGenres.length > 0 ? JSON.stringify(selectedGenres) : 'nil'},
        "preferred_otts":   nil,
        "allow_adult":      ${allowAdult},
        "excluded_ids_a":   []int{},
        "excluded_ids_b":   []int{},
    }
    jsonData, _ := json.Marshal(data)

    req, _ := http.NewRequest("POST", "${API_BASE_URL}/v1/recommend", bytes.NewBuffer(jsonData))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("X-API-Key", "${apiKey}")

    client := &http.Client{}
    resp, _ := client.Do(req)
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)
    fmt.Println(string(body))
}`

      case 'java':
        return `import java.net.http.*;
import java.net.URI;

public class MovieSirAPI {
    public static void main(String[] args) throws Exception {
        String json = """
            ${bodyJsonIndented}
            """;

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("${API_BASE_URL}/v1/recommend"))
            .header("Content-Type", "application/json")
            .header("X-API-Key", "${apiKey}")
            .POST(HttpRequest.BodyPublishers.ofString(json))
            .build();

        HttpResponse<String> response = client.send(request,
            HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}`

      case 'php':
        return `<?php
$url = '${API_BASE_URL}/v1/recommend';
$data = ${bodyJson};

$options = [
    'http' => [
        'method' => 'POST',
        'header' => [
            'Content-Type: application/json',
            'X-API-Key: ${apiKey}'
        ],
        'content' => json_encode($data)
    ]
];

$context = stream_context_create($options);
$response = file_get_contents($url, false, $context);
echo $response;
?>`

      case 'ruby':
        return `require 'net/http'
require 'json'
require 'uri'

uri = URI('${API_BASE_URL}/v1/recommend')
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = true

request = Net::HTTP::Post.new(uri)
request['Content-Type'] = 'application/json'
request['X-API-Key'] = '${apiKey}'
request.body = ${bodyJson}.to_json

response = http.request(request)
puts response.body`

      default:
        return ''
    }
  }

  const sendRequest = async () => {
    if (!effectiveApiKey) {
      setError('API 키를 입력해주세요')
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
          'X-API-Key': effectiveApiKey,
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

      <div className="grid lg:grid-cols-2 gap-4 lg:gap-6 mb-6">
        {/* Request Panel */}
        <div className="bg-[#16161d] rounded-xl overflow-hidden">
          <div className="px-4 lg:px-5 py-3 lg:py-4 border-b border-white/5 flex justify-between items-center">
            <h3 className="text-sm font-medium text-white">Request</h3>
            <code className="text-xs text-blue-400 font-mono">POST /v1/recommend</code>
          </div>
          <div className="p-4 lg:p-5 space-y-4 lg:space-y-5">
            {/* API Key Input */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">API Key <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={manualApiKey}
                onChange={e => handleApiKeyChange(e.target.value)}
                placeholder="sk-moviesir-xxxx..."
                className={`w-full px-3 lg:px-4 py-2 lg:py-2.5 bg-white/5 border rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-600 ${
                  !effectiveApiKey ? 'border-yellow-500/50' : 'border-white/10'
                }`}
              />
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberKey}
                  onChange={e => handleRememberChange(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-white/5 border-white/10 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-[11px] text-gray-400">이 브라우저에 API 키 저장</span>
              </label>
              {!effectiveApiKey && (
                <p className="text-[10px] text-yellow-500 mt-1.5">
                  ⚠️ API Keys 페이지에서 키 발급 시 표시되는 원본 키를 입력하세요
                </p>
              )}
            </div>

            {/* Available Time */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">시청 가능 시간</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={2}
                  max={12}
                  value={hours}
                  onChange={e => setHours(Math.min(12, Math.max(2, Number(e.target.value))))}
                  className="w-20 px-3 py-2 lg:py-2.5 bg-[#1f1f28] border border-white/10 rounded-lg text-white text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-xs text-gray-400">시간</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={minutes}
                  onChange={e => setMinutes(Math.min(59, Math.max(0, Number(e.target.value))))}
                  className="w-20 px-3 py-2 lg:py-2.5 bg-[#1f1f28] border border-white/10 rounded-lg text-white text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-xs text-gray-400">분</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1.5">2시간 ~ 12시간 59분</p>
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
              disabled={loading || !effectiveApiKey}
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

      {/* Code Examples */}
      <div className="bg-[#16161d] rounded-xl overflow-hidden mb-6">
        <div className="px-4 lg:px-5 py-3 lg:py-4 border-b border-white/5 flex justify-between items-center">
          <h3 className="text-sm font-medium text-white">Code Example</h3>
          <button
            onClick={() => copyToClipboard(getCodeExample(selectedLang))}
            className="px-2.5 py-1 text-xs bg-white/5 text-gray-400 rounded hover:text-white transition-colors"
          >
            복사
          </button>
        </div>
        {/* Language Tabs */}
        <div className="px-4 lg:px-5 py-2 border-b border-white/5 flex gap-1 overflow-x-auto">
          {languages.map(lang => (
            <button
              key={lang.id}
              onClick={() => setSelectedLang(lang.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedLang === lang.id
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              {lang.name}
            </button>
          ))}
        </div>
        <pre className={`p-4 font-mono text-xs overflow-auto max-h-[300px] ${
          languages.find(l => l.id === selectedLang)?.color || 'text-gray-400'
        }`}>
          {getCodeExample(selectedLang)}
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
