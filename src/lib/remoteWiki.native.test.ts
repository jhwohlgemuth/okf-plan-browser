import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fetchRemoteWiki } from './remoteWiki';
import { getGithubToken, setGithubToken } from './githubToken';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/tauri', () => ({ invoke }));

beforeEach(() => {
  invoke.mockReset();
  vi.stubGlobal('window', { __TAURI__: {} });
});
afterEach(() => vi.unstubAllGlobals());

it('uses native IPC for remote reads without exposing stored credentials to JavaScript', async () => {
  const browserFetch = vi.fn();
  vi.stubGlobal('fetch', browserFetch);
  invoke.mockImplementation(async (command, args) => {
    expect(command).toBe('forge_request');
    expect(args.requestId).toBeTruthy();
    expect(args.headers.Authorization).toBeUndefined();
    return { status: 200, headers: {}, body: JSON.stringify(args.url.includes('/git/trees/')
      ? { tree: [] } : { default_branch: 'main' }) };
  });
  expect(await getGithubToken()).toBe('');
  expect((await fetchRemoteWiki('team/app')).files).toEqual([]);
  expect(invoke).toHaveBeenCalledTimes(2);
  expect(browserFetch).not.toHaveBeenCalled();
});

it('stores desktop credentials through the native command', async () => {
  invoke.mockResolvedValue(undefined);
  await setGithubToken('test-token');
  expect(invoke).toHaveBeenCalledWith('save_forge_token', {
    forge: 'github', host: 'api.github.com', token: 'test-token',
  });
});

it('cancels native requests by their request ID and returns the abort reason', async () => {
  let rejectRequest: (error: string) => void = () => {};
  invoke.mockImplementation((command) => {
    if (command === 'forge_request') return new Promise((_resolve, reject) => { rejectRequest = reject; });
    if (command === 'cancel_forge_request') { rejectRequest('Remote request cancelled'); return Promise.resolve(); }
    throw new Error('Unexpected command');
  });
  const controller = new AbortController();
  const pending = fetchRemoteWiki('team/app', { signal: controller.signal });
  const assertion = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith('forge_request', expect.anything()));
  controller.abort();
  await assertion;
  const id = invoke.mock.calls[0]?.[1].requestId;
  expect(invoke).toHaveBeenCalledWith('cancel_forge_request', { requestId: id });
});
