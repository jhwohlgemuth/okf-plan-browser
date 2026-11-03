import { describe, expect, it } from 'vitest';
import type { ParsedPlan, WikiRepo } from '@/types/wiki';
import type { PlanEdge } from './planLinks';
import {
  blockedPathIds, buildGraphNodeViews, connectedNodeIds, filterGraphEdges, filterGraphNodes,
  graphLayoutPositions, matchesGraphQuery, neighborhoodIds,
} from './graphView';

const plan = (id: string, title: string, status: ParsedPlan['frontmatter']['status'], tags: string[] = []): ParsedPlan => ({
  id, repoId: id.startsWith('two:') ? 'two' : 'one', fileName: `${title.toLowerCase().replace(/\s+/g, '-')}.md`,
  frontmatter: { title, status, tags, package: ['app'], execution: 'phased' },
  sections: [{ heading: 'Execution phases', body: '', phases: [{
    id: `${title.slice(0, 3).toUpperCase()}-01`, title: `${title} phase`, rawBody: '',
    status: status === 'blocked' ? 'blocked' : 'ready', refs: [],
  }] }],
  dependencies: [], phaseRefs: [], parseErrors: [],
});

const plans = [
  plan('one:alpha', 'Alpha Service', 'ready', ['api', 'os:linux']),
  plan('one:beta', 'Beta UI', 'blocked', ['ui', 'os:windows']),
  plan('two:gamma', 'Gamma Worker', 'planned', ['worker']),
];
const repos: WikiRepo[] = [
  { id: 'one', label: 'Core', color: '#61afef', planCount: 2 },
  { id: 'two', label: 'Workers', color: '#98c379', planCount: 1 },
];
const edges: PlanEdge[] = [
  { source: 'one:beta', target: 'one:alpha', type: 'dep' },
  { source: 'two:gamma', target: 'one:beta', type: 'ref' },
];
const nodes = buildGraphNodeViews(plans, repos);

describe('graph view model', () => {
  it('searches IDs, titles, tags, repositories, statuses, and OS names', () => {
    const alpha = nodes[0]!;
    expect(['ALP', 'service', 'api', 'core', 'ready', 'linux'].every(query => matchesGraphQuery(alpha, query))).toBe(true);
    expect(matchesGraphQuery(alpha, 'windows')).toBe(false);
  });

  it('filters metadata and blocked dependency paths without changing source nodes', () => {
    const filtered = filterGraphNodes(nodes, {
      query: '', statuses: [], repos: [], kinds: [], tags: [], blockedOnly: true,
    }, edges);
    expect(filtered.map(node => node.id).sort()).toEqual(['one:alpha', 'one:beta']);
    expect(blockedPathIds(nodes, edges)).toEqual(new Set(['one:alpha', 'one:beta']));
    expect(filterGraphNodes(nodes, {
      query: 'worker', statuses: [], repos: ['two'], kinds: ['plan'], tags: ['worker'], blockedOnly: false,
    }, edges).map(node => node.id)).toEqual(['two:gamma']);
  });

  it('filters edges and resolves one-hop and two-hop neighborhoods', () => {
    expect(filterGraphEdges(edges, new Set(nodes.map(node => node.id)), new Set(['dep']))).toEqual([edges[0]]);
    expect(neighborhoodIds('one:alpha', edges, 1)).toEqual(new Set(['one:alpha', 'one:beta']));
    expect(neighborhoodIds('one:alpha', edges, 2)).toEqual(new Set(['one:alpha', 'one:beta', 'two:gamma']));
    expect(connectedNodeIds('one:beta', edges)).toEqual({ incoming: ['two:gamma'], outgoing: ['one:alpha'] });
  });

  it('produces stable grouped and dependency coordinates', () => {
    const dependency = graphLayoutPositions(nodes, edges, 'dependency', 800, 600);
    expect(dependency.get('one:beta')!.x).toBeGreaterThan(dependency.get('one:alpha')!.x);
    const repositories = graphLayoutPositions(nodes, edges, 'repository', 800, 600);
    expect(repositories.get('one:alpha')!.x).toBe(repositories.get('one:beta')!.x);
    expect(repositories.get('two:gamma')!.x).not.toBe(repositories.get('one:alpha')!.x);
    expect(graphLayoutPositions(nodes, edges, 'force', 800, 600).size).toBe(0);
  });
});

