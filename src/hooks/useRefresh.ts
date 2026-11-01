import { useCallback, useEffect, useState, useRef } from 'react';
import { usePlanStore } from '@/store/planStore';
import { parseWikiFolder, parseWikiFileList, parseWikiTexts, findWikiDir } from '@/lib/wikiParser';
import {
  beginWikiOperation, commitWikiOperation, invalidateWikiOperation,
} from '@/lib/commitWiki';
import { getHandle, ensureReadAccess, cacheAssetFiles } from '@/lib/handleStore';
import { fetchRemoteWiki, type RemoteWikiRef } from '@/lib/remoteWiki';
import { getGithubToken, getGitlabToken } from '@/lib/githubToken';
import { useToast } from '@/components/ui/use-toast';

interface RefreshOperation {
  controller: AbortController;
  generation: number;
}

type RefreshResult =
  | { status: 'ok'; id: string; plans: number }
  | { status: 'skipped' | 'failed'; id: string; reason: string }
  | { status: 'cancelled' | 'stale'; id: string };

const wasAborted = (error: unknown) => error instanceof Error && error.name === 'AbortError';

export function useRefresh() {
  const operations = useRef(new Map<string, RefreshOperation>());
  const repos = usePlanStore(s => s.repos);
  const isDemo = usePlanStore(s => s.isDemoData);
  const { toast } = useToast();
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [refreshable, setRefreshable] = useState<Set<string>>(new Set());
  const [needsReselection, setNeedsReselection] = useState<string[]>([]);

  const syncBusy = useCallback(() => setBusy(new Set(operations.current.keys())), []);
  const startOperation = useCallback((id: string): RefreshOperation => {
    operations.current.get(id)?.controller.abort(new DOMException('Refresh superseded', 'AbortError'));
    const operation = { controller: new AbortController(), generation: beginWikiOperation(id) };
    operations.current.set(id, operation);
    syncBusy();
    return operation;
  }, [syncBusy]);
  const finishOperation = useCallback((id: string, operation: RefreshOperation) => {
    if (operations.current.get(id) !== operation) return;
    operations.current.delete(id);
    syncBusy();
  }, [syncBusy]);
  const cancelRefresh = useCallback((id?: string) => {
    const targets = id ? [id] : [...operations.current.keys()];
    for (const target of targets) {
      const operation = operations.current.get(target);
      if (!operation) continue;
      operation.controller.abort(new DOMException('Refresh cancelled', 'AbortError'));
      operations.current.delete(target);
      invalidateWikiOperation(target);
    }
    syncBusy();
  }, [syncBusy]);

  useEffect(() => {
    const active = operations.current;
    const unsubscribe = usePlanStore.subscribe((state, previous) => {
      const currentIds = new Set(state.repos.map(repo => repo.id));
      let changed = false;
      for (const repo of previous.repos) {
        if (currentIds.has(repo.id)) continue;
        active.get(repo.id)?.controller.abort(new DOMException('Repository removed', 'AbortError'));
        changed = active.delete(repo.id) || changed;
        invalidateWikiOperation(repo.id);
      }
      if (changed) setBusy(new Set(active.keys()));
    });
    return () => {
      unsubscribe();
      for (const operation of active.values()) operation.controller.abort();
      active.clear();
    };
  }, []);

  const repoKey = repos.map(r => r.id).join('\n');
  useEffect(() => {
    let live = true;
    (async () => {
      const ids = new Set<string>();
      for (const r of usePlanStore.getState().repos) {
        try {
          if (r.remote || await getHandle(r.id)) ids.add(r.id);
        } catch { /* A reupload remains available when stored access cannot be checked. */ }
      }
      if (live) setRefreshable(ids);
    })();
    return () => { live = false; };
  }, [repoKey]);

  const refresh = useCallback(async (ids: string[]): Promise<RefreshResult[]> => {
    if (isDemo || !ids.length) return [];
    const uniqueIds = [...new Set(ids)];
    const results = await Promise.all(uniqueIds.map(async (id): Promise<RefreshResult> => {
      const repo = usePlanStore.getState().repos.find(candidate => candidate.id === id);
      if (!repo) return { status: 'stale', id };
      const operation = startOperation(id);
      const { signal } = operation.controller;
      try {
        if (repo.remote) {
          const remote: RemoteWikiRef = repo.remote;
          const wiki = await fetchRemoteWiki(remote, {
            signal,
            githubToken: remote.forge === 'github' ? await getGithubToken() : undefined,
            gitlabToken: remote.forge === 'gitlab' ? await getGitlabToken(remote.host) : undefined,
          });
          const parsed = await parseWikiTexts(wiki.files, id, undefined, wiki.assets);
          signal.throwIfAborted();
          const result = commitWikiOperation(id, operation.generation, parsed, {
            remote: wiki.remote, refresh: true,
          });
          return result ? { status: 'ok', id, plans: result.plans } : { status: 'stale', id };
        }
        const h = await getHandle(id);
        if (!h || !await ensureReadAccess(h)) {
          return { status: 'skipped', id, reason: `${id}: folder access is unavailable.` };
        }
        signal.throwIfAborted();
        const parsed = await parseWikiFolder(await findWikiDir(h), id);
        signal.throwIfAborted();
        const result = commitWikiOperation(id, operation.generation, parsed, { refresh: true });
        return result ? { status: 'ok', id, plans: result.plans } : { status: 'stale', id };
      } catch (error) {
        return wasAborted(error)
          ? { status: 'cancelled', id }
          : { status: 'failed', id, reason: `${id}: ${(error as Error).message}` };
      } finally {
        finishOperation(id, operation);
      }
    }));
    const reported = results.filter(result => result.status !== 'cancelled' && result.status !== 'stale');
    if (!reported.length) return results;
    const succeeded = reported.filter((result): result is Extract<RefreshResult, { status: 'ok' }> => result.status === 'ok');
    const problems = reported.filter((result): result is Extract<RefreshResult, { status: 'skipped' | 'failed' }> =>
      result.status === 'skipped' || result.status === 'failed');
    const plans = succeeded.reduce((total, result) => total + result.plans, 0);
    toast({
      title: succeeded.length
        ? `Refreshed ${succeeded.length} wiki${succeeded.length !== 1 ? 's' : ''} (${plans} plans)`
        : 'Nothing refreshed',
      description: problems.length
        ? problems.map(problem => problem.reason).join(' ')
        : undefined,
    });
    return results;
  }, [finishOperation, isDemo, startOperation, toast]);

  const pickFolderFiles = () => new Promise<File[] | null>(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.className = 'sr-only';
    input.tabIndex = -1;
    input.setAttribute('webkitdirectory', '');
    const finish = (files: File[] | null) => { input.remove(); resolve(files); };
    input.onchange = () => finish(input.files?.length ? Array.from(input.files) : null);
    input.oncancel = () => finish(null);
    document.body.append(input);
    input.click();
  });

  const reupload = useCallback(async (id: string) => {
    const files = await pickFolderFiles();
    if (!files) return;
    const operation = startOperation(id);
    try {
      const parsed = await parseWikiFileList(files, id);
      operation.controller.signal.throwIfAborted();
      await cacheAssetFiles(id, parsed.assets ?? []);
      operation.controller.signal.throwIfAborted();
      const result = commitWikiOperation(id, operation.generation, parsed, { refresh: true });
      if (!result) return;
      setNeedsReselection(current => current.filter(candidate => candidate !== id));
      const label = usePlanStore.getState().repos.find(repo => repo.id === id)?.label ?? id;
      toast({ title: `Refreshed ${label}`, description: `${result.plans} plans` });
    } catch (e) {
      if (wasAborted(e)) return;
      const label = usePlanStore.getState().repos.find(repo => repo.id === id)?.label ?? id;
      toast({ title: `Could not refresh ${label}`, description: (e as Error).message });
    } finally {
      finishOperation(id, operation);
    }
  }, [finishOperation, startOperation, toast]);

  const refreshAll = useCallback(async () => {
    const candidates = usePlanStore.getState().repos.filter(repo => !operations.current.has(repo.id));
    const sources = await Promise.all(candidates.map(async repo => ({
      id: repo.id,
      automatic: !!repo.remote || !!await getHandle(repo.id),
    })));
    const automatic = sources.filter(source => source.automatic).map(source => source.id);
    const manual = sources.filter(source => !source.automatic).map(source => source.id);
    setNeedsReselection(manual);
    if (manual.length) toast({
      title: `Folder access needed for ${manual.length} wiki${manual.length !== 1 ? 's' : ''}`,
      description: 'Choose each folder in the sidebar to finish refreshing.',
    });
    const results = await refresh(automatic);
    const unavailable = results.filter(result => result.status === 'skipped').map(result => result.id);
    if (unavailable.length) setNeedsReselection(current => [...new Set([...current, ...unavailable])]);
  }, [refresh, toast]);

  const refreshOne = async (id: string) => {
    if (!refreshable.has(id)) return reupload(id);
    const results = await refresh([id]);
    if (results.some(result => result.status === 'skipped')) {
      setNeedsReselection(current => [...new Set([...current, id])]);
    }
  };

  return {
    busy, refreshable,
    needsReselection: needsReselection.filter(id => repos.some(repo => repo.id === id)),
    cancelRefresh,
    refreshOne,
    refreshAll,
    reselectFolder: reupload,
    dismissReselection: () => setNeedsReselection([]),
  };
}
