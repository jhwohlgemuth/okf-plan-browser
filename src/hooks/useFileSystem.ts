import { useState, useCallback, useEffect, useRef } from 'react';
import { parseWikiFolder, parseWikiFileList, parseWikiEntry, parseWikiTexts, findWikiEntry, findWikiDir, isWikiFolderName, type Progress } from '@/lib/wikiParser';
import { usePlanStore } from '@/store/planStore';
import { randomProjectName } from '@/lib/names';
import { newUuid } from '@/lib/utils';
import { commitWiki, type LoadResult, type Parsed } from '@/lib/commitWiki';
import { cacheAssetFiles, getHandle, saveHandle } from '@/lib/handleStore';
import { fetchRemoteWiki, parseRemoteSpec, remoteProjectId, type RemoteWikiRef } from '@/lib/remoteWiki';
import { getGithubToken, getGitlabToken } from '@/lib/githubToken';

export type { LoadResult };
/** A wiki whose project name can't be inferred (the picked folder was `.wiki` itself). */
export interface PendingWiki {
  folderName: string;
  parse:      (project: string, report?: Progress) => Promise<Parsed>;
  cacheFiles?: boolean;
}

export interface LoadProgress { done: number; total?: number }

export interface DroppedSources {
  directoryHandles: FileSystemDirectoryHandle[];
  legacyDirectories: FileSystemDirectoryEntry[];
  files: File[];
}

interface NativeWiki {
  folderName: string;
  rootPath: string;
  files: Array<{ path: string; text: string }>;
  assets: string[];
}

export const hasNativeFolderPicker = () => typeof window !== 'undefined' && '__TAURI__' in window;

/** Capture every browser-specific drop source synchronously before the drag data store closes. */
export async function collectDroppedSources(items: DataTransferItemList): Promise<DroppedSources> {
  const pending: Array<{
    handle: Promise<FileSystemHandle | null>;
    fallbackEntry: FileSystemEntry | null;
    fallbackFile: File | null;
  }> = [];
  const legacyDirectories: FileSystemDirectoryEntry[] = [];
  const files: File[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i] as DataTransferItem & {
      getAsFileSystemHandle?: () => Promise<FileSystemHandle | null>;
    };
    if (item.kind !== 'file') continue;
    const fallbackEntry = item.webkitGetAsEntry?.() ?? null;
    const fallbackFile = item.getAsFile();
    if (item.getAsFileSystemHandle) {
      pending.push({ handle: item.getAsFileSystemHandle(), fallbackEntry, fallbackFile });
    } else if (fallbackEntry?.isDirectory) {
      legacyDirectories.push(fallbackEntry as FileSystemDirectoryEntry);
    } else if (fallbackFile) {
      files.push(fallbackFile);
    }
  }

  const directoryHandles: FileSystemDirectoryHandle[] = [];
  for (const source of pending) {
    const handle = await source.handle.catch(() => null);
    if (handle?.kind === 'directory') {
      directoryHandles.push(handle as FileSystemDirectoryHandle);
    } else if (handle?.kind === 'file') {
      const file = await (handle as FileSystemFileHandle).getFile().catch(() => source.fallbackFile);
      if (file) files.push(file);
    } else if (source.fallbackEntry?.isDirectory) {
      legacyDirectories.push(source.fallbackEntry as FileSystemDirectoryEntry);
    } else if (source.fallbackFile) {
      files.push(source.fallbackFile);
    }
  }

  return { directoryHandles, legacyDirectories, files };
}

export function useFileSystem() {
  const remoteController = useRef<AbortController | null>(null);
  useEffect(() => () => remoteController.current?.abort(), []);
  const cancelRemote = () => remoteController.current?.abort(new DOMException('Remote load cancelled', 'AbortError'));
  const repos = usePlanStore(s => s.repos);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const report = useCallback<Progress>((done, total) => setProgress({ done, total }), []);
  const [error,   setError]   = useState<string | null>(null);
  const [pending, setPending] = useState<PendingWiki[]>([]);

  useEffect(() => { if (!loading) setProgress(null); }, [loading]);
  const commit = useCallback((project: string, parsed: Parsed, source?: { remote?: RemoteWikiRef; label?: string }): LoadResult | null => {
    try {
      return commitWiki(project, parsed, source);
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }, []);

  /** Load now if the folder name identifies the project; otherwise queue a name prompt. */
  const ingest = useCallback(async (
    folderName: string,
    parse: (project: string, report?: Progress) => Promise<Parsed>,
    cacheFiles = false,
  ): Promise<LoadResult | null> => {
    if (isWikiFolderName(folderName)) {
      setPending(q => [...q, { folderName, parse, cacheFiles }]);
      return null;
    }
    const id = `local:${newUuid()}`;
    const parsed = await parse(id, report);
    const result = commit(id, parsed, { label: folderName });
    if (result && cacheFiles) await cacheAssetFiles(id, parsed.assets ?? []);
    return result;
  }, [commit, report]);

  const confirmPending = useCallback(async (project: string): Promise<LoadResult | null> => {
    const next = pending[0];
    if (!next) return null;
    // Browsers never expose a picked folder's parent, so a blank name gets a random Docker-style name.
    const taken = new Set(usePlanStore.getState().repos.map(r => r.label));
    let name = project.trim();
    if (!name) name = randomProjectName(taken);
    setPending(q => q.slice(1));
    setLoading(true);
    try {
      const id = `local:${newUuid()}`;
      const parsed = await next.parse(id, report);
      const result = commit(id, parsed, { label: name });
      if (result && next.cacheFiles) await cacheAssetFiles(id, parsed.assets ?? []);
      return result;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [pending, commit, report]);

  const cancelPending = useCallback(() => setPending(q => q.slice(1)), []);

  const ingestDir = async (dir: FileSystemDirectoryHandle): Promise<LoadResult | null> => {
    for (const repo of usePlanStore.getState().repos) {
      if (repo.remote) continue;
      const previous = await getHandle(repo.id);
      if (previous && await dir.isSameEntry(previous).catch(() => false)) {
        return commit(repo.id, await dirParser(dir)(repo.id, report), { label: repo.label });
      }
    }
    return ingest(dir.name, dirParser(dir));
  };

  const dirParser = (dir: FileSystemDirectoryHandle) => async (project: string, r?: Progress) => {
    const parsed = await parseWikiFolder(await findWikiDir(dir), project, r);
    if (parsed.plans.length) await saveHandle(project, dir);
    return parsed;
  };

  const loadRemote = useCallback(async (spec: string, refOverride?: string): Promise<LoadResult | null> => {
    const trimmed = spec.trim();
    if (!trimmed) {
      setError('Enter a GitHub owner/repo or a GitLab project URL.');
      return null;
    }
    setError(null);
    setLoading(true);
    setRemoteLoading(true);
    try {
      remoteController.current?.abort();
      const controller = new AbortController();
      remoteController.current = controller;
      const remote = parseRemoteSpec(trimmed, refOverride);
      const wiki = await fetchRemoteWiki(remote, {
        signal: controller.signal,
        githubToken: remote.forge === 'github' ? await getGithubToken() : undefined,
        gitlabToken: remote.forge === 'gitlab' ? await getGitlabToken(remote.host) : undefined,
        report,
      });
      const project = remoteProjectId(wiki.remote);
      const parsed = await parseWikiTexts(wiki.files, project, report, wiki.assets);
      controller.signal.throwIfAborted();
      return commit(project, parsed, { remote: wiki.remote, label: `${wiki.remote.host}/${wiki.remote.project} (${wiki.remote.ref})` });
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setLoading(false);
      setRemoteLoading(false);
    }
  }, [commit, report]);

  const openFolder = async (): Promise<LoadResult | null> => {
    setError(null);
    if (hasNativeFolderPicker()) {
      try {
        const { open } = await import('@tauri-apps/api/dialog');
        const path = await open({
          title: 'Open .wiki Folder',
          directory: true,
          multiple: false,
          recursive: true,
        });
        if (!path || Array.isArray(path)) return null;
        setLoading(true);
        const { invoke } = await import('@tauri-apps/api/tauri');
        const wiki = await invoke<NativeWiki>('read_wiki_folder', { path });
        return await ingest(wiki.folderName, async (project, r) => ({
          ...await parseWikiTexts(wiki.files, project, r, wiki.assets),
          nativeRoot: wiki.rootPath,
        }));
      } catch (e) {
        setError(String(e instanceof Error ? e.message : e));
        return null;
      } finally {
        setLoading(false);
      }
    }
    if (!('showDirectoryPicker' in window)) {
      setError('This browser cannot open folders directly. Use the fallback picker.');
      return null;
    }
    try {
      const handle = await (window as unknown as {
        showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>
      }).showDirectoryPicker();
      setLoading(true);
      return await ingestDir(handle);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /** <input webkitdirectory> fallback — works in any modern browser */
  const loadFileList = useCallback(async (list: FileList | null): Promise<LoadResult | null> => {
    const files = Array.from(list ?? []);
    if (!files.length) return null;
    setError(null);
    setScanning(false);
    setLoading(true);
    try {
      const rel = (files[0] as File & { webkitRelativePath?: string }).webkitRelativePath;
      return await ingest(rel?.split('/')[0] || 'wiki', (project, r) => parseWikiFileList(files, project, r), true);
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [ingest]);

  /** Accept several folders plus one grouped import of standalone Markdown files. */
  const dropItems = async (items: DataTransferItemList): Promise<LoadResult[]> => {
    setError(null);
    const { directoryHandles, legacyDirectories, files } = await collectDroppedSources(items);
    const markdownFiles = files.filter(file => file.name.toLowerCase().endsWith('.md'));
    if (!directoryHandles.length && !legacyDirectories.length && !markdownFiles.length) {
      setError('Drop Markdown files or a project/.wiki folder, or click to browse.');
      return [];
    }
    setLoading(true);
    const results: LoadResult[] = [];
    try {
      for (const entry of legacyDirectories) {
        const r = await ingest(entry.name, async (project, rep) =>
          parseWikiEntry(await findWikiEntry(entry), project, rep), true);
        if (r) results.push(r);
      }
      for (const dir of directoryHandles) {
        const r = await ingestDir(dir);
        if (r) results.push(r);
      }
      if (markdownFiles.length) {
        const r = await ingest('wiki', (project, rep) => parseWikiFileList(markdownFiles, project, rep), true);
        if (r) results.push(r);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
    return results;
  };

  return {
    openFolder, loadFileList, dropItems, loadRemote, cancelRemote,
    nativeFolderPicker: hasNativeFolderPicker(),
    pending: pending[0] ?? null, confirmPending, cancelPending,
    existingProjects: repos.map(r => r.label),
    loading, remoteLoading, error, scanning, setScanning, progress,
  };
}




