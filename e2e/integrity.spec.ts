import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

const markdown = (title: string, metadata = '') => `---\ntype: Plan\ntitle: ${title}\n${metadata}\n---\n# Goal\nContent\n`;
const importPortfolio = async (
  page: Page,
  title: string,
  files: Array<{ name: string; text: string }>,
) => {
  const directory = test.info().outputPath(randomUUID(), '.wiki');
  await mkdir(directory, { recursive: true });
  await Promise.all(files.map(file => writeFile(path.join(directory, file.name), file.text)));
  await page.locator('input[type=file]').setInputFiles(directory);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox').fill(title);
  await dialog.getByRole('button', { name: 'Load', exact: true }).click();
  await expect(dialog).toBeHidden();
};
const importFiles = async (page: Page, title: string, text = markdown(title)) => {
  const labels = page.getByRole('main').getByText(title, { exact: true });
  const previousCount = await labels.count();
  await importPortfolio(page, title, [{ name: 'plan.md', text }]);
  await expect(labels).toHaveCount(previousCount + 1);
};

test('stale in-progress plan status is corrected across portfolio and phase tracker', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'portfolio flow runs on the desktop layout');
  await page.goto('/home');
  await importPortfolio(page, 'Mixed statuses', [
    {
      name: 'active.md',
      text: `${markdown('Active plan', 'status: in-progress\nexecution: phased')}\n# Execution phases\n\n## ACT-01 — Next task\n- Status: ready\n\n## ACT-02 — Later task\n- Status: planned\n`,
    },
    {
      name: 'queued.md',
      text: `${markdown('Queued plan', 'status: planned\nexecution: phased')}\n# Execution phases\n\n## QUE-01 — Queued task\n- Status: planned\n`,
    },
    {
      name: 'working.md',
      text: `${markdown('Working plan', 'status: in-progress\nexecution: phased')}\n# Execution phases\n\n## WRK-01 — Active task\n- Status: in-progress\n`,
    },
  ]);

  await page.goto('/portfolio');
  await expect(page.getByRole('button', { name: 'Open plan: Active plan' })).toContainText('Ready');
  await expect(page.getByRole('button', { name: 'Open plan: Active plan' }).getByTitle('Source says in-progress, but no phase is in-progress. Showing the phase-based status.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open plan: Working plan' })).toContainText('In Progress');

  await page.goto('/phases');
  await expect(page.getByText('1 plan in progress')).toBeVisible();
  await expect(page.getByText('Columns show phase status; plan status appears on each card.')).toBeVisible();
  await expect(page.getByRole('region', { name: 'In Progress phases' })).toContainText('Active task');
  await expect(page.getByRole('region', { name: 'Ready phases' })).toContainText('Next task');
  await expect(page.getByRole('region', { name: 'Ready phases' })).toContainText('Plan:Ready');
  await page.getByRole('button', { name: 'in-progress', exact: true }).click();
  await expect(page.getByRole('region', { name: 'In Progress phases' })).toContainText('Active task');
  await expect(page.getByRole('region', { name: 'Ready phases' })).not.toContainText('Next task');
  await expect(page.getByRole('region', { name: 'Planned phases' })).not.toContainText('Later task');
  await expect(page.getByRole('region', { name: 'Planned phases' })).not.toContainText('Queued task');
});

test('simple phase view keeps collapsed items compact and expands their details', async ({ page }) => {
  await page.goto('/home');
  await importPortfolio(page, 'Simple phases', [
    {
      name: 'compact.md',
      text: `${markdown('Compact plan', 'status: ready\npriority: next\nimpact: high\nexecution: phased')}\n# Execution phases\n\n## CMP-01 — Prepare workspace\n- Status: planned\n\n## CMP-02 — Ship the focused change\n- Status: ready\n- Deliverable: **formatted details**\n`,
    },
    { name: 'epic.md', text: markdown('Coordination record', "status: planned\npriority: low\nimpact: critical\nexecution: coordination\ndescription: '**Coordinate** work'") },
  ]);

  await page.goto('/phases');
  const view = page.getByRole('switch', { name: 'Simple view' });
  await expect(view).not.toBeChecked();
  await view.click();
  await expect(view).toBeChecked();
  await expect.poll(() => new URL(page.url()).searchParams.get('view')).toBe('simple');
  for (const status of ['Planned', 'Ready', 'In Progress', 'Waiting on Validation', 'Blocked']) {
    await expect(page.getByRole('region', { name: `${status} phases` })).toBeVisible();
  }
  const planned = page.getByRole('region', { name: 'Planned phases' });
  const ready = page.getByRole('region', { name: 'Ready phases' });
  await expect(planned.getByRole('listitem')).toHaveCount(1);
  await expect(ready.getByRole('listitem')).toHaveCount(1);
  await expect(page.getByRole('region', { name: 'In Progress phases' })).toContainText('empty');
  const epics = page.getByRole('region', { name: 'Epics' });
  await expect(epics).toContainText('Coordination record');
  await expect(epics.getByRole('img', { name: 'Plan priority: Low' })).toHaveClass(/text-od-muted/);
  await expect(epics.getByRole('img', { name: 'Plan impact: Critical' })).toHaveClass(/text-od-red/);
  await expect(epics.getByRole('img', { name: 'Project wiki: Simple phases' })).toHaveAttribute('style', /background-color:/);
  const epic = epics.getByText('Coordination record');
  await epic.click();
  await expect(epics.getByRole('button', { name: 'Open full Epic' })).toBeVisible();
  await expect(epics.getByRole('button', { name: 'Copy agent command for Coordination record' })).toBeVisible();
  await expect(epics.locator('.md-body strong')).toHaveText('Coordinate');
  const row = ready.getByRole('button', { name: /^Expand phase CMP-02: Ship the focused change in Compact plan/ });
  await expect(row).toContainText('CMP-02');
  await expect(row).toContainText('Ship the focused change');
  await expect(row.getByRole('img', { name: 'Plan priority: Next' })).toHaveClass(/text-od-purple/);
  await expect(row.getByRole('img', { name: 'Plan impact: High' })).toHaveClass(/text-od-orange/);
  await expect(row.getByRole('img', { name: 'Project wiki: Simple phases' })).toHaveAttribute('style', /background-color:/);
  await expect(row.getByRole('img', { name: /^Phase state:/ })).toHaveCount(0);
  await expect(ready.getByRole('button', { name: 'Copy agent command for phase CMP-02' })).toHaveCount(0);
  await expect(planned.getByRole('img', { name: 'Plan priority: Next' })).toBeVisible();
  const box = await row.boundingBox();
  expect(box?.height).toBeLessThan(48);
  await row.click();
  await expect(ready.getByRole('button', { name: 'Open phase in plan' })).toBeVisible();
  const copyCommand = ready.getByRole('button', { name: 'Copy agent command for phase CMP-02' });
  await expect(copyCommand).toBeVisible();
  await copyCommand.click();
  await expect(row).toHaveAttribute('aria-expanded', 'true');
  await expect(ready.locator('.md-body li').first()).toHaveText('Status: ready');
  await expect(ready.locator('.md-body strong')).toHaveText('formatted details');
  await expect(page.getByRole('dialog', { name: 'Compact plan' })).toHaveCount(0);
  await row.click();
  await expect(ready.getByRole('button', { name: 'Open phase in plan' })).toHaveCount(0);

  await page.reload();
  await expect(view).toBeChecked();
  await row.click();
  await ready.getByRole('button', { name: 'Open phase in plan' }).click();
  await expect.poll(() => new URL(page.url()).hash).toBe('#cmp-02');
  await expect(page.getByRole('dialog', { name: 'Compact plan' })).toBeVisible();
  await page.getByRole('dialog', { name: 'Compact plan' }).getByRole('button', { name: 'Close plan details' }).click();
  await view.click();
  await expect(view).not.toBeChecked();
  await expect.poll(() => new URL(page.url()).searchParams.get('view')).toBeNull();
  await expect(page.getByRole('region', { name: 'Ready phases' })).toContainText('CMP-02');
});

test('phase sort controls order each column in board and simple views', async ({ page }) => {
  await page.goto('/home');
  const source = (title: string, priority: string, impact: string, id: string, phaseTitle: string) =>
    `${markdown(title, `status: ready\npriority: ${priority}\nimpact: ${impact}\nexecution: phased`)}\n# Execution phases\n\n## ${id} — ${phaseTitle}\n- Status: ready\n`;
  await importPortfolio(page, 'Sorted phases', [
    { name: 'high.md', text: source('High plan', 'high', 'low', 'SOR-01', 'Beta phase') },
    { name: 'low.md', text: source('Low plan', 'low', 'critical', 'SOR-02', 'Alpha phase') },
    { name: 'next.md', text: source('Next plan', 'next', 'medium', 'SOR-03', 'Gamma phase') },
  ]);
  await page.goto('/phases');
  const sort = page.getByRole('combobox', { name: 'Sort phases by' });
  const reverse = page.getByRole('button', { name: 'Reverse phase order' });
  const ready = page.getByRole('region', { name: 'Ready phases' });
  const boardCards = ready.locator('[role="button"][aria-label^="Open plan"]');
  await sort.selectOption('priority');
  await expect(boardCards.nth(0)).toHaveAttribute('aria-label', /phase SOR-03$/);
  await expect(boardCards.nth(1)).toHaveAttribute('aria-label', /phase SOR-01$/);
  await expect(boardCards.nth(2)).toHaveAttribute('aria-label', /phase SOR-02$/);
  await reverse.click();
  await expect(reverse).toHaveAttribute('aria-pressed', 'true');
  await expect(boardCards.nth(0)).toHaveAttribute('aria-label', /phase SOR-02$/);

  await page.getByRole('switch', { name: 'Simple view' }).click();
  const simpleRows = ready.getByRole('button', { name: /^Expand phase SOR-/ });
  await expect(simpleRows.nth(0)).toHaveAttribute('aria-label', /^Expand phase SOR-02:/);
  await expect(simpleRows.nth(2)).toHaveAttribute('aria-label', /^Expand phase SOR-03:/);
  await sort.selectOption('impact');
  await expect(reverse).toHaveAttribute('aria-pressed', 'false');
  await expect(simpleRows.nth(0)).toHaveAttribute('aria-label', /^Expand phase SOR-02:/);
  await expect(simpleRows.nth(1)).toHaveAttribute('aria-label', /^Expand phase SOR-03:/);
  await expect(simpleRows.nth(2)).toHaveAttribute('aria-label', /^Expand phase SOR-01:/);
  await sort.selectOption('phase-title');
  await page.reload();
  await expect(sort).toHaveValue('phase-title');
  await expect(page.getByRole('switch', { name: 'Simple view' })).toBeChecked();
  await expect(simpleRows.nth(0)).toHaveAttribute('aria-label', /^Expand phase SOR-02:/);
  await expect(simpleRows.nth(1)).toHaveAttribute('aria-label', /^Expand phase SOR-01:/);
  await expect(simpleRows.nth(2)).toHaveAttribute('aria-label', /^Expand phase SOR-03:/);
});

test('large plan loads document rendering on first detail open', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'document loading coverage runs on desktop');
  const markdownRequests: string[] = [];
  await page.route('**/assets/Markdown-*.js', async route => {
    markdownRequests.push(route.request().url());
    await new Promise(resolve => setTimeout(resolve, 250));
    await route.continue();
  });
  await page.goto('/home');
  expect(markdownRequests).toHaveLength(0);
  const source = `${markdown('Large rendering plan')}\n${Array.from({ length: 150 }, (_, i) => `## Section ${i + 1}\n\nSome **formatted** content.\n`).join('\n')}`;
  await importFiles(page, 'Large rendering plan', source);
  await page.goto('/portfolio');
  expect(markdownRequests).toHaveLength(0);
  await page.getByRole('button', { name: 'Open Epic: Large rendering plan' }).click();
  await expect(page.getByText('Loading document…').first()).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Large rendering plan' }).getByText('Some formatted content.').first()).toBeVisible();
  expect(markdownRequests).toHaveLength(1);
});

test('graph recenters after resize while retaining zoom', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'graph resize coverage runs on desktop');
  await page.goto('/home');
  await page.getByRole('button', { name: 'Load Demo Data' }).click();
  await page.getByRole('link', { name: 'Dependency Graph' }).click();
  const graph = page.locator('svg#dependency-graph');
  const layer = graph.locator(':scope > g').first();
  await page.getByRole('button', { name: 'Zoom in' }).click();
  const before = await layer.getAttribute('transform');
  const width = await graph.evaluate(element => element.clientWidth);
  await graph.evaluate((element, nextWidth) => { element.style.width = `${nextWidth}px`; }, width - 100);
  await expect(layer).not.toHaveAttribute('transform', before ?? '');
  await expect(layer).toHaveAttribute('transform', /scale\(1\.25\)/);
});

test('drop zone imports standalone Markdown file handles', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'drop-contract coverage only needs one browser viewport');
  await page.goto('/home');
  const dropZone = page.getByText('Drop Files', { exact: true }).locator('..');
  await dropZone.evaluate((element, text) => {
    const file = new File([text], 'standalone.md', { type: 'text/markdown' });
    const item = {
      kind: 'file',
      getAsFile: () => file,
      getAsFileSystemHandle: () => Promise.resolve({
        kind: 'file',
        name: file.name,
        getFile: () => Promise.resolve(file),
      }),
    };
    const event = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { items: { 0: item, length: 1 } } });
    element.dispatchEvent(event);
  }, markdown('Standalone drop plan'));

  const dialog = page.getByRole('dialog', { name: 'Name this project' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox').fill('Standalone drop');
  await dialog.getByRole('button', { name: 'Load', exact: true }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByRole('main').getByText('Standalone drop', { exact: true })).toBeVisible();
  await expect(page.locator('p.text-od-red')).toHaveCount(0);
});

test('legacy directory drops succeed without a false file error', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'drop-contract coverage only needs one browser viewport');
  await page.goto('/home');
  const dropZone = page.getByText('Drop Files', { exact: true }).locator('..');
  await dropZone.evaluate((element, text) => {
    const file = new File([text], 'legacy.md', { type: 'text/markdown' });
    const fileEntry = {
      name: file.name,
      isFile: true,
      isDirectory: false,
      file: (success: (value: File) => void) => success(file),
    };
    const directory = (name: string, entries: object[]) => ({
      name,
      isFile: false,
      isDirectory: true,
      createReader: () => {
        let read = false;
        return { readEntries: (success: (value: object[]) => void) => {
          const batch = read ? [] : entries;
          read = true;
          success(batch);
        } };
      },
    });
    const wiki = directory('.wiki', [fileEntry]);
    const project = directory('legacy-project', [wiki]);
    const item = {
      kind: 'file',
      getAsFile: () => null,
      webkitGetAsEntry: () => project,
    };
    const event = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { items: { 0: item, length: 1 } } });
    element.dispatchEvent(event);
  }, markdown('Legacy directory plan'));

  await expect(page.getByRole('main').getByText('legacy-project', { exact: true })).toBeVisible();
  await expect(page.getByText('Loaded 1 plan', { exact: true })).toBeVisible();
  await expect(page.locator('p.text-od-red')).toHaveCount(0);
});

test('remaining time survives reload and follows portfolio filters', async ({ page }) => {
  await page.goto('/home');
  await importFiles(page, 'Estimated', `${markdown('Estimated', 'phase_budget_hours: 5')}\n# Execution phases\n\n## TM-01 First\n- Budget: 2 hours maximum\n\n## TM-02 Second\n- Remaining: 30 minutes\n`);
  await importFiles(page, 'Unknown');
  await page.goto('/portfolio');
  await expect(page.getByText('Time remaining: ~2h 30m', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open plan: Estimated', exact: true })).toContainText('~2h 30m');
  await expect(page.getByRole('button', { name: 'Open Epic: Unknown', exact: true })).toContainText('N/A (Epic)');
  await page.reload();
  await expect(page.getByText('Time remaining: ~2h 30m', { exact: true })).toBeVisible();
  await page.getByPlaceholder('Quick search…').fill('Estimated');
  await expect(page.getByRole('button', { name: 'Open Epic: Unknown', exact: true })).toHaveCount(0);
  await expect(page.getByText('Time remaining: ~2h 30m', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Time remaining', exact: true }).click();
});

test('imports same-name portfolios independently and safely searches malformed fields', async ({ page }) => {
  await page.goto('/home');
  await importFiles(page, 'Shared', markdown('First', 'description: 123\nstatus: unknown'));
  await importFiles(page, 'Shared', markdown('Second'));
  await page.goto('/portfolio');
  await expect(page.getByRole('button', { name: 'Open Epic: First' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Epic: Second' })).toBeVisible();
  await page.goto('/search');
  await page.getByRole('textbox').fill('First');
  await expect(page.getByRole('button', { name: 'Open Epic: First', exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('textbox').fill('First');
  await expect(page.getByRole('button', { name: 'Open Epic: First', exact: true })).toBeVisible();
});

test('search input toggles case and regular expressions independently', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'matching behavior only needs one viewport');
  await page.goto('/home');
  await importPortfolio(page, 'Search options', [
    { name: 'upper.md', text: markdown('CamelCaseToken', 'tags: [focus]') },
    { name: 'lower.md', text: markdown('camelcasetoken', 'tags: [other]') },
  ]);
  await page.goto('/search');
  const input = page.getByRole('textbox', { name: 'Search query' });
  const matchCase = page.getByRole('button', { name: 'Match case' });
  const regex = page.getByRole('button', { name: 'Use regular expression' });

  await expect(matchCase).toHaveAttribute('aria-pressed', 'false');
  await expect(regex).toHaveAttribute('aria-pressed', 'false');
  await input.fill('CamelCaseToken');
  await expect(page.getByRole('button', { name: 'Open Epic: CamelCaseToken', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Epic: camelcasetoken', exact: true })).toBeVisible();

  await matchCase.click();
  await expect(page.getByRole('button', { name: 'Open Epic: camelcasetoken', exact: true })).toHaveCount(0);
  await input.fill('CamelCaseToke.');
  await expect(page.getByRole('button', { name: 'Open Epic: CamelCaseToken', exact: true })).toHaveCount(0);
  await regex.click();
  await expect(page.getByRole('button', { name: 'Open Epic: CamelCaseToken', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Epic: camelcasetoken', exact: true })).toHaveCount(0);

  await matchCase.click();
  await expect(page.getByRole('button', { name: 'Open Epic: camelcasetoken', exact: true })).toBeVisible();
  await page.getByRole('group', { name: 'Plan tags' }).getByRole('button', { name: 'focus' }).click();
  await expect(page.getByRole('button', { name: 'Open Epic: camelcasetoken', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear tags' }).click();
  await input.fill('[');
  await expect(page.getByRole('alert')).toContainText('Invalid regular expression');
  await regex.click();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('search options also apply to image and PDF paths', async ({ page }) => {
  await page.goto('/home');
  await importPortfolio(page, 'Search assets', [
    { name: 'plan.md', text: markdown('Asset search') },
    { name: 'sample.png', text: 'png' },
    { name: 'sample.jpg', text: 'jpg' },
    { name: 'sample.pdf', text: 'pdf' },
  ]);
  await page.goto('/search');
  await page.getByRole('tab', { name: 'Assets' }).click();
  const input = page.getByRole('textbox', { name: 'Search query' });
  const matchCase = page.getByRole('button', { name: 'Match case' });
  const regex = page.getByRole('button', { name: 'Use regular expression' });

  await input.fill('SAMPLE.PNG');
  await expect(page.getByRole('button', { name: /sample\.png/ })).toBeVisible();
  await matchCase.click();
  await expect(page.getByRole('button', { name: /sample\.png/ })).toHaveCount(0);
  await regex.click();
  await input.fill('sample\\.(png|pdf)$');
  await expect(page.getByRole('button', { name: /sample\.png/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /sample\.pdf/ })).toBeVisible();
  await regex.click();
  await expect(page.getByRole('button', { name: /sample\.png/ })).toHaveCount(0);
});

test('selected search tags use a canonical URL and survive reload and history', async ({ page }) => {
  const revealTags = async () => {
    const show = page.getByRole('button', { name: 'Show tags' });
    if (await show.isVisible()) await show.click();
  };
  await page.goto('/home');
  await importPortfolio(page, 'Tagged portfolio', [
    { name: 'one.md', text: markdown('API and UI', 'tags: [api, ui]') },
    { name: 'two.md', text: markdown('UI only', 'tags: [ui]') },
    { name: 'three.md', text: markdown('Database', 'tags: [db]') },
  ]);

  await page.goto('/search?view=compact&tag=ui&tag=api&tag=ui');
  await expect.poll(() => new URL(page.url()).searchParams.getAll('tag')).toEqual(['api', 'ui']);
  expect(new URL(page.url()).searchParams.get('view')).toBe('compact');
  await revealTags();
  await expect(page.getByRole('button', { name: 'api', pressed: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ui', pressed: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Epic: API and UI' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Epic: UI only' })).toHaveCount(0);

  await page.reload();
  await revealTags();
  await expect(page.getByRole('button', { name: 'api', pressed: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ui', pressed: true })).toBeVisible();
  await page.getByRole('button', { name: 'ui', pressed: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.getAll('tag')).toEqual(['api']);
  expect(new URL(page.url()).searchParams.get('view')).toBe('compact');

  await page.goBack();
  await expect.poll(() => new URL(page.url()).searchParams.getAll('tag')).toEqual(['api', 'ui']);
  await expect(page.getByRole('button', { name: 'ui', pressed: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear tags' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.getAll('tag')).toEqual([]);
  expect(new URL(page.url()).searchParams.get('view')).toBe('compact');
  await expect(page.getByRole('button', { name: 'Clear tags' })).toBeDisabled();
});

test('OS labels use platform logos and a dedicated search group', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'platform label presentation only needs one viewport');
  await page.goto('/home');
  await importPortfolio(page, 'Platform labels', [
    { name: 'platform.md', text: markdown('Platform plan', 'tags: [os:windows, release, linux]') },
  ]);

  await page.goto('/portfolio');
  const row = page.getByRole('button', { name: 'Open Epic: Platform plan' });
  await expect(row.getByLabel('Operating system: Windows')).toHaveAttribute('data-os-label', 'os:windows');
  await expect(row.getByLabel('Operating system: Windows')).toHaveClass(/text-sky-700/);
  await expect(row.getByText('#release')).toBeVisible();

  await page.goto('/search');
  const platforms = page.getByRole('group', { name: 'Operating system labels' });
  await expect(platforms.getByRole('button', { name: 'Operating system: Windows' })).toBeVisible();
  await expect(platforms.getByRole('button', { name: 'Operating system: Linux' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Plan tags' }).getByRole('button', { name: 'release' })).toBeVisible();
  await platforms.getByRole('button', { name: 'Operating system: Windows' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.getAll('tag')).toEqual(['os:windows']);
  await expect(page.getByRole('button', { name: 'Open Epic: Platform plan' })).toBeVisible();
});

test('wiki extensions become canonical file-type search tags', async ({ page }) => {
  const revealTags = async () => {
    const show = page.getByRole('button', { name: 'Show tags' });
    if (await show.isVisible()) await show.click();
  };
  await page.goto('/home');
  await importPortfolio(page, 'File types', [
    { name: 'plan.md', text: markdown('Extension plan') },
    { name: 'image.png', text: 'png' },
    { name: 'diagram.svg', text: '<svg xmlns="http://www.w3.org/2000/svg" />' },
    { name: 'guide.pdf', text: 'pdf' },
  ]);

  await page.goto('/search?view=compact&ext=.png&ext=PNG');
  await expect.poll(() => new URL(page.url()).searchParams.getAll('ext')).toEqual(['PNG']);
  expect(new URL(page.url()).searchParams.get('mode')).toBe('assets');
  expect(new URL(page.url()).searchParams.get('view')).toBe('compact');
  await revealTags();
  await expect(page.getByRole('group', { name: 'File types' }).getByRole('button', { name: 'MD' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'PNG', pressed: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'PDF', pressed: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'SVG', pressed: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'PNG', pressed: true })).toHaveAttribute('data-file-type', 'PNG');
  await expect(page.getByRole('button', { name: 'PNG', pressed: true }).locator('svg')).toBeVisible();
  await expect(page.getByRole('button', { name: 'SVG', pressed: false }).locator('svg')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Assets', selected: true })).toBeVisible();
  await expect(page.getByText('image.png', { exact: true })).toBeVisible();
  await expect(page.getByText('diagram.svg', { exact: true })).toHaveCount(0);

  await page.reload();
  await revealTags();
  await expect(page.getByRole('button', { name: 'PNG', pressed: true })).toBeVisible();
  await page.getByRole('button', { name: 'SVG', pressed: false }).click();
  await expect.poll(() => new URL(page.url()).searchParams.getAll('ext')).toEqual(['PNG', 'SVG']);
  await expect(page.getByText('image.png', { exact: true })).toBeVisible();
  await expect(page.getByText('diagram.svg', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'MD', pressed: false }).click();
  await expect.poll(() => new URL(page.url()).searchParams.getAll('ext')).toEqual(['MD']);
  expect(new URL(page.url()).searchParams.get('mode')).toBeNull();
  await expect(page.getByRole('tab', { name: 'Plans', selected: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Epic: Extension plan' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear tags' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.getAll('ext')).toEqual([]);
  await expect(page.getByRole('button', { name: 'Clear tags' })).toBeDisabled();
});

test('selected plans survive reload and follow browser history', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'selection history coverage runs on the desktop layout');
  await page.goto('/home');
  await importFiles(page, 'Linked portfolio', markdown('Linked plan'));
  await page.goto('/portfolio?view=all');
  await page.getByRole('button', { name: 'Open Epic: Linked plan', exact: true }).click();

  await expect.poll(() => new URL(page.url()).searchParams.get('plan')).not.toBeNull();
  expect(new URL(page.url()).searchParams.get('plan')).toContain(':plan.md');
  expect(new URL(page.url()).searchParams.get('view')).toBe('all');
  await expect(page.getByRole('dialog', { name: 'Linked plan' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Linked plan' })).toBeVisible();

  await page.getByRole('button', { name: 'Close plan details' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('plan')).toBeNull();
  expect(new URL(page.url()).searchParams.get('view')).toBe('all');
  await page.goBack();
  await expect.poll(() => new URL(page.url()).searchParams.get('plan')).not.toBeNull();
  await expect(page.getByRole('dialog', { name: 'Linked plan' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goForward();
  await expect(page.getByRole('dialog', { name: 'Linked plan' })).toBeVisible();

  await page.goto('/portfolio?plan=missing%3Aplan.md');
  const missing = page.getByRole('dialog', { name: 'Plan not loaded' });
  await expect(missing).toBeVisible();
  await expect(missing).toContainText('missing:plan.md');
  expect(new URL(page.url()).searchParams.get('plan')).toBe('missing:plan.md');
  await missing.getByRole('button', { name: 'Close plan details' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('plan')).toBeNull();
});

test('phase cards and Markdown fragments focus canonical URL anchors', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'deep-link focus coverage runs on the desktop layout');
  const source = `---
type: Plan
title: Source plan
---
# Goal
[Jump to overview](#overview)

[Ship target](target.md#TP-02--Ship-It)

# Overview
Source overview text.
`;
  const target = `---
type: Plan
title: Target plan
status: ready
---
# Execution phases

## TP-01 — Prepare
- Status: ready

## TP-02 — Ship It
- Status: ready
`;

  await page.goto('/home');
  await importPortfolio(page, 'Deep links', [
    { name: 'source.md', text: source },
    { name: 'target.md', text: target },
  ]);

  await page.goto('/phases');
  await page.getByRole('button', { name: /^Open plan .* phase TP-02$/ }).click();
  await expect.poll(() => new URL(page.url()).hash).toBe('#tp-02');
  const phaseHeading = page.locator('#tp-02');
  await expect(phaseHeading).toBeFocused();
  await page.reload();
  await expect(phaseHeading).toBeFocused();
  const targetDialog = page.getByRole('dialog', { name: 'Target plan' });
  const firstPhaseLink = targetDialog.getByRole('link', { name: 'Jump to phase TP-01: Prepare' });
  await expect(firstPhaseLink).toHaveAttribute('href', '#tp-01');
  await firstPhaseLink.click();
  await expect.poll(() => new URL(page.url()).hash).toBe('#tp-01');
  await expect(targetDialog.locator('#tp-01')).toBeFocused();
  await targetDialog.getByRole('link', { name: 'Jump to phase TP-02: Ship It' }).click();
  await expect.poll(() => new URL(page.url()).hash).toBe('#tp-02');
  await expect(phaseHeading).toBeFocused();

  await page.goto('/portfolio');
  await page.getByRole('button', { name: 'Open Epic: Source plan', exact: true }).click();
  const sourceDialog = page.getByRole('dialog', { name: 'Source plan' });
  await sourceDialog.getByRole('link', { name: 'Jump to overview' }).click();
  await expect.poll(() => new URL(page.url()).hash).toBe('#overview');
  await expect(sourceDialog.locator('#overview')).toBeFocused();

  await sourceDialog.getByRole('link', { name: 'Ship target' }).click();
  await expect.poll(() => new URL(page.url()).hash).toBe('#tp-02');
  await expect(page.getByRole('dialog', { name: 'Target plan' }).locator('#tp-02')).toBeFocused();
  await page.goBack();
  await expect.poll(() => new URL(page.url()).hash).toBe('#overview');
  await expect(page.getByRole('dialog', { name: 'Source plan' }).locator('#overview')).toBeFocused();
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
  await expect(page.getByRole('button', { name: 'Open Epic: Original' })).toBeVisible();
  empty = true;
  await page.getByRole('button', { name: 'Refresh all wikis' }).click();
  await expect(page.getByText('Refreshed 1 wiki (0 plans)', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Epic: Original' })).toHaveCount(0);
});

test('explicit branch loads a slash ref from an ambiguous GitHub URL', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'remote source selection coverage runs on desktop');
  const requests: string[] = [];
  await page.route('https://api.github.com/**', async route => {
    const url = route.request().url();
    requests.push(url);
    const body = url.includes('/git/trees/')
      ? { truncated: false, tree: [{ type: 'blob', path: '.wiki/plan.md', sha: 'one' }] }
      : url.includes('/git/blobs/')
        ? { encoding: 'base64', content: Buffer.from(markdown('Slash branch plan')).toString('base64') }
        : { default_branch: 'main' };
    await route.fulfill({ json: body });
  });
  await page.goto('/home');
  await page.getByRole('textbox', { name: 'GitHub owner/repo or GitLab project URL' })
    .fill('https://github.com/team/app/tree/main/docs');
  await page.getByRole('button', { name: 'Load', exact: true }).click();
  await expect(page.getByText(/Tree\/blob URLs with extra path segments are ambiguous/)).toBeVisible();
  expect(requests).toHaveLength(0);

  await page.getByRole('textbox', { name: 'Branch/ref (optional)' }).fill('feature/new-ui');
  await page.getByRole('button', { name: 'Load', exact: true }).click();
  await expect(page.getByText('Loaded 1 plan', { exact: true })).toBeVisible();
  expect(requests.some(url => url.includes('/git/trees/feature%2Fnew-ui?recursive=1'))).toBe(true);
  await page.goto('/portfolio');
  await expect(page.getByRole('button', { name: 'Open Epic: Slash branch plan' })).toBeVisible();
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
