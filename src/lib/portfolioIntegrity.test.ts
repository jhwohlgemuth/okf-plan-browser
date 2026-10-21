import { beforeEach, describe, expect, it } from 'vitest';
import { parseWikiFile, parseWikiTexts } from './wikiParser';
import { commitWiki } from './commitWiki';
import { restorePortfolio } from './restorePortfolio';
import { usePlanStore } from '@/store/planStore';
import { buildPlanEdges, resolvePlanLink } from './planLinks';
import { remoteProjectId } from './remoteWiki';

const plan = (repo: string, path: string, body = '', metadata = '') =>
  parseWikiFile(repo, path, `---\ntype: Plan\ntitle: Example\n${metadata}\n---\n${body}`);

describe('portfolio integrity', () => {
  beforeEach(() => usePlanStore.getState().clearAll());

  it('normalizes invalid metadata without unsafe values entering renderers', () => {
    const p = plan('r', 'p.md', '', 'description: 123\nstatus: surprise\nphase_budget_hours: nope\ntags: [{}]');
    expect(p.frontmatter.description).toBeUndefined();
    expect(p.frontmatter.status).toBeUndefined();
    expect(p.frontmatter.tags).toEqual([]);
    expect(p.parseErrors).toHaveLength(4);
  });

  it('reports malformed YAML and keeps the previous snapshot on a partial refresh', async () => {
    commitWiki('r', { plans: [plan('r', 'old.md')], errors: [] });
    const result = await parseWikiTexts([
      { path: 'new.md', text: '---\ntitle: New\n---\nx' },
      { path: 'bad.md', text: '---\ntitle: [broken\n---\nx' },
    ], 'r');
    expect(result.errors[0]?.name).toBe('bad.md');
    expect(() => commitWiki('r', result, { refresh: true })).toThrow(/bad.md/);
    expect(usePlanStore.getState().plans[0]?.fileName).toBe('old.md');
  });

  it('accepts a valid empty refresh, but not an accidental empty initial import', () => {
    commitWiki('r', { plans: [plan('r', 'old.md')], errors: [] });
    commitWiki('r', { plans: [], errors: [] }, { refresh: true });
    expect(usePlanStore.getState().plans).toEqual([]);
    expect(usePlanStore.getState().repos[0]?.planCount).toBe(0);
    expect(() => commitWiki('new', { plans: [], errors: [] })).toThrow(/No plans/);
  });

  it('separates hosts, branches, and local identities sharing a label', () => {
    const base = { forge: 'github' as const, host: 'github.com', project: 'team/app', ref: 'main' };
    const ids = [remoteProjectId(base), remoteProjectId({ ...base, forge: 'gitlab', host: 'gitlab.com' }),
      remoteProjectId({ ...base, ref: 'feature/one' }), 'local:a', 'local:b'];
    for (const id of ids) commitWiki(id, { plans: [plan(id, 'p.md')], errors: [] }, { label: 'app' });
    expect(usePlanStore.getState().repos).toHaveLength(5);
  });

  it('migrates legacy remote identities and validates restored plans', () => {
    const p = plan('team/app', 'p.md');
    const restored = restorePortfolio({
      repos: [{ id: 'team/app', remote: { forge: 'github', host: 'github.com', project: 'team/app', ref: 'main' } }],
      plans: [{ ...p, frontmatter: { title: 'Safe', description: {} } }, { ...p, fileName: 'bad.md', sections: null }],
    });
    expect(restored.plans).toHaveLength(1);
    expect(restored.plans[0]?.repoId).toBe('remote:github:github.com/team/app@main');
    expect(restored.plans[0]?.frontmatter.description).toBeUndefined();
    expect(restored.warnings).toHaveLength(2);
    expect(restorePortfolio({ plans: {}, repos: 'bad' })).toEqual({ plans: [], repos: [], warnings: [] });
  });
});

describe('plan links', () => {
  it('resolves relative paths and anchors in the same repository, preserving case', () => {
    const a = plan('a', 'sub/start.md', '# Dependencies\n[next](../setup.md#phase)\n# Reading\n[notes](notes.md)');
    const wrong = plan('b', 'setup.md');
    const target = plan('a', 'setup.md');
    const notes = plan('a', 'sub/notes.md');
    const plans = [wrong, a, target, notes];
    expect(resolvePlanLink(plans, a, '../setup.md#phase')).toBe(target);
    expect(resolvePlanLink(plans, a, '../Setup.md')).toBeUndefined();
    expect(resolvePlanLink(plans, a, 'https://example.com/setup.md')).toBeUndefined();
    expect(buildPlanEdges(plans)).toEqual([
      { source: a.id, target: target.id, type: 'dep' }, { source: a.id, target: notes.id, type: 'ref' },
    ]);
  });

  it('ignores fenced examples and ambiguous or cross-repository phase references', () => {
    const a = plan('a', 'a.md', '# Goal\nSee XX-01\n```md\n[fake](fake.md)\n```');
    const owner = (repo: string, file: string) => plan(repo, file, '# Work\n## XX-01 — Work');
    expect(a.dependencies).toEqual([]);
    expect(buildPlanEdges([a, owner('b', 'other.md')])).toEqual([]);
    expect(buildPlanEdges([a, owner('a', 'one.md'), owner('a', 'two.md')])).toEqual([]);
    expect(buildPlanEdges([a, owner('a', 'one.md')])).toHaveLength(1);
  });
});
