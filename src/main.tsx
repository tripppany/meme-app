import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  // Immediately dismiss preloader placeholder once React execution begins
  try {
    const preloader = document.getElementById('preloader');
    if (preloader) {
      preloader.remove();
    }
  } catch {
    // ignore
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
