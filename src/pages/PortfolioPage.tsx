import { TimeRemaining } from '@/components/TimeRemaining';
import { useEffect, useMemo, useState } from 'react';
import { usePlanStore, selectFilteredPlans } from '@/store/planStore';
import { debounce } from '@/lib/utils';
import { useShallow } from 'zustand/react/shallow';
import { FilterBar } from '@/components/FilterBar';
import { PlanTable } from '@/components/PlanTable';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export function PortfolioPage() {
  const filtered = usePlanStore(useShallow(selectFilteredPlans));
  const total    = usePlanStore(s => s.plans.length);
  const search    = usePlanStore(s => s.filters.search);
  const setFilter = usePlanStore(s => s.setFilter);
  const [query, setQuery] = useState(search);

  useEffect(() => { setQuery(search); }, [search]);

  const commit = useMemo(
    () => debounce((value: unknown) => setFilter('search', String(value)), 200),
    [setFilter],
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Top bar */}
      <div className="shrink-0 px-4 sm:px-5 py-4 border-b border-border bg-background flex flex-wrap items-center gap-x-4 gap-y-2">
        <div>
          <h1 className="text-base font-semibold text-foreground">Portfolio</h1>
          <p className="text-xs text-muted-foreground">
            {filtered.length} of {total} plan{total !== 1 ? 's' : ''}
            {' · '}<TimeRemaining plans={filtered} />
          </p>
        </div>
        <div className="relative w-full sm:w-64 sm:ml-auto" data-tour="portfolio-search">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-xs"
            placeholder="Quick search…"
            value={query}
            onChange={e => { setQuery(e.target.value); commit(e.target.value); }}
          />
        </div>
      </div>

      {/* Filters */}
      <div data-tour="portfolio-filters"><FilterBar /></div>

      {/* Table */}
      <div className="flex-1 overflow-auto" data-tour="plan-table">
        <PlanTable />
      </div>
    </div>
  );
}
