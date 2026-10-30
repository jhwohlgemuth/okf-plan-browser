import { expect, test } from '@playwright/test';

test('zero-phase records stay Epics across portfolio, tracker, search, graph, and detail', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'portfolio flow runs on the desktop layout');
  await page.goto('/home');
  await page.getByRole('button', { name: 'Load Demo Data' }).click();
  await expect(page.locator('[data-tour="home-overview"]')).toContainText('Epics');

  await page.getByRole('link', { name: 'Portfolio' }).click();
  const epicRow = page.getByRole('button', { name: 'Open Epic: Schema Contract Freeze v1' });
  await expect(epicRow).toContainText('Epic');
  await page.getByRole('button', { name: 'epic', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Open Epic:/ })).toHaveCount(3);

  await page.getByRole('link', { name: 'Phase Tracker' }).click();
  await expect(page.getByRole('region', { name: 'Epics' })).toContainText('Schema Contract Freeze v1');
  await expect(page.getByRole('button', { name: /phase Plan$/ })).toHaveCount(0);

  await page.getByRole('link', { name: 'Search' }).click();
  await page.getByRole('textbox').first().fill('epic');
  await expect(page.getByRole('button', { name: /^Open Epic:/ })).toHaveCount(3);

  await page.getByRole('link', { name: 'Dependency Graph' }).click();
  await expect(page.getByRole('group', { name: 'Plan dependency graph' }).getByRole('button', { name: /Open Epic: Schema Contract Freeze v1/ })).toBeVisible();
  await page.getByRole('group', { name: 'Plan dependency graph' }).getByRole('button', { name: /Open Epic: Schema Contract Freeze v1/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Epic overview');
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Implement API Versioning Strategy' })).toBeVisible();
});
