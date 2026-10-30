import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePlanStore, selectFilteredPlans } from '@/store/planStore';
import { parseWikiFile } from '@/lib/wikiParser';
import type { ParsedPlan, WikiRepo } from '@/types/wiki';

const handleCleanup = vi.hoisted(() => ({
  deleteHandle: vi.fn<(project: string) => Promise<void>>(),
  clearHandles: vi.fn<() => Promise<void>>(),
}));

vi.mock('@/lib/handleStore', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/handleStore')>(),
  ...handleCleanup,
}));

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

beforeEach(() => {
  handleCleanup.deleteHandle.mockReset().mockResolvedValue(undefined);
  handleCleanup.clearHandles.mockReset().mockResolvedValue(undefined);
});

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

describe('folder handle cleanup', () => {
  const repos: WikiRepo[] = [
    { id: 'r1', label: 'one', color: '#61afef', planCount: 1 },
    { id: 'r2', label: 'two', color: '#98c379', planCount: 1 },
  ];

  const seed = () => usePlanStore.setState({
    plans,
    repos,
    warnings: [{ repoId: 'r1', fileName: 'broken.md', errors: ['bad'] }],
    isDemoData: false,
  });

  it('removes repository state after its handle transaction commits', async () => {
    seed();
    const outcome = usePlanStore.getState().removeRepo('r1');

    expect(usePlanStore.getState().repos.map(repo => repo.id)).toEqual(['r2']);
    expect(usePlanStore.getState().plans.map(plan => plan.repoId)).toEqual(['r2']);
    expect(usePlanStore.getState().warnings).toEqual([]);
    await expect(outcome).resolves.toEqual({ ok: true });
    expect(handleCleanup.deleteHandle).toHaveBeenCalledWith('r1');
  });

  it('keeps repository state removed and reports a handle cleanup failure', async () => {
    const error = new Error('IndexedDB is unavailable');
    handleCleanup.deleteHandle.mockRejectedValueOnce(error);
    seed();

    const outcome = usePlanStore.getState().removeRepo('r1');

    expect(usePlanStore.getState().repos.map(repo => repo.id)).toEqual(['r2']);
    await expect(outcome).resolves.toEqual({ ok: false, error });
  });

  it.each(['clearAll', 'clearSavedData'] as const)('%s clears all handles and reports cleanup failures', async action => {
    const error = new Error('cleanup blocked');
    handleCleanup.clearHandles.mockRejectedValueOnce(error);
    seed();

    const outcome = usePlanStore.getState()[action]();

    expect(usePlanStore.getState().repos).toEqual([]);
    expect(usePlanStore.getState().plans).toEqual([]);
    await expect(outcome).resolves.toEqual({ ok: false, error });
    expect(handleCleanup.clearHandles).toHaveBeenCalledOnce();
  });

  it('treats handle cleanup during demo replacement as best-effort', async () => {
    handleCleanup.clearHandles.mockRejectedValueOnce(new Error('cleanup blocked'));
    seed();

    usePlanStore.getState().loadDemoData();
    await Promise.resolve();

    expect(usePlanStore.getState().isDemoData).toBe(true);
    expect(handleCleanup.clearHandles).toHaveBeenCalledOnce();
  });
});
