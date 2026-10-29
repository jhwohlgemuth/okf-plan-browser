import { test, expect } from '@playwright/test';

test('sidebar collapses to an icon rail and persists', async ({ page }, info) => {
  test.skip(info.project.name === 'phone', 'sidebar is a drawer on small screens');
  await page.goto('/home');
  const aside = page.getByRole('complementary', { name: 'Primary navigation' });
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

test('mobile navigation traps focus, closes, and restores the trigger', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'modal navigation is only used on small screens');
  await page.goto('/home');

  const trigger = page.getByRole('button', { name: 'Open navigation' });
  const desktopHome = page.locator('aside[aria-label="Primary navigation"]').first().getByRole('link', { name: 'Home' });
  await expect(desktopHome).toBeHidden();
  await trigger.focus();
  await page.keyboard.press('Enter');

  const dialog = page.getByRole('dialog', { name: 'Navigation' });
  const home = dialog.getByRole('link', { name: 'Home' });
  const close = dialog.getByRole('button', { name: 'Close navigation' });
  await expect(dialog).toBeVisible();
  await expect(home).toBeFocused();

  await page.keyboard.press('Shift+Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(home).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(desktopHome).toBeHidden();

  await page.keyboard.press('Enter');
  await dialog.getByRole('link', { name: 'Portfolio' }).press('Enter');
  await expect(page).toHaveURL(/\/portfolio$/);
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
