import { usePlanStore, selectFilteredPlans } from '@/store/planStore';
import { useShallow } from 'zustand/react/shallow';
import { PriorityBadge } from './PriorityBadge';
import { cn, truncate } from '@/lib/utils';
import type { PhaseStatus, Phase, ParsedPlan } from '@/types/wiki';

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

  // Collect all phases across all filtered plans
  // Plans that define no phases still appear as a single card carrying the plan's status
  const allPhaseCards: PhaseCard[] = plans.flatMap(plan => {
    const phases = plan.sections.flatMap(section => section.phases);
    if (phases.length) return phases.map(phase => ({ plan, phase }));
    const whole: Phase = {
      id: 'Plan', title: 'No phases defined', rawBody: '', refs: [],
      status: plan.frontmatter.status ?? 'planned',
    };
    return [{ plan, phase: whole }];
  });

  const byStatus = (status: PhaseStatus) =>
    allPhaseCards.filter(c => c.phase.status === status);

  return (
    <div className="grid grid-flow-col auto-cols-[minmax(240px,1fr)] xl:grid-flow-row xl:grid-cols-5 gap-4 h-full min-h-0 overflow-x-auto xl:overflow-hidden">
      {COLUMNS.map(col => {
        const cards = byStatus(col.status);
        return (
          <div key={col.status} className="flex flex-col min-h-0 overflow-hidden">
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
                    onClick={() => selectPlan(plan.id)}
                    className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
                  >
                    {/* Phase ID + status */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-mono text-xs text-od-blue font-medium">{phase.id}</span>
                      {fm.impact && (
                        <span
                          className={cn('inline-block w-2 h-2 rounded-full', IMPACT_DOT[fm.impact] ?? 'bg-od-muted')}
                          title={`Impact: ${fm.impact}`}
                        />
                      )}
                    </div>

                    {/* Phase title */}
                    <p className="text-xs font-medium text-foreground leading-snug mb-2">
                      {truncate(phase.title, 80)}
                    </p>

                    {/* Plan title */}
                    <p className="text-xs text-muted-foreground leading-tight mb-2">
                      {truncate(fm.title, 60)}
                    </p>

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
          </div>
        );
      })}
    </div>
  );
}
