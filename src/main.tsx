import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Remove the initial preloader placeholder as soon as bundle starts executing
try {
  const preloader = document.getElementById('preloader');
  if (preloader) {
    preloader.remove();
  }
} catch {
  // ignore
}

const rootElement = document.getElementById('root');
if (rootElement) {
  try {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (err) {
    console.error('Fatal error mounting React application:', err);
    rootElement.innerHTML = `
      <div style="min-height:100vh;background-color:#0f172a;color:#f8fafc;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;font-family:sans-serif;">
        <div style="font-size:20px;font-weight:bold;margin-bottom:8px;">Ошибка запуска</div>
        <div style="font-size:12px;color:#94a3b8;margin-bottom:16px;">Не удалось запустить приложение. Нажмите для перезагрузки.</div>
        <button onclick="window.location.reload(true)" style="background:#6366f1;color:white;border:none;border-radius:12px;padding:10px 20px;font-weight:bold;cursor:pointer;">
          Перезагрузить
        </button>
      </div>
    `;
  }
}
