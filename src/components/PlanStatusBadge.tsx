import type { ParsedPlan } from '@/types/wiki';
import { planStatus } from '@/lib/planKind';
import { StatusBadge } from './StatusBadge';

export function PlanStatusBadge({ plan }: { plan: Pick<ParsedPlan, 'frontmatter' | 'sections'> }) {
  const status = planStatus(plan);
  if (!status) return null;
  const sourceDiffers = status !== plan.frontmatter.status;
  return <StatusBadge status={status} title={sourceDiffers
    ? 'Source says in-progress, but no phase is in-progress. Showing the phase-based status.'
    : undefined} />;
}
