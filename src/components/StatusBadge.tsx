import { cn } from '@/lib/utils';
import type { PlanStatus, PhaseStatus } from '@/types/wiki';

const STATUS_CLASSES: Record<string, string> = {
  planned:     'bg-od-surface3/60 text-od-muted   border border-od-border',
  'in-progress':'bg-od-blue/15   text-od-blue    border border-od-blue/30',
  blocked:     'bg-od-red/15    text-od-red     border border-od-red/30',
  ready:       'bg-od-green/15  text-od-green   border border-od-green/30',
};

const STATUS_LABELS: Record<string, string> = {
  planned:      'Planned',
  'in-progress':'In Progress',
  blocked:      'Blocked',
  ready:        'Ready',
};

interface Props {
  status:    PlanStatus | PhaseStatus;
  className?: string;
}

export function StatusBadge({ status, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        STATUS_CLASSES[status] ?? STATUS_CLASSES.planned,
        className,
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
