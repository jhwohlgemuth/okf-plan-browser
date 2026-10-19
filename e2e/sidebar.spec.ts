import { test, expect } from '@playwright/test';

test('sidebar collapses to an icon rail and persists', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'sidebar is a drawer on small screens');
  await page.goto('/home');
  const aside = page.locator('aside');
  const width = async () => (await aside.boundingBox())!.width;
  expect(await width()).toBeGreaterThan(200);

  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await expect.poll(width).toBeLessThan(80);
  await expect(page.getByRole('link', { name: 'Portfolio' })).toBeVisible();

  await page.reload();
  await expect.poll(width).toBeLessThan(80);

  await page.getByRole('button', { name: 'Expand sidebar' }).click();
  await expect.poll(width).toBeGreaterThan(200);
});
