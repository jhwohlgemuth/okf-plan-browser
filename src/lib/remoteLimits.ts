export const REMOTE_LIMITS = {
  requestMs: 30_000, loadMs: 120_000, responseBytes: 8 * 1024 * 1024,
  totalBytes: 32 * 1024 * 1024, archiveBytes: 32 * 1024 * 1024,
  fileBytes: 2 * 1024 * 1024, files: 1000, requests: 2000,
};

export class RemoteLimitError extends Error {}

export async function readBounded(response: Response, max: number, signal?: AbortSignal): Promise<Uint8Array> {
  if (Number(response.headers.get('content-length')) > max) {
    await response.body?.cancel();
    throw new RemoteLimitError('Remote response exceeds the size limit. Open a local clone instead.');
  }
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const abort = () => { void reader.cancel(); };
  signal?.addEventListener('abort', abort, { once: true });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      size += value.length;
      if (size > max) throw new RemoteLimitError('Remote response exceeds the size limit. Open a local clone instead.');
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return bytes;
  } finally {
    signal?.removeEventListener('abort', abort);
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}

/** Bound every response, including its streamed body, and the entire operation. */
export function boundedFetch(transport: typeof fetch, signal: AbortSignal): typeof fetch {
  let total = 0;
  let requests = 0;
  return async (input, init) => {
    for (let attempt = 0; ; attempt++) {
      if (++requests > REMOTE_LIMITS.requests) throw new RemoteLimitError('Too many remote requests. Open a local clone instead.');
      signal.throwIfAborted();
      const controller = new AbortController();
      const abort = () => controller.abort(signal.reason);
      signal.addEventListener('abort', abort, { once: true });
      const timer = setTimeout(() => controller.abort(new DOMException('Remote request timed out. Retry or open a local clone.', 'TimeoutError')), REMOTE_LIMITS.requestMs);
      let response: Response;
      try {
        response = await transport(input, { ...init, signal: controller.signal });
        const bytes = await readBounded(response, Math.min(REMOTE_LIMITS.responseBytes, REMOTE_LIMITS.totalBytes - total), controller.signal);
        total += bytes.length;
        if (total > REMOTE_LIMITS.totalBytes) throw new RemoteLimitError('Remote load exceeds the total size limit.');
        response = new Response(response.status === 204 || response.status === 304 ? null : bytes as BodyInit,
          { status: response.status, headers: response.headers });
      } catch (error) {
        if (controller.signal.aborted) throw controller.signal.reason;
        throw error;
      } finally {
        clearTimeout(timer);
        signal.removeEventListener('abort', abort);
      }
      const retrySeconds = Number(response.headers.get('retry-after'));
      const limited = response.status === 429 || (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0');
      if (attempt < 2 && (limited || [502, 503, 504].includes(response.status)) && retrySeconds <= 2) {
        await pause(Math.max(retrySeconds * 1000, 250 * 2 ** attempt), signal);
        continue;
      }
      return response;
    }
  };
}
