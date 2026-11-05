import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearGraphState, graphCanvasScope, readGraphCanvasState, saveGraphCanvasState,
  type GraphCanvasState,
} from './graphState';

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn((key: string) => { values.delete(key); }),
  });
  clearGraphState();
});

describe('graph canvas persistence', () => {
  it('uses a stable portfolio scope independent of node order', () => {
    expect(graphCanvasScope(['repo:b', 'repo:a'])).toBe(graphCanvasScope(['repo:a', 'repo:b']));
    expect(graphCanvasScope(['repo:a'])).not.toBe(graphCanvasScope(['repo:a', 'repo:b']));
  });

  it('round-trips viewport, node positions, and selection for the same graph only', () => {
    const state: GraphCanvasState = {
      scope: graphCanvasScope(['repo:a', 'repo:b']),
      transform: { x: 81.5, y: -24, k: 1.75 },
      positions: { 'repo:a': { x: 120, y: 80 }, 'repo:b': { x: 340, y: 210 } },
      selectedId: 'repo:b',
    };

    saveGraphCanvasState(state);

    expect(readGraphCanvasState(state.scope)).toEqual(state);
    expect(readGraphCanvasState(graphCanvasScope(['repo:other']))).toBeNull();
  });

  it('clears the saved canvas state', () => {
    const scope = graphCanvasScope(['repo:a']);
    saveGraphCanvasState({
      scope,
      transform: { x: 10, y: 20, k: 1.25 },
      positions: { 'repo:a': { x: 30, y: 40 } },
      selectedId: null,
    });

    clearGraphState();

    expect(readGraphCanvasState(scope)).toBeNull();
  });
});
