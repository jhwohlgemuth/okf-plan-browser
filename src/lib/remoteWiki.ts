import { boundedFetch, readBounded, REMOTE_LIMITS, RemoteLimitError } from './remoteLimits';
import { newUuid } from './utils';
import { isWikiFolderName, isViewableAsset, parseWikiTexts, type Progress } from '@/lib/wikiParser';

export type ForgeKind = 'github' | 'gitlab';

export interface RemoteWikiRef {
  forge: ForgeKind;
  host: string;
  project: string;
  ref?: string;
}

export interface RemoteFile {
  path: string;
  text: string;
}

export interface FetchRemoteOptions {
  signal?: AbortSignal;
  githubToken?: string;
  gitlabToken?: string;
  fetch?: typeof fetch;
  report?: Progress;
}

export interface RemoteWiki {
  remote: RemoteWikiRef;
  files: RemoteFile[];
  assets?: string[];
}

const SKIP = new Set(['node_modules', '.git']);

export function parseRemoteSpec(raw: string): RemoteWikiRef {
  let s = raw.trim().replace(/\.git$/i, '').replace(/\/+$/, '');
  if (!s) throw new Error('Enter a GitHub owner/repo or a GitLab project URL.');

  const hasScheme = /^https?:\/\//i.test(s);
  if (!hasScheme) {
    const head = s.split('/')[0] ?? '';
    if (!head.includes('.')) {
      const parts = s.split('/');
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        throw new Error('GitHub repos look like owner/repo.');
      }
      return { forge: 'github', host: 'github.com', project: `${parts[0]}/${parts[1]}` };
    }
    s = `https://${s}`;
  }

  let url: URL;
  try {
    url = new URL(s);
  } catch {
    throw new Error('Enter a GitHub owner/repo or a GitLab project URL.');
  }

  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('Repository URLs must use HTTPS and must not contain credentials.');
  }

  const host = url.host.replace(/^www\./i, '').toLowerCase();
  const dash = url.pathname.split('/-/');
  const beforeDash = (dash[0] ?? '').replace(/^\/+|\/+$/g, '');
  const afterDash = dash[1];

  if (host === 'github.com') {
    const segs = beforeDash.split('/').filter(Boolean);
    if (segs.length < 2) throw new Error('GitHub repos look like owner/repo.');
    const project = `${segs[0]}/${segs[1]}`;
    const treeIdx = segs[2] === 'tree' || segs[2] === 'blob' ? 3 : -1;
    const ref = treeIdx > 0 && segs[treeIdx] ? segs[treeIdx] : undefined;
    return { forge: 'github', host: 'github.com', project, ref };
  }

  const segs = beforeDash.split('/').filter(Boolean);
  if (segs.length < 2) throw new Error('GitLab projects look like host/group/project.');
  let ref: string | undefined;
  if (afterDash) {
    const m = afterDash.match(/^(?:tree|blob)\/([^/]+)/);
    if (m?.[1]) ref = m[1];
  }
  return { forge: 'gitlab', host, project: segs.join('/'), ref };
}

export function remoteProjectId(remote: RemoteWikiRef): string {
  return `remote:${remote.forge}:${remote.host.toLowerCase()}/${remote.project}@${encodeURIComponent(remote.ref ?? '')}`;
}

export async function fetchRemoteWiki(spec: string | RemoteWikiRef, opts: FetchRemoteOptions = {}): Promise<RemoteWiki> {
  const remote = typeof spec === 'string' ? parseRemoteSpec(spec) : spec;
  const controller = new AbortController();
  const abort = () => controller.abort(opts.signal?.reason);
  opts.signal?.throwIfAborted();
  opts.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(new DOMException('Remote load timed out. Open a local clone instead.', 'TimeoutError')), REMOTE_LIMITS.loadMs);
  const transport: typeof fetch = async (url, init) => {
    if (!opts.fetch && typeof window !== 'undefined' && '__TAURI__' in window) {
      return nativeRequest(String(url), init?.headers as Record<string, string> ?? {}, init?.signal ?? undefined);
    }
    const target = opts.fetch ? url : forgeProxyUrl(String(url), remote.forge);
    return (opts.fetch ?? fetch)(target, init);
  };
  const fetchImpl = boundedFetch(transport, controller.signal);
  try {
    const fetched = remote.forge === 'github'
      ? await fetchGithub(remote, fetchImpl, opts.githubToken, opts.report)
      : await fetchGitlab(remote, fetchImpl, opts.gitlabToken, opts.report, controller.signal);
    controller.signal.throwIfAborted();
    return fetched;
  } finally {
    controller.abort();
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', abort);
  }
}

export function parseRemoteWiki(project: string, files: RemoteFile[], report?: Progress) {
  return parseWikiTexts(files, project, report);
}

function selectedEntries(absPaths: string[], accepts: (path: string) => boolean): Array<{ abs: string; rel: string }> {
  const md = absPaths.filter(p => {
    const parts = p.split('/');
    return accepts(p) && !parts.some(part => SKIP.has(part));
  });
  const wikiHits = md.filter(p => isWikiFolderName(p.split('/')[0] ?? ''));
  if ((wikiHits.length || md.length) > REMOTE_LIMITS.files) throw new RemoteLimitError('Too many Markdown files. Open a local clone instead.');
  if (wikiHits.length) {
    return wikiHits.map(abs => ({ abs, rel: abs.split('/').slice(1).join('/') }));
  }
  return md.map(abs => ({ abs, rel: abs }));
}

const wikiEntries = (paths: string[]) => selectedEntries(paths, path => path.toLowerCase().endsWith('.md'));
const assetEntries = (paths: string[]) => selectedEntries(paths, isViewableAsset);

class GitlabIpRestrictedError extends Error {}
class ForgeHttpError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function forgeError(res: Response, forge: ForgeKind, url: string, hasToken: boolean): Promise<Error> {
  const status = res.status;
  if (forge === 'gitlab' && status === 403) {
    const body = await res.text();
    if (body.includes('Access from your IP address is currently restricted')) {
      return new GitlabIpRestrictedError(
        `${new URL(url).host} is blocking your IP address. Ask your ORNL collaboration partner to request an exception; a GitLab token cannot override this restriction.`,
      );
    }
  }
  if (status === 429 || (status === 403 && res.headers.get('x-ratelimit-remaining') === '0')) {
    return new Error(`The ${forge} host rate-limited this request. Retry later${res.headers.get('retry-after') ? ` (Retry-After: ${res.headers.get('retry-after')})` : ''}, or open a local clone.`);
  }
  if (status === 401 || status === 403) {
    return new Error(
      forge === 'github'
        ? 'GitHub denied access. For a private repo, add a token in Settings.'
        : hasToken
          ? 'GitLab denied access. Check that the token saved for this exact host can read the project.'
          : 'GitLab denied access. If the project is private or internal, add a GitLab token in Settings.',
    );
  }
  if (status === 404) {
    return new Error(
      forge === 'github'
        ? 'Repository not found. If it is private, add a GitHub token in Settings.'
        : 'Repository or .wiki folder not found.',
    );
  }
  if (status === 429) {
    return new Error(
      forge === 'github'
        ? 'GitHub rate-limited this request. Wait and retry, or add a token in Settings.'
        : 'The GitLab host rate-limited this request. Wait and retry.',
    );
  }
  return new Error(`Forge request failed (${status}).`);
}

function forgeProxyUrl(url: string, forge: ForgeKind): string {
  if (forge !== 'gitlab' || !import.meta.env.DEV || !url.startsWith('https://')) return url;
  try {
    const parsed = new URL(url);
    if (!__GITLAB_HOSTS__.includes(parsed.host)) {
      throw new Error(`GitLab host ${parsed.host} is not in OKF_GITLAB_HOSTS.`);
    }
    return `/__forge/${parsed.host}${parsed.pathname}${parsed.search}`;
  } catch {
    throw new Error('This GitLab host is not enabled in the development proxy. Add it to OKF_GITLAB_HOSTS and restart the dev server.');
  }
}

async function nativeRequest(url: string, headers: Record<string, string>, signal?: AbortSignal): Promise<Response> {
  const { invoke } = await import('@tauri-apps/api/tauri');
  signal?.throwIfAborted();
  const requestId = newUuid();
  const cancel = () => { void invoke('cancel_forge_request', { requestId }).catch(() => undefined); };
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    const result = await invoke<{ status: number; body: string; headers: Record<string, string> }>('forge_request', { url, headers, requestId });
    signal?.throwIfAborted();
    return new Response(result.body, { status: result.status, headers: result.headers });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  } finally { signal?.removeEventListener('abort', cancel); }
}

async function req(
  fetchImpl: typeof fetch,
  url: string,
  forge: ForgeKind,
  headers: Record<string, string> = {},
): Promise<Response> {
  let res: Response;
  try {
    res = await fetchImpl(url, { headers });
  } catch (e) {
    if (e instanceof TypeError) {
      throw new Error(
        forge === 'gitlab'
          ? 'GitLab blocked this browser request (CORS or gateway). A token cannot bypass this restriction. Try the desktop app or open a local clone.'
          : 'Network error talking to GitHub.',
      );
    }
    throw e;
  }
  if (!res.ok) {
    const error = await forgeError(res, forge, url, !!headers['PRIVATE-TOKEN']);
    if (error instanceof GitlabIpRestrictedError) throw error;
    throw new ForgeHttpError(error.message, res.status);
  }
  return res;
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx] as T, idx);
    }
  });
  await Promise.all(workers);
  return out;
}

function decodeBase64(content: string): string {
  const bin = atob(content.replace(/\s/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  if (bytes.length > REMOTE_LIMITS.fileBytes) throw new RemoteLimitError('Markdown file exceeds the size limit.');
  return new TextDecoder().decode(bytes);
}

async function readWikiArchive(compressed: ArrayBuffer, report?: Progress, signal?: AbortSignal): Promise<{ files: RemoteFile[]; assets: string[] }> {
  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
  const tar = await readBounded(new Response(stream), REMOTE_LIMITS.archiveBytes, signal);
  const decoder = new TextDecoder();
  const field = (start: number, length: number) =>
    decoder.decode(tar.subarray(start, start + length)).replace(/\0.*$/s, '');
  const entries = new Map<string, Uint8Array>();
  const assets: string[] = [];
  let offset = 0;
  let extendedPath: string | undefined;
  while (offset + 512 <= tar.length) {
    if (tar.subarray(offset, offset + 512).every(byte => byte === 0)) break;
    const name = field(offset, 100);
    const prefix = field(offset + 345, 155);
    const size = parseInt(field(offset + 124, 12).trim(), 8);
    if (!Number.isSafeInteger(size) || size < 0) throw new Error('Invalid GitLab archive.');
    const type = tar[offset + 156];
    const start = offset + 512;
    const end = start + size;
    if (end > tar.length) throw new Error('Incomplete GitLab archive.');
    const content = tar.subarray(start, end);
    offset = start + Math.ceil(size / 512) * 512;

    if (type === 120) { // POSIX extended header, including paths longer than the tar name field.
      let position = 0;
      while (position < content.length) {
        const space = content.indexOf(32, position);
        if (space < 0) break;
        const length = parseInt(decoder.decode(content.subarray(position, space)), 10);
        if (!Number.isSafeInteger(length) || length <= 0) break;
        const record = decoder.decode(content.subarray(space + 1, position + length - 1));
        if (record.startsWith('path=')) extendedPath = record.slice(5);
        position += length;
      }
      continue;
    }
    const path = extendedPath ?? (prefix ? `${prefix}/${name}` : name);
    extendedPath = undefined;
    if (type !== 0 && type !== 48) continue;
    const marker = '/.wiki/';
    const markerAt = path.indexOf(marker);
    const absolute = markerAt >= 0 ? path.slice(markerAt + 1) : path;
    if (!absolute.startsWith('.wiki/')) continue;
    if (absolute.split('/').some(part => SKIP.has(part))) continue;
    if (isViewableAsset(absolute)) { assets.push(absolute); continue; }
    if (!absolute.toLowerCase().endsWith('.md')) continue;
    if (size > REMOTE_LIMITS.fileBytes || entries.size >= REMOTE_LIMITS.files) throw new RemoteLimitError('Wiki archive exceeds the file limits.');
    entries.set(absolute, content);
  }
  const selected = wikiEntries([...entries.keys()]);
  report?.(0, selected.length);
  const files = selected.map((entry, i) => {
    const text = decoder.decode(entries.get(entry.abs));
    report?.(i + 1, selected.length);
    return { path: entry.rel, text };
  });
  return { files, assets: assetEntries(assets).map(entry => entry.rel) };
}

async function fetchGithub(
  remote: RemoteWikiRef,
  fetchImpl: typeof fetch,
  token: string | undefined,
  report?: Progress,
): Promise<RemoteWiki> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const api = (path: string) => `https://api.github.com${path}`;
  const repo = await (await req(
    fetchImpl,
    api(`/repos/${remote.project}`),
    'github',
    headers,
  )).json() as { default_branch: string };
  const ref = remote.ref || repo.default_branch;
  const resolved: RemoteWikiRef = { ...remote, ref };

  const tree = await (await req(
    fetchImpl,
    api(`/repos/${remote.project}/git/trees/${encodeURIComponent(ref)}?recursive=1`),
    'github',
    headers,
  )).json() as { truncated?: boolean; tree?: Array<{ path?: string; type?: string; sha?: string }> };

  let pairs: Array<{ abs: string; rel: string; sha?: string }> = [];
  let assets: string[] = [];
  if (tree.truncated) {
    const abs = await walkGithubContents(fetchImpl, remote.project, ref, headers);
    pairs = wikiEntries(abs).map(e => ({ ...e }));
    assets = assetEntries(abs).map(e => e.rel);
  } else {
    const blobs = (tree.tree ?? []).filter(e => e.type === 'blob' && e.path);
    const byAbs = new Map(blobs.map(e => [e.path as string, e.sha]));
    pairs = wikiEntries([...byAbs.keys()]).map(e => ({ ...e, sha: byAbs.get(e.abs) }));
    assets = assetEntries([...byAbs.keys()]).map(e => e.rel);
  }

  report?.(0, pairs.length);
  const files = await mapPool(pairs, 6, async (entry, i) => {
    let text: string;
    if (entry.sha) {
      const blob = await (await req(
        fetchImpl,
        api(`/repos/${remote.project}/git/blobs/${entry.sha}`),
        'github',
        headers,
      )).json() as { content?: string; encoding?: string };
      text = blob.encoding === 'base64' ? decodeBase64(blob.content ?? '') : (blob.content ?? '');
    } else {
      const res = await req(
        fetchImpl,
        api(`/repos/${remote.project}/contents/${entry.abs}?ref=${encodeURIComponent(ref)}`),
        'github',
        { ...headers, Accept: 'application/vnd.github.raw' },
      );
      text = await res.text();
    }
    if (new TextEncoder().encode(text).length > REMOTE_LIMITS.fileBytes) throw new RemoteLimitError('Markdown file exceeds the size limit.');
    report?.(i + 1, pairs.length);
    return { path: entry.rel, text };
  });
  return { remote: resolved, files, assets };
}

async function walkGithubContents(
  fetchImpl: typeof fetch,
  project: string,
  ref: string,
  headers: Record<string, string>,
  path = '',
  depth = 0,
): Promise<string[]> {
  if (depth > 30) throw new RemoteLimitError('Remote folder depth exceeds the limit.');
  const qs = `?ref=${encodeURIComponent(ref)}`;
  const url = path
    ? `https://api.github.com/repos/${project}/contents/${path}${qs}`
    : `https://api.github.com/repos/${project}/contents${qs}`;
  const body = await (await req(fetchImpl, url, 'github', headers)).json() as
    | Array<{ type: string; path: string; name: string }>
    | { type: string; path: string; name: string };
  const entries = Array.isArray(body) ? body : [body];
  if (!path) {
    const wikiDir = entries.find(e => e.type === 'dir' && isWikiFolderName(e.name));
    if (wikiDir) return walkGithubContents(fetchImpl, project, ref, headers, wikiDir.path);
  }
  const out: string[] = [];
  for (const e of entries) {
    if (e.type === 'dir') {
      if (SKIP.has(e.name)) continue;
      out.push(...await walkGithubContents(fetchImpl, project, ref, headers, e.path, depth + 1));
    } else if (e.path.toLowerCase().endsWith('.md') || isViewableAsset(e.path)) {
      out.push(e.path);
    }
  }
  return out;
}

async function fetchGitlab(
  remote: RemoteWikiRef,
  fetchImpl: typeof fetch,
  token: string | undefined,
  report?: Progress,
  signal?: AbortSignal,
): Promise<RemoteWiki> {
  const headers: Record<string, string> = {};
  if (token) headers['PRIVATE-TOKEN'] = token;
  const id = encodeURIComponent(remote.project);
  const base = `https://${remote.host}/api/v4/projects/${id}`;
  const project = await (await req(fetchImpl, base, 'gitlab', headers)).json() as { default_branch: string };
  const ref = remote.ref || project.default_branch;
  const resolved: RemoteWikiRef = { ...remote, ref };

  // A single archive request avoids gateway limits on bursts of individual file reads.
  const native = typeof window !== 'undefined' && '__TAURI__' in window;
  if (!native && typeof DecompressionStream !== 'undefined') {
    try {
      const archive = await req(
        fetchImpl,
        `${base}/repository/archive.tar.gz?sha=${encodeURIComponent(ref)}&path=.wiki`,
        'gitlab',
        headers,
      );
      const archiveFiles = await readWikiArchive(await archive.arrayBuffer(), report, signal);
      return { remote: resolved, ...archiveFiles };
    } catch (error) {
      signal?.throwIfAborted();
      if (error instanceof GitlabIpRestrictedError || error instanceof RemoteLimitError || (error instanceof DOMException && error.name === 'TimeoutError')) throw error;
      if (error instanceof ForgeHttpError && ![400, 404, 405, 501].includes(error.status)) throw error;
      // Some GitLab hosts disable archives; try the file API below.
    }
  }

  const listed = await gitlabTree(fetchImpl, base, ref, headers);
  const pairs = wikiEntries(listed);
  const assets = assetEntries(listed).map(entry => entry.rel);

  report?.(0, pairs.length);
  const files = await mapPool(pairs, 2, async (entry, i) => {
    const filePath = encodeURIComponent(entry.abs);
    const file = await (await req(
      fetchImpl,
      `${base}/repository/files/${filePath}?ref=${encodeURIComponent(ref)}`,
      'gitlab',
      headers,
    )).json() as { content?: string; encoding?: string };
    if (file.encoding !== 'base64' || !file.content) {
      throw new Error(`GitLab returned an unreadable file: ${entry.abs}`);
    }
    report?.(i + 1, pairs.length);
    return { path: entry.rel, text: decodeBase64(file.content) };
  });
  return { remote: resolved, files, assets };
}

export async function fetchRemoteAsset(remote: RemoteWikiRef, path: string, token?: string, fetchOverride?: typeof fetch): Promise<Blob> {
  if (!isViewableAsset(path) || path.split('/').some(part => part === '..' || part === '.')) throw new Error('Invalid asset path.');
  const headers: Record<string, string> = remote.forge === 'github'
    ? { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
    : {};
  if (token) headers[remote.forge === 'github' ? 'Authorization' : 'PRIVATE-TOKEN'] = remote.forge === 'github' ? `Bearer ${token}` : token;
  const absolute = `.wiki/${path}`;
  const url = remote.forge === 'github'
    ? `https://api.github.com/repos/${remote.project}/contents/${absolute.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(remote.ref ?? '')}`
    : `https://${remote.host}/api/v4/projects/${encodeURIComponent(remote.project)}/repository/files/${encodeURIComponent(absolute)}?ref=${encodeURIComponent(remote.ref ?? '')}`;
  const transport: typeof fetch = (target, init) => fetchOverride ? fetchOverride(target, init) : typeof window !== 'undefined' && '__TAURI__' in window
    ? nativeRequest(String(target), init?.headers as Record<string, string> ?? {})
    : fetch(forgeProxyUrl(String(target), remote.forge), init);
  const response = await req(transport, url, remote.forge, headers);
  const payload = JSON.parse(new TextDecoder().decode(await readBounded(response, 28 * 1024 * 1024))) as { content?: string; encoding?: string };
  if (payload.encoding !== 'base64' || !payload.content) throw new Error(`Unreadable asset: ${path}`);
  const binary = atob(payload.content.replace(/\s/g, ''));
  if (binary.length > 20 * 1024 * 1024) throw new RemoteLimitError('Asset exceeds 20 MB.');
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  const ext = path.split('.').pop()?.toLowerCase();
  const mime: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', bmp: 'image/bmp', svg: 'image/svg+xml', ico: 'image/x-icon', pdf: 'application/pdf' };
  return new Blob([bytes], { type: mime[ext ?? ''] ?? 'application/octet-stream' });
}

async function gitlabTree(
  fetchImpl: typeof fetch,
  base: string,
  ref: string,
  headers: Record<string, string>,
): Promise<string[]> {
  for (const path of ['.wiki', 'wiki', '']) {
    try {
      const blobs = await gitlabTreePages(fetchImpl, base, ref, path, headers);
      return blobs;
    } catch (e) {
      if (!(e instanceof ForgeHttpError) || e.status !== 404) throw e;
      if (path === '') throw e;
    }
  }
  return [];
}

async function gitlabTreePages(
  fetchImpl: typeof fetch,
  base: string,
  ref: string,
  path: string,
  headers: Record<string, string>,
): Promise<string[]> {
  const out: string[] = [];
  let page = 1;
  for (;;) {
    const params = new URLSearchParams({
      recursive: 'true',
      per_page: '100',
      page: String(page),
      ref,
    });
    if (path) params.set('path', path);
    if (page > 100) throw new RemoteLimitError('Remote tree exceeds the page limit.');
    const res = await req(fetchImpl, `${base}/repository/tree?${params}`, 'gitlab', headers);
    const batch = await res.json() as Array<{ type?: string; path?: string }>;
    for (const e of batch) {
      if (e.type === 'blob' && e.path) out.push(e.path);
    }
    if (batch.length < 100) break;
    page += 1;
  }
  return out;
}
