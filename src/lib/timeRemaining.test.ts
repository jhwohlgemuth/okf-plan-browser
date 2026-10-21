import { describe, expect, it } from 'vitest';
import type { ParsedPlan } from '@/types/wiki';
import { extractSections } from './wikiParser';
import { formatTime, planTime, totalTime } from './timeRemaining';

const plan = (body: string, metadata: Partial<ParsedPlan['frontmatter']> = {}): ParsedPlan => ({
  id: 'repo:plan.md', repoId: 'repo', fileName: 'plan.md',
  frontmatter: { title: 'Test', ...metadata }, sections: extractSections(body),
  dependencies: [], phaseRefs: [], parseErrors: [],
});
const phase = (body: string) => `# Execution phases\n\n## TM-01 Work\n${body}`;

describe('remaining effort estimates', () => {
  it('prefers explicit remaining effort over budgets and per-phase caps', () => {
    const value = plan(phase('**Remaining:** 30 minutes\n- Budget: 4 hours'), { phase_budget_hours: 5 });
    expect(formatTime(planTime(value))).toBe('~30m');
  });
  it('uses upper range budgets and falls back for each phase', () => {
    const value = plan(phase('- Budget: 2–4 active hours maximum\n\n## TM-02 Next\n- Status: blocked'), { phase_budget_hours: 5 });
    expect(formatTime(planTime(value))).toBe('~9h');
  });
  it('does not deduct effort based on status or incidental prose/code', () => {
    const value = plan(phase('- Status: in-progress\nExample: 2 hours\n```\nRemaining: 1h\n```'), { phase_budget_hours: 5 });
    expect(formatTime(planTime(value))).toBe('~5h');
  });
  it('preserves explicitly zero remaining work', () => {
    expect(formatTime(planTime(plan(phase('Remaining hours: 0\nBudget: 5h'))))).toBe('0m');
  });
  it('reports unknown work and does not multiply coordination budgets', () => {
    const values = [plan(phase('Budget: 1.1 hours')), plan('# Goal\nUnphased', { phase_budget_hours: 5 }),
      plan(phase('Budget: 5 hours'), { execution: 'coordination' })];
    expect(formatTime(totalTime(values))).toBe('~1h 6m + 1 unestimated');
    expect(formatTime(planTime(values[1]!))).toBe('Not estimated (1)');
    expect(formatTime(planTime(values[2]!))).toBe('N/A (coordination)');
  });
  it('keeps missing phase estimates visible alongside known phases', () => {
    expect(formatTime(planTime(plan(phase('Budget: 2h\n\n## TM-02 Unknown'))))).toBe('~2h + 1 unestimated');
  });
});
