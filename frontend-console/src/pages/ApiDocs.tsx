import { useState } from 'react'

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

const getCodeExample = (lang: Language, method: string, path: string, isPost: boolean): string => {
  const url = `https://api.moviesir.cloud${path}`
  const body = isPost ? '{"genres": ["액션"], "limit": 10}' : ''

  switch (lang) {
    case 'curl':
      return `curl -X ${method} "${url}" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"${isPost ? ` \\
  -d '${body}'` : ''}`

    case 'python':
      return `import requests

response = requests.${method.toLowerCase()}(
    "${url}",
    headers={
        "X-API-Key": "YOUR_API_KEY",
        "Content-Type": "application/json"
    }${isPost ? `,
    json=${body.replace(/"/g, '"')}` : ''}
)

data = response.json()
print(data)`

    case 'javascript':
      return `const response = await fetch("${url}", {
  method: "${method}",
  headers: {
    "X-API-Key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }${isPost ? `,
  body: JSON.stringify(${body})` : ''}
});

const data = await response.json();
console.log(data);`

    case 'nodejs':
      return `const axios = require('axios');

const response = await axios.${method.toLowerCase()}(
  "${url}",
  ${isPost ? `${body},
  ` : ''}{
    headers: {
      "X-API-Key": "YOUR_API_KEY",
      "Content-Type": "application/json"
    }
  }
);

console.log(response.data);`

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
    ${isPost ? `body := []byte(\`${body}\`)
    req, _ := http.NewRequest("${method}", "${url}", bytes.NewBuffer(body))` : `req, _ := http.NewRequest("${method}", "${url}", nil)`}

    req.Header.Set("X-API-Key", "YOUR_API_KEY")
    req.Header.Set("Content-Type", "application/json")

    client := &http.Client{}
    resp, _ := client.Do(req)
    defer resp.Body.Close()

    data, _ := io.ReadAll(resp.Body)
    fmt.Println(string(data))
}`

    case 'java':
      return `import java.net.http.*;
import java.net.URI;

HttpClient client = HttpClient.newHttpClient();

HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("${url}"))
    .header("X-API-Key", "YOUR_API_KEY")
    .header("Content-Type", "application/json")
    ${isPost ? `.POST(HttpRequest.BodyPublishers.ofString("${body.replace(/"/g, '\\"')}"))` : `.GET()`}
    .build();

HttpResponse<String> response = client.send(
    request,
    HttpResponse.BodyHandlers.ofString()
);

System.out.println(response.body());`

    case 'php':
      return `<?php
$curl = curl_init();

curl_setopt_array($curl, [
    CURLOPT_URL => "${url}",
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => "${method}",
    CURLOPT_HTTPHEADER => [
        "X-API-Key: YOUR_API_KEY",
        "Content-Type: application/json"
    ]${isPost ? `,
    CURLOPT_POSTFIELDS => '${body}'` : ''}
]);

$response = curl_exec($curl);
curl_close($curl);

$data = json_decode($response, true);
print_r($data);`

    case 'ruby':
      return `require 'net/http'
require 'json'

uri = URI("${url}")
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = true

request = Net::HTTP::${method === 'GET' ? 'Get' : 'Post'}.new(uri)
request["X-API-Key"] = "YOUR_API_KEY"
request["Content-Type"] = "application/json"
${isPost ? `request.body = '${body}'` : ''}

response = http.request(request)
data = JSON.parse(response.body)
puts data`

    default:
      return ''
  }
}

const endpoints = [
  {
    method: 'POST',
    path: '/v1/recommend',
    description: '영화 추천 요청',
    params: [
      { name: 'genres', type: 'string[]', required: false, description: '장르 필터 (예: ["액션", "SF"])' },
      { name: 'runtime_limit', type: 'number', required: false, description: '최대 러닝타임 (분)' },
      { name: 'exclude_adult', type: 'boolean', required: false, description: '성인 콘텐츠 제외' },
      { name: 'limit', type: 'number', required: false, description: '추천 개수 (기본: 10)' },
    ],
    response: `{
  "success": true,
  "data": {
    "recommendations": [
      {
        "movie_id": 12345,
        "title": "인터스텔라",
        "poster_url": "https://...",
        "release_year": 2014,
        "genres": ["SF", "드라마"],
        "runtime": 169,
        "score": 0.95
      }
    ],
    "algorithm": "hybrid-v2"
  },
  "meta": {
    "latency_ms": 234,
    "remaining_quota": 987
  }
}`,
  },
  {
    method: 'GET',
    path: '/v1/movies/:id',
    description: '영화 상세 정보 조회',
    params: [
      { name: 'id', type: 'number', required: true, description: '영화 ID (TMDB ID)' },
    ],
    response: `{
  "success": true,
  "data": {
    "movie_id": 12345,
    "title": "인터스텔라",
    "original_title": "Interstellar",
    "overview": "세계 각국의 정부...",
    "poster_url": "https://...",
    "backdrop_url": "https://...",
    "release_date": "2014-11-05",
    "runtime": 169,
    "genres": ["SF", "드라마"],
    "rating": 8.6,
    "vote_count": 32456
  }
}`,
  },
  {
    method: 'GET',
    path: '/v1/genres',
    description: '장르 목록 조회',
    params: [],
    response: `{
  "success": true,
  "data": {
    "genres": [
      { "id": 28, "name": "액션" },
      { "id": 12, "name": "모험" },
      { "id": 16, "name": "애니메이션" },
      { "id": 35, "name": "코미디" },
      { "id": 80, "name": "범죄" }
    ]
  }
}`,
  },
  {
    method: 'GET',
    path: '/v1/search',
    description: '영화 검색',
    params: [
      { name: 'query', type: 'string', required: true, description: '검색어' },
      { name: 'page', type: 'number', required: false, description: '페이지 번호 (기본: 1)' },
    ],
    response: `{
  "success": true,
  "data": {
    "results": [...],
    "page": 1,
    "total_pages": 5,
    "total_results": 48
  }
}`,
  },
]

const errorCodes = [
  { code: 400, name: 'INVALID_REQUEST', description: '잘못된 요청 파라미터' },
  { code: 401, name: 'INVALID_API_KEY', description: '유효하지 않은 API 키' },
  { code: 403, name: 'FORBIDDEN', description: '접근 권한 없음' },
  { code: 429, name: 'RATE_LIMIT_EXCEEDED', description: '일일 호출 한도 초과' },
  { code: 500, name: 'INTERNAL_ERROR', description: '서버 내부 오류' },
  { code: 503, name: 'SERVICE_UNAVAILABLE', description: '서비스 일시 불가' },
]

export default function ApiDocs() {
  const [selectedEndpoint, setSelectedEndpoint] = useState(0)
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('curl')
  const [copiedCode, setCopiedCode] = useState(false)

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const currentEndpoint = endpoints[selectedEndpoint]
  const codeExample = getCodeExample(
    selectedLanguage,
    currentEndpoint.method,
    currentEndpoint.path,
    currentEndpoint.method === 'POST'
  )

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-lg lg:text-xl font-semibold text-white">API 문서</h1>
        <p className="text-xs lg:text-sm text-gray-500 mt-1">MovieSir API 레퍼런스</p>
      </div>

      {/* Authentication */}
      <div className="bg-[#16161d] rounded-xl p-4 lg:p-5 mb-4 lg:mb-6">
        <h2 className="text-sm font-medium text-white mb-3 lg:mb-4">인증</h2>
        <p className="text-xs lg:text-sm text-gray-400 mb-3 lg:mb-4">
          모든 API 요청에는 <code className="px-1 lg:px-1.5 py-0.5 bg-white/10 rounded text-blue-400 text-[10px] lg:text-sm">X-API-Key</code> 헤더가 필요합니다.
        </p>
        <div className="bg-black/30 rounded-lg p-3 lg:p-4 font-mono text-[10px] lg:text-sm overflow-x-auto">
          <span className="text-gray-500">Header:</span>{' '}
          <span className="text-blue-400">X-API-Key</span>:{' '}
          <span className="text-green-400 break-all">sk-moviesir-your-api-key</span>
        </div>
      </div>

      {/* Base URL */}
      <div className="bg-[#16161d] rounded-xl p-4 lg:p-5 mb-4 lg:mb-6">
        <h2 className="text-sm font-medium text-white mb-3 lg:mb-4">Base URL</h2>
        <div className="bg-black/30 rounded-lg p-3 lg:p-4 font-mono text-[10px] lg:text-sm text-cyan-400 overflow-x-auto">
          https://api.moviesir.cloud
        </div>
      </div>

      {/* Endpoints */}
      <div className="bg-[#16161d] rounded-xl p-4 lg:p-5 mb-4 lg:mb-6">
        <h2 className="text-sm font-medium text-white mb-3 lg:mb-4">엔드포인트</h2>

        {/* Endpoint List */}
        <div className="flex gap-2 mb-4 lg:mb-6 overflow-x-auto pb-2 custom-scrollbar">
          {endpoints.map((ep, i) => (
            <button
              key={i}
              onClick={() => setSelectedEndpoint(i)}
              className={`flex items-center gap-1.5 lg:gap-2 px-2 lg:px-3 py-1.5 lg:py-2 rounded-lg text-[10px] lg:text-sm whitespace-nowrap transition-colors ${selectedEndpoint === i
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:text-white'
                }`}
            >
              <span className={`px-1 lg:px-1.5 py-0.5 rounded text-[9px] lg:text-xs font-medium ${ep.method === 'GET' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                }`}>
                {ep.method}
              </span>
              <span className="hidden sm:inline">{ep.path}</span>
              <span className="sm:hidden">{ep.path.split('/').pop()}</span>
            </button>
          ))}
        </div>

        {/* Selected Endpoint Details */}
        <div className="space-y-4 lg:space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 lg:gap-3 mb-2">
              <span className={`px-1.5 lg:px-2 py-0.5 lg:py-1 rounded text-[10px] lg:text-sm font-medium ${endpoints[selectedEndpoint].method === 'GET'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-green-500/20 text-green-400'
                }`}>
                {endpoints[selectedEndpoint].method}
              </span>
              <code className="text-white font-mono text-xs lg:text-sm break-all">{endpoints[selectedEndpoint].path}</code>
            </div>
            <p className="text-xs lg:text-sm text-gray-400">{endpoints[selectedEndpoint].description}</p>
          </div>

          {/* Parameters */}
          {endpoints[selectedEndpoint].params.length > 0 && (
            <div>
              <h3 className="text-[10px] lg:text-xs font-medium text-gray-500 mb-2 lg:mb-3">파라미터</h3>
              <div className="space-y-2">
                {endpoints[selectedEndpoint].params.map((param) => (
                  <div key={param.name} className="flex flex-wrap items-start gap-2 lg:gap-4 py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-1 lg:gap-2">
                      <code className="text-[10px] lg:text-sm text-cyan-400 font-mono">{param.name}</code>
                      {param.required && (
                        <span className="px-1 lg:px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[9px] lg:text-xs rounded">required</span>
                      )}
                    </div>
                    <span className="text-[9px] lg:text-xs text-gray-500">{param.type}</span>
                    <span className="text-[10px] lg:text-sm text-gray-400 w-full lg:w-auto lg:flex-1">{param.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Code Example */}
          <div>
            <div className="flex items-center justify-between mb-2 lg:mb-3">
              <h3 className="text-[10px] lg:text-xs font-medium text-gray-500">코드 예제</h3>
              <button
                onClick={() => copyCode(codeExample)}
                className="text-[10px] lg:text-xs text-blue-400 hover:text-blue-300"
              >
                {copiedCode ? '복사됨!' : '복사'}
              </button>
            </div>
            {/* Language Tabs */}
            <div className="flex gap-1 mb-3 overflow-x-auto pb-2 custom-scrollbar">
              {languages.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => setSelectedLanguage(lang.id)}
                  className={`px-2 lg:px-3 py-1 lg:py-1.5 rounded text-[9px] lg:text-xs font-medium whitespace-nowrap transition-colors ${selectedLanguage === lang.id
                      ? `bg-white/10 ${lang.color}`
                      : 'bg-white/5 text-gray-500 hover:text-gray-300'
                    }`}
                >
                  {lang.name}
                </button>
              ))}
            </div>
            <pre className="bg-black/30 rounded-lg p-3 lg:p-4 font-mono text-[9px] lg:text-xs text-gray-300 overflow-x-auto custom-scrollbar max-h-64 lg:max-h-80">
              {codeExample}
            </pre>
          </div>

          {/* Response */}
          <div>
            <h3 className="text-[10px] lg:text-xs font-medium text-gray-500 mb-2 lg:mb-3">응답 예시</h3>
            <pre className="bg-black/30 rounded-lg p-3 lg:p-4 font-mono text-[9px] lg:text-xs text-gray-300 overflow-x-auto max-h-48 lg:max-h-64 custom-scrollbar">
              {endpoints[selectedEndpoint].response}
            </pre>
          </div>
        </div>
      </div>

      {/* Error Codes */}
      <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
        <h2 className="text-sm font-medium text-white mb-3 lg:mb-4">에러 코드</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[10px] lg:text-xs text-gray-500 border-b border-white/5">
                <th className="pb-3 font-medium">HTTP</th>
                <th className="pb-3 font-medium">코드</th>
                <th className="pb-3 font-medium hidden sm:table-cell">설명</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {errorCodes.map((err) => (
                <tr key={err.code}>
                  <td className="py-2 lg:py-3">
                    <span className={`text-[10px] lg:text-sm font-medium ${err.code < 500 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                      {err.code}
                    </span>
                  </td>
                  <td className="py-2 lg:py-3">
                    <code className="text-[10px] lg:text-sm text-cyan-400 font-mono">{err.name}</code>
                  </td>
                  <td className="py-2 lg:py-3 text-[10px] lg:text-sm text-gray-400 hidden sm:table-cell">{err.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
