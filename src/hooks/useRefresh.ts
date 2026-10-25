import { useCallback, useEffect, useState, useRef } from 'react';
import { usePlanStore } from '@/store/planStore';
import { parseWikiFolder, parseWikiFileList, parseWikiTexts, findWikiDir } from '@/lib/wikiParser';
import { commitWiki } from '@/lib/commitWiki';
import { getHandle, ensureReadAccess, cacheAssetFiles } from '@/lib/handleStore';
import { fetchRemoteWiki, type RemoteWikiRef } from '@/lib/remoteWiki';
import { getGithubToken, getGitlabToken } from '@/lib/githubToken';
import { useToast } from '@/components/ui/use-toast';

export function useRefresh() {
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const repos = usePlanStore(s => s.repos);
  const isDemo = usePlanStore(s => s.isDemoData);
  const { toast } = useToast();
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [refreshable, setRefreshable] = useState<Set<string>>(new Set());

  const repoKey = repos.map(r => r.id).join('\n');
  useEffect(() => {
    let live = true;
    (async () => {
      const ids = new Set<string>();
      for (const r of usePlanStore.getState().repos) {
        if (r.remote || await getHandle(r.id)) ids.add(r.id);
      }
      if (live) setRefreshable(ids);
    })();
    return () => { live = false; };
  }, [repoKey]);

  const refresh = useCallback(async (ids: string[]) => {
    if (isDemo || !ids.length) return;
    controller.current?.abort();
    const operation = new AbortController();
    controller.current = operation;
    const handles = new Map<string, FileSystemDirectoryHandle>();
    const remotes = new Map<string, RemoteWikiRef>();
    const skipped: string[] = [];
    for (const id of ids) {
      const repo = usePlanStore.getState().repos.find(r => r.id === id);
      if (repo?.remote) {
        remotes.set(id, repo.remote);
        continue;
      }
      try {
        const h = await getHandle(id);
        if (h && await ensureReadAccess(h)) handles.set(id, h); else skipped.push(id);
      } catch { skipped.push(id); }
    }
    if (operation.signal.aborted) return;
    setBusy(new Set([...handles.keys(), ...remotes.keys()]));
    let plans = 0;
    const failed: string[] = [];
    const reasons: string[] = [];
    for (const [id, remote] of remotes) {
      try {
        const wiki = await fetchRemoteWiki(remote, {
          signal: operation.signal,
          githubToken: remote.forge === 'github' ? await getGithubToken() : undefined,
          gitlabToken: remote.forge === 'gitlab' ? await getGitlabToken(remote.host) : undefined,
        });
        const parsed = await parseWikiTexts(wiki.files, id, undefined, wiki.assets);
        operation.signal.throwIfAborted();
        plans += commitWiki(id, parsed, { remote: wiki.remote, refresh: true }).plans;
      } catch (error) {
        failed.push(id);
        reasons.push(`${id}: ${(error as Error).message}`);
      }
    }
    for (const [id, handle] of handles) {
      try {
        operation.signal.throwIfAborted();
        const parsed = await parseWikiFolder(await findWikiDir(handle), id);
        operation.signal.throwIfAborted();
        plans += commitWiki(id, parsed, { refresh: true }).plans;
      } catch (error) {
        failed.push(id);
        reasons.push(`${id}: ${(error as Error).message}`);
      }
    }
    if (controller.current !== operation) return;
    setBusy(new Set());
    const ok = handles.size + remotes.size - failed.length;
    const problems = [...skipped, ...failed];
    toast({
      title: ok ? `Refreshed ${ok} wiki${ok !== 1 ? 's' : ''} (${plans} plans)` : 'Nothing refreshed',
      description: problems.length
        ? [`Skipped ${problems.join(', ')}.`, ...reasons].join(' ')
        : undefined,
    });
  }, [isDemo, toast]);

  const pickFolderFiles = () => new Promise<File[] | null>(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.setAttribute('webkitdirectory', '');
    input.onchange = () => resolve(input.files?.length ? Array.from(input.files) : null);
    input.oncancel = () => resolve(null);
    input.click();
  });

  const reupload = useCallback(async (id: string) => {
    const files = await pickFolderFiles();
    if (!files) return;
    setBusy(new Set([id]));
    try {
      const parsed = await parseWikiFileList(files, id);
      const result = commitWiki(id, parsed, { refresh: true });
      await cacheAssetFiles(id, parsed.assets ?? []);
      toast({ title: `Refreshed ${id}`, description: `${result.plans} plans` });
    } catch (e) {
      toast({ title: `Could not refresh ${id}`, description: (e as Error).message });
    } finally {
      setBusy(new Set());
    }
  }, [toast]);

  return {
    busy, refreshable,
    cancelRefresh: () => controller.current?.abort(new DOMException('Refresh cancelled', 'AbortError')),
    refreshOne: (id: string) => (refreshable.has(id) ? refresh([id]) : reupload(id)),
    refreshAll: () => refresh(usePlanStore.getState().repos.map(r => r.id)),
  };
}
