import { test, expect, type Page } from '@playwright/test';

const goTo = (page: Page, path: string) =>
  page.evaluate(p => {
    window.history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);

const settle = async (page: Page) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
};

test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
});

test.describe('empty state', () => {
  for (const [name, path] of [['home-empty', '/home'], ['about', '/about'], ['settings', '/settings']] as const) {
    test(name, async ({ page }) => {
      await page.goto(path);
      await settle(page);
      await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
    });
  }
});

test.describe('with demo data', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/home');
    await page.getByRole('button', { name: 'Load Demo Data' }).click();
  });

  test('home-loaded', async ({ page }) => {
    await settle(page);
    await expect(page).toHaveScreenshot('home-loaded.png', { fullPage: true });
  });

  test('portfolio', async ({ page }) => {
    await goTo(page, '/portfolio');
    await settle(page);
    await expect(page).toHaveScreenshot('portfolio.png');
  });

  test('phases', async ({ page }) => {
    await goTo(page, '/phases');
    await settle(page);
    await expect(page).toHaveScreenshot('phases.png');
  });

  test('search', async ({ page }) => {
    await goTo(page, '/search');
    await settle(page);
    await expect(page).toHaveScreenshot('search.png');
  });

  test('graph', async ({ page }) => {
    await goTo(page, '/graph');
    await settle(page);
    await expect(page).toHaveScreenshot('graph.png');
  });

  test('plan detail panel', async ({ page }) => {
    await goTo(page, '/search');
    await page.getByRole('textbox').first().fill('a');
    await page.locator('main .cursor-pointer').first().click();
    await page.locator('h2').first().waitFor();
    await settle(page);
    await expect(page).toHaveScreenshot('plan-detail.png');
  });
});
