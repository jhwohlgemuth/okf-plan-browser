import { describe, expect, it } from 'vitest';
import { getOsLabel, isOsLabel } from './osLabels';

describe('OS labels', () => {
  it('resolves canonical labels to display metadata', () => {
    expect(getOsLabel('os:windows')).toEqual({
      id: 'windows', name: 'Windows', canonicalTag: 'os:windows',
    });
    expect(getOsLabel('os:red-hat')).toEqual({
      id: 'red-hat', name: 'Red Hat', canonicalTag: 'os:red-hat',
    });
  });

  it('recognizes legacy bare tags and platform-prefixed aliases', () => {
    expect(getOsLabel('macos')?.canonicalTag).toBe('os:macos');
    expect(getOsLabel('platform:OSX')?.canonicalTag).toBe('os:macos');
    expect(getOsLabel('RHEL')?.canonicalTag).toBe('os:red-hat');
    expect(getOsLabel('free_bsd')?.canonicalTag).toBe('os:freebsd');
  });

  it('leaves ordinary labels untouched', () => {
    expect(getOsLabel('release')).toBeUndefined();
    expect(isOsLabel('desktop')).toBe(false);
  });
});

