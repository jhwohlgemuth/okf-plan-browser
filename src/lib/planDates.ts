import type { ParsedPlan } from '@/types/wiki';

export type PlanDateField = 'created' | 'updated';

export function planDateMs(plan: ParsedPlan, field: PlanDateField): number | undefined {
  const value = plan.frontmatter[field];
  if (!value) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function planDateLabel(plan: ParsedPlan, field: PlanDateField): string {
  const ms = planDateMs(plan, field);
  return ms === undefined ? '—' : new Date(ms).toISOString().slice(0, 10);
}

export function dateInRange(ms: number | undefined, after: string, before: string): boolean {
  if (!after && !before) return true;
  if (ms === undefined) return false;
  const day = new Date(ms).toISOString().slice(0, 10);
  return (!after || day >= after) && (!before || day <= before);
}
