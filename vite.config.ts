import { defineConfig, type Plugin, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import pkg from './package.json';

const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const repoName = process.env.REPO_NAME ?? 'okf-plan-browser';

const csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self'";

// Injected at build time only: the dev server needs inline scripts for React refresh.
const cspPlugin = (): Plugin => ({
  name: 'okf-csp',
  apply: 'build',
  transformIndexHtml: () => [
    { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: csp }, injectTo: 'head-prepend' },
  ],
});
const forgeProxy: ProxyOptions = {
  target: 'https://gitlab.com',
  changeOrigin: true,
  rewrite: p => p.replace(/^\/__forge\/[^/]+/, '') || '/',
  router(req) {
    const host = req.url?.match(/^\/__forge\/([^/?#]+)/)?.[1] ?? '';
    if (!/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(host)) return 'https://gitlab.com';
    return `https://${host}`;
  },
  configure(proxy) {
    proxy.on('proxyReq', proxyReq => {
      proxyReq.removeHeader('origin');
      proxyReq.removeHeader('referer');
      proxyReq.setHeader('User-Agent', 'okf-plan-browser');
    });
  },
};

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [react(), cspPlugin()],
  base: isGitHubPages ? `/${repoName}/` : '/',
  server: { proxy: { '/__forge': forgeProxy } },
  preview: { proxy: { '/__forge': forgeProxy } },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          d3: ['d3'],
          yaml: ['js-yaml'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-tabs', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
  },
});
