import { cn } from '@/lib/utils';
import type { PlanPriority } from '@/types/wiki';

const PRIORITY_CLASSES: Record<PlanPriority, string> = {
  next:   'bg-od-purple/15 text-od-purple border border-od-purple/30',
  high:   'bg-od-orange/15 text-od-orange border border-od-orange/30',
  medium: 'bg-od-yellow/15 text-od-yellow border border-od-yellow/30',
  low:    'bg-od-muted/15  text-od-muted  border border-od-border',
};

interface Props { priority: PlanPriority; className?: string }

export function PriorityBadge({ priority, className }: Props) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize',
      PRIORITY_CLASSES[priority] ?? PRIORITY_CLASSES.low,
      className,
    )}>
      {priority}
    </span>
  );
}
