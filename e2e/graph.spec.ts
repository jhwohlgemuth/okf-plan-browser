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
  await expect(nodes.first().locator('.plan-id')).toHaveText('API');
  const planIds = await nodes.locator('.plan-id').allTextContents();
  expect(planIds.every(id => /^[A-Z]{3}$/.test(id))).toBe(true);
  expect(names.every(name => / — ID [A-Z]{3}$/.test(name ?? ''))).toBe(true);
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
  // Node activation recenters with a short D3 transition. Establish a settled
  // baseline before asserting exact zoom factors so the test cannot sample an
  // interpolated scale and wait until its timeout.
  await page.getByRole('button', { name: 'Reset zoom' }).click();
  await expect(graphLayer).toHaveAttribute('transform', 'translate(0,0) scale(1)');
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(graphLayer).toHaveAttribute('transform', /scale\(1\.25\)/);
  await page.getByRole('button', { name: 'Zoom out' }).click();
  await expect(graphLayer).toHaveAttribute('transform', /scale\(1\)/);
  await page.getByRole('button', { name: 'Reset zoom' }).click();
  await expect(graphLayer).toHaveAttribute('transform', 'translate(0,0) scale(1)');
});

test('graph viewport, node positions, and selection survive site navigation', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'canvas persistence coverage runs on the desktop layout');
  await loadDemoGraph(page);

  const graph = page.getByRole('group', { name: 'Plan dependency graph' });
  const svg = graph.locator('svg#dependency-graph');
  const layer = svg.locator(':scope > g').first();
  const firstNode = graph.locator('[role="button"]').first();
  await firstNode.click();
  await page.getByRole('button', { name: 'Close plan details' }).click();
  const selectedId = new URL(page.url()).searchParams.get('gplan');
  expect(selectedId).toBeTruthy();

  await page.getByRole('button', { name: 'Zoom in' }).click();
  const box = await svg.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box!.x + box!.width * 0.72, box!.y + box!.height * 0.72);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * 0.72 + 64, box!.y + box!.height * 0.72 - 38, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(250);

  const transform = await layer.getAttribute('transform');
  expect(transform).toMatch(/translate\((?!0,0)/);
  expect(transform).toMatch(/scale\((?!1\))/);
  const positions = await graph.locator('[data-node-id]').evaluateAll(nodes => Object.fromEntries(nodes.map(node => [
    node.getAttribute('data-node-id'), node.getAttribute('transform'),
  ])));
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('okf-plan-browser:graph-canvas-v1'))).not.toBeNull();

  await page.getByRole('link', { name: 'Search' }).click();
  await page.getByRole('link', { name: 'Dependency Graph' }).click();
  const restoredGraph = page.getByRole('group', { name: 'Plan dependency graph' });
  await expect(restoredGraph.locator('svg#dependency-graph > g').first()).toHaveAttribute('transform', transform!);
  await expect.poll(() => new URL(page.url()).searchParams.get('gplan')).toBe(selectedId);
  await expect(restoredGraph.locator(`[data-node-id="${selectedId}"] .selection-ring`)).toHaveAttribute('opacity', '1');
  await expect.poll(() => restoredGraph.locator('[data-node-id]').evaluateAll(nodes => Object.fromEntries(nodes.map(node => [
    node.getAttribute('data-node-id'), node.getAttribute('transform'),
  ])))).toEqual(positions);
});

test('resolved relationships remain readable in light and dark themes', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'theme coverage runs on the desktop layout');
  await loadDemoGraph(page);

  const relationships = page.getByRole('region', { name: 'Resolved relationships' });
  const keyboardLegend = relationships.getByRole('note', { name: 'Keyboard controls' });
  await expect(keyboardLegend).toContainText(/Tab\s*\/\s*Shift\+Tab\s*Move focus/);
  await expect(keyboardLegend).toContainText(/Enter\s*\/\s*Space\s*Open or activate/);
  await expect(keyboardLegend).toContainText(/Escape\s*Close navigation or details/);
  const firstRelationship = relationships.getByRole('listitem').first();
  await expect(firstRelationship).toBeVisible();
  await expect(relationships.getByText('depends on', { exact: true }).first()).toBeVisible();
  await expect(firstRelationship).toContainText(/Plan|Epic/);
  await expect(firstRelationship.getByLabel(/Estimated time remaining/)
    .or(firstRelationship.getByText(/Coordination record/))).toBeVisible();
  await expect(firstRelationship).toContainText(/No blocked phases|blocked phase/);
  await expect(firstRelationship).toContainText(/impact/);
  await expect(firstRelationship).toContainText(/acorn-/);
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

test('graph search, local controls, preview, and URL state work together', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'interactive graph coverage runs on the desktop layout');
  await loadDemoGraph(page);

  const graph = page.getByRole('group', { name: 'Plan dependency graph' });
  const search = page.getByRole('textbox', { name: 'Search graph' });
  await search.fill('API Versioning Strategy');
  await expect(graph.locator('[role="button"]')).toHaveCount(1);
  await search.press('Enter');

  const selected = graph.locator('[role="button"]').first();
  await expect(selected).toBeFocused();
  const preview = page.getByRole('region', { name: 'Plan preview' });
  await expect(preview).toContainText('Implement API Versioning Strategy');
  const previewStyles = await preview.evaluate(element => {
    const styles = getComputedStyle(element);
    return { position: styles.position, border: styles.borderBottomStyle, shadow: styles.boxShadow };
  });
  expect(previewStyles.position).toBe('sticky');
  expect(previewStyles.border).toBe('solid');
  expect(previewStyles.shadow).not.toBe('none');
  await expect(selected.locator('.selection-ring')).toHaveAttribute('opacity', '1');
  await expect.poll(() => new URL(page.url()).searchParams.get('gq')).toBe('API Versioning Strategy');
  await expect.poll(() => new URL(page.url()).searchParams.get('gplan')).toContain('api-versioning-strategy.md');

  await page.getByRole('button', { name: 'Clear graph search' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('gq')).toBeNull();
  await expect(graph.locator('[role="button"]')).toHaveCount(7);
  await page.getByLabel('Neighborhood focus').selectOption('1');
  await expect.poll(() => new URL(page.url()).searchParams.get('ghops')).toBe('1');
  await expect(graph.locator('[role="button"][opacity="0.16"]').first()).toBeVisible();

  const beforeArrow = new URL(page.url()).searchParams.get('gplan');
  await selected.focus();
  await selected.press('ArrowRight');
  await expect.poll(() => new URL(page.url()).searchParams.get('gplan')).not.toBe(beforeArrow);
  await expect(page.locator('header [role="status"]')).toContainText('Selected');

  await page.getByLabel('Graph layout').selectOption('repository');
  await expect.poll(() => new URL(page.url()).searchParams.get('glayout')).toBe('repository');
  await page.getByLabel('Graph layout').selectOption('status');
  await page.goBack();
  await expect(page.getByLabel('Graph layout')).toHaveValue('repository');

  await page.getByLabel('Show references').click();
  await expect.poll(() => new URL(page.url()).searchParams.get('gedges')).toBe('dep');
  await expect(page.getByRole('button', { name: 'Fit graph from minimap' })).toBeVisible();
  await page.getByRole('button', { name: 'Fit graph from minimap' }).click();

  await page.locator('summary').filter({ hasText: /^Status/ }).click();
  await page.getByRole('checkbox', { name: 'Status: blocked' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('gstatus')).toBe('blocked');
  await expect(page.locator('header [role="status"]')).toContainText(/1 of \d+ nodes visible/);
  await page.getByRole('button', { name: /Clear filters/ }).click();

  await page.getByRole('button', { name: 'Blocked paths' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('gblocked')).toBe('1');
  await page.getByRole('link', { name: 'Search' }).click();
  await page.getByRole('link', { name: 'Dependency Graph' }).click();
  await expect(page.getByLabel('Graph layout')).toHaveValue('repository');
  await expect(page.getByLabel('Neighborhood focus')).toHaveValue('1');
  await expect(page.getByRole('button', { name: 'Blocked paths' })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.getByLabel('Graph layout')).toHaveValue('repository');
  await expect(page.getByRole('button', { name: 'Blocked paths' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Reset graph state' }).click();
  await expect(page.getByLabel('Graph layout')).toHaveValue('force');
  await expect(page.getByLabel('Neighborhood focus')).toHaveValue('0');
  await expect(page.getByRole('button', { name: 'Blocked paths' })).toHaveAttribute('aria-pressed', 'false');
  expect([...new URL(page.url()).searchParams.keys()].filter(key => key.startsWith('g'))).toEqual([]);
  await page.getByRole('link', { name: 'Search' }).click();
  await page.getByRole('link', { name: 'Dependency Graph' }).click();
  await expect(page.getByLabel('Graph layout')).toHaveValue('force');
});
