import { File as NodeFile } from 'node:buffer';

export const TREE: Record<string, string> = {
  '.wiki/plan-one.md': '---\ntype: Plan\ntitle: One\n---\n# Goal\nx\n',
  '.wiki/sub/plan-two.md': '---\ntype: Plan\ntitle: Two\n---\n# Goal\ny\n',
  '.wiki/notes.md': '# just notes\n',
  '.wiki/node_modules/skip.md': '---\ntype: Plan\ntitle: Skip\n---\n',
};

const FileCtor = NodeFile as unknown as typeof File;

type Node = { [name: string]: Node | string };

function toTree(): Node {
  const root: Node = {};
  for (const [path, text] of Object.entries(TREE)) {
    const parts = path.split('/');
    let cur = root;
    parts.slice(0, -1).forEach(p => { cur = (cur[p] ??= {}) as Node; });
    cur[parts[parts.length - 1] ?? ''] = text;
  }
  return root;
}

export function fileList(): File[] {
  return Object.entries(TREE).map(([path, text]) => {
    const f = new FileCtor([text], path.split('/').pop()!);
    Object.defineProperty(f, 'webkitRelativePath', { value: `proj/${path}` });
    return f;
  });
}

export function dirHandle(node: Node = toTree(), name = 'proj'): FileSystemDirectoryHandle {
  return {
    name,
    kind: 'directory',
    async getDirectoryHandle(n: string) {
      const v = node[n];
      if (!v || typeof v === 'string') throw new Error('NotFoundError');
      return dirHandle(v, n);
    },
    async *values() {
      for (const [n, v] of Object.entries(node)) {
        if (typeof v === 'string') {
          yield { name: n, kind: 'file', getFile: async () => new FileCtor([v], n) };
        } else {
          yield dirHandle(v, n);
        }
      }
    },
  } as unknown as FileSystemDirectoryHandle;
}

export function dirEntry(node: Node = toTree(), name = 'proj'): FileSystemDirectoryEntry {
  const entries = Object.entries(node).map(([n, v]) =>
    typeof v === 'string'
      ? { name: n, isDirectory: false, isFile: true, file: (ok: (f: File) => void) => ok(new FileCtor([v], n)) }
      : dirEntry(v, n),
  );
  return {
    name,
    isDirectory: true,
    isFile: false,
    createReader() {
      let done = false;
      return {
        readEntries(ok: (b: unknown[]) => void) {
          const batch = done ? [] : entries;
          done = true;
          ok(batch);
        },
      };
    },
  } as unknown as FileSystemDirectoryEntry;
}

export const projectRoot = () => dirHandle();
export const wikiRoot = () => dirHandle(toTree()['.wiki'] as Node, '.wiki');
