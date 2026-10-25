import { test, expect } from '@playwright/test';
import path from 'node:path';

test.use({ browserName: 'firefox' });

test('renders a local wiki image in the Firefox search viewer', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Firefox asset rendering is covered on desktop');
  await page.goto('/home');
  await page.locator('input[type=file]').setInputFiles(path.resolve('e2e/fixtures/gallery-project/.wiki'));
  const nameDialog = page.getByRole('dialog');
  await nameDialog.getByRole('textbox').fill('Gallery');
  await nameDialog.getByRole('button', { name: 'Load', exact: true }).click();
  await expect(nameDialog).toBeHidden();
  await expect(page.getByText('Loaded 1 plan', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Search' }).click();
  await page.getByRole('tab', { name: 'Images & PDFs' }).click();
  const result = page.getByRole('button', { name: /image-review\/_assets\/sample\.png/ });
  await expect.poll(() => result.locator('img').evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await result.click();
  const image = page.getByRole('dialog', { name: /sample\.png/ }).getByRole('img');
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Close asset viewer' }).click();

  await page.reload();
  await page.getByRole('tab', { name: 'Images & PDFs' }).click();
  await page.getByRole('button', { name: /image-review\/_assets\/sample\.png/ }).click();
  const restoredImage = page.getByRole('dialog', { name: /sample\.png/ }).getByRole('img');
  await expect.poll(() => restoredImage.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
});
