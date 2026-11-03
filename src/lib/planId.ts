import type { ParsedPlan } from '@/types/wiki';

/** Stable three-letter graph label derived from a plan entrypoint path. */
export function planGraphId(plan: Pick<ParsedPlan, 'fileName'>): string {
  const parts = plan.fileName.replace(/\\/g, '/').split('/').filter(Boolean);
  const file = parts[parts.length - 1] ?? '';
  const stem = file.replace(/\.md$/i, '');
  const source = stem.toLowerCase() === 'index' ? (parts[parts.length - 2] ?? stem) : stem;
  const letters = source.normalize('NFKD').replace(/[^a-z]/gi, '').toUpperCase();
  return (letters + 'PLN').slice(0, 3);
}

