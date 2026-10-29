import type { ParsedPlan } from '@/types/wiki';

export function planAnchor(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/[\s-]+/g, '-') || 'section';
}

export function headingAnchorForPlan(plan: ParsedPlan, heading: string): string {
  const normalized = planAnchor(heading);
  const phase = plan.sections.flatMap(section => section.phases)
    .find(candidate => normalized === planAnchor(candidate.id)
      || normalized.startsWith(`${planAnchor(candidate.id)}-`));
  return phase ? planAnchor(phase.id) : normalized;
}

export function resolvePlanAnchor(plan: ParsedPlan, fragment: string): string | undefined {
  let decoded = fragment.replace(/^#/, '');
  try { decoded = decodeURIComponent(decoded); } catch { /* retain malformed input for safe normalization */ }
  const requested = planAnchor(decoded);
  const aliases = new Map<string, string>();
  const add = (alias: string, canonical: string) => aliases.set(planAnchor(alias), canonical);

  for (const section of plan.sections) {
    if (section.heading) {
      const canonical = planAnchor(section.heading);
      add(section.heading, canonical);
    }
    for (const phase of section.phases) {
      const canonical = planAnchor(phase.id);
      add(phase.id, canonical);
      add(`${phase.id} ${phase.title}`, canonical);
    }
    for (const match of section.body.matchAll(/^#{2,6}\s+(.+?)\s*#*\s*$/gm)) {
      const heading = match[1]?.trim();
      if (!heading) continue;
      add(heading, headingAnchorForPlan(plan, heading));
    }
  }
  return aliases.get(requested);
}

export function resolvePlanLink(plans: ParsedPlan[], source: ParsedPlan, href: string): ParsedPlan | undefined {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) return undefined;
  try {
    const url = new URL(href, `https://wiki.invalid/${source.fileName.split('/').map(encodeURIComponent).join('/')}`);
    const path = decodeURIComponent(url.pathname).replace(/^\//, '');
    return plans.find(p => p.repoId === source.repoId && p.fileName === path);
  } catch { return undefined; }
}

export interface ResolvedPlanTarget { plan: ParsedPlan; anchor?: string }

export function resolvePlanTarget(
  plans: ParsedPlan[],
  source: ParsedPlan,
  href: string,
): ResolvedPlanTarget | undefined {
  const plan = resolvePlanLink(plans, source, href);
  if (!plan) return undefined;
  try {
    const url = new URL(href, `https://wiki.invalid/${source.fileName.split('/').map(encodeURIComponent).join('/')}`);
    if (!url.hash) return { plan };
    const anchor = resolvePlanAnchor(plan, url.hash);
    return anchor ? { plan, anchor } : undefined;
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
