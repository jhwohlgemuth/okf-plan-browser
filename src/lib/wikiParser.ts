import yaml from 'js-yaml';
import { validateFrontmatter } from './frontmatter';
import { isEpic } from './planKind';
import type {
  Frontmatter, Section, Phase, PhaseStatus, PlanStatus,
  PlanDependency, ParsedPlan,
} from '@/types/wiki';

// ─── Frontmatter ──────────────────────────────────────────────────────────────

export function parseFrontmatter(raw: string): { fm: Frontmatter; body: string; errors: string[] } {
  const errors: string[] = [];
  raw = raw.replace(/^\uFEFF/, '');
  const match = raw.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/);
  if (!match) {
    errors.push('No YAML frontmatter block found');
    return { fm: { title: 'Untitled' }, body: raw, errors };
  }
  let fm: Frontmatter = { title: 'Untitled' };
  try {
    const validated = validateFrontmatter(yaml.load(match[1] ?? '') ?? {});
    fm = validated.fm;
    errors.push(...validated.errors);
  } catch (e) {
    errors.push(`YAML parse error: ${(e as Error).message}`);
  }
  return { fm, body: match[2] ?? '', errors };
}

// ─── Phases ───────────────────────────────────────────────────────────────────

const PHASE_ID_RE = /^([A-Z][A-Z0-9]*-\d+|[Pp]hase\s+\d+|\d+)/;
// Accepts "**Status:** x", "- Status: x", "- **Status**: x", optional backticks, and spaces instead of hyphens.
const STATUS_RE = /^[ \t>*-]*\**Status\**[ \t]*:[ \t]*\**[ \t]*`?(planned|ready|blocked|in[- ]progress|waiting[- ]on[- ]validation)\b/im;
const REF_RE = /\b([A-Z][A-Z0-9]*-\d+)\b/g;
const refsOf = (text: string) => [...text.matchAll(REF_RE)].flatMap(m => (m[1] ? [m[1]] : []));

const LIST_ITEM_RE = /^\s*(\d+)[.)]\s+(.+(?:\n(?!\s*\d+[.)]\s|\s*$)[ \t]+.+)*)/gm;
const PHASES_HEADING_RE = /\bphases?\b/i;

/** Numbered items under a "... phases" heading, e.g. "1. Qualify OCI artifact handling, ...". */
function parseListPhases(text: string, defaultStatus: PhaseStatus): Phase[] {
  return [...text.matchAll(LIST_ITEM_RE)].map((m): Phase => {
    const rawBody = (m[2] ?? '').trim();
    const title = (rawBody.split(/(?<=[.;:])\s/)[0] ?? '').replace(/[.;:]$/, '');
    return {
      id: `Phase ${m[1] ?? ''}`,
      title,
      rawBody,
      status: normalizeStatus(STATUS_RE.exec(rawBody)?.[1]) ?? defaultStatus,
      refs: refsOf(rawBody),
    };
  });
}

function normalizeStatus(s?: string): PhaseStatus | undefined {
  return s ? (s.toLowerCase().replace(/\s+/g, '-') as PhaseStatus) : undefined;
}

function parsePhases(text: string, defaultStatus: PhaseStatus): Phase[] {
  const chunks = text.split(/^(?=## )/m).filter(Boolean);
  return chunks.flatMap((chunk): Phase[] => {
    const firstLine = (chunk.split('\n')[0] ?? '').replace(/^## /, '').trim();
    const rawBody = chunk.split('\n').slice(1).join('\n');
    const idMatch = PHASE_ID_RE.exec(firstLine);
    if (!idMatch) {
      return chunk.startsWith('## ') && PHASES_HEADING_RE.test(firstLine)
        ? parseListPhases(rawBody, defaultStatus)
        : [];
    }
    const id = idMatch[1] ?? '';
    // Strip leading punctuation separators from the phase title
    const titlePrefix = new RegExp('^[' + ['-', ':', '.', '\u2013', '\u2014'].join('') + ']\\s*');
    const title = firstLine.slice(id.length).trim().replace(titlePrefix, '');
    const status = normalizeStatus(STATUS_RE.exec(rawBody)?.[1]) ?? defaultStatus;
    const refs = refsOf(rawBody).filter(r => r !== id);
    return [{ id, title, rawBody, status, refs }];
  });
}

// ─── Sections ─────────────────────────────────────────────────────────────────

export function extractSections(body: string, defaultStatus: PhaseStatus = 'planned'): Section[] {
  const parts = body.split(/^(?=# )/m).filter(p => p.trim());
  return parts.map((part): Section => {
    if (!part.startsWith('# ')) return { heading: '', body: part, phases: [] };
    const lines = part.split('\n');
    const heading = (lines[0] ?? '').replace(/^# /, '').trim();
    const rest = lines.slice(1).join('\n');
    let phases = parsePhases(rest, defaultStatus);
    if (!phases.length && part.startsWith('# ') && PHASES_HEADING_RE.test(heading)) {
      phases = parseListPhases(rest, defaultStatus);
    }
    return { heading, body: rest, phases };
  });
}

export function fallbackPhaseStatus(status?: PlanStatus): PhaseStatus {
  return status === 'in-progress' ? 'planned' : status ?? 'planned';
}

// ─── Dependencies ─────────────────────────────────────────────────────────────

const LINK_RE = /\[([^\]]+)\]\(([^)]+\.md[^)]*)\)/g;

export function extractDependencies(body: string): PlanDependency[] {
  let dependencySection = false;
  let fence = '';
  const links: PlanDependency[] = [];
  for (const line of body.split('\n')) {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker) { fence = fence ? '' : marker; continue; }
    if (fence) continue;
    const heading = /^#{1,6}\s+(.+)/.exec(line)?.[1];
    if (heading) dependencySection = /\b(dependencies|prerequisites|blocked by)\b/i.test(heading);
    for (const m of line.matchAll(LINK_RE)) {
      links.push({ text: m[1] ?? '', href: m[2] ?? '', kind: dependencySection ? 'dependency' : 'reference' });
    }
  }
  return links;
}

// ─── Phase refs (all PA-XX in the entire file) ───────────────────────────────

export function extractPhaseRefs(body: string): string[] {
  return [...new Set(refsOf(body))];
}

// ─── Full file parser ─────────────────────────────────────────────────────────

export function buildSearchText(p: Pick<ParsedPlan, 'frontmatter' | 'sections'>): string {
  const fm = p.frontmatter;
  return [
    isEpic(p) ? 'epic' : 'phased plan',
    fm.title, fm.description,
    ...(fm.tags ?? []), ...(fm.package ?? []),
    ...p.sections.map(s => s.heading + ' ' + s.body),
    ...p.sections.flatMap(s => s.phases.map(ph => ph.title)),
  ].join(' ').toLowerCase();
}

export function parseWikiFile(
  repoId: string,
  fileName: string,
  raw: string,
): ParsedPlan {
  const { fm, body, errors } = parseFrontmatter(raw);
  const sections     = extractSections(body, fallbackPhaseStatus(fm.status));
  // Coordination headings describe work across child plans, not executable phases.
  if (fm.execution === 'coordination') sections.forEach(section => { section.phases = []; });
  const dependencies = extractDependencies(body);
  const phaseRefs    = extractPhaseRefs(body);
  return {
    id:           `${repoId}:${fileName}`,
    repoId,
    fileName,
    frontmatter:  fm,
    sections,
    dependencies,
    phaseRefs,
    searchText:   buildSearchText({ frontmatter: fm, sections }),
    parseErrors:  errors,
  };
}

// ─── Directory reader ─────────────────────────────────────────────────────────

/** Index pages, assets and other notes aren't plans: only files whose frontmatter marks them as one count. */
export function isPlanFile(raw: string): boolean {
  const { fm, errors } = parseFrontmatter(raw);
  if (errors.some(e => e.startsWith('YAML parse error') || e.startsWith('No YAML'))) return false;
  if (fm.type) return String(fm.type).toLowerCase() === 'plan';
  return fm.title !== 'Untitled';
}

function ingestText(result: ParseResult, repoId: string, path: string, text: string): void {
  const parsed = parseWikiFile(repoId, path, text);
  if (parsed.parseErrors.some(e => e.startsWith('YAML parse error'))) {
    result.errors.push({ name: path, error: parsed.parseErrors.join('; ') });
    return;
  }
  if (isPlanFile(text)) result.plans.push(parsed);
}

const SKIP_DIRS = new Set(['node_modules', '.git']);
const MAX_DEPTH = 6;

export const isViewableAsset = (path: string) => /\.(?:png|jpe?g|gif|webp|avif|bmp|svg|ico|pdf)$/i.test(path);
export type WikiAsset = { path: string; file?: File };
type ParseResult = { plans: ParsedPlan[]; errors: Array<{ name: string; error: string }>; assets?: WikiAsset[] };

export async function parseWikiFolder(
  handle: FileSystemDirectoryHandle,
  repoId: string,
  report?: Progress,
): Promise<ParseResult> {
  const errors: ParseResult['errors'] = [];
  const texts: Array<{ path: string; text: string }> = [];
  const assets: WikiAsset[] = [];
  let seen = 0;
  async function walk(dir: FileSystemDirectoryHandle, prefix: string, depth: number) {
    for await (const entry of (dir as unknown as { values(): AsyncIterable<FileSystemHandle> }).values()) {
      const path = prefix + entry.name;
      if (entry.kind === 'directory') {
        if (depth < MAX_DEPTH && !SKIP_DIRS.has(entry.name)) {
          await walk(entry as FileSystemDirectoryHandle, path + '/', depth + 1);
        }
        continue;
      }
      if (!entry.name.toLowerCase().endsWith('.md') && !isViewableAsset(path)) continue;
      try {
        const file = await (entry as FileSystemFileHandle).getFile();
        if (isViewableAsset(path)) assets.push({ path, file });
        else { texts.push({ path, text: await file.text() }); report?.(++seen); }
      } catch (e) {
        errors.push({ name: path, error: (e as Error).message });
      }
    }
  }

  await walk(handle, '', 0);
  const parsed = await parseWikiTexts(texts, repoId);
  return { ...parsed, errors: [...errors, ...parsed.errors], assets };
}

/** Picked folder is the wiki itself (so its name says nothing about the project). */
export const isWikiFolderName = (name: string) => /^\.?wiki$/i.test(name);

/** If the picked folder is a project containing a `.wiki` dir, return that dir. */
export async function findWikiDir(handle: FileSystemDirectoryHandle): Promise<FileSystemDirectoryHandle> {
  if (isWikiFolderName(handle.name)) return handle;
  try {
    return await handle.getDirectoryHandle('.wiki');
  } catch {
    return handle;
  }
}

export type Progress = (done: number, total?: number) => void;

const tick = () => new Promise<void>(r => setTimeout(r, 0));

/** Parse already-read markdown paths (local files or a remote forge fetch). */
export async function parseWikiTexts(
  files: Array<{ path: string; text: string }>,
  repoId: string,
  report?: Progress,
  assetPaths: string[] = [],
): Promise<ParseResult> {
  const result: ParseResult = { plans: [], errors: [], assets: assetPaths.map(path => ({ path })) };
  const md = files.filter(f => {
    const parts = f.path.split(/[/\\]/);
    return f.path.toLowerCase().endsWith('.md') && !parts.some(p => SKIP_DIRS.has(p));
  });
  let done = 0;
  report?.(0, md.length);
  for (const { path, text } of md) {
    try {
      ingestText(result, repoId, path, text);
    } catch (e) {
      result.errors.push({ name: path, error: (e as Error).message });
    }
    report?.(++done, md.length);
    if (done % 10 === 0) await tick();
  }
  const planFolders = new Set(result.plans.filter(plan => plan.fileName.endsWith('/index.md'))
    .map(plan => plan.fileName.slice(0, -'index.md'.length)));
  result.plans = result.plans.filter(plan => plan.fileName.endsWith('/index.md')
    || !planFolders.has(plan.fileName.slice(0, plan.fileName.lastIndexOf('/') + 1)));
  for (const plan of result.plans) {
    if (!plan.fileName.endsWith('/index.md')) continue;
    const folder = plan.fileName.slice(0, -'index.md'.length);
    plan.documents = md.filter(f => f.path !== plan.fileName && f.path.startsWith(folder)
      && !f.path.slice(folder.length).includes('/'))
      .map(f => ({ fileName: f.path, text: f.text }));
  }
  return result;
}

/** Fallback for browsers without showDirectoryPicker (<input webkitdirectory>). */
export async function parseWikiFileList(files: File[], repoId: string, report?: Progress): Promise<ParseResult> {
  const rel = (f: File) => (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
  const hasWikiDir = files.some(f => rel(f).split('/')[1] === '.wiki');
  const candidates: Array<{ path: string; file: File }> = [];
  const assets: WikiAsset[] = [];
  for (const file of files) {
    let parts = rel(file).split('/').slice(1);
    if (hasWikiDir) {
      if (parts[0] !== '.wiki') continue;
      parts = parts.slice(1);
    }
    if (parts.some(p => SKIP_DIRS.has(p))) continue;
    const path = parts.join('/') || file.name;
    if (file.name.toLowerCase().endsWith('.md')) candidates.push({ path, file });
    else if (isViewableAsset(path)) assets.push({ path, file });
  }
  const texts = await Promise.all(candidates.map(async ({ path, file }) => ({ path, text: await file.text() })));
  return { ...await parseWikiTexts(texts, repoId, report), assets };
}

const readAll = (dir: FileSystemDirectoryEntry) => new Promise<FileSystemEntry[]>((resolve, reject) => {
  const reader = dir.createReader();
  const out: FileSystemEntry[] = [];
  const next = () => reader.readEntries(batch => {
    if (!batch.length) return resolve(out);
    out.push(...batch);
    next();
  }, reject);
  next();
});

const entryFile = (e: FileSystemFileEntry) => new Promise<File>((res, rej) => e.file(res, rej));

/** Lazy walk of a dropped folder (webkitGetAsEntry); only descends into `.wiki`, so huge projects stay fast. */
export async function findWikiEntry(entry: FileSystemDirectoryEntry): Promise<FileSystemDirectoryEntry> {
  if (isWikiFolderName(entry.name)) return entry;
  const wiki = (await readAll(entry)).find(e => e.isDirectory && e.name === '.wiki');
  return (wiki as FileSystemDirectoryEntry | undefined) ?? entry;
}

export async function parseWikiEntry(root: FileSystemDirectoryEntry, repoId: string, report?: Progress): Promise<ParseResult> {
  const errors: ParseResult['errors'] = [];
  const texts: Array<{ path: string; text: string }> = [];
  const assets: WikiAsset[] = [];
  let seen = 0;
  async function walk(dir: FileSystemDirectoryEntry, prefix: string, depth: number) {
    for (const entry of await readAll(dir)) {
      const path = prefix + entry.name;
      if (entry.isDirectory) {
        if (depth < MAX_DEPTH && !SKIP_DIRS.has(entry.name)) {
          await walk(entry as FileSystemDirectoryEntry, path + '/', depth + 1);
        }
        continue;
      }
      if (!entry.name.toLowerCase().endsWith('.md') && !isViewableAsset(path)) continue;
      try {
        const file = await entryFile(entry as FileSystemFileEntry);
        if (isViewableAsset(path)) assets.push({ path, file });
        else { texts.push({ path, text: await file.text() }); report?.(++seen); }
      } catch (e) {
        errors.push({ name: path, error: (e as Error).message });
      }
    }
  }

  await walk(root, '', 0);
  const parsed = await parseWikiTexts(texts, repoId);
  return { ...parsed, errors: [...errors, ...parsed.errors], assets };
}
