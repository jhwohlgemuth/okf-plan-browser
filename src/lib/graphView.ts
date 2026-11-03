import type { ParsedPlan, PhaseStatus, PlanStatus, WikiRepo } from '@/types/wiki';
import type { PlanEdge } from './planLinks';
import { isEpic, planStatus } from './planKind';
import { planGraphId } from './planId';
import { getOsLabel } from './osLabels';

export type GraphLayoutMode = 'force' | 'dependency' | 'repository' | 'status' | 'os';
export type GraphKind = 'plan' | 'epic';
export type GraphHops = 0 | 1 | 2;

export interface GraphNodeView {
  id: string;
  graphId: string;
  title: string;
  repoId: string;
  repoLabel: string;
  status: PlanStatus | 'unknown';
  kind: GraphKind;
  tags: string[];
  osLabels: string[];
  nextPhase?: { id: string; title: string; status: PhaseStatus };
  blockedPhases: number;
  searchText: string;
  plan: ParsedPlan;
}

export interface GraphFilters {
  query: string;
  statuses: string[];
  repos: string[];
  kinds: GraphKind[];
  tags: string[];
  blockedOnly: boolean;
}

export interface GraphPosition { x: number; y: number; group: string }

const PHASE_ORDER = ['in-progress', 'ready', 'blocked', 'waiting-on-validation', 'planned'];

export function buildGraphNodeViews(plans: ParsedPlan[], repos: WikiRepo[]): GraphNodeView[] {
  const repoLabels = new Map(repos.map(repo => [repo.id, repo.label]));
  return plans.map(plan => {
    const tags = plan.frontmatter.tags ?? [];
    const phases = plan.sections.flatMap(section => section.phases);
    const nextPhase = [...phases].sort((a, b) =>
      PHASE_ORDER.indexOf(a.status) - PHASE_ORDER.indexOf(b.status))[0];
    const graphId = planGraphId(plan);
    const status = planStatus(plan) ?? 'unknown';
    const repoLabel = repoLabels.get(plan.repoId) ?? plan.repoId;
    const osLabels = tags.flatMap(tag => getOsLabel(tag)?.name ?? []);
    const searchText = [
      graphId, plan.frontmatter.title, plan.frontmatter.description, status, repoLabel,
      isEpic(plan) ? 'epic' : 'plan', ...tags, ...osLabels, ...(plan.frontmatter.package ?? []),
    ].filter(Boolean).join(' ').toLowerCase();
    return {
      id: plan.id,
      graphId,
      title: plan.frontmatter.title,
      repoId: plan.repoId,
      repoLabel,
      status,
      kind: isEpic(plan) ? 'epic' : 'plan',
      tags,
      osLabels,
      nextPhase: nextPhase && { id: nextPhase.id, title: nextPhase.title, status: nextPhase.status },
      blockedPhases: phases.filter(phase => phase.status === 'blocked').length,
      searchText,
      plan,
    };
  });
}

export function matchesGraphQuery(node: GraphNodeView, query: string): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return terms.every(term => node.searchText.includes(term));
}

export function blockedPathIds(nodes: GraphNodeView[], edges: PlanEdge[]): Set<string> {
  const ids = new Set(nodes.filter(node => node.status === 'blocked' || node.blockedPhases > 0).map(node => node.id));
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of edges) {
      if (edge.type !== 'dep' || (!ids.has(edge.source) && !ids.has(edge.target))) continue;
      if (!ids.has(edge.source)) { ids.add(edge.source); changed = true; }
      if (!ids.has(edge.target)) { ids.add(edge.target); changed = true; }
    }
  }
  return ids;
}

export function filterGraphNodes(
  nodes: GraphNodeView[], filters: GraphFilters, edges: PlanEdge[],
): GraphNodeView[] {
  const blocked = filters.blockedOnly ? blockedPathIds(nodes, edges) : null;
  return nodes.filter(node =>
    matchesGraphQuery(node, filters.query)
    && (!filters.statuses.length || filters.statuses.includes(node.status))
    && (!filters.repos.length || filters.repos.includes(node.repoId))
    && (!filters.kinds.length || filters.kinds.includes(node.kind))
    && (!filters.tags.length || filters.tags.some(tag => node.tags.includes(tag)))
    && (!blocked || blocked.has(node.id)));
}

export function filterGraphEdges(
  edges: PlanEdge[], nodeIds: Set<string>, edgeTypes: Set<PlanEdge['type']>,
): PlanEdge[] {
  return edges.filter(edge => nodeIds.has(edge.source) && nodeIds.has(edge.target) && edgeTypes.has(edge.type));
}

export function neighborhoodIds(seed: string | null, edges: PlanEdge[], hops: GraphHops): Set<string> {
  if (!seed || hops === 0) return new Set();
  const result = new Set([seed]);
  let frontier = new Set([seed]);
  for (let distance = 0; distance < hops; distance++) {
    const next = new Set<string>();
    for (const edge of edges) {
      if (frontier.has(edge.source) && !result.has(edge.target)) next.add(edge.target);
      if (frontier.has(edge.target) && !result.has(edge.source)) next.add(edge.source);
    }
    next.forEach(id => result.add(id));
    frontier = next;
  }
  return result;
}

export function connectedNodeIds(seed: string, edges: PlanEdge[]): { incoming: string[]; outgoing: string[] } {
  return {
    incoming: [...new Set(edges.filter(edge => edge.target === seed).map(edge => edge.source))],
    outgoing: [...new Set(edges.filter(edge => edge.source === seed).map(edge => edge.target))],
  };
}

function dependencyDepths(nodes: GraphNodeView[], edges: PlanEdge[]): Map<string, number> {
  const depths = new Map(nodes.map(node => [node.id, 0]));
  for (let pass = 0; pass < nodes.length; pass++) {
    let changed = false;
    for (const edge of edges.filter(candidate => candidate.type === 'dep')) {
      const next = Math.min(nodes.length - 1, (depths.get(edge.target) ?? 0) + 1);
      if (next > (depths.get(edge.source) ?? 0)) { depths.set(edge.source, next); changed = true; }
    }
    if (!changed) break;
  }
  return depths;
}

export function graphLayoutPositions(
  nodes: GraphNodeView[], edges: PlanEdge[], mode: GraphLayoutMode, width: number, height: number,
): Map<string, GraphPosition> {
  if (mode === 'force' || nodes.length === 0) return new Map();
  const depths = mode === 'dependency' ? dependencyDepths(nodes, edges) : null;
  const groupFor = (node: GraphNodeView) => {
    if (depths) return String(depths.get(node.id) ?? 0);
    if (mode === 'repository') return node.repoLabel;
    if (mode === 'status') return node.status;
    return node.osLabels[0] ?? 'Other';
  };
  const grouped = new Map<string, GraphNodeView[]>();
  for (const node of nodes) grouped.set(groupFor(node), [...(grouped.get(groupFor(node)) ?? []), node]);
  const groups = [...grouped.entries()].sort(([a], [b]) => mode === 'dependency'
    ? Number(a) - Number(b) : a.localeCompare(b));
  const positions = new Map<string, GraphPosition>();
  groups.forEach(([group, members], groupIndex) => {
    const x = ((groupIndex + 1) * width) / (groups.length + 1);
    members.sort((a, b) => a.title.localeCompare(b.title)).forEach((node, rowIndex) => {
      positions.set(node.id, {
        x,
        y: ((rowIndex + 1) * height) / (members.length + 1),
        group,
      });
    });
  });
  return positions;
}

