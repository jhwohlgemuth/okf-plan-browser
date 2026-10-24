import { test, expect } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

test('planning download contains every authored skill file with current content', async ({ page }) => {
  await page.goto('/home');
  await page.getByRole('link', { name: /Official home of the planning skill/ }).click();
  await expect(page.getByRole('heading', { name: 'Planning Skill', exact: true })).toBeVisible();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download skill folder' }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('planning-skill.zip');
  const zip = await readFile((await download.path())!);
  const files = new Map<string, string>();
  let offset = 0;
  while (zip.readUInt32LE(offset) === 0x04034b50) {
    expect(zip.readUInt16LE(offset + 8)).toBe(0);
    const size = zip.readUInt32LE(offset + 18);
    const nameLength = zip.readUInt16LE(offset + 26);
    const extraLength = zip.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const contentStart = nameStart + nameLength + extraLength;
    files.set(zip.toString('utf8', nameStart, nameStart + nameLength), zip.toString('utf8', contentStart, contentStart + size));
    offset = contentStart + size;
  }
  expect(zip.readUInt32LE(offset)).toBe(0x02014b50);
  const root = '.agents/skills/planning';
  const authored = (await readdir(root, { recursive: true }))
    .filter(file => /\.(md|yaml|py)$/.test(file))
    .map(file => `${root}/${file.replaceAll('\\', '/')}`);
  expect([...files.keys()].sort()).toEqual(authored.sort());
  for (const file of authored) {
    const source = await readFile(path.resolve(file), 'utf8');
    expect(files.get(file)?.replaceAll('\r\n', '\n')).toBe(source.replaceAll('\r\n', '\n'));
  }
});
