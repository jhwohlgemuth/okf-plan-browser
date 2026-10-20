import { describe, it, expect } from 'vitest';
import {
  parseRemoteSpec, remoteProjectId, fetchRemoteWiki, parseRemoteWiki,
} from '@/lib/remoteWiki';
import { TREE } from '@/test/handles';

const planOne = TREE['.wiki/plan-one.md']!;
const planTwo = TREE['.wiki/sub/plan-two.md']!;
const notes = TREE['.wiki/notes.md']!;

describe('parseRemoteSpec', () => {
  it('treats owner/repo as GitHub', () => {
    expect(parseRemoteSpec('acme/widgets')).toEqual({
      forge: 'github', host: 'github.com', project: 'acme/widgets',
    });
  });

  it('parses GitHub URLs and a tree ref', () => {
    expect(parseRemoteSpec('https://github.com/acme/widgets.git')).toEqual({
      forge: 'github', host: 'github.com', project: 'acme/widgets',
    });
    expect(parseRemoteSpec('https://github.com/acme/widgets/tree/main')).toEqual({
      forge: 'github', host: 'github.com', project: 'acme/widgets', ref: 'main',
    });
  });

  it('parses GitLab.com and a custom host', () => {
    expect(parseRemoteSpec('https://gitlab.com/group/proj')).toEqual({
      forge: 'gitlab', host: 'gitlab.com', project: 'group/proj',
    });
    expect(parseRemoteSpec('code.ornl.gov/research-enablement/acorn')).toEqual({
      forge: 'gitlab', host: 'code.ornl.gov', project: 'research-enablement/acorn',
    });
    expect(parseRemoteSpec('https://code.ornl.gov/research-enablement/acorn/-/tree/main')).toEqual({
      forge: 'gitlab', host: 'code.ornl.gov', project: 'research-enablement/acorn', ref: 'main',
    });
  });

  it('rejects empty and malformed specs', () => {
    expect(() => parseRemoteSpec('')).toThrow(/owner\/repo/);
    expect(() => parseRemoteSpec('justone')).toThrow(/owner\/repo/);
    expect(() => parseRemoteSpec('http://gitlab.com/group/project')).toThrow(/HTTPS/);
    expect(() => parseRemoteSpec('https://token@gitlab.com/group/project')).toThrow(/credentials/);
  });
});

describe('remoteProjectId', () => {
  it('omits github.com and gitlab.com, keeps a custom host', () => {
    expect(remoteProjectId({ forge: 'github', host: 'github.com', project: 'acme/widgets' })).toBe('acme/widgets');
    expect(remoteProjectId({ forge: 'gitlab', host: 'gitlab.com', project: 'g/p' })).toBe('g/p');
    expect(remoteProjectId({
      forge: 'gitlab', host: 'code.ornl.gov', project: 'research-enablement/acorn',
    })).toBe('code.ornl.gov/research-enablement/acorn');
  });
});

type Route = { status?: number; json?: unknown; text?: string };

function mockFetch(routes: Record<string, Route>): typeof fetch {
  return async (input, init) => {
    const url = String(input);
    const hit = Object.entries(routes)
      .filter(([k]) => url === k || url.startsWith(k))
      .sort((a, b) => b[0].length - a[0].length)[0];
    if (!hit) throw new Error(`unexpected fetch ${url}`);
    const [, route] = hit;
    const status = route.status ?? 200;
    const body = route.text ?? JSON.stringify(route.json ?? {});
    const accept = (init?.headers as Record<string, string> | undefined)?.Accept ?? '';
    if (route.text !== undefined || accept.includes('raw')) {
      return new Response(route.text ?? body, { status });
    }
    return new Response(body, { status, headers: { 'Content-Type': 'application/json' } });
  };
}

function b64(text: string): string {
  return btoa(unescape(encodeURIComponent(text)));
}

describe('fetchRemoteWiki GitHub', () => {
  const repo = 'https://api.github.com/repos/acme/widgets';
  const tree = `${repo}/git/trees/main?recursive=1`;
  const blob = (sha: string) => `${repo}/git/blobs/${sha}`;

  const githubRoutes: Record<string, Route> = {
    [repo]: { json: { default_branch: 'main' } },
    [tree]: {
      json: {
        truncated: false,
        tree: [
          { path: '.wiki/plan-one.md', type: 'blob', sha: 's1' },
          { path: '.wiki/sub/plan-two.md', type: 'blob', sha: 's2' },
          { path: '.wiki/notes.md', type: 'blob', sha: 's3' },
          { path: '.wiki/node_modules/skip.md', type: 'blob', sha: 's4' },
          { path: 'README.md', type: 'blob', sha: 's5' },
        ],
      },
    },
    [blob('s1')]: { json: { encoding: 'base64', content: b64(planOne) } },
    [blob('s2')]: { json: { encoding: 'base64', content: b64(planTwo) } },
    [blob('s3')]: { json: { encoding: 'base64', content: b64(notes) } },
  };

  it('lists .wiki markdown and strips the folder prefix', async () => {
    const wiki = await fetchRemoteWiki('acme/widgets', { fetch: mockFetch(githubRoutes) });
    expect(wiki.remote).toEqual({
      forge: 'github', host: 'github.com', project: 'acme/widgets', ref: 'main',
    });
    expect(wiki.files.map(f => f.path).sort()).toEqual(['notes.md', 'plan-one.md', 'sub/plan-two.md']);
    const parsed = await parseRemoteWiki('acme/widgets', wiki.files);
    expect(parsed.plans.map(p => p.id).sort()).toEqual(['acme/widgets:plan-one.md', 'acme/widgets:sub/plan-two.md']);
  });

  it('explains private-repo 401 and missing 404', async () => {
    await expect(fetchRemoteWiki('acme/widgets', {
      fetch: mockFetch({ [repo]: { status: 401 } }),
    })).rejects.toThrow(/token in Settings/);
    await expect(fetchRemoteWiki('acme/widgets', {
      fetch: mockFetch({ [repo]: { status: 404 } }),
    })).rejects.toThrow(/private/);
  });

  it('sends the GitHub token', async () => {
    let auth = '';
    const fetchImpl: typeof fetch = async (input, init) => {
      auth = (init?.headers as Record<string, string> | undefined)?.Authorization ?? '';
      return mockFetch(githubRoutes)(input, init);
    };
    await fetchRemoteWiki('acme/widgets', { fetch: fetchImpl, githubToken: 'ghp_secret' });
    expect(auth).toBe('Bearer ghp_secret');
  });

  it('walks contents when the tree is truncated', async () => {
    const routes: Record<string, Route> = {
      [repo]: { json: { default_branch: 'main' } },
      [tree]: { json: { truncated: true, tree: [] } },
      [`${repo}/contents?ref=main`]: {
        json: [
          { type: 'dir', name: '.wiki', path: '.wiki' },
          { type: 'file', name: 'README.md', path: 'README.md' },
        ],
      },
      [`${repo}/contents/.wiki?ref=main`]: {
        json: [
          { type: 'file', name: 'plan-one.md', path: '.wiki/plan-one.md' },
        ],
      },
      [`${repo}/contents/.wiki/plan-one.md?ref=main`]: { text: planOne },
    };
    const wiki = await fetchRemoteWiki('acme/widgets', { fetch: mockFetch(routes) });
    expect(wiki.files).toEqual([{ path: 'plan-one.md', text: planOne }]);
  });
});

describe('fetchRemoteWiki GitLab', () => {
  const base = 'https://code.ornl.gov/api/v4/projects/research-enablement%2Facorn';

  it('loads a custom-host public project', async () => {
    const routes: Record<string, Route> = {
      [base]: { json: { default_branch: 'main' } },
      [`${base}/repository/tree?`]: {
        json: [
          { type: 'blob', path: '.wiki/plan-one.md' },
          { type: 'blob', path: '.wiki/sub/plan-two.md' },
          { type: 'tree', path: '.wiki/sub' },
        ],
      },
      [`${base}/repository/files/${encodeURIComponent('.wiki/plan-one.md')}/raw?ref=main`]: { text: planOne },
      [`${base}/repository/files/${encodeURIComponent('.wiki/sub/plan-two.md')}/raw?ref=main`]: { text: planTwo },
    };
    const wiki = await fetchRemoteWiki('https://code.ornl.gov/research-enablement/acorn', {
      fetch: mockFetch(routes),
    });
    expect(wiki.remote.host).toBe('code.ornl.gov');
    expect(wiki.files.map(f => f.path).sort()).toEqual(['plan-one.md', 'sub/plan-two.md']);
  });

  it('surfaces a missing GitLab project', async () => {
    await expect(fetchRemoteWiki('https://gitlab.com/missing/proj', {
      fetch: mockFetch({
        'https://gitlab.com/api/v4/projects/missing%2Fproj': { status: 404 },
      }),
    })).rejects.toThrow(/not found/);
  });

  it('sends the GitLab token', async () => {
    let token = '';
    const routes: Record<string, Route> = {
      [base]: { json: { default_branch: 'main' } },
      [`${base}/repository/tree?`]: { json: [{ type: 'blob', path: '.wiki/plan-one.md' }] },
      [`${base}/repository/files/${encodeURIComponent('.wiki/plan-one.md')}/raw?ref=main`]: { text: planOne },
    };
    const fetchImpl: typeof fetch = async (input, init) => {
      token = (init?.headers as Record<string, string> | undefined)?.['PRIVATE-TOKEN'] ?? '';
      return mockFetch(routes)(input, init);
    };
    await fetchRemoteWiki('https://code.ornl.gov/research-enablement/acorn', {
      fetch: fetchImpl, gitlabToken: 'glpat-secret',
    });
    expect(token).toBe('glpat-secret');
  });

  it('explains a CORS failure', async () => {
    await expect(fetchRemoteWiki('https://gitlab.com/group/proj', {
      fetch: async () => { throw new TypeError('Failed to fetch'); },
    })).rejects.toThrow(/CORS/);
  });
});
