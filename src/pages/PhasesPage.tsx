import { TimeRemaining } from '@/components/TimeRemaining';
import { usePlanStore, selectFilteredPlans } from '@/store/planStore';
import { useShallow } from 'zustand/react/shallow';
import { FilterBar } from '@/components/FilterBar';
import { KanbanBoard } from '@/components/KanbanBoard';
import { formatPlanCounts, isEpic, planStatus } from '@/lib/planKind';

export function PhasesPage() {
  const filtered = usePlanStore(useShallow(selectFilteredPlans));
  const phased = filtered.filter(p => !isEpic(p));
  const inProgressPlans = filtered.filter(p => planStatus(p) === 'in-progress').length;
  const phaseCount = phased.reduce((acc, p) =>
    acc + p.sections.reduce((a, s) => a + s.phases.length, 0), 0);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Top bar */}
      <div className="shrink-0 px-5 py-4 border-b border-border bg-background">
        <h1 className="text-base font-semibold text-foreground">Phase Tracker</h1>
        <p className="text-xs text-muted-foreground">
          {phaseCount} phase{phaseCount !== 1 ? 's' : ''} across {formatPlanCounts(filtered)}
          {' · '}{inProgressPlans} plan{inProgressPlans !== 1 ? 's' : ''} in progress
          {' · '}<TimeRemaining plans={filtered} />
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Columns show phase status; plan status appears on each card.</p>
      </div>

      {/* Filters */}
      <FilterBar statusLabel="Plan status" />

      {/* Board */}
      <div className="flex-1 overflow-hidden px-4 py-4" data-tour="phase-board">
        <KanbanBoard />
      </div>
    </div>
  );
}
