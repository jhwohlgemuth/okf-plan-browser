import type { Frontmatter } from '@/types/wiki';

/** Treat YAML and persisted JSON as untrusted data at the application boundary. */
export function validateFrontmatter(value: unknown): { fm: Frontmatter; errors: string[] } {
  const errors: string[] = [];
  const obj = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
  if (obj !== value) errors.push('Frontmatter must be a mapping');
  const fm: Frontmatter = { title: 'Untitled' };
  for (const key of ['title', 'description', 'type'] as const) {
    const v = obj[key];
    if (v === undefined) continue;
    if (typeof v === 'string') fm[key] = v;
    else errors.push(`${key} must be text`);
  }
  for (const key of ['tags', 'package'] as const) {
    const v = obj[key];
    if (v === undefined) { fm[key] = []; continue; }
    if (typeof v === 'string') fm[key] = v.split(/[,\s]+/).filter(Boolean);
    else if (Array.isArray(v) && v.every(x => typeof x === 'string')) fm[key] = v;
    else { fm[key] = []; errors.push(`${key} must be a list of strings`); }
  }
  const enums = {
    status: ['planned', 'ready', 'in-progress', 'waiting-on-validation', 'blocked'],
    priority: ['next', 'high', 'medium', 'low'],
    impact: ['low', 'medium', 'high', 'critical'],
    difficulty: ['easy', 'medium', 'hard'],
    execution: ['phased', 'coordination'],
  };
  for (const [key, allowed] of Object.entries(enums)) {
    const original = obj[key];
    const v = key === 'difficulty' && original === 'low' ? 'easy'
      : key === 'difficulty' && original === 'high' ? 'hard' : original;
    if (v === undefined || (['difficulty', 'impact'].includes(key) && typeof v === 'string' && ['mixed', 'not-assessed'].includes(v))) continue;
    if (typeof v === 'string' && allowed.includes(v)) fm[key] = v;
    else errors.push(`${key} must be one of: ${allowed.join(', ')}`);
  }
  if (obj.phase_budget_hours !== undefined) {
    if (typeof obj.phase_budget_hours === 'number' && Number.isFinite(obj.phase_budget_hours) && obj.phase_budget_hours > 0) {
      fm.phase_budget_hours = obj.phase_budget_hours;
    } else errors.push('phase_budget_hours must be a positive number');
  }
  return { fm, errors };
}
