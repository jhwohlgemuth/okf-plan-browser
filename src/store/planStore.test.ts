import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PLAN_STORAGE_KEY, usePlanStore, selectFilteredPlans } from '@/store/planStore';
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
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn((key: string) => { values.delete(key); }),
  });
  handleCleanup.deleteHandle.mockReset().mockResolvedValue(undefined);
  handleCleanup.clearHandles.mockReset().mockResolvedValue(undefined);
});

describe('portfolio persistence', () => {
  const repo: WikiRepo = { id: 'r1', label: 'one', color: '#61afef', planCount: 1 };

  it('does not serialize or write the portfolio for filter and detail updates', () => {
    usePlanStore.getState().addPlans([plans[0]!], repo, []);
    const write = vi.mocked(localStorage.setItem);
    write.mockClear();
    const stringify = vi.spyOn(JSON, 'stringify');

    for (let index = 0; index < 100; index += 1) {
      usePlanStore.getState().setFilter('search', `alpha-${index}`);
      usePlanStore.getState().selectPlan(plans[0]!.id);
      usePlanStore.getState().syncPlanSelection(plans[0]!.id, 'goal');
      usePlanStore.getState().closeDetail();
    }
    usePlanStore.getState().clearFilters();

    expect(stringify).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    stringify.mockRestore();
  });

  it('serializes and writes once for a representative large portfolio mutation', () => {
    const largePlans = Array.from({ length: 50 }, (_, index) => mk(
      `large-${index}`,
      'status: planned\nimpact: high',
      `# Goal\n${'Representative portfolio content. '.repeat(625)}\n`,
    ));
    const largeRepo = { ...repo, planCount: largePlans.length };
    const write = vi.mocked(localStorage.setItem);
    write.mockClear();
    const stringify = vi.spyOn(JSON, 'stringify');
    const started = performance.now();

    usePlanStore.getState().addPlans(largePlans, largeRepo, []);

    const elapsed = performance.now() - started;
    expect(stringify).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledWith(PLAN_STORAGE_KEY, expect.any(String));
    expect(write.mock.calls[0]![1].length).toBeGreaterThan(750_000);
    expect(elapsed).toBeLessThan(1_000);
    stringify.mockRestore();
  });
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
