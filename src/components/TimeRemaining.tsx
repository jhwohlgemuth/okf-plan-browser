import type { ParsedPlan, Phase } from '@/types/wiki';
import { formatTime, phaseTime, totalTime, TIME_EXPLANATION } from '@/lib/timeRemaining';

export function TimeRemaining({ plans, phase, label = true }: { plans: ParsedPlan[]; phase?: Phase; label?: boolean }) {
  const estimate = phase && plans[0] ? phaseTime(plans[0], phase) : totalTime(plans);
  const text = formatTime(estimate);
  return (
    <span className="text-xs text-muted-foreground tabular-nums" title={TIME_EXPLANATION} aria-label={`Estimated time remaining: ${text}`}>
      {label && 'Time remaining: '}{text}
    </span>
  );
}
