#!/usr/bin/env node
/**
 * Syncs the version from package.json into src-tauri/tauri.conf.json.
 * Run automatically by the version-bump workflow.
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const pkg     = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const version = pkg.version;

const tauriPath = resolve(root, 'src-tauri', 'tauri.conf.json');
const tauri     = JSON.parse(readFileSync(tauriPath, 'utf8'));

tauri.package.version = version;

writeFileSync(tauriPath, JSON.stringify(tauri, null, 2) + '\n');
console.log(`✓ Synced version ${version} → src-tauri/tauri.conf.json`);
