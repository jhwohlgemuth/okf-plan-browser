import { useCallback, useEffect, useState } from 'react';
import { usePlanStore } from '@/store/planStore';
import { parseWikiFolder, parseWikiFileList, findWikiDir } from '@/lib/wikiParser';
import { commitWiki } from '@/lib/commitWiki';
import { getHandle, ensureReadAccess } from '@/lib/handleStore';
import { useToast } from '@/components/ui/use-toast';

export function useRefresh() {
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
      for (const r of usePlanStore.getState().repos) if (await getHandle(r.id)) ids.add(r.id);
      if (live) setRefreshable(ids);
    })();
    return () => { live = false; };
  }, [repoKey]);

  const refresh = useCallback(async (ids: string[]) => {
    if (isDemo || !ids.length) return;
    const handles = new Map<string, FileSystemDirectoryHandle>();
    const skipped: string[] = [];
    for (const id of ids) {
      const h = await getHandle(id);
      if (h && await ensureReadAccess(h)) handles.set(id, h); else skipped.push(id);
    }
    setBusy(new Set(handles.keys()));
    let plans = 0;
    const failed: string[] = [];
    for (const [id, handle] of handles) {
      try {
        plans += commitWiki(id, await parseWikiFolder(await findWikiDir(handle), id)).plans;
      } catch {
        failed.push(id);
      }
    }
    setBusy(new Set());
    const ok = handles.size - failed.length;
    const problems = [...skipped, ...failed];
    toast({
      title: ok ? `Refreshed ${ok} wiki${ok !== 1 ? 's' : ''} (${plans} plans)` : 'Nothing refreshed',
      description: problems.length
        ? `Skipped ${problems.join(', ')}. Use ${problems.length > 1 ? 'their' : 'its'} refresh button to re-select the folder.`
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
      const result = commitWiki(id, await parseWikiFileList(files, id));
      toast({ title: `Refreshed ${id}`, description: `${result.plans} plans` });
    } catch (e) {
      toast({ title: `Could not refresh ${id}`, description: (e as Error).message });
    } finally {
      setBusy(new Set());
    }
  }, [toast]);

  return {
    busy, refreshable,
    refreshOne: (id: string) => (refreshable.has(id) ? refresh([id]) : reupload(id)),
    refreshAll: () => refresh(usePlanStore.getState().repos.map(r => r.id)),
  };
}
