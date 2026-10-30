const DB_NAME = 'okf-plan-browser';
const STORE   = 'handles';
const ASSETS = 'assets';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      if (!req.result.objectStoreNames.contains(ASSETS)) req.result.createObjectStore(ASSETS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(
  storeName: typeof STORE | typeof ASSETS,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      db.close();
      reject(error ?? new Error('IndexedDB transaction failed.'));
    };

    try {
      const transaction = db.transaction(storeName, mode);
      const request = fn(transaction.objectStore(storeName));
      transaction.oncomplete = () => {
        if (settled) return;
        settled = true;
        db.close();
        resolve(request.result);
      };
      transaction.onerror = () => fail(transaction.error ?? request.error);
      transaction.onabort = () => fail(transaction.error ?? request.error);
    } catch (error) {
      fail(error);
    }
  });
}

export const saveHandle = (project: string, handle: FileSystemDirectoryHandle) =>
  run(STORE, 'readwrite', s => s.put(handle, project)).catch(() => undefined);

export const getHandle = (project: string) =>
  run<FileSystemDirectoryHandle | undefined>(STORE, 'readonly', s => s.get(project)).catch(() => undefined);

export const deleteHandle = (project: string) =>
  run(STORE, 'readwrite', s => s.delete(project));

export const clearHandles = () =>
  run(STORE, 'readwrite', s => s.clear());

export async function cacheAssetFiles(project: string, assets: Array<{ path: string; file?: File }>): Promise<void> {
  const entries = assets.filter((asset): asset is { path: string; file: File } => !!asset.file);
  if (!entries.length) return;
  try {
    await run(ASSETS, 'readwrite', store => {
      let request: IDBRequest<IDBValidKey> | undefined;
      for (const asset of entries) request = store.put(asset.file, `${project}\n${asset.path}`);
      return request!;
    });
  } catch { /* Asset cache is optional when storage is unavailable. */ }
}

export const getCachedAsset = (project: string, path: string) =>
  run<File | undefined>(ASSETS, 'readonly', store => store.get(`${project}\n${path}`)).catch(() => undefined);

export async function deleteCachedAssets(project: string): Promise<void> {
  try {
    await run(ASSETS, 'readwrite', store => {
      const request = store.openCursor(IDBKeyRange.bound(`${project}\n`, `${project}\n\uffff`));
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) { cursor.delete(); cursor.continue(); }
      };
      return request;
    });
  } catch { /* Ignore storage errors during removal. */ }
}

export const clearCachedAssets = () =>
  run(ASSETS, 'readwrite', store => store.clear()).then(() => undefined).catch(() => undefined);

type Permissioned = FileSystemDirectoryHandle & {
  queryPermission?:   (d: { mode: 'read' }) => Promise<PermissionState>;
  requestPermission?: (d: { mode: 'read' }) => Promise<PermissionState>;
};

export async function ensureReadAccess(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const h = handle as Permissioned;
  if (!h.queryPermission) return true;
  if (await h.queryPermission({ mode: 'read' }) === 'granted') return true;
  return (await h.requestPermission?.({ mode: 'read' })) === 'granted';
}
