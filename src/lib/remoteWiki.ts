import { isWikiFolderName, parseWikiTexts, type Progress } from '@/lib/wikiParser';

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
  githubToken?: string;
  gitlabToken?: string;
  fetch?: typeof fetch;
  report?: Progress;
}

export interface RemoteWiki {
  remote: RemoteWikiRef;
  files: RemoteFile[];
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

  const host = url.hostname.replace(/^www\./i, '').toLowerCase();
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
  if (remote.host === 'github.com' || remote.host === 'gitlab.com') return remote.project;
  return `${remote.host}/${remote.project}`;
}

export async function fetchRemoteWiki(spec: string | RemoteWikiRef, opts: FetchRemoteOptions = {}): Promise<RemoteWiki> {
  const remote = typeof spec === 'string' ? parseRemoteSpec(spec) : spec;
  const fetchImpl = opts.fetch ?? fetch;
  const fetched = remote.forge === 'github'
    ? await fetchGithub(remote, fetchImpl, opts.githubToken, opts.report)
    : await fetchGitlab(remote, fetchImpl, opts.gitlabToken, opts.report);
  if (!fetched.files.length) {
    throw new Error(`No markdown found in "${remoteProjectId(fetched.remote)}". The repo needs a .wiki folder.`);
  }
  return fetched;
}

export function parseRemoteWiki(project: string, files: RemoteFile[], report?: Progress) {
  return parseWikiTexts(files, project, report);
}

function wikiEntries(absPaths: string[]): Array<{ abs: string; rel: string }> {
  const md = absPaths.filter(p => {
    const parts = p.split('/');
    return p.toLowerCase().endsWith('.md') && !parts.some(part => SKIP.has(part));
  });
  const wikiHits = md.filter(p => isWikiFolderName(p.split('/')[0] ?? ''));
  if (wikiHits.length) {
    return wikiHits.map(abs => ({ abs, rel: abs.split('/').slice(1).join('/') }));
  }
  return md.map(abs => ({ abs, rel: abs }));
}

function forgeError(status: number, forge: ForgeKind): Error {
  if (status === 401 || status === 403) {
    return new Error(
      forge === 'github'
        ? 'GitHub denied access. For a private repo, add a token in Settings.'
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

function forgeProxyUrl(url: string): string {
  if (!import.meta.env.DEV || !url.startsWith('https://')) return url;
  try {
    const parsed = new URL(url);
    return `/__forge/${parsed.host}${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

async function req(
  fetchImpl: typeof fetch,
  url: string,
  forge: ForgeKind,
  headers: Record<string, string> = {},
): Promise<Response> {
  const target = fetchImpl === fetch ? forgeProxyUrl(url) : url;
  let res: Response;
  try {
    res = await fetchImpl(target, { headers });
  } catch (e) {
    if (e instanceof TypeError) {
      throw new Error(
        forge === 'gitlab'
          ? 'This GitLab host blocked the browser (CORS). npm run dev proxies GitLab; a 403 often means the project is internal — add a GitLab token in Settings.'
          : 'Network error talking to GitHub.',
      );
    }
    throw e;
  }
  if (!res.ok) throw forgeError(res.status, forge);
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
  return new TextDecoder().decode(bytes);
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
  if (tree.truncated) {
    const abs = await walkGithubContents(fetchImpl, remote.project, ref, headers);
    pairs = wikiEntries(abs).map(e => ({ ...e }));
  } else {
    const blobs = (tree.tree ?? []).filter(e => e.type === 'blob' && e.path);
    const byAbs = new Map(blobs.map(e => [e.path as string, e.sha]));
    pairs = wikiEntries([...byAbs.keys()]).map(e => ({ ...e, sha: byAbs.get(e.abs) }));
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
    report?.(i + 1, pairs.length);
    return { path: entry.rel, text };
  });
  return { remote: resolved, files };
}

async function walkGithubContents(
  fetchImpl: typeof fetch,
  project: string,
  ref: string,
  headers: Record<string, string>,
  path = '',
): Promise<string[]> {
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
      out.push(...await walkGithubContents(fetchImpl, project, ref, headers, e.path));
    } else if (e.path.toLowerCase().endsWith('.md')) {
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
): Promise<RemoteWiki> {
  const headers: Record<string, string> = {};
  if (token) headers['PRIVATE-TOKEN'] = token;
  const id = encodeURIComponent(remote.project);
  const base = `https://${remote.host}/api/v4/projects/${id}`;
  const project = await (await req(fetchImpl, base, 'gitlab', headers)).json() as { default_branch: string };
  const ref = remote.ref || project.default_branch;
  const resolved: RemoteWikiRef = { ...remote, ref };

  const listed = await gitlabTree(fetchImpl, base, ref, headers);
  const pairs = wikiEntries(listed);

  report?.(0, pairs.length);
  const files = await mapPool(pairs, 6, async (entry, i) => {
    const filePath = encodeURIComponent(entry.abs);
    const res = await req(
      fetchImpl,
      `${base}/repository/files/${filePath}/raw?ref=${encodeURIComponent(ref)}`,
      'gitlab',
      headers,
    );
    report?.(i + 1, pairs.length);
    return { path: entry.rel, text: await res.text() };
  });
  return { remote: resolved, files };
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
      if (path && blobs.length) return blobs;
      if (!path) return blobs;
    } catch (e) {
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
