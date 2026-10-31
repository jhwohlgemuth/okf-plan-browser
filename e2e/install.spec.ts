import { test, expect } from '@playwright/test';

test('install page covers desktop downloads and planning skill setup', async ({ page }, info) => {
  await page.goto('/install');
  await expect(page.getByRole('heading', { name: 'Install OKF Plan Browser' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Install the desktop app' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Install the planning skill' })).toBeVisible();
  if (info.project.name === 'phone') {
    const downloads = page.getByRole('list', { name: 'Desktop downloads' });
    await expect(downloads).toContainText('*_macos-aarch64.dmg');
    await expect(downloads).toContainText('*_windows-x64.msi');
    await expect(downloads).toContainText('*_linux-x64.AppImage');
  } else {
    await expect(page.getByRole('row', { name: /macOS · Apple Silicon/ })).toContainText('*_macos-aarch64.dmg');
    await expect(page.getByRole('row', { name: /Windows · x64/ })).toContainText('*_windows-x64.msi');
    await expect(page.getByRole('row', { name: /Linux · x64 portable/ })).toContainText('*_linux-x64.AppImage');
  }
  await expect(page.getByRole('link', { name: 'View latest release' })).toHaveAttribute(
    'href', 'https://github.com/jhwohlgemuth/okf-plan-browser/releases/latest',
  );

  await page.getByRole('navigation', { name: 'Install options' }).getByRole('link', { name: /Planning skill/ }).click();
  await expect(page).toHaveURL(/\/install#planning-skill$/);
  await expect(page.getByText('.agents/skills/planning/SKILL.md')).toBeVisible();
  await page.getByRole('link', { name: 'Open Planning Skill page' }).click();
  await expect(page).toHaveURL(/\/planning$/);
  await expect(page.getByRole('button', { name: 'Download skill folder' })).toBeVisible();
});
