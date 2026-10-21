import { describe, it, expect } from 'vitest';
import { extractSections, extractDependencies, extractPhaseRefs, parseWikiFile } from '@/lib/wikiParser';

const phases = (body: string, def: 'planned' | 'ready' = 'planned') =>
  extractSections(body, def).flatMap(s => s.phases);

describe('heading phases', () => {
  const body = `# Execution phases

## AB-01 — First phase

- Status: ready
- Prerequisites: none

## AB-02 - Second phase

Depends on AB-01.

**Status:** blocked
`;

  it('detects ids, titles and statuses', () => {
    const p = phases(body);
    expect(p.map(x => x.id)).toEqual(['AB-01', 'AB-02']);
    expect(p[0]?.title).toBe('First phase');
    expect(p[1]?.title).toBe('Second phase');
    expect(p.map(x => x.status)).toEqual(['ready', 'blocked']);
  });

  it('collects refs excluding the phase itself', () => {
    expect(phases(body)[1]?.refs).toEqual(['AB-01']);
  });
});

describe('numbered phases', () => {
  it('parses "Phase N" headings and bare numbers', () => {
    const p = phases('# Plan\n\n## Phase 1: Setup\ntext\n\n## 2. Build\ntext\n');
    expect(p.map(x => x.id)).toEqual(['Phase 1', '2']);
    expect(p[0]?.title).toBe('Setup');
    expect(p[1]?.title).toBe('Build');
  });

  it('parses list items under a phases heading and splits titles on sentence punctuation', () => {
    const p = phases('# Delivery phases\n\n1. Qualify artifacts. Then more detail.\n2. Ship it; later\n');
    expect(p.map(x => x.id)).toEqual(['Phase 1', 'Phase 2']);
    expect(p.map(x => x.title)).toEqual(['Qualify artifacts', 'Ship it']);
  });

  it('ignores headings that are not phases', () => {
    expect(phases('# Plan\n\n## Background\ntext\n')).toEqual([]);
  });
});

describe('status variants', () => {
  const status = (line: string) => phases(`# P\n\n## XY-01 — T\n\n${line}\n`)[0]?.status;

  it.each([
    ['- Status: ready', 'ready'],
    ['**Status:** blocked', 'blocked'],
    ['- **Status**: in-progress', 'in-progress'],
    ['- Status: in progress', 'in-progress'],
    ['- Status: `planned`', 'planned'],
    ['- Status: waiting on validation', 'waiting-on-validation'],
    ['- Status: Waiting-On-Validation', 'waiting-on-validation'],
    ['> Status: ready', 'ready'],
  ])('%s', (line, expected) => {
    expect(status(line)).toBe(expected);
  });

  it('falls back to the plan default status', () => {
    expect(phases('# P\n\n## XY-01 — T\n\nno status here\n', 'ready')[0]?.status).toBe('ready');
  });
});

describe('extractDependencies', () => {
  it('finds markdown links to .md files only', () => {
    const deps = extractDependencies('See [a](a.md), [b](../b.md#x) and [web](https://x.io) and [c](c.md).');
    expect(deps).toEqual([
      { text: 'a', href: 'a.md', kind: 'reference' },
      { text: 'b', href: '../b.md#x', kind: 'reference' },
      { text: 'c', href: 'c.md', kind: 'reference' },
    ]);
  });

  it('returns an empty list when there are no links', () => {
    expect(extractDependencies('nothing')).toEqual([]);
  });

  it('is stable across repeated calls', () => {
    const t = '[a](a.md)';
    expect(extractDependencies(t)).toEqual(extractDependencies(t));
  });
});

describe('extractPhaseRefs', () => {
  it('returns unique ids in order', () => {
    expect(extractPhaseRefs('AB-01 then CD-22 and AB-01 again, not ab-3 or X')).toEqual(['AB-01', 'CD-22']);
  });
});

describe('parseWikiFile', () => {
  it('assembles a plan', () => {
    const p = parseWikiFile('repo', 'a.md', '---\ntitle: A\nstatus: ready\n---\n# Execution phases\n\n## AB-01 — T\n\nsee [b](b.md)\n');
    expect(p.id).toBe('repo:a.md');
    expect(p.sections[0]?.phases[0]?.status).toBe('ready');
    expect(p.dependencies).toHaveLength(1);
    expect(p.phaseRefs).toEqual(['AB-01']);
    expect(p.parseErrors).toEqual([]);
  });
});
