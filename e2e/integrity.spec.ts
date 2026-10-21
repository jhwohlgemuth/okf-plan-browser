import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

const markdown = (title: string, metadata = '') => `---\ntype: Plan\ntitle: ${title}\n${metadata}\n---\n# Goal\nContent\n`;
const importFiles = async (page: Page, title: string, text = markdown(title)) => {
  const labels = page.getByRole('main').getByText(title, { exact: true });
  const previousCount = await labels.count();
  const directory = test.info().outputPath(randomUUID(), '.wiki');
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'plan.md'), text);
  await page.locator('input[type=file]').setInputFiles(directory);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox').fill(title);
  await dialog.getByRole('button', { name: 'Load', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(labels).toHaveCount(previousCount + 1);
};

test('remaining time survives reload and follows portfolio filters', async ({ page }) => {
  await page.goto('/home');
  await importFiles(page, 'Estimated', `${markdown('Estimated', 'phase_budget_hours: 5')}\n# Execution phases\n\n## TM-01 First\n- Budget: 2 hours maximum\n\n## TM-02 Second\n- Remaining: 30 minutes\n`);
  await importFiles(page, 'Unknown');
  await page.goto('/portfolio');
  await expect(page.getByLabel('Estimated time remaining: ~2h 30m + 1 unestimated')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open plan: Estimated', exact: true })).toContainText('~2h 30m');
  await page.reload();
  await expect(page.getByLabel('Estimated time remaining: ~2h 30m + 1 unestimated')).toBeVisible();
  await page.getByPlaceholder('Quick search…').fill('Estimated');
  await expect(page.getByRole('button', { name: 'Open plan: Unknown', exact: true })).toHaveCount(0);
  await expect(page.getByText('Time remaining: ~2h 30m', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Time remaining', exact: true }).click();
});

test('imports same-name portfolios independently and safely searches malformed fields', async ({ page }) => {
  await page.goto('/home');
  await importFiles(page, 'Shared', markdown('First', 'description: 123\nstatus: unknown'));
  await importFiles(page, 'Shared', markdown('Second'));
  await page.goto('/portfolio');
  await expect(page.getByRole('button', { name: 'Open plan: First' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open plan: Second' })).toBeVisible();
  await page.goto('/search');
  await page.getByRole('textbox').fill('First');
  await expect(page.getByRole('button', { name: 'Open plan: First', exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('textbox').fill('First');
  await expect(page.getByRole('button', { name: 'Open plan: First', exact: true })).toBeVisible();
});

test('remote refresh preserves failed snapshots and removes a valid empty snapshot', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'refresh controls are inside the mobile drawer');
  let content = markdown('Original');
  let empty = false;
  await page.route('https://api.github.com/**', async route => {
    const url = route.request().url();
    const body = url.includes('/git/trees/') ? { tree: empty ? [] : [{ type: 'blob', path: '.wiki/plan.md', sha: 'one' }] }
      : url.includes('/git/blobs/') ? { encoding: 'base64', content: Buffer.from(content).toString('base64') }
      : { default_branch: 'main' };
    await route.fulfill({ json: body });
  });
  await page.goto('/home');
  await page.getByRole('textbox', { name: 'GitHub owner/repo or GitLab project URL' }).fill('team/app');
  await page.getByRole('button', { name: 'Load', exact: true }).click();
  await expect(page.getByText('Loaded 1 plan', { exact: true })).toBeVisible();
  content = '---\ntitle: [bad\n---\n';
  await page.getByRole('button', { name: 'Refresh all wikis' }).click();
  await expect(page.getByRole('region', { name: 'Notifications (F8)' }).getByText(/Import failed; existing plans were kept/)).toBeVisible();
  await page.goto('/portfolio');
  await expect(page.getByRole('button', { name: 'Open plan: Original' })).toBeVisible();
  empty = true;
  await page.getByRole('button', { name: 'Refresh all wikis' }).click();
  await expect(page.getByText('Refreshed 1 wiki (0 plans)', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open plan: Original' })).toHaveCount(0);
});

test('tokens stay in session storage and are forgotten through keyboard controls', async ({ page }) => {
  await page.goto('/settings');
  const token = page.getByRole('textbox', { name: 'GitHub personal access token' });
  await token.fill('test-token-only');
  await token.press('Enter');
  await expect(page.getByText('A token is configured.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('test-token-only');
  expect(await page.evaluate(() => sessionStorage.getItem('okf-plan-browser:session-token:github:api.github.com'))).toBe('test-token-only');
  const forget = page.getByRole('button', { name: 'Forget', exact: true });
  await forget.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('No token configured.', { exact: true })).toBeVisible();
});

test('cancel remote import leaves the portfolio unchanged', async ({ page }) => {
  await page.route('https://api.github.com/**', () => {});
  await page.goto('/home');
  await page.getByRole('textbox', { name: 'GitHub owner/repo or GitLab project URL' }).fill('team/app');
  await page.getByRole('button', { name: 'Load', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel remote load' }).click();
  await expect(page.getByText('Remote load cancelled', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Load Demo Data' })).toBeVisible();
});
