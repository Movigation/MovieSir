// deploy trigger: 2026-01-13
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from '@/App.tsx'

// 🎬 Console Branding
console.log(
  '%c ',
  'background: url(/moviesir_header.png) no-repeat center; background-size: contain; padding: 60px 200px;'
);
console.log(
  '%c무비서 - AI 영화 추천 서비스',
  'color: #3b82f6; font-size: 18px; font-weight: bold;'
);
console.log(
  '%c시간만 알려주세요, 영화는 제가 고를게요.',
  'color: #9ca3af; font-size: 12px;'
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
