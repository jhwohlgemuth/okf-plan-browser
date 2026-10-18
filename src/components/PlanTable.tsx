import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { usePlanStore, selectFilteredPlans } from '@/store/planStore';
import { useShallow } from 'zustand/react/shallow';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { cn, truncate } from '@/lib/utils';
import type { ParsedPlan } from '@/types/wiki';

type SortKey = 'title' | 'status' | 'priority' | 'impact' | 'difficulty';

const PRIORITY_ORDER: Record<string, number> = { next: 0, high: 1, medium: 2, low: 3 };
const IMPACT_ORDER:   Record<string, number>  = { critical: 0, high: 1, medium: 2, low: 3 };
const STATUS_ORDER:   Record<string, number>  = { 'in-progress': 0, 'waiting-on-validation': 1, blocked: 2, planned: 3 };
const DIFF_ORDER:     Record<string, number>  = { hard: 0, medium: 1, easy: 2 };

function sortPlans(plans: ParsedPlan[], key: SortKey, dir: 'asc' | 'desc') {
  return [...plans].sort((a, b) => {
    let diff = 0;
    const afm = a.frontmatter, bfm = b.frontmatter;
    switch (key) {
      case 'title':      diff = (afm.title ?? '').localeCompare(bfm.title ?? ''); break;
      case 'status':     diff = (STATUS_ORDER[afm.status ?? ''] ?? 9) - (STATUS_ORDER[bfm.status ?? ''] ?? 9); break;
      case 'priority':   diff = (PRIORITY_ORDER[afm.priority ?? ''] ?? 9) - (PRIORITY_ORDER[bfm.priority ?? ''] ?? 9); break;
      case 'impact':     diff = (IMPACT_ORDER[afm.impact ?? ''] ?? 9) - (IMPACT_ORDER[bfm.impact ?? ''] ?? 9); break;
      case 'difficulty': diff = (DIFF_ORDER[afm.difficulty ?? ''] ?? 9) - (DIFF_ORDER[bfm.difficulty ?? ''] ?? 9); break;
    }
    return dir === 'asc' ? diff : -diff;
  });
}

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/40" />;
  return dir === 'asc'
    ? <ChevronUp className="h-3.5 w-3.5 text-primary" />
    : <ChevronDown className="h-3.5 w-3.5 text-primary" />;
}

const IMPACT_CLASSES: Record<string, string> = {
  critical: 'text-od-red font-medium',
  high:     'text-od-orange',
  medium:   'text-od-yellow',
  low:      'text-muted-foreground',
};

export function PlanTable() {
  const filtered   = usePlanStore(useShallow(selectFilteredPlans));
  const repos      = usePlanStore(s => s.repos);
  const selectPlan = usePlanStore(s => s.selectPlan);
  const [sortKey, setSortKey] = useState<SortKey>('priority');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = sortPlans(filtered, sortKey, sortDir);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-sm">No plans match the current filters.</p>
      </div>
    );
  }

  const col = (key: SortKey, label: string, extra = '') => (
    <th
      scope="col"
      aria-sort={sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn('px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap', extra)}
    >
      <button
        type="button"
        onClick={() => handleSort(key)}
        className="flex items-center gap-1 select-none rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {label}
        <SortIcon active={sortKey === key} dir={sortDir} />
      </button>
    </th>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead className="bg-card border-b border-border sticky top-0">
          <tr>
            {col('title', 'Title', 'min-w-[240px]')}
            {col('status', 'Status')}
            {col('priority', 'Priority')}
            {col('impact', 'Impact')}
            {col('difficulty', 'Difficulty')}
            <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Repo</th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Tags</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(plan => {
            const fm   = plan.frontmatter;
            const repo = repos.find(r => r.id === plan.repoId);
            return (
              <tr
                key={plan.id}
                tabIndex={0}
                role="button"
                aria-label={`Open plan: ${fm.title ?? plan.fileName}`}
                onClick={() => selectPlan(plan.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectPlan(plan.id); }
                }}
                className="border-b border-border/50 hover:bg-accent/50 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                {/* Title */}
                <td className="px-3 py-2.5">
                  <div className="font-medium text-foreground leading-snug">{fm.title}</div>
                  {fm.description && (
                    <div className="text-xs text-muted-foreground mt-0.5">{truncate(fm.description, 80)}</div>
                  )}
                </td>

                {/* Status */}
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {fm.status && <StatusBadge status={fm.status} />}
                </td>

                {/* Priority */}
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {fm.priority && <PriorityBadge priority={fm.priority} />}
                </td>

                {/* Impact */}
                <td className={cn('px-3 py-2.5 whitespace-nowrap text-xs capitalize', IMPACT_CLASSES[fm.impact ?? ''] ?? '')}>
                  {fm.impact ?? '—'}
                </td>

                {/* Difficulty */}
                <td className="px-3 py-2.5 whitespace-nowrap text-xs text-muted-foreground capitalize">
                  {fm.difficulty ?? '—'}
                </td>

                {/* Repo */}
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {repo && (
                    <span className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                      <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: repo.color }} />
                      {repo.label}
                    </span>
                  )}
                </td>

                {/* Tags */}
                <td className="px-3 py-2.5 max-w-[200px]">
                  <div className="flex flex-wrap gap-1">
                    {(fm.tags ?? []).slice(0, 2).map(t => (
                      <span key={t} className="text-xs bg-accent px-1.5 py-0.5 rounded text-muted-foreground">#{t}</span>
                    ))}
                    {(fm.tags?.length ?? 0) > 2 && (
                      <span className="text-xs text-muted-foreground">+{fm.tags!.length - 2}</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

