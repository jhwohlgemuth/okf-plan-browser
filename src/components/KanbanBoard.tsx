import { TimeRemaining } from '@/components/TimeRemaining';
import { usePlanStore, selectFilteredPlans } from '@/store/planStore';
import { useShallow } from 'zustand/react/shallow';
import { PriorityBadge } from './PriorityBadge';
import { cn, truncate } from '@/lib/utils';
import type { PhaseStatus, Phase, ParsedPlan } from '@/types/wiki';
import { AgentCommandButton } from './AgentCommandButton';
import { phaseAgentCommand, planAgentCommand } from '@/lib/agentCommand';
import { planAnchor } from '@/lib/planLinks';
import { isEpic, linkedPlans } from '@/lib/planKind';
import { PlanKindBadge } from './PlanKindBadge';
import { PlanStatusBadge } from './PlanStatusBadge';

interface PhaseCard { plan: ParsedPlan; phase: Phase }

const COLUMNS: { status: PhaseStatus; label: string }[] = [
  { status: 'planned',     label: 'Planned' },
  { status: 'ready',       label: 'Ready' },
  { status: 'in-progress', label: 'In Progress' },
  { status: 'waiting-on-validation', label: 'Waiting on Validation' },
  { status: 'blocked',     label: 'Blocked' },
];

const COL_HEADER: Record<PhaseStatus, string> = {
  planned:      'border-od-border  text-od-muted',
  ready:        'border-od-green   text-od-green',
  'in-progress':'border-od-blue    text-od-blue',
  'waiting-on-validation': 'border-od-yellow text-od-yellow',
  blocked:      'border-od-red     text-od-red',
};

const IMPACT_DOT: Record<string, string> = {
  critical: 'bg-od-red',
  high:     'bg-od-orange',
  medium:   'bg-od-yellow',
  low:      'bg-od-muted',
};

export function KanbanBoard() {
  const plans      = usePlanStore(useShallow(selectFilteredPlans));
  const repos      = usePlanStore(s => s.repos);
  const selectPlan = usePlanStore(s => s.selectPlan);

  const epics = plans.filter(isEpic);
  const allPhaseCards: PhaseCard[] = plans.filter(plan => !isEpic(plan)).flatMap(plan =>
    plan.sections.flatMap(section => section.phases.map(phase => ({ plan, phase }))));

  const byStatus = (status: PhaseStatus) =>
    allPhaseCards.filter(c => c.phase.status === status);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto">
      {epics.length > 0 && <section aria-label="Epics" className="shrink-0 rounded-xl border border-od-purple/30 bg-od-purple/5 p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-od-purple">Epics · {epics.length}</h2>
          <p className="text-xs text-muted-foreground">Coordination and overview records have no executable phases. Open one to follow its linked plans.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {epics.map(plan => {
            const linked = linkedPlans(plan, plans);
            const repo = repos.find(r => r.id === plan.repoId);
            return <div key={plan.id} role="button" tabIndex={0}
              aria-label={`Open Epic: ${plan.frontmatter.title}`}
              onClick={() => selectPlan(plan.id)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectPlan(plan.id); } }}
              className="cursor-pointer rounded-lg border border-od-purple/25 bg-card p-3 hover:border-od-purple/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <div className="mb-2 flex items-center justify-between gap-2">
                <PlanKindBadge plan={plan} compact />
                <AgentCommandButton command={planAgentCommand({ ...plan, repoId: repo?.label ?? plan.repoId })} label={`Copy agent command for ${plan.frontmatter.title}`} />
              </div>
              <p className="text-xs font-semibold text-foreground">{truncate(plan.frontmatter.title, 80)}</p>
              {plan.frontmatter.description && <p className="mt-1 text-xs text-muted-foreground">{truncate(plan.frontmatter.description, 120)}</p>}
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <PlanStatusBadge plan={plan} />
                <span>{linked.length} linked plan{linked.length !== 1 ? 's' : ''}</span>
                {repo && <span className="ml-auto font-mono">{repo.label}</span>}
              </div>
            </div>;
          })}
        </div>
      </section>}
      <div className="grid grid-flow-col auto-cols-[minmax(240px,1fr)] xl:grid-flow-row xl:grid-cols-5 gap-4 flex-1 min-h-[360px] overflow-x-auto xl:overflow-hidden">
      {COLUMNS.map(col => {
        const cards = byStatus(col.status);
        return (
          <section key={col.status} aria-label={`${col.label} phases`} className="flex flex-col min-h-0 overflow-hidden">
            {/* Column header */}
            <div className={cn(
              'flex items-center justify-between px-3 py-2 mb-3 border-b-2 shrink-0',
              COL_HEADER[col.status],
            )}>
              <span className="text-xs font-semibold tracking-wide uppercase">{col.label}</span>
              <span className="text-xs font-mono opacity-70">{cards.length}</span>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
              {cards.length === 0 && (
                <div className="flex items-center justify-center h-16 border border-dashed border-border rounded-lg">
                  <span className="text-xs text-muted-foreground">empty</span>
                </div>
              )}
              {cards.map(({ plan, phase }) => {
                const fm   = plan.frontmatter;
                const repo = repos.find(r => r.id === plan.repoId);
                return (
                  <div
                    key={`${plan.id}:${phase.id}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open plan ${plan.id} phase ${phase.id}`}
                    onClick={() => selectPlan(plan.id, planAnchor(phase.id))}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selectPlan(plan.id, planAnchor(phase.id));
                      }
                    }}
                    className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {/* Phase ID + status */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-mono text-xs text-od-blue font-medium">{phase.id}</span>
                      <span className="flex items-center gap-1.5">
                        {fm.impact && (
                          <span
                            className={cn('inline-block w-2 h-2 rounded-full', IMPACT_DOT[fm.impact] ?? 'bg-od-muted')}
                            title={`Impact: ${fm.impact}`}
                          />
                        )}
                        <AgentCommandButton
                          command={phaseAgentCommand({ ...plan, repoId: repo?.label ?? plan.repoId }, phase)}
                          label={`Copy agent command for phase ${phase.id}`}
                        />
                      </span>
                    </div>

                    {/* Phase title */}
                    <p className="text-xs font-medium text-foreground leading-snug mb-2">
                      {truncate(phase.title, 80)}
                    </p>

                    <div className="mb-2"><TimeRemaining plans={[plan]} phase={phase} /></div>

                    {/* Plan title */}
                    <p className="text-xs text-muted-foreground leading-tight mb-2">
                      {truncate(fm.title, 60)}
                    </p>

                    {fm.status && (
                      <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>Plan:</span><PlanStatusBadge plan={plan} />
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between gap-2">
                      {fm.priority && <PriorityBadge priority={fm.priority} />}
                      {repo && (
                        <span className="flex items-center gap-1 text-xs font-mono text-muted-foreground ml-auto">
                          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: repo.color }} />
                          {repo.label}
                        </span>
                      )}
                    </div>

                    {/* Refs */}
                    {phase.refs.length > 0 && (
                      <p className="text-xs text-muted-foreground/60 mt-1.5 font-mono">
                        → {phase.refs.slice(0, 3).join(', ')}
                        {phase.refs.length > 3 ? ` +${phase.refs.length - 3}` : ''}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
      </div>
    </div>
  );
}
