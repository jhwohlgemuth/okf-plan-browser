import { describe, it, expect } from 'vitest';
import {
  parseWikiFileList, parseWikiFolder, parseWikiEntry, findWikiDir, findWikiEntry, isWikiFolderName,
} from '@/lib/wikiParser';
import { fileList, projectRoot, dirEntry } from '@/test/handles';

const ids = (r: { plans: { id: string }[] }) => r.plans.map(p => p.id).sort();
const expected = ['r:plan-one.md', 'r:sub/plan-two.md'];

describe('ingest paths', () => {
  it('parseWikiFileList reads the .wiki folder of a project', async () => {
    const r = await parseWikiFileList(fileList(), 'r');
    expect(ids(r)).toEqual(expected);
    expect(r.errors).toEqual([]);
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
});
