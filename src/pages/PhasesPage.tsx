import { TimeRemaining } from '@/components/TimeRemaining';
import { usePlanStore, selectFilteredPlans } from '@/store/planStore';
import { useShallow } from 'zustand/react/shallow';
import { FilterBar } from '@/components/FilterBar';
import { KanbanBoard } from '@/components/KanbanBoard';
import { SimplePhaseList } from '@/components/SimplePhaseList';
import { formatPlanCounts, isEpic, planStatus } from '@/lib/planKind';
import { useSearchParams } from 'react-router-dom';

export function PhasesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') === 'simple' ? 'simple' : 'board';
  const filtered = usePlanStore(useShallow(selectFilteredPlans));
  const phased = filtered.filter(p => !isEpic(p));
  const inProgressPlans = filtered.filter(p => planStatus(p) === 'in-progress').length;
  const phaseCount = phased.reduce((acc, p) =>
    acc + p.sections.reduce((a, s) => a + s.phases.length, 0), 0);
  const changeView = (next: 'board' | 'simple') => {
    const params = new URLSearchParams(searchParams);
    if (next === 'simple') params.set('view', 'simple');
    else params.delete('view');
    setSearchParams(params);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Top bar */}
      <div className="shrink-0 px-5 py-4 border-b border-border bg-background">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold text-foreground">Phase Tracker</h1>
            <p className="text-xs text-muted-foreground">
              {phaseCount} phase{phaseCount !== 1 ? 's' : ''} across {formatPlanCounts(filtered)}
              {' · '}{inProgressPlans} plan{inProgressPlans !== 1 ? 's' : ''} in progress
              {' · '}<TimeRemaining plans={filtered} />
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{view === 'board'
              ? 'Columns show phase status; plan status appears on each card.'
              : 'Columns show phase status; select a row to expand its details.'}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-label="Simple view"
            aria-checked={view === 'simple'}
            onClick={() => changeView(view === 'board' ? 'simple' : 'board')}
            className="inline-flex shrink-0 items-center gap-2.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className={view === 'board' ? 'text-foreground' : 'text-muted-foreground'}>Board</span>
            <span aria-hidden="true" className={`relative h-5 w-9 rounded-full transition-colors ${view === 'simple' ? 'bg-primary' : 'bg-muted-foreground/40'}`}>
              <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${view === 'simple' ? 'translate-x-4' : ''}`} />
            </span>
            <span className={view === 'simple' ? 'text-foreground' : 'text-muted-foreground'}>Simple</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <FilterBar statusLabel="Plan status" />

      {/* Views */}
      <div className="flex-1 overflow-hidden px-4 py-4" data-tour="phase-board">
        {view === 'board' ? <KanbanBoard /> : <SimplePhaseList />}
      </div>
    </div>
  );
}
