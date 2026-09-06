import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guard against environments where window.fetch has only a getter
try {
  const root = typeof window !== 'undefined' ? window : (globalThis as unknown as Window);
  if (root) {
    let activeFetch = typeof root.fetch === 'function' ? root.fetch.bind(root) : root.fetch;
    Object.defineProperty(root, 'fetch', {
      get() {
        return activeFetch;
      },
      set(fn) {
        activeFetch = fn;
      },
      configurable: true,
      enumerable: true,
    });
  }
} catch (_) {}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
