import { afterEach, expect, it, vi } from 'vitest';
import { boundedFetch, readBounded, REMOTE_LIMITS } from './remoteLimits';
import { fetchRemoteWiki } from './remoteWiki';

afterEach(() => vi.useRealTimers());

it('limits streaming bodies even without content-length', async () => {
  const body = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(11)); c.close(); } });
  await expect(readBounded(new Response(body), 10)).rejects.toThrow(/size limit/);
});

it('enforces an aggregate budget across concurrent responses', async () => {
  const original = REMOTE_LIMITS.totalBytes;
  REMOTE_LIMITS.totalBytes = 10;
  try {
    const request = boundedFetch(async () => new Response('123456'), new AbortController().signal);
    const results = await Promise.allSettled([request('https://example.com/1'), request('https://example.com/2')]);
    expect(results.filter(r => r.status === 'rejected')).toHaveLength(1);
  } finally { REMOTE_LIMITS.totalBytes = original; }
});

it('cancels a pending body read', async () => {
  const controller = new AbortController();
  const response = new Response(new ReadableStream({ start() {} }));
  const read = readBounded(response, 10, controller.signal);
  const assertion = expect(read).rejects.toMatchObject({ name: 'AbortError' });
  controller.abort();
  await assertion;
});

it('bounds retry count and obeys a long Retry-After without waiting', async () => {
  vi.useFakeTimers();
  const transport = vi.fn(async () => new Response('', { status: 503 }));
  const pending = boundedFetch(transport, new AbortController().signal)('https://example.com');
  await vi.runAllTimersAsync();
  expect((await pending).status).toBe(503);
  expect(transport).toHaveBeenCalledTimes(3);
  const limited = vi.fn(async () => new Response('', { status: 429, headers: { 'Retry-After': '60' } }));
  expect((await boundedFetch(limited, new AbortController().signal)('https://example.com')).status).toBe(429);
  expect(limited).toHaveBeenCalledTimes(1);
});

it('times out stalled responses including their body', async () => {
  vi.useFakeTimers();
  const pending = boundedFetch(async () => new Response(new ReadableStream({ start() {} })),
    new AbortController().signal)('https://example.com');
  const assertion = expect(pending).rejects.toMatchObject({ name: 'TimeoutError' });
  await vi.advanceTimersByTimeAsync(REMOTE_LIMITS.requestMs + 1);
  await assertion;
});

it('does not request anything for an already cancelled load', async () => {
  const controller = new AbortController();
  controller.abort();
  const transport = vi.fn();
  await expect(fetchRemoteWiki('team/app', { fetch: transport, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
  expect(transport).not.toHaveBeenCalled();
});

it('permits an empty remote snapshot for refresh and surfaces rate limits', async () => {
  const transport: typeof fetch = async url => String(url).includes('/git/trees/')
    ? Response.json({ tree: [] }) : Response.json({ default_branch: 'main' });
  expect((await fetchRemoteWiki('team/app', { fetch: transport })).files).toEqual([]);
  await expect(fetchRemoteWiki('team/app', {
    fetch: async () => new Response('', { status: 403, headers: { 'x-ratelimit-remaining': '0', 'retry-after': '60' } }),
  })).rejects.toThrow(/rate-limited/);
});
