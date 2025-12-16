// [용도] PWA Service Worker - 기본 캐싱 전략
// [파일 위치] public/sw.js
// [자동 등록] main.tsx에서 자동으로 등록됨

const CACHE_NAME = 'movisr-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/src/main.tsx',
    '/src/index.css'
];

// Service Worker 설치
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
    // 즉시 활성화
    self.skipWaiting();
});

// 네트워크 요청 가로채기 (Network First 전략)
self.addEventListener('fetch', (event) => {
    // POST, PUT, DELETE 등의 요청은 캐시하지 않음 (GET만 캐시 가능)
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // 성공적인 응답을 캐시에 저장
                if (response && response.status === 200) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => {
                // 네트워크 실패 시 캐시에서 반환
                return caches.match(event.request);
            })
    );
});

// 오래된 캐시 정리
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // 즉시 클라이언트 제어
    return self.clients.claim();
});
