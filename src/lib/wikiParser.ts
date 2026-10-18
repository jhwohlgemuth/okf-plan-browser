import yaml from 'js-yaml';
import type {
  Frontmatter, Section, Phase, PhaseStatus,
  PlanDependency, ParsedPlan,
} from '@/types/wiki';

// ─── Frontmatter ──────────────────────────────────────────────────────────────

function normArray(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string') return val.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
  return [];
}

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
    const parsed = (yaml.load(match[1]) ?? {}) as Record<string, unknown>;
    fm = {
      ...parsed,
      title:    String(parsed.title ?? 'Untitled'),
      package:  normArray(parsed.package),
      tags:     normArray(parsed.tags),
    } as Frontmatter;
  } catch (e) {
    errors.push(`YAML parse error: ${(e as Error).message}`);
  }
  return { fm, body: match[2], errors };
}

// ─── Phases ───────────────────────────────────────────────────────────────────

const PHASE_ID_RE = /^(PA-\d+|[A-Z]{2}-\d+|\d+)/;
const STATUS_RE = /\*\*Status:\*\*\s*(planned|ready|blocked|in-progress)/i;
const REF_RE = /\b(PA-\d+)\b/g;

function parsePhases(text: string): Phase[] {
  const chunks = text.split(/^(?=## )/m).filter(Boolean);
  return chunks.map((chunk): Phase | null => {
    const firstLine = chunk.split('\n')[0].replace(/^## /, '').trim();
    const idMatch = PHASE_ID_RE.exec(firstLine);
    if (!idMatch) return null;
    const id = idMatch[1];
    // Strip leading punctuation separators from the phase title
    const titlePrefix = new RegExp('^[' + ['-', ':', '.'].join('') + ']\\s*');
    const title = firstLine.slice(id.length).trim().replace(titlePrefix, '');
    const rawBody = chunk.split('\n').slice(1).join('\n');
    const statusMatch = STATUS_RE.exec(rawBody);
    const status: PhaseStatus = (statusMatch?.[1]?.toLowerCase() ?? 'planned') as PhaseStatus;
    const refs = [...rawBody.matchAll(REF_RE)].map(m => m[1]).filter(r => r !== id);
    return { id, title, rawBody, status, refs };
  }).filter((p): p is Phase => p !== null);
}

// ─── Sections ─────────────────────────────────────────────────────────────────

export function extractSections(body: string): Section[] {
  const parts = body.split(/^(?=# )/m).filter(Boolean);
  return parts.map((part): Section => {
    const lines = part.split('\n');
    const heading = lines[0].replace(/^# /, '').trim();
    const rest = lines.slice(1).join('\n');
    const phases = parsePhases(rest);
    return { heading, body: rest, phases };
  });
}

// ─── Dependencies ─────────────────────────────────────────────────────────────

const LINK_RE = /\[([^\]]+)\]\(([^)]+\.md[^)]*)\)/g;

export function extractDependencies(body: string): PlanDependency[] {
  const deps: PlanDependency[] = [];
  let m: RegExpExecArray | null;
  while ((m = LINK_RE.exec(body)) !== null) {
    deps.push({ text: m[1], href: m[2] });
  }
  return deps;
}

// ─── Phase refs (all PA-XX in the entire file) ───────────────────────────────

export function extractPhaseRefs(body: string): string[] {
  return [...new Set([...body.matchAll(/\b(PA-\d+)\b/g)].map(m => m[1]))];
}

// ─── Full file parser ─────────────────────────────────────────────────────────

export function parseWikiFile(
  repoId: string,
  fileName: string,
  raw: string,
): ParsedPlan {
  const { fm, body, errors } = parseFrontmatter(raw);
  const sections     = extractSections(body);
  const dependencies = extractDependencies(body);
  const phaseRefs    = extractPhaseRefs(body);
  return {
    id:           `${repoId}:${fileName}`,
    repoId,
    fileName,
    raw,
    frontmatter:  fm,
    sections,
    dependencies,
    phaseRefs,
    parseErrors:  errors,
  };
}

// ─── Directory reader ─────────────────────────────────────────────────────────

/** Index pages, assets and other notes aren't plans: only files whose frontmatter marks them as one count. */
export function isPlanFile(raw: string): boolean {
  const { fm, errors } = parseFrontmatter(raw);
  if (errors.length) return false;
  if (fm.type) return String(fm.type).toLowerCase() === 'plan';
  return fm.title !== 'Untitled';
}

const SKIP_DIRS = new Set(['node_modules', '.git']);
const MAX_DEPTH = 6;

type ParseResult = { plans: ParsedPlan[]; errors: Array<{ name: string; error: string }> };

export async function parseWikiFolder(
  handle: FileSystemDirectoryHandle,
  repoId: string,
): Promise<ParseResult> {
  const result: ParseResult = { plans: [], errors: [] };

  async function walk(dir: FileSystemDirectoryHandle, prefix: string, depth: number) {
    for await (const entry of (dir as unknown as { values(): AsyncIterable<FileSystemHandle> }).values()) {
      const path = prefix + entry.name;
      if (entry.kind === 'directory') {
        if (depth < MAX_DEPTH && !SKIP_DIRS.has(entry.name)) {
          await walk(entry as FileSystemDirectoryHandle, path + '/', depth + 1);
        }
        continue;
      }
      if (!entry.name.toLowerCase().endsWith('.md')) continue;
      try {
        const file = await (entry as FileSystemFileHandle).getFile();
        const text = await file.text();
        if (isPlanFile(text)) result.plans.push(parseWikiFile(repoId, path, text));
      } catch (e) {
        result.errors.push({ name: path, error: (e as Error).message });
      }
    }
  }

  await walk(handle, '', 0);
  return result;
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

/** Fallback for browsers without showDirectoryPicker (<input webkitdirectory>). */
export async function parseWikiFileList(files: File[], repoId: string): Promise<ParseResult> {
  const result: ParseResult = { plans: [], errors: [] };
  const rel = (f: File) => (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
  const hasWikiDir = files.some(f => rel(f).split('/')[1] === '.wiki');
  for (const file of files) {
    let parts = rel(file).split('/').slice(1);
    if (hasWikiDir) {
      if (parts[0] !== '.wiki') continue;
      parts = parts.slice(1);
    }
    if (parts.some(p => SKIP_DIRS.has(p))) continue;
    if (!file.name.toLowerCase().endsWith('.md')) continue;
    const path = parts.join('/') || file.name;
    try {
      const text = await file.text();
      if (isPlanFile(text)) result.plans.push(parseWikiFile(repoId, path, text));
    } catch (e) {
      result.errors.push({ name: path, error: (e as Error).message });
    }
  }
  return result;
}
