import type { ParsedPlan } from '@/types/wiki';
import { resolvePlanLink } from './planLinks';

/** Coordination records and plans without parsed execution phases are Epics. */
export function isEpic(plan: Pick<ParsedPlan, 'frontmatter' | 'sections'>): boolean {
  return plan.frontmatter.execution === 'coordination'
    || !plan.sections.some(section => section.phases.length > 0);
}

export function formatPlanCounts(plans: ParsedPlan[]): string {
  const epicCount = plans.filter(isEpic).length;
  const planCount = plans.length - epicCount;
  return `${planCount} plan${planCount === 1 ? '' : 's'} · ${epicCount} Epic${epicCount === 1 ? '' : 's'}`;
}

export function linkedPlans(plan: ParsedPlan, plans: ParsedPlan[]): ParsedPlan[] {
  const links = plan.dependencies
    .map(link => resolvePlanLink(plans, plan, link.href))
    .filter((target): target is ParsedPlan => !!target && target.id !== plan.id);
  return [...new Map(links.map(target => [target.id, target])).values()];
}
