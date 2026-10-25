import { clearCachedAssets, deleteCachedAssets, getCachedAsset, getHandle } from './handleStore';
import { findWikiDir, type WikiAsset } from './wikiParser';
import { fetchRemoteAsset } from './remoteWiki';
import { getGithubToken, getGitlabToken } from './githubToken';
import { usePlanStore } from '@/store/planStore';

const files = new Map<string, Map<string, File>>();
const urls = new Map<string, string>();
const pending = new Map<string, Promise<string>>();
const keyOf = (repoId: string, path: string) => `${repoId}\n${path}`;

export function registerAssetFiles(repoId: string, assets: WikiAsset[]): void {
  clearAssetUrls(repoId);
  files.set(repoId, new Map(assets.flatMap(asset => asset.file ? [[asset.path, asset.file]] : [])));
}

export function clearAssetUrls(repoId: string): void {
  for (const [key, url] of urls) {
    if (key.startsWith(`${repoId}\n`)) { URL.revokeObjectURL(url); urls.delete(key); }
  }
  for (const key of pending.keys()) if (key.startsWith(`${repoId}\n`)) pending.delete(key);
}

export function forgetAssets(repoId: string): void {
  clearAssetUrls(repoId);
  files.delete(repoId);
  void deleteCachedAssets(repoId);
}

export function forgetAllAssets(): void {
  for (const url of urls.values()) URL.revokeObjectURL(url);
  urls.clear();
  pending.clear();
  files.clear();
  void clearCachedAssets();
}

async function readAsset(repoId: string, path: string): Promise<Blob> {
  const file = files.get(repoId)?.get(path);
  if (file) {
    const demoUrl = (file as File & { demoUrl?: string }).demoUrl;
    if (demoUrl) {
      const response = await fetch(demoUrl);
      if (!response.ok) throw new Error(`Could not load demo asset: ${path}`);
      return response.blob();
    }
    return file;
  }
  const repo = usePlanStore.getState().repos.find(r => r.id === repoId);
  if (!repo?.assets?.includes(path)) throw new Error('Asset is not in this wiki.');
  if (repo.remote) {
    const token = repo.remote.forge === 'github' ? await getGithubToken() : await getGitlabToken(repo.remote.host);
    return fetchRemoteAsset(repo.remote, path, token);
  }
  const cached = await getCachedAsset(repoId, path);
  if (cached) return cached;
  const handle = await getHandle(repoId);
  if (!handle) throw new Error('Reopen this wiki folder to view its assets.');
  let dir = await findWikiDir(handle);
  const parts = path.split('/');
  if (parts.some(part => !part || part === '.' || part === '..')) throw new Error('Invalid asset path.');
  for (const part of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(part);
  return (await dir.getFileHandle(parts[parts.length - 1]!)).getFile();
}

export async function getAssetUrl(repoId: string, path: string): Promise<string> {
  const key = keyOf(repoId, path);
  const cached = urls.get(key);
  if (cached) return cached;
  const current = pending.get(key);
  if (current) return current;
  const task = readAsset(repoId, path).then(blob => {
    const ext = path.split('.').pop()?.toLowerCase();
    const mime: Record<string, string> = { pdf: 'application/pdf', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif', bmp: 'image/bmp', ico: 'image/x-icon' };
    const typed = blob.type === mime[ext ?? ''] ? blob : new Blob([blob], { type: mime[ext ?? ''] ?? blob.type });
    const url = URL.createObjectURL(typed);
    urls.set(key, url);
    return url;
  }).finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}

export function resolveWikiPath(source: string, href: string): string | null {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href)) return null;
  try {
    const url = new URL(href, `https://wiki.invalid/${source.split('/').map(encodeURIComponent).join('/')}`);
    if (url.host !== 'wiki.invalid') return null;
    const path = decodeURIComponent(url.pathname).replace(/^\//, '');
    return path && !path.split('/').some(part => part === '.' || part === '..') ? path : null;
  } catch { return null; }
}
