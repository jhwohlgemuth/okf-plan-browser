import { describe, expect, it } from 'vitest';
import { sortPlans } from './PlanTable';
import { parseWikiFile } from '@/lib/wikiParser';

const plan = (name: string, created?: string, updated?: string) => parseWikiFile('repo', `${name}.md`,
  `---\ntype: Plan\ntitle: ${name}\n${created ? `created: "${created}"\n` : ''}${updated ? `updated: "${updated}"\n` : ''}---\n# Goal\n`);

describe('timestamp sorting', () => {
  const plans = [
    plan('Old', '2026-11-01T10:00:00Z', '2026-11-21T10:00:00Z'),
    plan('New', '2026-11-20T10:00:00Z', '2026-11-23T10:00:00Z'),
    plan('Missing'),
  ];

  it('sorts recent by latest update with missing timestamps last', () => {
    expect(sortPlans(plans, 'recent', 'desc').map(p => p.frontmatter.title)).toEqual(['New', 'Old', 'Missing']);
    expect(sortPlans(plans, 'recent', 'asc').map(p => p.frontmatter.title)).toEqual(['Old', 'New', 'Missing']);
  });

  it('sorts by creation time', () => {
    expect(sortPlans(plans, 'created', 'desc').map(p => p.frontmatter.title)).toEqual(['New', 'Old', 'Missing']);
  });

  it('orders date-only values at midnight UTC alongside timestamps', () => {
    const dateOnly = plan('Date only', '2026-11-22', '2026-11-23');
    const later = plan('Later', '2026-11-22T12:00:00Z', '2026-11-23T12:00:00Z');
    expect(sortPlans([dateOnly, later], 'recent', 'desc').map(p => p.frontmatter.title)).toEqual(['Later', 'Date only']);
  });
});
