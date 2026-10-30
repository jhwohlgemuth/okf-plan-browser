#!/usr/bin/env node
/** Syncs the npm version into Tauri config and Cargo metadata. */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const pkg     = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const version = pkg.version;
const checkOnly = process.argv.includes('--check');

const lock = JSON.parse(readFileSync(resolve(root, 'package-lock.json'), 'utf8'));
if (lock.version !== version || lock.packages[''].version !== version) {
  throw new Error(`package-lock.json must match package.json version ${version}`);
}

const tauriPath = resolve(root, 'src-tauri', 'tauri.conf.json');
const tauri     = JSON.parse(readFileSync(tauriPath, 'utf8'));

if (checkOnly && tauri.package.version !== version) {
  throw new Error(`Tauri version ${tauri.package.version} does not match ${version}`);
}
if (!checkOnly && tauri.package.version !== version) {
  tauri.package.version = version;
  writeFileSync(tauriPath, JSON.stringify(tauri, null, 2) + '\n');
}

for (const relativePath of ['src-tauri/Cargo.toml', 'src-tauri/Cargo.lock']) {
  const path = resolve(root, relativePath);
  const source = readFileSync(path, 'utf8');
  const header = relativePath.endsWith('.lock') ? '[[package]]' : '[package]';
  const marker = `${header}\nname = "okf-plan-browser"\nversion = "`;
  if (source.split(marker).length !== 2) {
    throw new Error(`Expected one okf-plan-browser package in ${relativePath}`);
  }
  const start = source.indexOf(marker) + marker.length;
  const end = source.indexOf('"', start);
  if (end < 0) throw new Error(`Missing version terminator in ${relativePath}`);
  const current = source.slice(start, end);
  if (checkOnly && current !== version) {
    throw new Error(`${relativePath} version ${current} does not match ${version}`);
  }
  if (!checkOnly && current !== version) {
    writeFileSync(path, source.slice(0, start) + version + source.slice(end));
  }
}

console.log(checkOnly ? `✓ Version metadata matches ${version}` : `✓ Synced version ${version} → Tauri config and Cargo metadata`);
