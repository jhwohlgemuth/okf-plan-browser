import { beforeEach, describe, expect, it } from 'vitest';
import { parseWikiFile, parseWikiTexts } from './wikiParser';
import { beginWikiOperation, commitWiki, commitWikiOperation } from './commitWiki';
import { restorePortfolio } from './restorePortfolio';
import { usePlanStore } from '@/store/planStore';
import {
  buildPlanEdges, headingAnchorForPlan, planAnchor, resolvePlanAnchor, resolvePlanLink, resolvePlanTarget,
} from './planLinks';
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

  it('rejects an older refresh after a newer refresh or import starts', () => {
    commitWiki('r', { plans: [plan('r', 'original.md')], errors: [] });
    const older = beginWikiOperation('r');
    const newer = beginWikiOperation('r');

    expect(commitWikiOperation('r', older, { plans: [plan('r', 'old.md')], errors: [] }, { refresh: true }))
      .toBeNull();
    expect(commitWikiOperation('r', newer, { plans: [plan('r', 'new.md')], errors: [] }, { refresh: true })?.plans)
      .toBe(1);
    expect(usePlanStore.getState().plans[0]?.fileName).toBe('new.md');

    const pending = beginWikiOperation('r');
    commitWiki('r', { plans: [plan('r', 'imported.md')], errors: [] });
    expect(commitWikiOperation('r', pending, { plans: [plan('r', 'stale.md')], errors: [] }, { refresh: true }))
      .toBeNull();
    expect(usePlanStore.getState().plans[0]?.fileName).toBe('imported.md');
  });

  it('rejects a refresh response after its repository is removed', () => {
    commitWiki('r', { plans: [plan('r', 'original.md')], errors: [] });
    const pending = beginWikiOperation('r');

    void usePlanStore.getState().removeRepo('r');

    expect(commitWikiOperation('r', pending, { plans: [plan('r', 'stale.md')], errors: [] }, { refresh: true }))
      .toBeNull();
    expect(usePlanStore.getState().repos).toEqual([]);
    expect(usePlanStore.getState().plans).toEqual([]);
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

  it('canonicalizes section and phase fragments through the repository-aware resolver', () => {
    const source = plan('a', 'sub/source.md', '# Reading\n[target](../target.md#TP-02--Ship-It)');
    const target = plan('a', 'target.md', '# Review & QA\n\n## Background Notes\nText\n\n# Execution phases\n\n## TP-02 — Ship It\n- Status: ready');
    expect(planAnchor('Review & QA')).toBe('review-qa');
    expect(headingAnchorForPlan(target, 'TP-02 — Ship It')).toBe('tp-02');
    expect(resolvePlanAnchor(target, '#TP-02--Ship-It')).toBe('tp-02');
    expect(resolvePlanAnchor(target, '#background-notes')).toBe('background-notes');
    expect(resolvePlanTarget([source, target], source, '../target.md#TP-02--Ship-It')).toEqual({
      plan: target,
      anchor: 'tp-02',
    });
    expect(resolvePlanTarget([source, target], source, '../target.md#missing')).toBeUndefined();
  });
});
