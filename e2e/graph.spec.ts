import { test, expect, type Page } from '@playwright/test';

const loadDemoGraph = async (page: Page) => {
  await page.goto('/home');
  await page.getByRole('button', { name: 'Load Demo Data' }).click();
  await page.getByRole('link', { name: 'Dependency Graph' }).click();
  await expect(page.getByRole('group', { name: 'Plan dependency graph' })).toBeVisible();
};

test('graph nodes and zoom controls work from the keyboard', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'keyboard graph coverage runs on the desktop layout');
  await loadDemoGraph(page);

  const graph = page.getByRole('group', { name: 'Plan dependency graph' });
  const nodes = graph.locator('[role="button"]');
  const names = await nodes.evaluateAll(elements => elements.map(element => element.getAttribute('aria-label')));
  expect(names.length).toBeGreaterThan(1);
  expect(names.every(Boolean)).toBe(true);
  expect(new Set(names).size).toBe(names.length);
  const accessibilityTree = await graph.ariaSnapshot();
  expect(accessibilityTree).toContain('button "Zoom in"');
  expect(accessibilityTree).toContain('button "Open plan:');

  const first = nodes.first();
  await first.focus();
  await expect(first).toBeFocused();
  await expect(first.locator('.focus-ring')).toHaveAttribute('opacity', '1');
  await page.keyboard.press('Tab');
  await expect(nodes.nth(1)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(first).toBeFocused();
  await first.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close plan details' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(first).toBeFocused();

  await first.press('Space');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close plan details' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  const graphLayer = graph.locator('svg#dependency-graph > g').first();
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(graphLayer).toHaveAttribute('transform', /scale\(1\.25\)/);
  await page.getByRole('button', { name: 'Zoom out' }).click();
  await expect(graphLayer).toHaveAttribute('transform', /scale\(1\)/);
  await page.getByRole('button', { name: 'Reset zoom' }).click();
  await expect(graphLayer).toHaveAttribute('transform', 'translate(0,0) scale(1)');
});

test('resolved relationships remain readable in light and dark themes', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'theme coverage runs on the desktop layout');
  await loadDemoGraph(page);

  const relationships = page.getByRole('region', { name: 'Resolved relationships' });
  const keyboardLegend = relationships.getByRole('note', { name: 'Keyboard controls' });
  await expect(keyboardLegend).toContainText(/Tab\s*\/\s*Shift\+Tab\s*Move focus/);
  await expect(keyboardLegend).toContainText(/Enter\s*\/\s*Space\s*Open or activate/);
  await expect(keyboardLegend).toContainText(/Escape\s*Close navigation or details/);
  await expect(relationships.getByRole('listitem').first()).toBeVisible();
  await expect(relationships.getByText('depends on', { exact: true }).first()).toBeVisible();
  const darkStyles = await relationships.evaluate(element => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, color: style.color };
  });

  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Light', exact: true }).click();
  await page.getByRole('link', { name: 'Dependency Graph' }).click();
  const lightRelationships = page.getByRole('region', { name: 'Resolved relationships' });
  const lightStyles = await lightRelationships.evaluate(element => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, color: style.color };
  });
  expect(lightStyles).not.toEqual(darkStyles);

  await page.reload();
  await expect(page.getByText('No resolved dependencies or references.', { exact: true })).toBeVisible();
});
