import type { ParsedPlan, Phase } from '@/types/wiki';

type PlanLocation = Pick<ParsedPlan, 'repoId' | 'fileName'>;
type PhaseIdentity = Pick<Phase, 'id'>;

function wikiPath(fileName: string): string {
  const normalized = fileName.replace(/\\/g, '/').replace(/^\.\//, '');
  return normalized.startsWith('.wiki/') ? normalized : `.wiki/${normalized}`;
}

export function planAgentCommand(plan: PlanLocation): string {
  return `Use $planning to execute the plan in repository ${JSON.stringify(plan.repoId)} at ${JSON.stringify(wikiPath(plan.fileName))}.`;
}

export function phaseAgentCommand(plan: PlanLocation, phase: PhaseIdentity): string {
  return `Use $planning to execute phase ${JSON.stringify(phase.id)} of the plan in repository ${JSON.stringify(plan.repoId)} at ${JSON.stringify(wikiPath(plan.fileName))}.`;
}

