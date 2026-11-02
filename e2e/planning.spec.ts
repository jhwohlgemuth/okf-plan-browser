import { test, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { collectPlanningSkill, createPlanningSkillArtifacts } from '../scripts/planning-skill-assets';

function readStoredZip(zip: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  let offset = 0;
  while (zip.readUInt32LE(offset) === 0x04034b50) {
    expect(zip.readUInt16LE(offset + 8)).toBe(0);
    const size = zip.readUInt32LE(offset + 18);
    const nameLength = zip.readUInt16LE(offset + 26);
    const extraLength = zip.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const contentStart = nameStart + nameLength + extraLength;
    files.set(zip.toString('utf8', nameStart, nameStart + nameLength), zip.subarray(contentStart, contentStart + size));
    offset = contentStart + size;
  }
  expect(zip.readUInt32LE(offset)).toBe(0x02014b50);
  return files;
}

test('planning web artifacts contain every authored skill file with current content', async ({ page }) => {
  await page.goto('/home');
  await page.getByRole('link', { name: /Official home of the planning skill/ }).click();
  await expect(page.getByRole('heading', { name: 'Planning Skill', exact: true })).toBeVisible();
  await expect(page.getByText('Generic Agent Skills', { exact: true })).toBeVisible();
  await expect(page.getByText('Codex', { exact: true })).toBeVisible();
  await expect(page.getByText('OpenCode v2', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy OpenCode v2 configuration' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'OpenCode catalog' })).toHaveAttribute(
    'href',
    'https://www.jasonwohlgemuth.com/okf-plan-browser/opencode/skills/',
  );
  const downloadEvent = page.waitForEvent('download');
  await page.locator('[data-tour="planning-install"]').getByRole('link', { name: 'Download stable ZIP' }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('planning-skill.zip');
  const zip = await readFile((await download.path())!);
  const zipFiles = readStoredZip(zip);
  const authored = collectPlanningSkill();
  expect([...zipFiles.keys()]).toEqual(authored.map(file => `.agents/skills/planning/${file.path}`));

  const catalogResponse = await page.request.get('/opencode/skills/index.json');
  expect(catalogResponse.ok()).toBe(true);
  const catalog = await catalogResponse.json() as {
    skills: Array<{ name: string; version: string; files: string[] }>;
  };
  expect(catalog.skills).toHaveLength(1);
  expect(catalog.skills[0]).toEqual({
    name: 'planning',
    version: expect.stringMatching(/^[a-f0-9]{64}$/),
    files: authored.map(file => file.path),
  });

  for (const file of authored) {
    expect(zipFiles.get(`.agents/skills/planning/${file.path}`)?.equals(file.content)).toBe(true);
    for (const url of [`/planning-skill/${file.path}`, `/opencode/skills/planning/${file.path}`]) {
      const resolved = new URL(url, 'http://localhost:4173');
      expect(resolved.origin).toBe('http://localhost:4173');
      const response = await page.request.get(url);
      expect(response.ok()).toBe(true);
      expect((await response.body()).equals(file.content)).toBe(true);
    }
  }
});

test('planning catalog version changes with content and unsafe paths are rejected', async ({ page: _page }, info) => {
  const root = info.outputPath('planning-skill');
  await mkdir(`${root}/references`, { recursive: true });
  await writeFile(`${root}/SKILL.md`, '# Fixture\n');
  await writeFile(`${root}/references/note.md`, 'first\n');
  const first = createPlanningSkillArtifacts(collectPlanningSkill(root));
  const repeated = createPlanningSkillArtifacts(collectPlanningSkill(root));
  expect(repeated.version).toBe(first.version);
  expect(repeated.zip.equals(first.zip)).toBe(true);
  await writeFile(`${root}/references/note.md`, 'second\n');
  const second = createPlanningSkillArtifacts(collectPlanningSkill(root));
  expect(second.version).not.toBe(first.version);
  expect(() => createPlanningSkillArtifacts([
    { path: '../escape.md', content: Buffer.from('unsafe') },
    { path: 'SKILL.md', content: Buffer.from('# Fixture') },
  ])).toThrow(/Unsafe planning skill path/);
});

test('copies an ordered portfolio briefing prompt', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'desktop', 'prompt copy interaction is covered on desktop');
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:4173' });
  await page.goto('/planning');

  const prompt = page.getByRole('article').filter({
    has: page.getByRole('heading', { name: 'Understand plans and next steps' }),
  });
  await expect(prompt).toContainText('read-only, ordered briefing');
  await prompt.getByRole('button', { name: 'Copy understand plans and next steps command' }).click();

  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('inspect the .wiki portfolio without changing files');
  expect(copied).toContain('recommended execution order');
  expect(copied).toContain('numbered "What to do next" list');
  expect(copied).toContain('Official planning skill guide and download:');
  expect(copied).toContain('/planning-skill/SKILL.md');
  expect(copied).toContain('/planning-skill.zip');
  expect(copied).toContain('start a new agent session');

  const commitPrompt = page.getByRole('article').filter({
    has: page.getByRole('heading', { name: 'Write a commit message' }),
  });
  await commitPrompt.getByRole('button', { name: 'Copy write a commit message command' }).click();
  const commitMessagePrompt = await page.evaluate(() => navigator.clipboard.readText());
  expect(commitMessagePrompt).toContain('Return only a one-line Git commit message in sentence case');
  expect(commitMessagePrompt).toContain('summarizes all completed work');
  expect(commitMessagePrompt).toContain('Official planning skill guide and download:');

  const upgradePrompt = page.getByRole('article').filter({
    has: page.getByRole('heading', { name: 'Upgrade wiki to current skill' }),
  });
  await upgradePrompt.getByRole('button', { name: 'Copy upgrade wiki to current skill command' }).click();
  const upgradeWikiPrompt = await page.evaluate(() => navigator.clipboard.readText());
  expect(upgradeWikiPrompt).toContain('complies with the current planning skill version');
  expect(upgradeWikiPrompt).toContain('preserve valid intent and stable IDs for unfinished phases');
  expect(upgradeWikiPrompt).toContain('migrate deprecated conventions');
  expect(upgradeWikiPrompt).toContain('Run the planning skill validator against the repository root');
  expect(upgradeWikiPrompt).toContain('Official planning skill guide and download:');
});

test('filters planning prompts by category', async ({ page }, info) => {
  test.skip(info.project.name === 'tablet', 'filter interaction is covered on desktop and phone');
  await page.goto('/planning');

  const filters = page.getByRole('group', { name: 'Filter planning prompts' });
  await expect(page.getByRole('article')).toHaveCount(12);
  await filters.getByRole('button', { name: 'Write 2' }).click();
  await expect(filters.getByRole('button', { name: 'Write 2' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('article')).toHaveCount(2);
  await expect(page.getByRole('heading', { name: 'Write a draft' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Resume a draft' })).toBeVisible();

  await filters.getByRole('button', { name: 'All 12' }).click();
  await expect(page.getByRole('article')).toHaveCount(12);
});
