import type { ParsedPlan, Phase } from '@/types/wiki';

type PlanLocation = Pick<ParsedPlan, 'repoId' | 'fileName'>;
type PhaseIdentity = Pick<Phase, 'id'>;

const PLANNING_SITE_ROOT = 'https://www.jasonwohlgemuth.com/okf-plan-browser';

export const PLANNING_SITE_URL = `${PLANNING_SITE_ROOT}/planning`;
export const PLANNING_SKILL_ENTRY_URL = `${PLANNING_SITE_ROOT}/planning-skill/SKILL.md`;
export const PLANNING_SKILL_ZIP_URL = `${PLANNING_SITE_ROOT}/planning-skill.zip`;
export const OPENCODE_SKILL_CATALOG_URL = `${PLANNING_SITE_ROOT}/opencode/skills/`;

export function withPlanningReference(command: string): string {
  return `${command}\n\nOfficial planning skill guide and download: ${PLANNING_SITE_URL}\nIf $planning is unavailable, review ${PLANNING_SKILL_ENTRY_URL}, download ${PLANNING_SKILL_ZIP_URL}, extract it at the repository root, and start a new agent session before continuing.`;
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

