import { test, expect } from '@playwright/test';
import path from 'node:path';

test('folder plan and wiki gallery render images, PDFs, and Pikchr diagrams', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'gallery interactions are covered on desktop');
  await page.goto('/home');
  await page.locator('input[type=file]').setInputFiles(path.resolve('e2e/fixtures/gallery-project/.wiki'));
  const nameDialog = page.getByRole('dialog');
  await expect(nameDialog).toBeVisible();
  await nameDialog.getByRole('textbox').fill('Gallery');
  await nameDialog.getByRole('button', { name: 'Load', exact: true }).click();
  await expect(nameDialog).toBeHidden();

  await page.goto('/search');
  await page.getByRole('tab', { name: 'Assets' }).click();
  await expect(page.getByRole('button', { name: /image-review\/_assets\/sample\.png/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /_assets\/overview\.svg/ })).toBeVisible();
  await page.getByRole('button', { name: /image-review\/_assets\/sample\.png/ }).click();
  await expect(page.getByRole('dialog', { name: /sample\.png/ }).getByRole('img')).toBeVisible();
  await page.getByRole('button', { name: 'Close asset viewer' }).click();
  await page.getByRole('button', { name: /image-review\/_assets\/sample\.pdf/ }).click();
  await expect(page.getByRole('dialog', { name: /sample\.pdf/ }).locator('iframe')).toBeVisible();
  await page.getByRole('button', { name: 'Close asset viewer' }).click();
  const pikchrResult = page.getByRole('button', { name: /image-review\/_assets\/sample\.pikchr/ });
  await expect(pikchrResult.locator('[data-pikchr-diagram]')).toBeVisible();
  await pikchrResult.click();
  await expect(page.getByRole('dialog', { name: /sample\.pikchr/ }).locator('[data-pikchr-diagram]')).toBeVisible();
  await page.getByRole('button', { name: 'Close asset viewer' }).click();

  await page.goto('/portfolio');
  await page.getByRole('button', { name: 'Open Epic: Image review fixture' }).click();
  const plan = page.getByRole('dialog', { name: 'Image review fixture' });
  await expect(plan.getByText('Related Markdown')).toBeVisible();
  await plan.getByRole('button', { name: 'notes.md' }).click();
  await expect(plan.getByText('This adjacent document links back')).toBeVisible();
  await plan.getByRole('link', { name: 'sample PDF' }).first().click();
  await expect(page.getByRole('dialog', { name: /sample\.pdf/ }).locator('iframe')).toBeVisible();
  await page.getByRole('button', { name: 'Close asset viewer' }).click();
  await plan.getByRole('button', { name: 'Open image: PNG sample' }).click();
  await expect(page.getByRole('dialog', { name: /sample\.png/ }).getByRole('img')).toBeVisible();
  await page.getByRole('button', { name: 'Close asset viewer' }).click();
  await expect(plan.locator('[data-pikchr-diagram]')).toHaveCount(2);
  await plan.getByRole('button', { name: 'Open diagram: Pikchr asset' }).click();
  await expect(page.getByRole('dialog', { name: /sample\.pikchr/ }).locator('[data-pikchr-diagram]')).toBeVisible();
});
