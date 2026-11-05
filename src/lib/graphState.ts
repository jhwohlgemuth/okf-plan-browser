const GRAPH_SESSION_KEY = 'okf-plan-browser:graph-state-v1';
const GRAPH_CANVAS_SESSION_KEY = 'okf-plan-browser:graph-canvas-v1';
const MAX_SAVED_POSITIONS = 5_000;

let memoryGraphState: string | null = null;
let memoryCanvasState: GraphCanvasState | null = null;

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

export interface GraphCanvasState {
  scope: string;
  transform: { x: number; y: number; k: number };
  positions: Record<string, { x: number; y: number }>;
  selectedId: string | null;
}

export function hasGraphState(params: URLSearchParams): boolean {
  return GRAPH_STATE_KEYS.some(key => params.has(key));
}

export function readGraphState(): URLSearchParams | null {
  try {
    const value = sessionStorage.getItem(GRAPH_SESSION_KEY) ?? memoryGraphState;
    return value ? new URLSearchParams(value) : null;
  } catch {
    return memoryGraphState ? new URLSearchParams(memoryGraphState) : null;
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
    memoryGraphState = value || null;
    if (value) sessionStorage.setItem(GRAPH_SESSION_KEY, value);
    else sessionStorage.removeItem(GRAPH_SESSION_KEY);
  } catch {
    // Storage may be unavailable in privacy-restricted browser contexts.
  }
}

export function graphCanvasScope(nodeIds: string[]): string {
  let hash = 0x811c9dc5;
  for (const id of [...nodeIds].sort()) {
    for (let index = 0; index < id.length; index++) {
      hash = Math.imul(hash ^ id.charCodeAt(index), 0x01000193);
    }
    hash = Math.imul(hash ^ 0, 0x01000193);
  }
  return `${nodeIds.length}:${(hash >>> 0).toString(36)}`;
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export function readGraphCanvasState(scope: string): GraphCanvasState | null {
  if (memoryCanvasState?.scope === scope) return memoryCanvasState;
  try {
    const raw = sessionStorage.getItem(GRAPH_CANVAS_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GraphCanvasState>;
    if (parsed.scope !== scope || !parsed.transform || !parsed.positions
      || !finite(parsed.transform.x) || !finite(parsed.transform.y) || !finite(parsed.transform.k)
      || parsed.transform.k < 0.25 || parsed.transform.k > 4) return null;
    const positions = Object.fromEntries(Object.entries(parsed.positions).slice(0, MAX_SAVED_POSITIONS)
      .filter((entry): entry is [string, { x: number; y: number }] => {
        const position = entry[1];
        return !!position && finite(position.x) && finite(position.y);
      }));
    const state: GraphCanvasState = {
      scope,
      transform: parsed.transform,
      positions,
      selectedId: typeof parsed.selectedId === 'string' ? parsed.selectedId : null,
    };
    memoryCanvasState = state;
    return state;
  } catch {
    return null;
  }
}

export function saveGraphCanvasState(state: GraphCanvasState): void {
  const positions = Object.fromEntries(Object.entries(state.positions).slice(0, MAX_SAVED_POSITIONS));
  const saved = { ...state, positions };
  memoryCanvasState = saved;
  try { sessionStorage.setItem(GRAPH_CANVAS_SESSION_KEY, JSON.stringify(saved)); } catch { /* ignore */ }
}

export function clearGraphState(): void {
  memoryGraphState = null;
  memoryCanvasState = null;
  try {
    sessionStorage.removeItem(GRAPH_SESSION_KEY);
    sessionStorage.removeItem(GRAPH_CANVAS_SESSION_KEY);
  } catch { /* ignore */ }
}
