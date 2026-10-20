import { describe, expect, it } from 'vitest';
import { phaseAgentCommand, planAgentCommand } from '@/lib/agentCommand';

const plan = { repoId: 'acorn', fileName: 'features/auth.md' };

describe('agent commands', () => {
  it('identifies a plan by repository and wiki path', () => {
    expect(planAgentCommand(plan)).toBe(
      'Use $planning to execute the plan in repository "acorn" at ".wiki/features/auth.md".',
    );
  });

  it('identifies a phase without copying plan-authored instructions', () => {
    expect(phaseAgentCommand(plan, { id: 'PA-02' })).toBe(
      'Use $planning to execute phase "PA-02" of the plan in repository "acorn" at ".wiki/features/auth.md".',
    );
  });

  it('normalizes Windows paths without duplicating an existing wiki prefix', () => {
    expect(planAgentCommand({ repoId: 'xylem', fileName: '.wiki\\api\\plan.md' })).toContain(
      '".wiki/api/plan.md"',
    );
  });
});

