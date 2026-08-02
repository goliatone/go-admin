#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);

function argument(name) {
  const index = args.indexOf(name);
  return index >= 0 ? String(args[index + 1] || '').trim() : '';
}

const version = argument('--version');
const destinationArgument = argument('--destination');
const destination = resolve(destinationArgument || '.');
const repository = argument('--repository') || 'goliatone/go-admin';
const commit = argument('--commit');
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('--version must be a semantic version without a v prefix');
if (!destinationArgument) throw new Error('--destination is required');

const packageJSON = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (packageJSON.version !== version) {
  throw new Error(`browser package ${packageJSON.version} does not match release ${version}`);
}

mkdirSync(destination, { recursive: true });
const packed = spawnSync(process.execPath, [
  join(root, 'scripts', 'pack-public-package.mjs'),
  '--destination', destination,
], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
if (packed.error) throw packed.error;
if (packed.status !== 0) process.exit(packed.status ?? 1);
const outputLines = String(packed.stdout || '').trim().split('\n').filter(Boolean);
const metadata = JSON.parse(outputLines.at(-1) || '');
if (metadata.version !== version) throw new Error(`packed browser package version mismatch: ${metadata.version}`);

const tag = `v${version}`;
const manifestName = `go-admin-client-${tag}.json`;
const checksumName = `${metadata.filename}.sha256`;
const manifest = {
  schemaVersion: 1,
  name: metadata.name,
  version,
  goAdminTag: tag,
  quickstartTag: `quickstart/${tag}`,
  asset: {
    filename: metadata.filename,
    url: `https://github.com/${repository}/releases/download/${tag}/${metadata.filename}`,
    size: metadata.size,
    sha256: metadata.sha256,
    integrity: metadata.integrity,
  },
};
if (commit) {
  if (!/^[a-f0-9]{40,64}$/.test(commit)) throw new Error('--commit must be a full hexadecimal commit id');
  manifest.source = { repository: `https://github.com/${repository}.git`, commit };
}
writeFileSync(join(destination, manifestName), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(join(destination, checksumName), `${metadata.sha256}  ${basename(metadata.filename)}\n`);
process.stdout.write(`${JSON.stringify({
  manifest: manifestName,
  checksum: checksumName,
  artifact: metadata.filename,
})}\n`);
