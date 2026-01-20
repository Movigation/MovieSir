import { useState } from 'react'
import { Highlight, themes } from 'prism-react-renderer'

type Language = 'curl' | 'python' | 'javascript' | 'nodejs' | 'go' | 'java' | 'php' | 'ruby'

// Prism 언어 매핑 (prism-react-renderer 기본 지원 언어로 매핑)
const prismLanguageMap: Record<Language, string> = {
  curl: 'bash',
  python: 'python',
  javascript: 'javascript',
  nodejs: 'javascript',
  go: 'go',
  java: 'javascript',
  php: 'javascript',
  ruby: 'python',
}

const languages: { id: Language; name: string }[] = [
  { id: 'curl', name: 'cURL' },
  { id: 'python', name: 'Python' },
  { id: 'javascript', name: 'JavaScript' },
  { id: 'nodejs', name: 'Node.js' },
  { id: 'go', name: 'Go' },
  { id: 'java', name: 'Java' },
  { id: 'php', name: 'PHP' },
  { id: 'ruby', name: 'Ruby' },
]

const endpoints = [
  {
    method: 'POST',
    path: '/v1/recommend',
    title: 'Recommend Movies',
    description: '사용자의 선호도와 가용 시간을 기반으로 최적의 영화 조합을 추천합니다.',
    params: [
      { name: 'user_movie_ids', type: 'integer[]', required: true, description: '사용자가 좋아하는 영화 ID 목록' },
      { name: 'available_time', type: 'integer', required: false, description: '시청 가능 시간 (분, 기본: 180)' },
      { name: 'preferred_genres', type: 'string[]', required: false, description: '선호 장르 (예: ["액션", "SF"])' },
      { name: 'preferred_otts', type: 'string[]', required: false, description: '선호 OTT 플랫폼' },
      { name: 'allow_adult', type: 'boolean', required: false, description: '성인 콘텐츠 허용 여부 (기본: false)' },
      { name: 'excluded_ids_a', type: 'integer[]', required: false, description: '트랙 A에서 제외할 영화 ID' },
      { name: 'excluded_ids_b', type: 'integer[]', required: false, description: '트랙 B에서 제외할 영화 ID' },
    ],
    requestBody: `{
  "user_movie_ids": [550, 27205, 157336],
  "available_time": 360,
  "preferred_genres": ["액션", "SF"],
  "allow_adult": false
}`,
    response: `{
  "success": true,
  "data": {
    "track_a": {
      "label": "장르 맞춤 추천",
      "movies": [
        {
          "movie_id": 157336,
          "title": "인터스텔라",
          "runtime": 169,
          "genres": ["SF", "드라마"],
          "vote_average": 8.6
        }
      ],
      "total_runtime": 169
    },
    "track_b": { ... }
  },
  "meta": {
    "latency_ms": 234,
    "remaining_quota": 987
  }
}`,
  },
  {
    method: 'POST',
    path: '/v1/recommend_single',
    title: 'Recommend Single',
    description: '단일 영화를 새로 추천받습니다. 기존 추천에서 마음에 들지 않는 영화를 교체할 때 사용합니다.',
    params: [
      { name: 'user_movie_ids', type: 'integer[]', required: true, description: '사용자가 좋아하는 영화 ID 목록' },
      { name: 'target_runtime', type: 'integer', required: true, description: '목표 런타임 (분)' },
      { name: 'excluded_ids', type: 'integer[]', required: false, description: '제외할 영화 ID 목록' },
      { name: 'track', type: 'string', required: false, description: '트랙 선택: "a" 또는 "b"' },
    ],
    requestBody: `{
  "user_movie_ids": [550, 27205],
  "target_runtime": 120,
  "excluded_ids": [157336],
  "track": "a"
}`,
    response: `{
  "success": true,
  "data": {
    "movie_id": 603,
    "title": "매트릭스",
    "runtime": 136,
    "genres": ["액션", "SF"],
    "vote_average": 8.2
  },
  "meta": {
    "latency_ms": 156,
    "remaining_quota": 986
  }
}`,
  },
  {
    method: 'GET',
    path: '/v1/health',
    title: 'Health Check',
    description: 'API 서비스 상태를 확인합니다.',
    params: [],
    requestBody: '',
    response: `{
  "status": "healthy",
  "service": "external-api",
  "version": "v1"
}`,
  },
]

const errorCodes = [
  { code: 400, name: 'INVALID_REQUEST', description: '잘못된 요청 파라미터' },
  { code: 401, name: 'INVALID_API_KEY', description: '유효하지 않은 API 키' },
  { code: 429, name: 'RATE_LIMIT_EXCEEDED', description: '일일 호출 한도 초과' },
  { code: 503, name: 'AI_SERVICE_UNAVAILABLE', description: 'AI 서비스 일시 불가' },
]

const getCodeExample = (lang: Language, endpoint: typeof endpoints[0]): string => {
  const url = `https://api.moviesir.cloud${endpoint.path}`
  const isPost = endpoint.method === 'POST'
  const body = endpoint.requestBody || ''

  switch (lang) {
    case 'curl':
      return `curl -X ${endpoint.method} "${url}" \\
  -H "X-API-Key: sk-moviesir-xxx..." \\
  -H "Content-Type: application/json"${isPost ? ` \\
  -d '${body}'` : ''}`

    case 'python':
      return `import requests

url = "${url}"
headers = {
    "Content-Type": "application/json",
    "X-API-Key": "sk-moviesir-xxx..."
}
${isPost ? `data = ${body.replace(/null/g, 'None').replace(/true/g, 'True').replace(/false/g, 'False')}

response = requests.post(url, json=data, headers=headers)` : `response = requests.get(url, headers=headers)`}
print(response.json())`

    case 'javascript':
      return `fetch("${url}", {
  method: "${endpoint.method}",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "sk-moviesir-xxx..."
  }${isPost ? `,
  body: JSON.stringify(${body})` : ''}
})
  .then(res => res.json())
  .then(data => console.log(data));`

    case 'nodejs':
      return `const axios = require('axios');

axios.${endpoint.method.toLowerCase()}('${url}'${isPost ? `, ${body}` : ''}, {
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'sk-moviesir-xxx...'
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
    ${isPost ? `data := []byte(\`${body}\`)
    req, _ := http.NewRequest("POST", "${url}", bytes.NewBuffer(data))` : `req, _ := http.NewRequest("GET", "${url}", nil)`}
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("X-API-Key", "sk-moviesir-xxx...")

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
        ${isPost ? `String json = """
            ${body}
            """;` : ''}

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("${url}"))
            .header("Content-Type", "application/json")
            .header("X-API-Key", "sk-moviesir-xxx...")
            .${endpoint.method}(${isPost ? 'HttpRequest.BodyPublishers.ofString(json)' : ''})
            .build();

        HttpResponse<String> response = client.send(request,
            HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}`

    case 'php':
      return `<?php
$url = '${url}';
${isPost ? `$data = ${body};` : ''}

$options = [
    'http' => [
        'method' => '${endpoint.method}',
        'header' => [
            'Content-Type: application/json',
            'X-API-Key: sk-moviesir-xxx...'
        ]${isPost ? `,
        'content' => json_encode($data)` : ''}
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

uri = URI('${url}')
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = true

request = Net::HTTP::${endpoint.method === 'POST' ? 'Post' : 'Get'}.new(uri)
request['Content-Type'] = 'application/json'
request['X-API-Key'] = 'sk-moviesir-xxx...'
${isPost ? `request.body = ${body}.to_json` : ''}

response = http.request(request)
puts response.body`

    default:
      return ''
  }
}

export default function ApiDocs() {
  const [selectedEndpoint, setSelectedEndpoint] = useState(0)
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('curl')
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedResponse, setCopiedResponse] = useState(false)

  const copyCode = (code: string, isResponse = false) => {
    navigator.clipboard.writeText(code)
    if (isResponse) {
      setCopiedResponse(true)
      setTimeout(() => setCopiedResponse(false), 2000)
    } else {
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  const currentEndpoint = endpoints[selectedEndpoint]
  const codeExample = getCodeExample(selectedLanguage, currentEndpoint)

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-lg lg:text-xl font-semibold text-white">API 문서</h1>
        <p className="text-xs lg:text-sm text-gray-500 mt-1">MovieSir External API Reference</p>
      </div>

      {/* Authentication */}
      <div className="bg-[#16161d] rounded-xl p-4 lg:p-5 mb-4">
        <h2 className="text-sm font-medium text-white mb-3">인증</h2>
        <p className="text-xs text-gray-400 mb-3">모든 API 요청에는 X-API-Key 헤더가 필요합니다.</p>
        <div className="bg-black/30 rounded-lg p-3">
          <code className="text-xs text-gray-300 font-mono">
            <span className="text-gray-500">X-API-Key:</span> <span className="text-cyan-400">sk-moviesir-xxxxxxxxxxxx</span>
          </code>
        </div>
      </div>

      {/* Base URL */}
      <div className="bg-[#16161d] rounded-xl p-4 lg:p-5 mb-4">
        <h2 className="text-sm font-medium text-white mb-3">Base URL</h2>
        <div className="bg-black/30 rounded-lg p-3">
          <code className="text-xs text-amber-400 font-mono">https://api.moviesir.cloud</code>
        </div>
      </div>

      {/* Endpoints */}
      <div className="bg-[#16161d] rounded-xl overflow-hidden mb-4">
        <div className="px-4 lg:px-5 py-3 lg:py-4 border-b border-white/5">
          <h2 className="text-sm font-medium text-white">Endpoints</h2>
        </div>

        {/* Endpoint Tabs */}
        <div className="px-4 lg:px-5 py-3 border-b border-white/5 flex gap-2 overflow-x-auto">
          {endpoints.map((ep, i) => (
            <button
              key={i}
              onClick={() => setSelectedEndpoint(i)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedEndpoint === i
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                ep.method === 'GET'
                  ? 'bg-blue-500/30 text-blue-300'
                  : 'bg-emerald-500/30 text-emerald-300'
              }`}>
                {ep.method}
              </span>
              {ep.path}
            </button>
          ))}
        </div>

        <div className="p-4 lg:p-5">
          {/* Endpoint Info */}
          <div className="mb-6">
            <h3 className="text-base font-medium text-white mb-2">{currentEndpoint.title}</h3>
            <p className="text-xs text-gray-400 mb-4">{currentEndpoint.description}</p>
            <div className="flex items-center gap-2 p-3 bg-black/30 rounded-lg">
              <span className={`px-2 py-1 rounded text-xs font-bold ${
                currentEndpoint.method === 'GET'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {currentEndpoint.method}
              </span>
              <code className="text-xs text-gray-300 font-mono">
                https://api.moviesir.cloud<span className="text-amber-400">{currentEndpoint.path}</span>
              </code>
            </div>
          </div>

          {/* Parameters */}
          {currentEndpoint.params.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-white mb-3">Parameters</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 px-3 text-gray-400 font-medium">Name</th>
                      <th className="text-left py-2 px-3 text-gray-400 font-medium">Type</th>
                      <th className="text-left py-2 px-3 text-gray-400 font-medium">Required</th>
                      <th className="text-left py-2 px-3 text-gray-400 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentEndpoint.params.map((param) => (
                      <tr key={param.name} className="border-b border-white/5">
                        <td className="py-2 px-3">
                          <code className="text-cyan-400">{param.name}</code>
                        </td>
                        <td className="py-2 px-3 text-gray-500 font-mono">{param.type}</td>
                        <td className="py-2 px-3">
                          {param.required ? (
                            <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-[10px]">required</span>
                          ) : (
                            <span className="text-gray-600">optional</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-gray-400">{param.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Code Example */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-white mb-3">Code Example</h4>
            <div className="bg-[#1a1a24] rounded-xl overflow-hidden border border-white/10">
              {/* Language Tabs */}
              <div className="flex items-center justify-between border-b border-white/10">
                <div className="flex overflow-x-auto scrollbar-hide">
                  {languages.map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => setSelectedLanguage(lang.id)}
                      className={`px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-[1px] ${
                        selectedLanguage === lang.id
                          ? 'text-white border-blue-500'
                          : 'text-gray-500 hover:text-gray-300 border-transparent'
                      }`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => copyCode(codeExample)}
                  className="p-2.5 text-gray-500 hover:text-white transition-colors flex-shrink-0"
                  title="복사"
                >
                  {copiedCode ? (
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
              {/* Code Block */}
              <Highlight
                theme={themes.nightOwl}
                code={codeExample}
                language={prismLanguageMap[selectedLanguage]}
              >
                {({ style, tokens, getLineProps, getTokenProps }) => (
                  <pre
                    className="p-4 font-mono text-xs overflow-x-auto custom-scrollbar leading-relaxed"
                    style={{ ...style, background: 'transparent' }}
                  >
                    {tokens.map((line, i) => (
                      <div key={i} {...getLineProps({ line })}>
                        {line.map((token, key) => (
                          <span key={key} {...getTokenProps({ token })} />
                        ))}
                      </div>
                    ))}
                  </pre>
                )}
              </Highlight>
            </div>
          </div>

          {/* Response */}
          <div>
            <h4 className="text-sm font-medium text-white mb-3">Response</h4>
            <div className="bg-[#1a1a24] rounded-xl overflow-hidden border border-white/10">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                <span className="text-xs text-gray-400 font-medium">application/json</span>
                <button
                  onClick={() => copyCode(currentEndpoint.response, true)}
                  className="p-1.5 text-gray-500 hover:text-white transition-colors"
                  title="복사"
                >
                  {copiedResponse ? (
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
              <Highlight
                theme={themes.nightOwl}
                code={currentEndpoint.response}
                language="json"
              >
                {({ style, tokens, getLineProps, getTokenProps }) => (
                  <pre
                    className="p-4 font-mono text-xs overflow-x-auto custom-scrollbar leading-relaxed max-h-80"
                    style={{ ...style, background: 'transparent' }}
                  >
                    {tokens.map((line, i) => (
                      <div key={i} {...getLineProps({ line })}>
                        {line.map((token, key) => (
                          <span key={key} {...getTokenProps({ token })} />
                        ))}
                      </div>
                    ))}
                  </pre>
                )}
              </Highlight>
            </div>
          </div>
        </div>
      </div>

      {/* Error Codes */}
      <div className="bg-[#16161d] rounded-xl p-4 lg:p-5">
        <h2 className="text-sm font-medium text-white mb-4">에러 코드</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-3 text-gray-400 font-medium">Code</th>
                <th className="text-left py-2 px-3 text-gray-400 font-medium">Name</th>
                <th className="text-left py-2 px-3 text-gray-400 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {errorCodes.map((err) => (
                <tr key={err.code} className="border-b border-white/5">
                  <td className="py-2 px-3">
                    <span className={`font-bold ${err.code < 500 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {err.code}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <code className="text-cyan-400">{err.name}</code>
                  </td>
                  <td className="py-2 px-3 text-gray-400">{err.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
