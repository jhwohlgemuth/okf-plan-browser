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

export function commitWiki(
  project: string,
  { plans, errors, assets = [], nativeRoot }: Parsed,
  source?: { remote?: RemoteWikiRef; label?: string; refresh?: boolean },
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
