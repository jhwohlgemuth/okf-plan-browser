const GITHUB_HOST = 'api.github.com';
const WEB_PREFIX = 'okf-plan-browser:session-token:';
const LEGACY_KEYS = ['okf-plan-browser:github-token', 'okf-plan-browser:gitlab-token'];

type Forge = 'github' | 'gitlab';

const isDesktop = () => typeof window !== 'undefined' && '__TAURI__' in window;

// Never leave credentials behind in the legacy persistent webview/browser store.
if (typeof window !== 'undefined') {
  try { LEGACY_KEYS.forEach(key => localStorage.removeItem(key)); } catch { /* storage unavailable */ }
}

export function canStoreForgeTokens(): boolean {
  return isDesktop() || (typeof window !== 'undefined' && window.isSecureContext);
}

export function normalizeGitlabHost(raw: string): string {
  const value = raw.trim();
  if (!value) throw new Error('Enter a GitLab host.');
  let url: URL;
  try {
    url = new URL(value.includes('://') ? value : `https://${value}`);
  } catch {
    throw new Error('Enter a valid GitLab host.');
  }
  if (
    url.protocol !== 'https:' || url.username || url.password
    || (url.pathname !== '/' && url.pathname !== '') || url.search || url.hash
  ) {
    throw new Error('GitLab hosts must be HTTPS origins without credentials, paths, queries, or fragments.');
  }
  return url.host.toLowerCase();
}

const webKey = (forge: Forge, host: string) => `${WEB_PREFIX}${forge}:${host}`;

function assertWebHostAllowed(forge: Forge, host: string): void {
  if (!isDesktop() && forge === 'gitlab' && !__GITLAB_HOSTS__.includes(host)) {
    throw new Error(`GitLab host ${host} is not enabled in this build.`);
  }
}

async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/tauri');
  return tauriInvoke<T>(command, args);
}

async function read(forge: Forge, host: string): Promise<string> {
  if (isDesktop() || !canStoreForgeTokens()) return '';
  assertWebHostAllowed(forge, host);
  try { return sessionStorage.getItem(webKey(forge, host)) ?? ''; } catch { return ''; }
}

async function write(forge: Forge, host: string, token: string): Promise<void> {
  const value = token.trim();
  if (!canStoreForgeTokens()) throw new Error('Tokens require a secure HTTPS connection.');
  assertWebHostAllowed(forge, host);
  if (isDesktop()) {
    await invoke('save_forge_token', { forge, host, token: value });
    return;
  }
  try {
    if (value) sessionStorage.setItem(webKey(forge, host), value);
    else sessionStorage.removeItem(webKey(forge, host));
  } catch {
    throw new Error('Session storage is unavailable.');
  }
}

async function has(forge: Forge, host: string): Promise<boolean> {
  if (!canStoreForgeTokens()) return false;
  assertWebHostAllowed(forge, host);
  if (isDesktop()) return invoke<boolean>('has_forge_token', { forge, host });
  return !!(await read(forge, host));
}

export const getGithubToken = () => read('github', GITHUB_HOST);
export const setGithubToken = (token: string) => write('github', GITHUB_HOST, token);
export const hasGithubToken = () => has('github', GITHUB_HOST);

export const getGitlabToken = (host: string) => read('gitlab', normalizeGitlabHost(host));
export const setGitlabToken = (host: string, token: string) => write('gitlab', normalizeGitlabHost(host), token);
export const hasGitlabToken = (host: string) => has('gitlab', normalizeGitlabHost(host));

export async function clearForgeTokens(): Promise<void> {
  if (isDesktop()) {
    await invoke('clear_forge_tokens');
    return;
  }
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(WEB_PREFIX)) sessionStorage.removeItem(key);
    }
  } catch { /* storage unavailable */ }
}
