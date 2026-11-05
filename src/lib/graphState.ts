const GRAPH_SESSION_KEY = 'okf-plan-browser:graph-state-v1';

export const GRAPH_STATE_KEYS = [
  'gq',
  'gstatus',
  'grepo',
  'gkind',
  'gtag',
  'gblocked',
  'gedges',
  'ghops',
  'glayout',
  'gplan',
] as const;

export function hasGraphState(params: URLSearchParams): boolean {
  return GRAPH_STATE_KEYS.some(key => params.has(key));
}

export function readGraphState(): URLSearchParams | null {
  try {
    const value = sessionStorage.getItem(GRAPH_SESSION_KEY);
    return value ? new URLSearchParams(value) : null;
  } catch {
    return null;
  }
}

export function saveGraphState(params: URLSearchParams): void {
  try {
    const saved = new URLSearchParams();
    for (const key of GRAPH_STATE_KEYS) {
      const value = params.get(key);
      if (value) saved.set(key, value);
    }
    const value = saved.toString();
    if (value) sessionStorage.setItem(GRAPH_SESSION_KEY, value);
    else sessionStorage.removeItem(GRAPH_SESSION_KEY);
  } catch {
    // Storage may be unavailable in privacy-restricted browser contexts.
  }
}

export function clearGraphState(): void {
  try { sessionStorage.removeItem(GRAPH_SESSION_KEY); } catch { /* ignore */ }
}
