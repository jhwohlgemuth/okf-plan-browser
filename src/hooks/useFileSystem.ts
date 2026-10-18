import { useState, useCallback } from 'react';
import { parseWikiFolder, parseWikiFileList, findWikiDir, isWikiFolderName } from '@/lib/wikiParser';
import { usePlanStore } from '@/store/planStore';
import { repoColor, newUuid } from '@/lib/utils';
import { randomProjectName } from '@/lib/names';
import type { WikiRepo, ParseWarning, ParsedPlan } from '@/types/wiki';

export interface LoadResult {
  repoId:   string;
  plans:    number;
  warnings: number;
}

type Parsed = { plans: ParsedPlan[]; errors: Array<{ name: string; error: string }> };

/** A wiki whose project name can't be inferred (the picked folder was `.wiki` itself). */
export interface PendingWiki {
  folderName: string;
  parse:      (project: string) => Promise<Parsed>;
}

export function useFileSystem() {
  const { addPlans, repos } = usePlanStore();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [pending, setPending] = useState<PendingWiki[]>([]);

  const commit = useCallback((project: string, { plans, errors }: Parsed): LoadResult | null => {
    if (plans.length === 0) {
      setError(`No plans found in "${project}". Pick the project folder, or its .wiki folder.`);
      return null;
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
    };
    const warns: ParseWarning[] = [
      ...plans.filter(p => p.parseErrors.length).map(p => ({
        repoId: project, fileName: p.fileName, errors: p.parseErrors,
      })),
      ...errors.map(e => ({ repoId: project, fileName: e.name, errors: [e.error] })),
    ];
    addPlans(plans, repo, warns);
    return { repoId: project, plans: plans.length, warnings: warns.length };
  }, [addPlans]);

  /** Load now if the folder name identifies the project; otherwise queue a name prompt. */
  const ingest = useCallback(async (
    folderName: string,
    parse: (project: string) => Promise<Parsed>,
  ): Promise<LoadResult | null> => {
    if (isWikiFolderName(folderName)) {
      setPending(q => [...q, { folderName, parse }]);
      return null;
    }
    return commit(folderName, await parse(folderName));
  }, [commit]);

  const confirmPending = useCallback(async (project: string): Promise<LoadResult | null> => {
    const next = pending[0];
    if (!next) return null;
    // Browsers never expose a picked folder's parent, so a blank name gets a random Docker-style name.
    const taken = new Set(usePlanStore.getState().repos.map(r => r.id));
    let name = project.trim();
    if (!name) name = randomProjectName(taken);
    setPending(q => q.slice(1));
    setLoading(true);
    try {
      return commit(name, await next.parse(name));
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [pending, commit]);

  const cancelPending = useCallback(() => setPending(q => q.slice(1)), []);

  const dirParser = (dir: FileSystemDirectoryHandle) => async (project: string) =>
    parseWikiFolder(await findWikiDir(dir), project);

  const openFolder = useCallback(async (): Promise<LoadResult | null> => {
    setError(null);
    if (!('showDirectoryPicker' in window)) {
      setError('This browser cannot open folders directly. Use the fallback picker.');
      return null;
    }
    try {
      const handle = await (window as unknown as {
        showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>
      }).showDirectoryPicker();
      setLoading(true);
      return await ingest(handle.name, dirParser(handle));
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [ingest]);

  /** <input webkitdirectory> fallback — works in any modern browser */
  const loadFileList = useCallback(async (list: FileList | null): Promise<LoadResult | null> => {
    const files = Array.from(list ?? []);
    if (!files.length) return null;
    setError(null);
    setLoading(true);
    try {
      const rel = (files[0] as File & { webkitRelativePath?: string }).webkitRelativePath;
      return await ingest(rel?.split('/')[0] || 'wiki', project => parseWikiFileList(files, project));
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [ingest]);

  /** Drag-and-drop — handles must be grabbed synchronously, before any await. Accepts several folders. */
  const dropFolder = useCallback(async (items: DataTransferItemList): Promise<LoadResult[]> => {
    setError(null);
    const pendingHandles: Promise<FileSystemHandle | null>[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i] as DataTransferItem & {
        getAsFileSystemHandle?: () => Promise<FileSystemHandle | null>;
      };
      if (item.kind === 'file' && item.getAsFileSystemHandle) pendingHandles.push(item.getAsFileSystemHandle());
    }
    if (!pendingHandles.length) {
      setError('Dropping folders is not supported here. Click to browse instead.');
      return [];
    }
    setLoading(true);
    const results: LoadResult[] = [];
    try {
      const dirs = (await Promise.all(pendingHandles))
        .filter((h): h is FileSystemDirectoryHandle => !!h && h.kind === 'directory');
      if (!dirs.length) setError('Please drop a folder, not a file.');
      for (const dir of dirs) {
        const r = await ingest(dir.name, dirParser(dir));
        if (r) results.push(r);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
    return results;
  }, [ingest]);

  return {
    openFolder, loadFileList, dropFolder,
    pending: pending[0] ?? null, confirmPending, cancelPending,
    existingProjects: repos.map(r => r.id),
    loading, error,
  };
}




