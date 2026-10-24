import type { ParsedPlan, Phase } from '@/types/wiki';

type PlanLocation = Pick<ParsedPlan, 'repoId' | 'fileName'>;
type PhaseIdentity = Pick<Phase, 'id'>;

export const PLANNING_SITE_URL = 'https://www.jasonwohlgemuth.com/okf-plan-browser/planning';

export function withPlanningReference(command: string): string {
  return `${command}\n\nOfficial planning skill guide and download: ${PLANNING_SITE_URL}`;
}

function wikiPath(fileName: string): string {
  const normalized = fileName.replace(/\\/g, '/').replace(/^\.\//, '');
  return normalized.startsWith('.wiki/') ? normalized : `.wiki/${normalized}`;
}

export function planAgentCommand(plan: PlanLocation): string {
  return withPlanningReference(`Use $planning to execute the plan in repository ${JSON.stringify(plan.repoId)} at ${JSON.stringify(wikiPath(plan.fileName))}.`);
}

export function phaseAgentCommand(plan: PlanLocation, phase: PhaseIdentity): string {
  return withPlanningReference(`Use $planning to execute phase ${JSON.stringify(phase.id)} of the plan in repository ${JSON.stringify(plan.repoId)} at ${JSON.stringify(wikiPath(plan.fileName))}.`);
}

