import { usePlanStore, selectFilteredPlans } from '@/store/planStore';
import { useShallow } from 'zustand/react/shallow';
import { lazy, Suspense, useState } from 'react';
import { isEpic } from '@/lib/planKind';
import { planAnchor, resolvePlanTarget } from '@/lib/planLinks';
import { resolveWikiPath } from '@/lib/wikiAssets';
import { cn } from '@/lib/utils';
import { PlanStatusBadge } from './PlanStatusBadge';
import { AgentCommandButton } from './AgentCommandButton';
import { AssetViewer, type AssetTarget } from './AssetViewer';
import { phaseAgentCommand, planAgentCommand } from '@/lib/agentCommand';
import { PHASE_COLUMNS, PHASE_COLUMN_HEADER } from '@/lib/phaseColumns';
import { sortPhaseCards, type PhaseSortKey } from '@/lib/phaseSort';
import { ArrowDown, ArrowUp, ChevronDown, CircleHelp, Flag, Flame, Minus, type LucideIcon } from 'lucide-react';
import type { ParsedPlan, PlanImpact, PlanPriority, WikiRepo } from '@/types/wiki';

const Markdown = lazy(() => import('./Markdown').then(module => ({ default: module.Markdown })));

const PRIORITY_MARKERS: Record<PlanPriority, string> = {
  next: 'bg-od-purple/15 text-od-purple ring-od-purple/40',
  high: 'bg-od-orange/15 text-od-orange ring-od-orange/40',
  medium: 'bg-od-yellow/15 text-od-yellow ring-od-yellow/40',
  low: 'bg-od-muted/15 text-od-muted ring-od-border',
};
const UNKNOWN_PRIORITY = 'bg-secondary text-muted-foreground/50 ring-border/50';

const IMPACT_MARKERS: Record<PlanImpact, { icon: LucideIcon; color: string }> = {
  critical: { icon: Flame, color: 'bg-od-red/15 text-od-red ring-od-red/40' },
  high: { icon: ArrowUp, color: 'bg-od-orange/15 text-od-orange ring-od-orange/40' },
  medium: { icon: Minus, color: 'bg-od-yellow/15 text-od-yellow ring-od-yellow/40' },
  low: { icon: ArrowDown, color: 'bg-secondary text-muted-foreground ring-border' },
};
const UNKNOWN_IMPACT = { icon: CircleHelp, color: 'bg-secondary text-muted-foreground ring-border' };

function valueLabel(value?: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Not specified';
}

function CircleMarker({ icon: Icon, color, label }: { icon: LucideIcon; color: string; label: string }) {
  return <span role="img" aria-label={label} title={label}
    className={cn('inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1 ring-inset', color)}>
    <Icon className="h-3 w-3" aria-hidden="true" />
  </span>;
}

function ImpactMarker({ impact }: { impact?: PlanImpact }) {
  const marker = impact ? IMPACT_MARKERS[impact] : UNKNOWN_IMPACT;
  return <CircleMarker icon={marker.icon} color={marker.color} label={`Plan impact: ${valueLabel(impact)}`} />;
}

function PriorityMarker({ priority }: { priority?: PlanPriority }) {
  return <CircleMarker icon={Flag} color={priority ? PRIORITY_MARKERS[priority] : UNKNOWN_PRIORITY}
    label={`Plan priority: ${valueLabel(priority)}`} />;
}

function ProjectDot({ repo }: { repo?: WikiRepo }) {
  if (!repo) return null;
  return <span role="img" aria-label={`Project wiki: ${repo.label}`} title={`Project wiki: ${repo.label}`}
    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-border"
    style={{ backgroundColor: repo.color }} />;
}

export function SimplePhaseList({ sortKey, reversed }: { sortKey: PhaseSortKey; reversed: boolean }) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [selectedAsset, setSelectedAsset] = useState<AssetTarget | null>(null);
  const toggleExpanded = (key: string) => setExpanded(current => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });
  const plans = usePlanStore(useShallow(selectFilteredPlans));
  const allPlans = usePlanStore(s => s.plans);
  const repos = usePlanStore(s => s.repos);
  const selectPlan = usePlanStore(s => s.selectPlan);
  const epics = plans.filter(isEpic);
  const phases = plans.filter(plan => !isEpic(plan)).flatMap(plan =>
    plan.sections.flatMap(section => section.phases.map(phase => ({ plan, phase }))));
  const renderMarkdown = (body: string, source: ParsedPlan, repo: WikiRepo | undefined, key: string) => (
    <Suspense fallback={<p role="status" className="text-xs text-muted-foreground">Loading details…</p>}>
      <Markdown
        headingId={heading => `simple-${planAnchor(key)}-${planAnchor(heading)}`}
        resolveLink={href => {
          const target = resolvePlanTarget(allPlans, source, href);
          return target ? { exists: true, open: () => selectPlan(target.plan.id, target.anchor) } : null;
        }}
        resolveImage={src => {
          const path = resolveWikiPath(source.fileName, src);
          return path && repo?.assets?.includes(path) && !path.toLowerCase().endsWith('.pdf')
            ? { repoId: source.repoId, path } : null;
        }}
        openAsset={setSelectedAsset}
      >{body}</Markdown>
    </Suspense>
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto">
      {epics.length > 0 && (
        <section aria-label="Epics" className="shrink-0 overflow-hidden rounded-lg border border-od-purple/30 bg-card">
          <h2 className="border-b border-border/60 bg-od-purple/5 px-3 py-2 text-xs font-semibold text-od-purple">Epics · {epics.length}</h2>
          <div className="divide-y divide-border/50">
            {epics.map(plan => {
              const repo = repos.find(candidate => candidate.id === plan.repoId);
              const key = `epic:${plan.id}`;
              const isExpanded = expanded.has(key);
              return (
                <div key={plan.id}>
                  <button
                    type="button"
                    aria-label={`Expand Epic: ${plan.frontmatter.title}; plan priority ${valueLabel(plan.frontmatter.priority)}; plan impact ${valueLabel(plan.frontmatter.impact)}; project wiki ${repo?.label ?? 'unknown'}`}
                    aria-expanded={isExpanded}
                    onClick={() => toggleExpanded(key)}
                    className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-xs hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <PriorityMarker priority={plan.frontmatter.priority} />
                    <ImpactMarker impact={plan.frontmatter.impact} />
                    <ProjectDot repo={repo} />
                    <span className="min-w-0 flex-1 truncate font-medium text-foreground">{plan.frontmatter.title}</span>
                    <PlanStatusBadge plan={plan} />
                    <ChevronDown aria-hidden="true" className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
                  </button>
                  {isExpanded && <div className="space-y-2 border-t border-border/50 px-3 py-3 text-xs text-muted-foreground">
                    {plan.frontmatter.description && renderMarkdown(plan.frontmatter.description, plan, repo, key)}
                    <p>{repo?.label ?? 'Unknown wiki'} · {plan.fileName}</p>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => selectPlan(plan.id)} className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Open full Epic</button>
                      <AgentCommandButton
                        command={planAgentCommand({ ...plan, repoId: repo?.label ?? plan.repoId })}
                        label={`Copy agent command for ${plan.frontmatter.title}`}
                      />
                    </div>
                  </div>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid grid-flow-col auto-cols-[minmax(240px,1fr)] gap-4 flex-1 min-h-[280px] overflow-x-auto xl:grid-flow-row xl:grid-cols-5 xl:overflow-hidden">
        {PHASE_COLUMNS.map(col => {
          const columnPhases = sortPhaseCards(phases.filter(({ phase }) => phase.status === col.status), sortKey, reversed);
          return (
            <section key={col.status} aria-label={`${col.label} phases`} className="flex min-h-0 flex-col overflow-hidden">
              <div className={cn('mb-3 flex shrink-0 items-center justify-between border-b-2 px-3 py-2', PHASE_COLUMN_HEADER[col.status])}>
                <span className="text-xs font-semibold uppercase tracking-wide">{col.label}</span>
                <span className="font-mono text-xs opacity-70">{columnPhases.length}</span>
              </div>
              <div role="list" aria-label={`${col.label} phase list`} className="flex-1 space-y-1 overflow-y-auto pr-0.5">
                {columnPhases.length === 0 && <p className="flex h-16 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">empty</p>}
                {columnPhases.map(({ plan, phase }) => {
                  const impact = plan.frontmatter.impact;
                  const priority = plan.frontmatter.priority;
                  const repo = repos.find(candidate => candidate.id === plan.repoId);
                  const key = `phase:${plan.id}:${phase.id}`;
                  const isExpanded = expanded.has(key);
                  return <div key={key} role="listitem" className={cn('overflow-hidden rounded-md border bg-card', isExpanded ? 'border-primary/40' : 'border-border')}>
                    <button
                      type="button"
                      aria-label={`Expand phase ${phase.id}: ${phase.title} in ${plan.frontmatter.title}; plan priority ${valueLabel(priority)}; plan impact ${valueLabel(impact)}; project wiki ${repo?.label ?? 'unknown'}`}
                      aria-expanded={isExpanded}
                      title={`${phase.id} — ${phase.title} · ${plan.frontmatter.title}`}
                      onClick={() => toggleExpanded(key)}
                      className="flex w-full min-w-0 items-center gap-1.5 px-2 py-2 text-left hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    >
                      <PriorityMarker priority={priority} />
                      <ImpactMarker impact={impact} />
                      <ProjectDot repo={repo} />
                      <span className="w-16 shrink-0 truncate font-mono text-xs font-medium text-od-blue">{phase.id}</span>
                      <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                        <span className="font-medium">{phase.title || 'Untitled phase'}</span>
                        <span className="text-muted-foreground"> · {plan.frontmatter.title}</span>
                      </span>
                      <ChevronDown aria-hidden="true" className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
                    </button>
                    {isExpanded && <div className="space-y-2 border-t border-border/60 px-3 py-3 text-xs">
                      <p className="font-medium text-foreground">{phase.title || 'Untitled phase'}</p>
                      <p className="text-muted-foreground">{plan.frontmatter.title} · {repo?.label ?? 'Unknown wiki'}</p>
                      {phase.rawBody.trim() && <div className="max-h-56 overflow-y-auto rounded bg-muted/40 p-2">{renderMarkdown(phase.rawBody.trim(), plan, repo, key)}</div>}
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => selectPlan(plan.id, planAnchor(phase.id))} className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Open phase in plan</button>
                        <AgentCommandButton
                          command={phaseAgentCommand({ ...plan, repoId: repo?.label ?? plan.repoId }, phase)}
                          label={`Copy agent command for phase ${phase.id}`}
                        />
                      </div>
                    </div>}
                  </div>;
                })}
              </div>
            </section>
          );
        })}
      </div>
      {selectedAsset && <AssetViewer target={selectedAsset} onClose={() => setSelectedAsset(null)} />}
    </div>
  );
}
