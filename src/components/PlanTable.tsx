import { planTime } from '@/lib/timeRemaining';
import { TimeRemaining } from '@/components/TimeRemaining';
import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { usePlanStore, selectFilteredPlans } from '@/store/planStore';
import { useShallow } from 'zustand/react/shallow';
import { PlanStatusBadge } from './PlanStatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { cn, truncate } from '@/lib/utils';
import type { ParsedPlan } from '@/types/wiki';
import { AgentCommandButton } from './AgentCommandButton';
import { planAgentCommand } from '@/lib/agentCommand';
import { isEpic, planStatus } from '@/lib/planKind';
import { PlanKindBadge } from './PlanKindBadge';
import { TagBadge } from './TagBadge';
import { planDateLabel, planDateMs } from '@/lib/planDates';

type SortKey = 'title' | 'kind' | 'status' | 'priority' | 'impact' | 'difficulty' | 'remaining' | 'created' | 'updated' | 'recent';

const PRIORITY_ORDER: Record<string, number> = { next: 0, high: 1, medium: 2, low: 3 };
const IMPACT_ORDER:   Record<string, number>  = { critical: 0, high: 1, medium: 2, low: 3 };
const STATUS_ORDER:   Record<string, number>  = { 'in-progress': 0, 'waiting-on-validation': 1, blocked: 2, ready: 3, planned: 4 };
const DIFF_ORDER:     Record<string, number>  = { hard: 0, medium: 1, easy: 2 };

// eslint-disable-next-line react-refresh/only-export-components -- pure sorter is tested independently
export function sortPlans(plans: ParsedPlan[], key: SortKey, dir: 'asc' | 'desc') {
  return [...plans].sort((a, b) => {
    let diff = 0;
    if (key === 'remaining') {
      const ae = planTime(a), be = planTime(b);
      const aKnown = ae.estimated > 0 && ae.unknown === 0;
      const bKnown = be.estimated > 0 && be.unknown === 0;
      if (aKnown !== bKnown) return aKnown ? -1 : 1;
      return (dir === 'asc' ? 1 : -1) * (ae.hours - be.hours);
    }
    const afm = a.frontmatter, bfm = b.frontmatter;
    if (key === 'created' || key === 'updated' || key === 'recent') {
      const field = key === 'created' ? 'created' : 'updated';
      const ams = planDateMs(a, field), bms = planDateMs(b, field);
      if (ams === undefined || bms === undefined) {
        if (ams === undefined && bms === undefined) return afm.title.localeCompare(bfm.title);
        return ams === undefined ? 1 : -1;
      }
      return (dir === 'asc' ? 1 : -1) * (ams - bms) || afm.title.localeCompare(bfm.title);
    }
    switch (key) {
      case 'title':      diff = (afm.title ?? '').localeCompare(bfm.title ?? ''); break;
      case 'kind':       diff = Number(isEpic(a)) - Number(isEpic(b)); break;
      case 'status':     diff = (STATUS_ORDER[planStatus(a) ?? ''] ?? 9) - (STATUS_ORDER[planStatus(b) ?? ''] ?? 9); break;
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
    else { setSortKey(key); setSortDir(['recent', 'created', 'updated'].includes(key) ? 'desc' : 'asc'); }
  }

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-sm">No plans or Epics match the current filters.</p>
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
      <div className="flex items-center justify-end gap-2 border-b border-border px-3 py-2">
        <label htmlFor="plan-sort" className="text-xs text-muted-foreground">Sort by</label>
        <select id="plan-sort" aria-label="Sort plans by" value={sortKey}
          onChange={event => handleSort(event.target.value as SortKey)}
          className="h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground">
          <option value="recent">Recent (updated)</option>
          <option value="created">Created</option>
          <option value="updated">Updated</option>
          <option value="priority">Priority</option>
          <option value="title">Title</option>
          <option value="kind">Kind</option>
          <option value="status">Status</option>
          <option value="impact">Impact</option>
          <option value="difficulty">Difficulty</option>
          <option value="remaining">Time remaining</option>
        </select>
      </div>
      <table className="w-full text-sm border-collapse">
        <thead className="bg-card border-b border-border sticky top-0">
          <tr>
            {col('title', 'Title', 'min-w-[240px]')}
            {col('kind', 'Kind')}
            {col('status', 'Status')}
            {col('priority', 'Priority')}
            {col('impact', 'Impact')}
            {col('difficulty', 'Difficulty')}
            {col('remaining', 'Time remaining')}
            {col('created', 'Created')}
            {col('updated', 'Updated')}
            <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Repo</th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Tags</th>
            <th className="w-12 px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Agent</th>
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
                aria-label={`Open ${isEpic(plan) ? 'Epic' : 'plan'}: ${fm.title ?? plan.fileName}`}
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

                <td className="px-3 py-2.5 whitespace-nowrap"><PlanKindBadge plan={plan} compact /></td>

                {/* Status */}
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <PlanStatusBadge plan={plan} />
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

                <td className="px-3 py-2.5 whitespace-nowrap"><TimeRemaining plans={[plan]} label={false} /></td>
                <td className="px-3 py-2.5 whitespace-nowrap text-xs text-muted-foreground" title={fm.created}>{planDateLabel(plan, 'created')}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-xs text-muted-foreground" title={fm.updated}>{planDateLabel(plan, 'updated')}</td>

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
                      <TagBadge key={t} tag={t} compact />
                    ))}
                    {(fm.tags?.length ?? 0) > 2 && (
                      <span className="text-xs text-muted-foreground">+{fm.tags!.length - 2}</span>
                    )}
                  </div>
                </td>

                {/* Agent command */}
                <td className="px-3 py-2.5 text-right">
                  <AgentCommandButton
                    command={planAgentCommand({ ...plan, repoId: repo?.label ?? plan.repoId })}
                    label={`Copy agent command for ${fm.title ?? plan.fileName}`}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

