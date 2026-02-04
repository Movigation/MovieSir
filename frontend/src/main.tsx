// deploy trigger: 2026-01-13
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from '@/App.tsx'

// 🎬 Console Branding
console.log(
  '%c 🎬 MOVIESIR ',
  'background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; font-size: 24px; font-weight: bold; padding: 10px 20px; border-radius: 8px;'
);
console.log(
  '%c시간만 알려주세요, 영화는 제가 고를게요.',
  'color: #3b82f6; font-size: 14px; font-weight: bold; margin-top: 5px;'
);
console.log(
  '%cAI 영화 추천 서비스 | https://moviesir.cloud',
  'color: #6b7280; font-size: 11px;'
);

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)

// PWA Service Worker 등록
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration.scope);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
}
