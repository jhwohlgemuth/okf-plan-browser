import { usePlanStore } from '@/store/planStore';
import { repoColor, newUuid } from '@/lib/utils';
import type { WikiRepo, ParseWarning, ParsedPlan } from '@/types/wiki';
import type { RemoteWikiRef } from '@/lib/remoteWiki';

export interface LoadResult {
  repoId:   string;
  plans:    number;
  warnings: number;
}

export type Parsed = { plans: ParsedPlan[]; errors: Array<{ name: string; error: string }> };

export function commitWiki(
  project: string,
  { plans, errors }: Parsed,
  source?: { remote?: RemoteWikiRef },
): LoadResult {
  if (plans.length === 0) {
    throw new Error(`No plans found in "${project}". Pick the project folder, its .wiki folder, or a repo that contains .wiki plans.`);
  }
  if (usePlanStore.getState().isDemoData) usePlanStore.getState().clearAll();
  const store = usePlanStore.getState();
  const existing = store.repos.find(r => r.id === project);
  const repo: WikiRepo = {
    id:        project,
    uuid:      existing?.uuid ?? newUuid(),
    label:     project,
    color:     (existing?.color ?? repoColor(store.repos.length)) as WikiRepo['color'],
    planCount: plans.length,
    remote:    source?.remote,
  };
  const warns: ParseWarning[] = [
    ...plans.filter(p => p.parseErrors.length).map(p => ({
      repoId: project, fileName: p.fileName, errors: p.parseErrors,
    })),
    ...errors.map(e => ({ repoId: project, fileName: e.name, errors: [e.error] })),
  ];
  store.addPlans(plans, repo, warns);
  return { repoId: project, plans: plans.length, warnings: warns.length };
}
