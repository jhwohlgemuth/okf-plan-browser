import { describe, it, expect, vi } from 'vitest';
import { File as NodeFile } from 'node:buffer';
import { readFileSync } from 'node:fs';
import {
  parseWikiFileList, parseWikiFolder, parseWikiEntry, parseWikiTexts, findWikiDir, findWikiEntry, isWikiFolderName,
} from '@/lib/wikiParser';
import { collectDroppedSources } from '@/hooks/useFileSystem';
import { fileList, projectRoot, dirEntry } from '@/test/handles';

const ids = (r: { plans: { id: string }[] }) => r.plans.map(p => p.id).sort();
const expected = ['r:plan-one.md', 'r:sub/plan-two.md'];

describe('ingest paths', () => {
  it('parseWikiFileList reads the .wiki folder of a project', async () => {
    const r = await parseWikiFileList(fileList(), 'r');
    expect(ids(r)).toEqual(expected);
    expect(r.errors).toEqual([]);
  });

  it('parseWikiFileList reads a flat multi-file selection without relative paths', async () => {
    const FileCtor = NodeFile as unknown as typeof File;
    const files = [
      new FileCtor(['---\ntype: Plan\ntitle: One\n---\n# Goal\nx\n'], 'plan-one.md'),
      new FileCtor(['---\ntype: Plan\ntitle: Two\n---\n# Goal\ny\n'], 'plan-two.md'),
      new FileCtor(['# just notes\n'], 'notes.md'),
    ];

    const r = await parseWikiFileList(files, 'r');

    expect(ids(r)).toEqual(['r:plan-one.md', 'r:plan-two.md']);
    expect(r.errors).toEqual([]);
  });

  it('captures modern file and directory handles before awaiting them', async () => {
    const FileCtor = NodeFile as unknown as typeof File;
    const file = new FileCtor(['---\ntitle: Dropped\n---\n'], 'dropped.md');
    const fileHandle = { kind: 'file', name: file.name, getFile: vi.fn().mockResolvedValue(file) } as unknown as FileSystemFileHandle;
    const directoryHandle = { kind: 'directory', name: 'project' } as FileSystemDirectoryHandle;
    const getFileHandle = vi.fn(() => Promise.resolve(fileHandle));
    const getDirectoryHandle = vi.fn(() => Promise.resolve(directoryHandle));
    const items = {
      0: { kind: 'file', getAsFile: () => file, getAsFileSystemHandle: getFileHandle },
      1: { kind: 'file', getAsFile: () => null, getAsFileSystemHandle: getDirectoryHandle },
      length: 2,
    } as unknown as DataTransferItemList;

    const pending = collectDroppedSources(items);

    expect(getFileHandle).toHaveBeenCalledOnce();
    expect(getDirectoryHandle).toHaveBeenCalledOnce();
    const sources = await pending;
    expect(sources.files).toEqual([file]);
    expect(sources.directoryHandles).toEqual([directoryHandle]);
    expect(sources.legacyDirectories).toEqual([]);
  });

  it('collects legacy directory entries and standalone files', async () => {
    const FileCtor = NodeFile as unknown as typeof File;
    const file = new FileCtor(['---\ntitle: Legacy\n---\n'], 'legacy.md');
    const directory = { name: 'legacy-project', isDirectory: true, isFile: false } as FileSystemDirectoryEntry;
    const items = {
      0: { kind: 'file', getAsFile: () => null, webkitGetAsEntry: () => directory },
      1: { kind: 'file', getAsFile: () => file, webkitGetAsEntry: () => null },
      length: 2,
    } as unknown as DataTransferItemList;

    const sources = await collectDroppedSources(items);

    expect(sources.legacyDirectories).toEqual([directory]);
    expect(sources.files).toEqual([file]);
    expect(sources.directoryHandles).toEqual([]);
  });

  it('parseWikiFolder reads via directory handles', async () => {
    const wiki = await findWikiDir(projectRoot());
    expect(wiki.name).toBe('.wiki');
    const r = await parseWikiFolder(wiki, 'r');
    expect(ids(r)).toEqual(expected);
  });

  it('parseWikiEntry reads via directory entries', async () => {
    const wiki = await findWikiEntry(dirEntry());
    expect(wiki.name).toBe('.wiki');
    const r = await parseWikiEntry(wiki, 'r');
    expect(ids(r)).toEqual(expected);
  });

  it('all three paths agree and reject notes.md', async () => {
    const a = await parseWikiFileList(fileList(), 'r');
    const b = await parseWikiFolder(await findWikiDir(projectRoot()), 'r');
    const c = await parseWikiEntry(await findWikiEntry(dirEntry()), 'r');
    expect(ids(a)).toEqual(ids(b));
    expect(ids(b)).toEqual(ids(c));
    expect(ids(a).some(i => i.includes('notes'))).toBe(false);
    expect(ids(a).some(i => i.includes('node_modules'))).toBe(false);
  });

  it('reports progress', async () => {
    const seen: number[] = [];
    await parseWikiFileList(fileList(), 'r', done => seen.push(done));
    expect(seen.at(-1)).toBe(3);
  });

  it('recognises wiki folder names', () => {
    expect(isWikiFolderName('.wiki')).toBe(true);
    expect(isWikiFolderName('Wiki')).toBe(true);
    expect(isWikiFolderName('proj')).toBe(false);
  });

  it('parseWikiTexts agrees with the file-list path', async () => {
    const fromList = await parseWikiFileList(fileList(), 'r');
    const fromTexts = await parseWikiTexts([
      { path: 'plan-one.md', text: '---\ntype: Plan\ntitle: One\n---\n# Goal\nx\n' },
      { path: 'sub/plan-two.md', text: '---\ntype: Plan\ntitle: Two\n---\n# Goal\ny\n' },
      { path: 'notes.md', text: '# just notes\n' },
    ], 'r');
    expect(ids(fromTexts)).toEqual(ids(fromList));
  });

  it('imports a folder plan, sibling Markdown, and real image and PDF fixtures', async () => {
    const paths = [
      'index.md', 'image-review/index.md', 'image-review/notes.md',
      '_assets/overview.svg', 'image-review/_assets/sample.svg',
      'image-review/_assets/sample.png', 'image-review/_assets/sample.webp',
      'image-review/_assets/sample.jpg', 'image-review/_assets/sample.pdf',
    ];
    const FileCtor = NodeFile as unknown as typeof File;
    const files = paths.map(path => {
      const bytes = readFileSync(new URL(`../../e2e/fixtures/gallery-project/.wiki/${path}`, import.meta.url));
      const file = new FileCtor([bytes], path.split('/').at(-1)!);
      Object.defineProperty(file, 'webkitRelativePath', { value: `gallery-project/.wiki/${path}` });
      return file;
    });
    const result = await parseWikiFileList(files, 'gallery');
    expect(ids(result)).toEqual(['gallery:image-review/index.md']);
    expect(result.plans[0]?.documents?.map(doc => doc.fileName)).toEqual(['image-review/notes.md']);
    expect(result.assets?.map(asset => asset.path).sort()).toEqual(paths.filter(path => !path.endsWith('.md')).sort());
    expect(result.assets?.every(asset => (asset.file?.size ?? 0) > 0)).toBe(true);
  });
});
