const DB_NAME = 'okf-plan-browser';
const STORE   = 'handles';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
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
