import { test, expect } from '@playwright/test';

test('walkthrough loads demo data, visits views, goes back, and restores Home', async ({ page }) => {
  await page.goto('/home');
  await page.getByRole('button', { name: 'Take a tour' }).click();
  await expect(page.getByRole('dialog', { name: 'Explore with demo plans?' })).toBeVisible();
  await page.getByRole('button', { name: 'Load demo data and start' }).click();
  const popover = page.locator('.driver-popover');
  await expect(popover).toContainText('Welcome to Plan Browser');
  const titles = [
    'Portfolio at a glance', 'Refresh project wikis', 'Planning workflows', 'Find a plan quickly',
    'Narrow the portfolio', 'Compare plans', 'Read plan details',
    'Track phases', 'Explore relationships', 'Resolved links',
    'Search plans and assets', 'Choose an appearance', 'GitHub access token',
    'GitLab access token', 'Manage loaded data', 'Remove one project wiki',
    'Clear loaded wikis', 'Clear saved data and tokens',
    'More information',
  ];
  for (const title of titles) {
    await popover.getByRole('button', { name: 'Next' }).click();
    await expect(popover).toContainText(title);
    if (title === 'Refresh project wikis') {
      const target = (page.viewportSize()?.width ?? 0) < 768
        ? '[data-tour="navigation-trigger"]' : '[data-tour="sidebar-repos"]';
      await expect(page.locator(target)).toBeVisible();
    }
    if (title === 'Remove one project wiki') await expect(page.locator('[data-tour="remove-wiki"]').first()).toBeVisible();
    if (title === 'Clear loaded wikis') await expect(page.locator('[data-tour="clear-loaded"]')).toBeVisible();
    if (title === 'Clear saved data and tokens') await expect(page.locator('[data-tour="clear-saved"]')).toBeVisible();
    if (title === 'GitHub access token') {
      await expect(page.locator('[data-tour="settings-github-token"]')).toBeVisible();
      await expect(page.getByLabel('GitHub personal access token')).toBeEmpty();
    }
    if (title === 'GitLab access token') {
      await expect(page.locator('[data-tour="settings-gitlab-token"]')).toBeVisible();
      await expect(page.getByLabel('GitLab personal access token')).toBeEmpty();
    }
    if (title === 'Read plan details') await expect(page.getByRole('dialog', { name: /plan/i })).toBeVisible();
    if (title === 'Track phases') {
      await expect(page).toHaveURL(/\/phases/);
      await popover.getByRole('button', { name: 'Back' }).click();
      await expect(popover).toContainText('Read plan details');
      await popover.getByRole('button', { name: 'Next' }).click();
      await expect(popover).toContainText('Track phases');
    }
  }
  await popover.getByRole('button', { name: 'Finish' }).click();
  await expect(popover).toHaveCount(0);
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByText('Plans', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Take a tour' })).toHaveClass(/text-muted-foreground/);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Take a tour' })).toHaveClass(/text-muted-foreground/);
  await page.getByRole('button', { name: 'Take a tour' }).click();
  await expect(page.getByRole('dialog', { name: 'Explore with demo plans?' })).toBeVisible();
});

test('replay from About can be exited without changing loaded plans', async ({ page }) => {
  await page.goto('/home');
  await page.getByRole('button', { name: 'Load Demo Data' }).click();
  if ((page.viewportSize()?.width ?? 0) < 768) await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('link', { name: 'About' }).click();
  await page.getByRole('button', { name: 'Take a tour' }).click();
  const popover = page.locator('.driver-popover');
  await expect(popover).toContainText('Welcome to Plan Browser');
  await page.keyboard.press('Escape');
  await expect(popover).toHaveCount(0);
  await expect(page).toHaveURL(/\/about$/);
  if ((page.viewportSize()?.width ?? 0) < 768) await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.getByText('Plans', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Take a tour' })).toHaveClass(/bg-primary/);
});

test('About offers demo plans when the portfolio is empty', async ({ page }) => {
  await page.goto('/about');
  await page.getByRole('button', { name: 'Take a tour' }).click();
  await expect(page.getByRole('dialog', { name: 'Explore with demo plans?' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('.driver-popover')).toHaveCount(0);
  await expect(page).toHaveURL(/\/about$/);
});

test('sparse saved portfolio skips relationship detail and keeps user data', async ({ page }) => {
  await page.goto('/home');
  await page.evaluate(() => localStorage.setItem('okf-plan-browser:wikis', JSON.stringify({
    version: 1,
    state: {
      repos: [{ id: 'user', label: 'My wiki', color: '#61afef', planCount: 1 }],
      plans: [{ repoId: 'user', fileName: 'simple.md', frontmatter: { title: 'Simple plan', status: 'planned' },
        sections: [{ heading: 'Goal', body: 'A short plan with no phases or links.', phases: [] }] }],
      warnings: [],
    },
  })));
  await page.reload();
  await expect(page.getByRole('main').getByText('My wiki')).toBeVisible();
  await page.getByRole('button', { name: 'Take a tour' }).click();
  const popover = page.locator('.driver-popover');
  await expect(popover).toContainText('Welcome to Plan Browser');
  for (const title of ['Portfolio at a glance', 'Refresh project wikis', 'Planning workflows', 'Find a plan quickly',
    'Narrow the portfolio', 'Compare plans', 'Read plan details', 'Track phases', 'Explore relationships']) {
    await popover.getByRole('button', { name: 'Next' }).click();
    await expect(popover).toContainText(title);
  }
  await expect(popover).toContainText('Explore relationships');
  await popover.getByRole('button', { name: 'Next' }).click();
  await expect(popover).toContainText('Search plans and assets');
  await popover.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole('main').getByText('My wiki')).toBeVisible();
});

test('refresh guidance uses the expand control when the desktop sidebar is collapsed', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await page.goto('/home');
  await page.getByRole('button', { name: 'Load Demo Data' }).click();
  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await page.getByRole('button', { name: 'Take a tour' }).click();
  const popover = page.locator('.driver-popover');
  await expect(popover).toContainText('Welcome to Plan Browser');
  await popover.getByRole('button', { name: 'Next' }).click();
  await expect(popover).toContainText('Portfolio at a glance');
  await popover.getByRole('button', { name: 'Next' }).click();
  await expect(popover).toContainText('Expand the sidebar');
  await expect(page.locator('[data-tour="sidebar-toggle"]')).toBeVisible();
  await popover.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
});

test('arrow navigation keeps keyboard focus off the tour close button', async ({ page }) => {
  await page.goto('/home');
  await page.getByRole('button', { name: 'Load Demo Data' }).click();
  await page.getByRole('button', { name: 'Take a tour' }).click();
  const popover = page.locator('.driver-popover');
  const close = popover.getByRole('button', { name: 'Close', exact: true });
  const next = popover.getByRole('button', { name: 'Next' });
  await expect(popover).toContainText('Welcome to Plan Browser');
  await expect(next).toBeFocused();
  await page.waitForTimeout(450); // Driver.js ignores arrow keys during its step transition.
  await page.keyboard.press('ArrowRight');
  await expect(popover).toContainText('Portfolio at a glance');
  await expect(next).toBeFocused();
  await expect(close).not.toBeFocused();
  await page.waitForTimeout(450);
  await page.keyboard.press('ArrowLeft');
  await expect(popover).toContainText('Welcome to Plan Browser');
  await expect(next).toBeFocused();
  await expect(close).not.toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(close).toBeFocused();
  for (const title of ['Portfolio at a glance', 'Refresh project wikis', 'Planning workflows']) {
    await popover.getByRole('button', { name: 'Next' }).click();
    await expect(popover).toContainText(title);
  }
  await page.waitForTimeout(450);
  await page.keyboard.press('ArrowRight');
  await expect(popover).toContainText('Find a plan quickly');
  await expect(page).toHaveURL(/\/portfolio$/);
  await expect(next).toBeFocused();
  await expect(close).not.toBeFocused();
});
