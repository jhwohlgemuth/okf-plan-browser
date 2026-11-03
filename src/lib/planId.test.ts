import { describe, expect, it } from 'vitest';
import { planGraphId } from './planId';

describe('planGraphId', () => {
  it('uses the first three letters of a plan entrypoint', () => {
    expect(planGraphId({ fileName: 'api-versioning-strategy.md' })).toBe('API');
    expect(planGraphId({ fileName: '.wiki/winget-publication.md' })).toBe('WIN');
  });

  it('uses the parent folder for folder-format plans', () => {
    expect(planGraphId({ fileName: 'desktop-ingest/index.md' })).toBe('DES');
    expect(planGraphId({ fileName: 'windows\\release-checks\\index.md' })).toBe('REL');
  });

  it('always returns three letters for short or unusual names', () => {
    expect(planGraphId({ fileName: 'ui.md' })).toBe('UIP');
    expect(planGraphId({ fileName: '123.md' })).toBe('PLN');
  });
});

