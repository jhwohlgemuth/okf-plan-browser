import { usePlanStore, selectFilteredPlans } from '@/store/planStore';
import { FilterBar } from '@/components/FilterBar';
import { PlanTable } from '@/components/PlanTable';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export function PortfolioPage() {
  const filtered = usePlanStore(selectFilteredPlans);
  const total    = usePlanStore(s => s.plans.length);
  const { filters, setFilter } = usePlanStore();

  return (
    <div className="flex flex-col h-screen min-h-0">
      {/* Top bar */}
      <div className="shrink-0 px-5 py-4 border-b border-border bg-background flex items-center gap-4">
        <div>
          <h1 className="text-base font-semibold text-foreground">Portfolio</h1>
          <p className="text-xs text-muted-foreground">
            {filtered.length} of {total} plan{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="relative ml-auto w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-xs"
            placeholder="Quick search…"
            value={filters.search}
            onChange={e => setFilter('search', e.target.value)}
          />
        </div>
      </div>

      {/* Filters */}
      <FilterBar />

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <PlanTable />
      </div>
    </div>
  );
}
