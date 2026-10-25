import { defineConfig, type Plugin, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import pkg from './package.json';

const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const repoName = process.env.REPO_NAME ?? 'okf-plan-browser';
const builtInGitlabHosts = ['gitlab.com', 'code.ornl.gov'];
const configuredGitlabHosts = (process.env.OKF_GITLAB_HOSTS ?? '')
    .split(',')
    .map(host => host.trim().toLowerCase())
    .filter(host => /^[a-z0-9.-]+(?::\d+)?$/.test(host));
const gitlabHosts = [...new Set([...builtInGitlabHosts, ...configuredGitlabHosts])];
const gitlabOrigins = gitlabHosts.map(host => `https://${host}`).join(' ');

const csp = `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; frame-src 'self' blob:; connect-src 'self' https://api.github.com ${gitlabOrigins}; object-src 'none'; base-uri 'self'; form-action 'self'`;

// Injected at build time only: the dev server needs inline scripts for React refresh.
const cspPlugin = (): Plugin => ({
  name: 'okf-csp',
  apply: 'build',
  transformIndexHtml: () => [
    { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: csp }, injectTo: 'head-prepend' },
  ],
});
const forgeProxy = (host: string): ProxyOptions => ({
  target: `https://${host}`,
  changeOrigin: true,
  rewrite: p => p.replace(/^\/__forge\/[^/]+/, '') || '/',
  configure(proxy) {
    proxy.on('proxyReq', proxyReq => {
      proxyReq.removeHeader('origin');
      proxyReq.removeHeader('referer');
      proxyReq.setHeader('User-Agent', 'okf-plan-browser');
    });
  },
});

const forgeProxies = Object.fromEntries(gitlabHosts.map(host => [
  `^/__forge/${host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:/|$)`,
  forgeProxy(host),
]));

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __GITLAB_HOSTS__: JSON.stringify(gitlabHosts),
  },
  plugins: [react(), cspPlugin()],
  base: isGitHubPages ? `/${repoName}/` : '/',
  server: { proxy: forgeProxies },
  preview: { proxy: forgeProxies },
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
