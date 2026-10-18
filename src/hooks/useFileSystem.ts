import { useState, useCallback, useEffect } from 'react';
import { parseWikiFolder, parseWikiFileList, parseWikiEntry, findWikiEntry, findWikiDir, isWikiFolderName, type Progress } from '@/lib/wikiParser';
import { usePlanStore } from '@/store/planStore';
import { randomProjectName } from '@/lib/names';
import { commitWiki, type LoadResult, type Parsed } from '@/lib/commitWiki';
import { saveHandle } from '@/lib/handleStore';

export type { LoadResult };
/** A wiki whose project name can't be inferred (the picked folder was `.wiki` itself). */
export interface PendingWiki {
  folderName: string;
  parse:      (project: string, report?: Progress) => Promise<Parsed>;
}

export interface LoadProgress { done: number; total?: number }

export function useFileSystem() {
  const repos = usePlanStore(s => s.repos);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const report = useCallback<Progress>((done, total) => setProgress({ done, total }), []);
  const [error,   setError]   = useState<string | null>(null);
  const [pending, setPending] = useState<PendingWiki[]>([]);

  useEffect(() => { if (!loading) setProgress(null); }, [loading]);
  const commit = useCallback((project: string, parsed: Parsed): LoadResult | null => {
    try {
      return commitWiki(project, parsed);
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }, []);

  /** Load now if the folder name identifies the project; otherwise queue a name prompt. */
  const ingest = useCallback(async (
    folderName: string,
    parse: (project: string, report?: Progress) => Promise<Parsed>,
  ): Promise<LoadResult | null> => {
    if (isWikiFolderName(folderName)) {
      setPending(q => [...q, { folderName, parse }]);
      return null;
    }
    return commit(folderName, await parse(folderName, report));
  }, [commit, report]);

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
      return commit(name, await next.parse(name, report));
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [pending, commit, report]);

  const cancelPending = useCallback(() => setPending(q => q.slice(1)), []);

  const dirParser = (dir: FileSystemDirectoryHandle) => async (project: string, r?: Progress) => {
    const parsed = await parseWikiFolder(await findWikiDir(dir), project, r);
    if (parsed.plans.length) await saveHandle(project, dir);
    return parsed;
  };

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
    setScanning(false);
    setLoading(true);
    try {
      const rel = (files[0] as File & { webkitRelativePath?: string }).webkitRelativePath;
      return await ingest(rel?.split('/')[0] || 'wiki', (project, r) => parseWikiFileList(files, project, r));
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
    const entries: FileSystemDirectoryEntry[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i] as DataTransferItem & {
        getAsFileSystemHandle?: () => Promise<FileSystemHandle | null>;
      };
      if (item.kind !== 'file') continue;
      if (item.getAsFileSystemHandle) {
        pendingHandles.push(item.getAsFileSystemHandle());
      } else {
        const entry = item.webkitGetAsEntry?.();
        if (entry?.isDirectory) entries.push(entry as FileSystemDirectoryEntry);
      }
    }
    if (!pendingHandles.length && !entries.length) {
      setError('Dropping folders is not supported here. Click to browse instead.');
      return [];
    }
    setLoading(true);
    const results: LoadResult[] = [];
    try {
      for (const entry of entries) {
        const r = await ingest(entry.name, async (project, rep) =>
          parseWikiEntry(await findWikiEntry(entry), project, rep));
        if (r) results.push(r);
      }
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
    loading, error, scanning, setScanning, progress,
  };
}




