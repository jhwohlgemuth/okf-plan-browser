import { describe, it, expect, beforeEach } from 'vitest';
import { usePlanStore, selectFilteredPlans } from '@/store/planStore';
import { parseWikiFile } from '@/lib/wikiParser';
import type { ParsedPlan } from '@/types/wiki';

const mk = (name: string, fm: string, body = ''): ParsedPlan =>
  parseWikiFile('r1', name, `---\ntitle: ${name}\n${fm}\n---\n${body}`);

const plans = [
  mk('alpha', 'status: planned\npriority: high\nimpact: high\ndifficulty: easy\ntags: [ui]\npackage: [web]', '# Goal\nrender speed\n'),
  mk('beta', 'status: blocked\npriority: low\nimpact: low\ndifficulty: hard\ntags: [db]\npackage: [api]', '# Execution phases\n\n## AB-01 — Migrate storage\n'),
  { ...mk('gamma', 'status: planned\ntags: [ui, db]'), repoId: 'r2' },
];

const run = (filters: Partial<ReturnType<typeof usePlanStore.getState>['filters']>) => {
  usePlanStore.setState(s => ({ plans, filters: { ...s.filters, ...filters } }));
  return selectFilteredPlans(usePlanStore.getState()).map(p => p.fileName);
};

describe('selectFilteredPlans', () => {
  beforeEach(() => {
    usePlanStore.getState().clearFilters();
  });

  it('returns everything with no filters', () => {
    expect(run({})).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('filters Epics separately from phased plans', () => {
    expect(run({ kinds: ['epic'] })).toEqual(['alpha', 'gamma']);
    expect(run({ kinds: ['plan'] })).toEqual(['beta']);
  });

  it.each([
    ['status', { status: ['blocked'] }, ['beta']],
    ['priority', { priority: ['high'] }, ['alpha']],
    ['impact', { impact: ['low'] }, ['beta']],
    ['difficulty', { difficulty: ['easy'] }, ['alpha']],
    ['repos', { repos: ['r2'] }, ['gamma']],
    ['tags (any match)', { tags: ['db'] }, ['beta', 'gamma']],
    ['packages (any match)', { packages: ['web', 'api'] }, ['alpha', 'beta']],
  ] as const)('filters by %s', (_n, f, expected) => {
    expect(run(f as never)).toEqual(expected);
  });

  it('combines dimensions with AND', () => {
    expect(run({ status: ['planned'], tags: ['db'] })).toEqual(['gamma']);
  });

  it('searches titles, section bodies and phase titles case-insensitively', () => {
    expect(run({ search: 'ALPHA' })).toEqual(['alpha']);
    expect(run({ search: 'render speed' })).toEqual(['alpha']);
    expect(run({ search: 'migrate storage' })).toEqual(['beta']);
    expect(run({ search: 'nomatch' })).toEqual([]);
  });
});
