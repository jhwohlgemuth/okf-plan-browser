import type { ParsedPlan } from '@/types/wiki';

export function resolvePlanLink(plans: ParsedPlan[], source: ParsedPlan, href: string): ParsedPlan | undefined {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) return undefined;
  try {
    const url = new URL(href, `https://wiki.invalid/${source.fileName.split('/').map(encodeURIComponent).join('/')}`);
    const path = decodeURIComponent(url.pathname).replace(/^\//, '');
    return plans.find(p => p.repoId === source.repoId && p.fileName === path);
  } catch { return undefined; }
}

export interface PlanEdge { source: string; target: string; type: 'dep' | 'ref' }

export function buildPlanEdges(plans: ParsedPlan[]): PlanEdge[] {
  const edges = new Map<string, PlanEdge>();
  const add = (source: ParsedPlan, target: ParsedPlan | undefined, type: PlanEdge['type']) => {
    if (!target || source.id === target.id) return;
    const key = `${source.id}\n${target.id}`;
    if (edges.get(key)?.type === 'dep') return;
    edges.set(key, { source: source.id, target: target.id, type });
  };
  for (const source of plans) {
    for (const link of source.dependencies) {
      add(source, resolvePlanLink(plans, source, link.href), link.kind === 'dependency' ? 'dep' : 'ref');
    }
    const ownPhases = new Set(source.sections.flatMap(s => s.phases.map(p => p.id)));
    for (const ref of source.phaseRefs) {
      if (ownPhases.has(ref)) continue;
      const owners = plans.filter(p => p.repoId === source.repoId && p.id !== source.id
        && p.sections.some(s => s.phases.some(phase => phase.id === ref)));
      if (owners.length === 1) add(source, owners[0], 'ref');
    }
  }
  return [...edges.values()];
}
