// deploy trigger: 2026-01-13
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from '@/App.tsx'

// Console Branding
console.log(`%c
██▄  ▄██ ▄████▄ ██  ██ ██ ██████ ▄█████ ██ █████▄
██ ▀▀ ██ ██  ██ ██▄▄██ ██ ██▄▄   ▀▀▀▄▄▄ ██ ██▄▄██▄
██    ██ ▀████▀  ▀██▀  ██ ██▄▄▄▄ █████▀ ██ ██   ██
`, 'color: #3B82F6; font-weight: bold;')
console.log('%c AI Movie Recommendation Service ', 'background: #3B82F6; color: white; font-size: 12px; padding: 4px 8px; border-radius: 4px;')

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
      .then(() => {
        // Service Worker registered successfully, but no need to use the 'registration' object
        // console.log('Service Worker registered:', registration.scope); // Removed to fix unused variable
      })
      .catch(() => {
        // console.log('Service Worker registration failed:', error); // Removed
      });
  });
}
