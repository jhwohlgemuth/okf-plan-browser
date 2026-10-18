import { test, expect } from '@playwright/test';

const plan = (title: string) => `---
title: ${title}
description: d
status: planned
priority: next
---
# Goal
x
`;

test('refresh re-reads a stored folder handle', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'sidebar is a drawer on small screens');
  await page.goto('/home');
  await page.evaluate(async (md) => {
    const root = await navigator.storage.getDirectory();
    const proj = await root.getDirectoryHandle('proj', { create: true });
    const wiki = await proj.getDirectoryHandle('.wiki', { create: true });
    const w = await (await wiki.getFileHandle('a.md', { create: true })).createWritable();
    await w.write(md); await w.close();
    await new Promise<void>((res, rej) => {
      const req = indexedDB.open('okf-plan-browser', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('handles');
      req.onsuccess = () => {
        const tx = req.result.transaction('handles', 'readwrite');
        tx.objectStore('handles').put(proj, 'proj');
        tx.oncomplete = () => res();
        tx.onerror = () => rej(tx.error);
      };
    });
  }, plan('Original title'));

  await page.evaluate(() => localStorage.setItem('okf-plan-browser:wikis', JSON.stringify({
    state: { plans: [], repos: [{ id: 'proj', uuid: 'u', label: 'proj', color: '#61afef', planCount: 0 }], warnings: [] }, version: 1,
  })));
  await page.reload();

  const btn = page.getByRole('button', { name: 'Refresh proj' });
  await expect(btn).toBeEnabled();
  await page.getByRole('button', { name: 'Refresh all wikis' }).click();
  await expect(page.getByText('Refreshed 1 wiki')).toBeVisible();

  await page.evaluate(async (md) => {
    const root = await navigator.storage.getDirectory();
    const wiki = await (await root.getDirectoryHandle('proj')).getDirectoryHandle('.wiki');
    const w = await (await wiki.getFileHandle('a.md')).createWritable();
    await w.write(md); await w.close();
  }, plan('Changed title'));

  await page.goto('/search');
  await btn.click();
  await expect(page.getByText('Refreshed 1 wiki').last()).toBeVisible();
  await page.getByRole('textbox').first().fill('Changed');
  await expect(page.getByText('Changed title').first()).toBeVisible();
});
