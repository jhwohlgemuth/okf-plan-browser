import type { ParsedPlan, PlanStatus } from '@/types/wiki';
import { resolvePlanLink } from './planLinks';

/** Coordination records and plans without parsed execution phases are Epics. */
export function isEpic(plan: Pick<ParsedPlan, 'frontmatter' | 'sections'>): boolean {
  return plan.frontmatter.execution === 'coordination'
    || !plan.sections.some(section => section.phases.length > 0);
}

/** A phased plan is active only while at least one of its phases is active. */
export function planStatus(plan: Pick<ParsedPlan, 'frontmatter' | 'sections'>): PlanStatus | undefined {
  const declared = plan.frontmatter.status;
  if (declared !== 'in-progress' || plan.frontmatter.execution === 'coordination') return declared;
  const statuses = plan.sections.flatMap(section => section.phases.map(phase => phase.status));
  if (statuses.includes('in-progress')) return declared;
  if (statuses.includes('waiting-on-validation')) return 'waiting-on-validation';
  if (statuses.includes('ready')) return 'ready';
  if (statuses.includes('blocked')) return 'blocked';
  return 'planned';
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
