import type { ParsedPlan, Phase, PlanImpact, PlanPriority } from '@/types/wiki';

export interface PhaseCard { plan: ParsedPlan; phase: Phase }
export type PhaseSortKey = 'source' | 'priority' | 'impact' | 'phase-id' | 'phase-title' | 'plan-title';

export const PHASE_SORT_OPTIONS: ReadonlyArray<{ value: PhaseSortKey; label: string }> = [
  { value: 'source', label: 'Source order' },
  { value: 'priority', label: 'Priority' },
  { value: 'impact', label: 'Impact' },
  { value: 'phase-id', label: 'Phase ID' },
  { value: 'phase-title', label: 'Phase title' },
  { value: 'plan-title', label: 'Plan title' },
];

const PRIORITY_ORDER: Record<PlanPriority, number> = { next: 0, high: 1, medium: 2, low: 3 };
const IMPACT_ORDER: Record<PlanImpact, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export function sortPhaseCards(cards: PhaseCard[], key: PhaseSortKey, reversed: boolean): PhaseCard[] {
  if (key === 'source') return reversed ? [...cards].reverse() : cards;

  return [...cards].sort((a, b) => {
    let comparison = 0;
    if (key === 'priority' || key === 'impact') {
      const rank = (card: PhaseCard) => {
        if (key === 'priority') {
          const priority = card.plan.frontmatter.priority;
          return priority ? PRIORITY_ORDER[priority] : undefined;
        }
        const impact = card.plan.frontmatter.impact;
        return impact ? IMPACT_ORDER[impact] : undefined;
      };
      const aRank = rank(a);
      const bRank = rank(b);
      if (aRank === undefined || bRank === undefined) {
        if (aRank === undefined && bRank === undefined) return 0;
        return aRank === undefined ? 1 : -1;
      }
      comparison = aRank - bRank;
    } else {
      const aValue = key === 'phase-id' ? a.phase.id : key === 'phase-title' ? a.phase.title : a.plan.frontmatter.title;
      const bValue = key === 'phase-id' ? b.phase.id : key === 'phase-title' ? b.phase.title : b.plan.frontmatter.title;
      if (!aValue || !bValue) {
        if (!aValue && !bValue) return 0;
        return aValue ? -1 : 1;
      }
      comparison = aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: 'base' });
    }
    return reversed ? -comparison : comparison;
  });
}
