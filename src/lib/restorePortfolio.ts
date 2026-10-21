import type { ParsedPlan, WikiRepo, ParseWarning } from '@/types/wiki';
import { validateFrontmatter } from './frontmatter';
import { buildSearchText, extractDependencies, extractPhaseRefs, extractSections } from './wikiParser';
import { remoteProjectId, type RemoteWikiRef } from './remoteWiki';
import { newUuid } from './utils';

const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};

export function restorePortfolio(value: unknown): { plans: ParsedPlan[]; repos: WikiRepo[]; warnings: ParseWarning[] } {
  const saved = record(value);
  const repos: WikiRepo[] = [];
  const plans: ParsedPlan[] = [];
  const warnings: ParseWarning[] = [];
  const ids = new Map<string, string>();
  for (const item of Array.isArray(saved.repos) ? saved.repos : []) {
    const r = record(item);
    if (typeof r.id !== 'string' || ids.has(r.id)) continue;
    const candidate = record(r.remote);
    const remote = typeof candidate.forge === 'string' && ['github', 'gitlab'].includes(candidate.forge)
      && typeof candidate.host === 'string' && typeof candidate.project === 'string'
      && (candidate.ref === undefined || typeof candidate.ref === 'string')
      ? candidate as unknown as RemoteWikiRef : undefined;
    const id = remote ? remoteProjectId(remote) : r.id;
    if (repos.some(repo => repo.id === id)) continue;
    ids.set(r.id, id);
    repos.push({ id, remote, label: typeof r.label === 'string' ? r.label : r.id,
      uuid: typeof r.uuid === 'string' ? r.uuid : newUuid(), color: typeof r.color === 'string' && /^#[a-f0-9]{6}$/i.test(r.color) ? r.color as WikiRepo['color'] : '#61afef', planCount: 0 });
  }
  for (const item of Array.isArray(saved.warnings) ? saved.warnings : []) {
    const warning = record(item);
    const repoId = typeof warning.repoId === 'string' ? ids.get(warning.repoId) : undefined;
    if (repoId && typeof warning.fileName === 'string' && Array.isArray(warning.errors)
      && warning.errors.every(e => typeof e === 'string')) {
      warnings.push({ repoId, fileName: warning.fileName, errors: warning.errors });
    }
  }
  for (const item of Array.isArray(saved.plans) ? saved.plans : []) {
    const p = record(item);
    const repoId = typeof p.repoId === 'string' ? ids.get(p.repoId) : undefined;
    if (!repoId) continue;
    if (typeof p.fileName !== 'string' || !Array.isArray(p.sections)
      || !p.sections.every(s => typeof record(s).body === 'string' && typeof record(s).heading === 'string')) {
      warnings.push({ repoId, fileName: typeof p.fileName === 'string' ? p.fileName : 'unknown', errors: ['Invalid saved plan; reload its source'] });
      continue;
    }
    const { fm, errors } = validateFrontmatter(p.frontmatter);
    const body = p.sections.map(s => {
      const section = record(s);
      return `${section.heading ? `# ${section.heading}\n` : ''}${section.body}`;
    }).join('\n');
    const sections = extractSections(body, fm.status ?? 'planned');
    const id = `${repoId}:${p.fileName}`;
    if (plans.some(plan => plan.id === id)) continue;
    plans.push({ id, repoId, fileName: p.fileName, frontmatter: fm, sections,
      dependencies: extractDependencies(body), phaseRefs: extractPhaseRefs(body),
      parseErrors: errors, searchText: buildSearchText({ frontmatter: fm, sections }) });
    if (errors.length) warnings.push({ repoId, fileName: p.fileName, errors });
  }
  for (const repo of repos) repo.planCount = plans.filter(p => p.repoId === repo.id).length;
  return { plans, repos, warnings };
}
