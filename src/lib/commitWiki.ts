import { usePlanStore } from '@/store/planStore';
import { repoColor, newUuid } from '@/lib/utils';
import type { WikiRepo, ParseWarning, ParsedPlan } from '@/types/wiki';
import type { RemoteWikiRef } from '@/lib/remoteWiki';
import { registerAssetFiles } from '@/lib/wikiAssets';
import type { WikiAsset } from '@/lib/wikiParser';

export interface LoadResult {
  repoId:   string;
  plans:    number;
  warnings: number;
}

export type Parsed = {
  plans: ParsedPlan[];
  errors: Array<{ name: string; error: string }>;
  assets?: WikiAsset[];
  nativeRoot?: string;
};

type WikiSource = { remote?: RemoteWikiRef; label?: string; refresh?: boolean };

const operationGenerations = new Map<string, number>();

export function beginWikiOperation(project: string): number {
  const generation = (operationGenerations.get(project) ?? 0) + 1;
  operationGenerations.set(project, generation);
  return generation;
}

export function invalidateWikiOperation(project: string): void {
  beginWikiOperation(project);
}

function isCurrentWikiOperation(project: string, generation: number): boolean {
  return operationGenerations.get(project) === generation;
}

function applyWiki(
  project: string,
  { plans, errors, assets = [], nativeRoot }: Parsed,
  source?: WikiSource,
): LoadResult {
  if (errors.length) {
    throw new Error(`Import failed; existing plans were kept. ${errors.map(e => `${e.name}: ${e.error}`).join('; ')}`);
  }
  if (plans.length === 0 && !(source?.refresh && usePlanStore.getState().repos.some(r => r.id === project))) {
    throw new Error(`No plans found in "${project}". Pick the project folder, its .wiki folder, or a repo that contains .wiki plans.`);
  }
  if (usePlanStore.getState().isDemoData) usePlanStore.getState().clearAll();
  const store = usePlanStore.getState();
  const existing = store.repos.find(r => r.id === project);
  const repo: WikiRepo = {
    id:        project,
    uuid:      existing?.uuid ?? newUuid(),
    label:     source?.label ?? existing?.label ?? project,
    color:     (existing?.color ?? repoColor(store.repos.length)) as WikiRepo['color'],
    planCount: plans.length,
    assets:    assets.map(asset => asset.path),
    remote:    source?.remote ?? existing?.remote,
  };
  const warns: ParseWarning[] = [
    ...plans.filter(p => p.parseErrors.length).map(p => ({
      repoId: project, fileName: p.fileName, errors: p.parseErrors,
    })),
    ...errors.map(e => ({ repoId: project, fileName: e.name, errors: [e.error] })),
  ];
  store.addPlans(plans, repo, warns);
  registerAssetFiles(project, assets, nativeRoot);
  return { repoId: project, plans: plans.length, warnings: warns.length };
}

/** Commit a user import and invalidate any older refresh response for this repository. */
export function commitWiki(project: string, parsed: Parsed, source?: WikiSource): LoadResult {
  invalidateWikiOperation(project);
  return applyWiki(project, parsed, source);
}

/** Commit only if this refresh is still the newest operation and the repository still exists. */
export function commitWikiOperation(
  project: string,
  generation: number,
  parsed: Parsed,
  source?: WikiSource,
): LoadResult | null {
  if (!isCurrentWikiOperation(project, generation)) return null;
  if (!usePlanStore.getState().repos.some(repo => repo.id === project)) return null;
  return applyWiki(project, parsed, source);
}
