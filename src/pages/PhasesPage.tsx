import { usePlanStore, selectFilteredPlans } from '@/store/planStore';
import { FilterBar } from '@/components/FilterBar';
import { KanbanBoard } from '@/components/KanbanBoard';

export function PhasesPage() {
  const filtered = usePlanStore(selectFilteredPlans);
  const total    = usePlanStore(s => s.plans.length);
  const phaseCount = filtered.reduce((acc, p) =>
    acc + p.sections.reduce((a, s) => a + s.phases.length, 0), 0);

  return (
    <div className="flex flex-col h-screen min-h-0">
      {/* Top bar */}
      <div className="shrink-0 px-5 py-4 border-b border-border bg-background">
        <h1 className="text-base font-semibold text-foreground">Phase Tracker</h1>
        <p className="text-xs text-muted-foreground">
          {phaseCount} phase{phaseCount !== 1 ? 's' : ''} across {filtered.length} plan{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filters */}
      <FilterBar />

      {/* Board */}
      <div className="flex-1 overflow-hidden px-4 py-4">
        <KanbanBoard />
      </div>
    </div>
  );
}
