import { describe, expect, it } from 'vitest';
import { normalizeGitlabHost } from '@/lib/githubToken';

describe('normalizeGitlabHost', () => {
  it('normalizes an exact HTTPS host', () => {
    expect(normalizeGitlabHost('GitLab.COM')).toBe('gitlab.com');
    expect(normalizeGitlabHost('https://code.example.com:8443')).toBe('code.example.com:8443');
  });

  it('rejects insecure, credentialed, and path-bearing origins', () => {
    expect(() => normalizeGitlabHost('http://gitlab.example.com')).toThrow(/HTTPS/);
    expect(() => normalizeGitlabHost('https://token@gitlab.example.com')).toThrow(/credentials/);
    expect(() => normalizeGitlabHost('https://gitlab.example.com/group/project')).toThrow(/paths/);
    expect(() => normalizeGitlabHost('https://gitlab.example.com?token=secret')).toThrow(/queries/);
    expect(() => normalizeGitlabHost('https://gitlab.example.com#settings')).toThrow(/fragments/);
  });
});
