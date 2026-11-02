import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import type { Plugin } from 'vite';

const SKILL_NAME = 'planning';
const ZIP_PREFIX = `.agents/skills/${SKILL_NAME}/`;
const VIRTUAL_ID = 'virtual:planning-skill-assets';
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_ID}`;
const GENERATED_DIRECTORIES = new Set(['__pycache__']);
const GENERATED_FILES = new Set(['.DS_Store']);
const GENERATED_EXTENSIONS = new Set(['.pyc', '.pyo']);

export interface PlanningSkillFile {
  path: string;
  content: Buffer;
}

export interface PlanningSkillCatalog {
  skills: Array<{
    name: string;
    version: string;
    files: string[];
  }>;
}

export interface PlanningSkillArtifacts {
  files: PlanningSkillFile[];
  version: string;
  catalog: PlanningSkillCatalog;
  zip: Buffer;
  outputs: Map<string, Buffer>;
}

function comparePaths(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function assertSafeSkillPath(relativePath: string): void {
  const segments = relativePath.split('/');
  if (
    !relativePath
    || path.posix.isAbsolute(relativePath)
    || relativePath.includes('\\')
    || segments.some(segment => !segment || segment === '.' || segment === '..' || !/^[A-Za-z0-9._-]+$/.test(segment))
    || path.posix.normalize(relativePath) !== relativePath
  ) {
    throw new Error(`Unsafe planning skill path: ${JSON.stringify(relativePath)}`);
  }
}

function isGeneratedFile(name: string): boolean {
  return GENERATED_FILES.has(name) || GENERATED_EXTENSIONS.has(path.extname(name));
}

export function collectPlanningSkill(root = path.resolve('.agents/skills/planning')): PlanningSkillFile[] {
  const files: PlanningSkillFile[] = [];

  const visit = (directory: string, prefix = '') => {
    const entries = readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => comparePaths(left.name, right.name));
    for (const entry of entries) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) throw new Error(`Planning skill contains a symbolic link: ${relativePath}`);
      if (entry.isDirectory()) {
        if (!GENERATED_DIRECTORIES.has(entry.name)) visit(path.join(directory, entry.name), relativePath);
        continue;
      }
      if (!entry.isFile() || isGeneratedFile(entry.name)) continue;
      assertSafeSkillPath(relativePath);
      files.push({ path: relativePath, content: readFileSync(path.join(directory, entry.name)) });
    }
  };

  visit(root);
  if (!files.some(file => file.path === 'SKILL.md')) throw new Error('Planning skill is missing SKILL.md.');
  return files.sort((left, right) => comparePaths(left.path, right.path));
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipHeader(size: number, write: (view: DataView) => void): Buffer {
  const bytes = Buffer.alloc(size);
  write(new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength));
  return bytes;
}

function createStoredZip(files: PlanningSkillFile[]): Buffer {
  if (files.length > 0xffff) throw new Error('Planning skill ZIP contains too many files.');
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let localOffset = 0;

  for (const file of files) {
    const name = Buffer.from(`${ZIP_PREFIX}${file.path}`, 'utf8');
    if (name.length > 0xffff) throw new Error(`Planning skill ZIP path is too long: ${file.path}`);
    const checksum = crc32(file.content);
    const localHeader = zipHeader(30, view => {
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 0x0800, true);
      view.setUint16(8, 0, true);
      view.setUint16(12, 0x0021, true);
      view.setUint32(14, checksum, true);
      view.setUint32(18, file.content.length, true);
      view.setUint32(22, file.content.length, true);
      view.setUint16(26, name.length, true);
    });
    localParts.push(localHeader, name, file.content);

    const centralHeader = zipHeader(46, view => {
      view.setUint32(0, 0x02014b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 20, true);
      view.setUint16(8, 0x0800, true);
      view.setUint16(10, 0, true);
      view.setUint16(14, 0x0021, true);
      view.setUint32(16, checksum, true);
      view.setUint32(20, file.content.length, true);
      view.setUint32(24, file.content.length, true);
      view.setUint16(28, name.length, true);
      view.setUint32(42, localOffset, true);
    });
    centralParts.push(centralHeader, name);
    localOffset += localHeader.length + name.length + file.content.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = zipHeader(22, view => {
    view.setUint32(0, 0x06054b50, true);
    view.setUint16(8, files.length, true);
    view.setUint16(10, files.length, true);
    view.setUint32(12, centralDirectory.length, true);
    view.setUint32(16, localOffset, true);
  });
  return Buffer.concat([...localParts, centralDirectory, end]);
}

function inventoryVersion(files: PlanningSkillFile[]): string {
  const digest = createHash('sha256');
  for (const file of files) {
    digest.update(file.path, 'utf8');
    digest.update(Buffer.from([0]));
    digest.update(file.content);
    digest.update(Buffer.from([0]));
  }
  return digest.digest('hex');
}

export function createPlanningSkillArtifacts(files: PlanningSkillFile[]): PlanningSkillArtifacts {
  const sorted = [...files].sort((left, right) => comparePaths(left.path, right.path));
  for (const file of sorted) assertSafeSkillPath(file.path);
  if (!sorted.some(file => file.path === 'SKILL.md')) throw new Error('Planning skill is missing SKILL.md.');
  const version = inventoryVersion(sorted);
  const catalog: PlanningSkillCatalog = {
    skills: [{ name: SKILL_NAME, version, files: sorted.map(file => file.path) }],
  };
  const outputs = new Map<string, Buffer>();
  for (const file of sorted) {
    outputs.set(`planning-skill/${file.path}`, file.content);
    outputs.set(`opencode/skills/${SKILL_NAME}/${file.path}`, file.content);
  }
  const zip = createStoredZip(sorted);
  outputs.set('planning-skill.zip', zip);
  outputs.set('opencode/skills/index.json', Buffer.from(`${JSON.stringify(catalog, null, 2)}\n`, 'utf8'));
  return { files: sorted, version, catalog, zip, outputs };
}

function contentType(fileName: string): string {
  if (fileName.endsWith('.json')) return 'application/json; charset=utf-8';
  if (fileName.endsWith('.zip')) return 'application/zip';
  if (fileName.endsWith('.md')) return 'text/markdown; charset=utf-8';
  if (fileName.endsWith('.yaml') || fileName.endsWith('.yml')) return 'application/yaml; charset=utf-8';
  if (fileName.endsWith('.py')) return 'text/x-python; charset=utf-8';
  return 'application/octet-stream';
}

export function planningSkillAssetsPlugin(root = path.resolve('.agents/skills/planning')): Plugin {
  const artifacts = createPlanningSkillArtifacts(collectPlanningSkill(root));
  const clientFiles = artifacts.files.map(file => ({ path: file.path, source: file.content.toString('utf8') }));
  let base = '/';

  const serve = (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    const basePath = base === '/' ? '/' : base.endsWith('/') ? base : `${base}/`;
    if (!pathname.startsWith(basePath)) return next();
    const artifactPath = pathname.slice(basePath.length);
    const output = artifacts.outputs.get(artifactPath);
    if (!output) return next();
    response.statusCode = 200;
    response.setHeader('Content-Type', contentType(artifactPath));
    response.setHeader('Content-Length', output.length);
    response.end(output);
  };

  return {
    name: 'planning-skill-assets',
    enforce: 'pre',
    configResolved(config) {
      base = config.base;
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_VIRTUAL_ID : null;
    },
    load(id) {
      return id === RESOLVED_VIRTUAL_ID ? `export default ${JSON.stringify(clientFiles)};` : null;
    },
    configureServer(server) {
      server.middlewares.use(serve);
    },
    configurePreviewServer(server) {
      server.middlewares.use(serve);
    },
    generateBundle() {
      for (const [fileName, source] of artifacts.outputs) {
        this.emitFile({ type: 'asset', fileName, source });
      }
    },
  };
}
