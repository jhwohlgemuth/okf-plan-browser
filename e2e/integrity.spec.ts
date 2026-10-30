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
  await expect(page.getByRole('tab', { name: 'Images & PDFs', selected: true })).toBeVisible();
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
