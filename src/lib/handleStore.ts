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

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const saveHandle = (project: string, handle: FileSystemDirectoryHandle) =>
  run('readwrite', s => s.put(handle, project)).catch(() => undefined);

export const getHandle = (project: string) =>
  run<FileSystemDirectoryHandle | undefined>('readonly', s => s.get(project)).catch(() => undefined);

export const deleteHandle = (project: string) =>
  run('readwrite', s => s.delete(project)).catch(() => undefined);

export const clearHandles = () =>
  run('readwrite', s => s.clear()).catch(() => undefined);

export async function cacheAssetFiles(project: string, assets: Array<{ path: string; file?: File }>): Promise<void> {
  const entries = assets.filter((asset): asset is { path: string; file: File } => !!asset.file);
  if (!entries.length) return;
  try {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(ASSETS, 'readwrite');
      const store = transaction.objectStore(ASSETS);
      for (const asset of entries) store.put(asset.file, `${project}\n${asset.path}`);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } catch { /* Asset cache is optional when storage is unavailable. */ }
}

export const getCachedAsset = (project: string, path: string) =>
  open().then(db => new Promise<File | undefined>((resolve, reject) => {
    const request = db.transaction(ASSETS, 'readonly').objectStore(ASSETS).get(`${project}\n${path}`);
    request.onsuccess = () => resolve(request.result as File | undefined);
    request.onerror = () => reject(request.error);
  })).catch(() => undefined);

export async function deleteCachedAssets(project: string): Promise<void> {
  try {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(ASSETS, 'readwrite');
      const request = transaction.objectStore(ASSETS).openCursor(IDBKeyRange.bound(`${project}\n`, `${project}\n\uffff`));
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) { cursor.delete(); cursor.continue(); }
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch { /* Ignore storage errors during removal. */ }
}

export const clearCachedAssets = () => open().then(db => new Promise<void>((resolve, reject) => {
  const transaction = db.transaction(ASSETS, 'readwrite');
  transaction.objectStore(ASSETS).clear();
  transaction.oncomplete = () => resolve();
  transaction.onerror = () => reject(transaction.error);
})).catch(() => undefined);

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
