import { test, expect, type Page } from '@playwright/test';

const plan = (title: string) => `---
title: ${title}
description: d
status: planned
priority: next
---
# Goal
x
`;

async function seedStoredRepos(page: Page, repos: Array<{ id: string; label: string }>) {
  await page.evaluate(async seededRepos => {
    const root = await navigator.storage.getDirectory();
    const handles = new Map<string, FileSystemDirectoryHandle>();
    for (const repo of seededRepos) {
      handles.set(repo.id, await root.getDirectoryHandle(repo.id, { create: true }));
    }
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('okf-plan-browser', 2);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('handles')) request.result.createObjectStore('handles');
        if (!request.result.objectStoreNames.contains('assets')) request.result.createObjectStore('assets');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('handles', 'readwrite');
      const store = transaction.objectStore('handles');
      for (const [id, handle] of handles) store.put(handle, id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    db.close();
    localStorage.setItem('okf-plan-browser:wikis', JSON.stringify({
      state: {
        plans: [],
        repos: seededRepos.map((repo, index) => ({
          ...repo,
          uuid: `uuid-${index}`,
          color: index % 2 ? '#98c379' : '#61afef',
          planCount: 0,
        })),
        warnings: [],
      },
      version: 1,
    }));
  }, repos);
}

async function storedHandleKeys(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('okf-plan-browser', 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const transaction = db.transaction('handles', 'readonly');
      const request = transaction.objectStore('handles').getAllKeys();
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    db.close();
    return keys.map(String).sort();
  });
}

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
        const db = req.result;
        const tx = db.transaction('handles', 'readwrite');
        tx.objectStore('handles').put(proj, 'proj');
        tx.oncomplete = () => { db.close(); res(); };
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
  await expect(page.getByRole('region', { name: 'Notifications (F8)' }).getByText('Refreshed 1 wiki')).toBeVisible();

  await page.evaluate(async (md) => {
    const root = await navigator.storage.getDirectory();
    const wiki = await (await root.getDirectoryHandle('proj')).getDirectoryHandle('.wiki');
    const w = await (await wiki.getFileHandle('a.md')).createWritable();
    await w.write(md); await w.close();
  }, plan('Changed title'));

  await page.goto('/search');
  await btn.click();
  await expect(page.getByRole('region', { name: 'Notifications (F8)' }).getByText('Refreshed 1 wiki').last()).toBeVisible();
  await page.getByRole('textbox').first().fill('Changed');
  await expect(page.getByText('Changed title').first()).toBeVisible();
});

test('repository and bulk removal actions forget stored folder handles', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'storage behavior only needs one browser viewport');
  await page.goto('/home');
  await seedStoredRepos(page, [{ id: 'one', label: 'one' }, { id: 'two', label: 'two' }]);
  await page.reload();

  await page.evaluate(() => {
    const tracked = window as typeof window & { __handleCloseCount?: number };
    tracked.__handleCloseCount = 0;
    const close = IDBDatabase.prototype.close;
    IDBDatabase.prototype.close = function () {
      tracked.__handleCloseCount = (tracked.__handleCloseCount ?? 0) + 1;
      return close.call(this);
    };
  });

  await page.getByTitle('Remove repo').first().click();
  await expect(page.getByRole('region', { name: 'Notifications (F8)' }).getByText('Removed one')).toBeVisible();
  expect(await page.evaluate(() => (window as typeof window & { __handleCloseCount?: number }).__handleCloseCount)).toBeGreaterThan(0);
  expect(await storedHandleKeys(page)).toEqual(['two']);

  await page.getByRole('button', { name: 'Clear all data' }).click();
  await expect(page.getByRole('region', { name: 'Notifications (F8)' }).getByText('Cleared all plans')).toBeVisible();
  expect(await storedHandleKeys(page)).toEqual([]);

  await seedStoredRepos(page, [{ id: 'saved', label: 'saved' }]);
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Clear saved data' }).click();
  await expect(page.getByRole('region', { name: 'Notifications (F8)' })
    .getByText('Cleared saved wikis and forgot all credentials')).toBeVisible();
  expect(await storedHandleKeys(page)).toEqual([]);
});

test('repository removal warns when handle cleanup fails', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'storage behavior only needs one browser viewport');
  await page.goto('/home');
  await seedStoredRepos(page, [{ id: 'blocked', label: 'blocked' }]);
  await page.reload();
  await page.evaluate(() => {
    Object.defineProperty(indexedDB, 'open', {
      configurable: true,
      value: () => { throw new Error('IndexedDB cleanup blocked'); },
    });
  });

  await page.getByTitle('Remove repo').click();

  await expect(page.getByTitle('Remove repo')).not.toBeVisible();
  const notifications = page.getByRole('region', { name: 'Notifications (F8)' });
  await expect(notifications.getByText('Removed blocked, but folder access may remain')).toBeVisible();
  await expect(notifications.getByText('IndexedDB cleanup blocked')).toBeVisible();
});
