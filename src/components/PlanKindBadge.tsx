import { Layers3, ListChecks } from 'lucide-react';
import type { ParsedPlan } from '@/types/wiki';
import { isEpic } from '@/lib/planKind';

export function PlanKindBadge({ plan, compact = false }: { plan: ParsedPlan; compact?: boolean }) {
  const epic = isEpic(plan);
  const Icon = epic ? Layers3 : ListChecks;
  return <span className={epic
    ? 'inline-flex items-center gap-1 rounded-md border border-od-purple/35 bg-od-purple/15 px-2 py-0.5 text-xs font-semibold text-od-purple'
    : 'inline-flex items-center gap-1 rounded-md border border-od-blue/30 bg-od-blue/10 px-2 py-0.5 text-xs font-medium text-od-blue'}>
    <Icon className="h-3 w-3" aria-hidden="true" />
    {compact ? (epic ? 'Epic' : 'Plan') : (epic ? 'Epic' : 'Phased plan')}
  </span>;
}
