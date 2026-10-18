import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { useThemeStore, initTheme } from './store/themeStore';

// Sync stored theme to DOM before first paint
initTheme(useThemeStore.getState().theme);

// Desktop webview: open external links in the system browser instead of navigating the app away.
if ('__TAURI__' in window) {
  document.addEventListener('click', e => {
    const a = (e.target as Element).closest?.('a[href]') as HTMLAnchorElement | null;
    if (!a || !/^https?:\/\//.test(a.href) || a.origin === window.location.origin) return;
    e.preventDefault();
    import('@tauri-apps/api/shell').then(m => m.open(a.href));
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
