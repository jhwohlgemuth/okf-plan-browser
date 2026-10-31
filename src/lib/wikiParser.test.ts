import { describe, it, expect } from 'vitest';
import { parseFrontmatter, extractSections, isPlanFile, parseWikiFile } from '@/lib/wikiParser';
import { isEpic, planStatus } from '@/lib/planKind';

describe('parseFrontmatter', () => {
  it('parses a basic block', () => {
    const { fm, body, errors } = parseFrontmatter('---\ntitle: Hello\nstatus: planned\n---\n# Goal\nx\n');
    expect(errors).toEqual([]);
    expect(fm.title).toBe('Hello');
    expect(fm.status).toBe('planned');
    expect(body).toBe('# Goal\nx\n');
  });

  it('reports a missing block', () => {
    const r = parseFrontmatter('# Just a heading\n');
    expect(r.errors).toEqual(['No YAML frontmatter block found']);
    expect(r.fm.title).toBe('Untitled');
    expect(r.body).toBe('# Just a heading\n');
  });

  it('reports YAML errors with the surfaced prefix', () => {
    const r = parseFrontmatter('---\ntitle: [unclosed\n---\nbody');
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toMatch(/^YAML parse error: /);
    expect(r.fm.title).toBe('Untitled');
  });

  it('strips a BOM', () => {
    const r = parseFrontmatter('\uFEFF---\ntitle: Bom\n---\nbody');
    expect(r.errors).toEqual([]);
    expect(r.fm.title).toBe('Bom');
  });

  it('handles CRLF line endings', () => {
    const r = parseFrontmatter('---\r\ntitle: Crlf\r\n---\r\nbody');
    expect(r.fm.title).toBe('Crlf');
    expect(r.body).toBe('body');
  });

  it('splits scalar and comma-separated tags and packages into arrays', () => {
    const r = parseFrontmatter('---\ntitle: T\ntags: a, b c\npackage: solo\n---\n');
    expect(r.fm.tags).toEqual(['a', 'b', 'c']);
    expect(r.fm.package).toEqual(['solo']);
  });

  it('keeps list tags and defaults absent ones to empty arrays', () => {
    const r = parseFrontmatter('---\ntitle: T\ntags: [x, y]\n---\n');
    expect(r.fm.tags).toEqual(['x', 'y']);
    expect(r.fm.package).toEqual([]);
  });

  it('handles an empty frontmatter block', () => {
    const r = parseFrontmatter('---\n\n---\nbody');
    expect(r.fm.title).toBe('Untitled');
  });
});

describe('extractSections', () => {
  it('splits on H1 headings', () => {
    const s = extractSections('# Goal\nA\n# Boundaries\nB\n');
    expect(s.map(x => x.heading)).toEqual(['Goal', 'Boundaries']);
    expect(s[0]?.body).toBe('A\n');
  });

  it('keeps leading text as a headless section', () => {
    const s = extractSections('intro\n# Goal\nA');
    expect(s[0]).toMatchObject({ heading: '', phases: [] });
    expect(s[1]?.heading).toBe('Goal');
  });

  it('returns nothing for an empty body', () => {
    expect(extractSections('')).toEqual([]);
    expect(extractSections('  \n')).toEqual([]);
  });
});

describe('isPlanFile', () => {
  it('rejects files without frontmatter or with errors', () => {
    expect(isPlanFile('# no frontmatter')).toBe(false);
    expect(isPlanFile('---\ntitle: [x\n---\n')).toBe(false);
  });

  it('honours the type field', () => {
    expect(isPlanFile('---\ntype: Plan\ntitle: A\n---\n')).toBe(true);
    expect(isPlanFile('---\ntype: Index\ntitle: A\n---\n')).toBe(false);
  });

  it('falls back to the presence of a title', () => {
    expect(isPlanFile('---\ntitle: A\n---\n')).toBe(true);
    expect(isPlanFile('---\ndescription: d\n---\n')).toBe(false);
  });
});

describe('Epic classification', () => {
  it('treats legacy zero-phase files as Epics', () => {
    const plan = parseWikiFile('repo', 'overview.md', '---\ntitle: Overview\n---\n# Goal\nCoordinate work');
    expect(isEpic(plan)).toBe(true);
  });

  it('keeps coordination headings as content rather than executable phases', () => {
    const plan = parseWikiFile('repo', 'epic.md', '---\ntitle: Epic\nexecution: coordination\n---\n# Work\n## 1. Child plan\nSee [Child](./child.md).');
    expect(isEpic(plan)).toBe(true);
    expect(plan.sections[0]?.phases).toEqual([]);
    expect(plan.dependencies).toHaveLength(1);
  });

  it('keeps phased work as a plan', () => {
    const plan = parseWikiFile('repo', 'work.md', '---\ntitle: Work\nexecution: phased\n---\n# Execution phases\n## WK-01 Build\n- Budget: 2h');
    expect(isEpic(plan)).toBe(false);
  });
});

describe('effective plan status', () => {
  const phased = (body: string) => parseWikiFile('repo', 'work.md',
    `---\ntitle: Work\nstatus: in-progress\nexecution: phased\n---\n# Execution phases\n## WK-01 Work\n${body}`);

  it('requires an explicit active phase before showing a plan in progress', () => {
    const unstated = phased('- Budget: 2h');
    expect(unstated.sections[0]?.phases[0]?.status).toBe('planned');
    expect(planStatus(unstated)).toBe('planned');
    expect(planStatus(phased('- Status: ready'))).toBe('ready');
    expect(planStatus(phased('- Status: in-progress'))).toBe('in-progress');
  });

  it('uses the most actionable remaining phase status for stale active metadata', () => {
    expect(planStatus(phased('- Status: blocked'))).toBe('blocked');
    expect(planStatus(phased('- Status: waiting-on-validation'))).toBe('waiting-on-validation');
    const coordination = parseWikiFile('repo', 'epic.md',
      '---\ntitle: Epic\nstatus: in-progress\nexecution: coordination\n---\n# Goal\nCoordinate child plans');
    expect(planStatus(coordination)).toBe('in-progress');
  });
});
