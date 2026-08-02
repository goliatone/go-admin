#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const root = resolve(import.meta.dirname, '..');
const packageJSON = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const args = process.argv.slice(2);
const destinationIndex = args.indexOf('--destination');
const destination = destinationIndex >= 0 ? resolve(args[destinationIndex + 1] || '') : root;
const temporary = mkdtempSync(join(tmpdir(), 'go-admin-client-pack-'));
const first = join(temporary, 'first');
const second = join(temporary, 'second');
const forbidden = /(^|[^a-z0-9])e[-_. ]?sign(?=$|[^a-z0-9])/i;

function run(command, commandArgs, cwd = root, capture = false) {
  const result = spawnSync(command, commandArgs, {
    cwd,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${commandArgs.join(' ')} failed\n${result.stdout ?? ''}\n${result.stderr ?? ''}`);
  }
  return result.stdout ?? '';
}

function digest(buffer, algorithm) {
  return createHash(algorithm).update(buffer).digest(algorithm === 'sha512' ? 'base64' : 'hex');
}

function files(directory, base = directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path, base) : [relative(base, path).replaceAll('\\', '/')];
  }).sort();
}

function pack(output) {
  mkdirSync(output, { recursive: true });
  const result = JSON.parse(run('npm', [
    'pack',
    '--ignore-scripts',
    '--json',
    '--pack-destination',
    output,
  ], root, true));
  if (result.length !== 1 || !result[0]?.filename || !Array.isArray(result[0].files)) {
    throw new Error('npm pack did not return exactly one package manifest');
  }
  for (const file of result[0].files) {
    const path = String(file.path || '').replaceAll('\\', '/');
    if (!path.startsWith('dist-public/') && !['package.json', 'README.md', 'LICENSE'].includes(path)) {
      throw new Error(`unexpected packed file: ${path}`);
    }
    if (forbidden.test(path)) throw new Error(`application-specific path leaked into package: ${path}`);
  }
  return join(output, result[0].filename);
}

function inspectArtifact(artifact) {
  const extracted = join(temporary, `extract-${basename(artifact)}`);
  mkdirSync(extracted, { recursive: true });
  const listing = run('tar', ['-tzf', artifact], root, true).trim().split('\n').filter(Boolean);
  for (const path of listing) {
    if (!path.startsWith('package/') || path.includes('../') || path.startsWith('/')) {
      throw new Error(`unsafe package entry: ${path}`);
    }
  }
  run('tar', ['-xzf', artifact, '-C', extracted]);
  const packageRoot = join(extracted, 'package');
  for (const path of files(packageRoot)) {
    if (forbidden.test(path)) throw new Error(`application-specific path leaked into package: ${path}`);
    if (!/\.(?:js|mjs|cjs|ts|json|md|map)$/.test(path)) continue;
    const content = readFileSync(join(packageRoot, path), 'utf8');
    if (forbidden.test(content)) throw new Error(`application-specific content leaked into package: ${path}`);
  }
  const packedJSON = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
  if (packedJSON.name !== packageJSON.name || packedJSON.version !== packageJSON.version) {
    throw new Error(`packed identity mismatch: ${packedJSON.name}@${packedJSON.version}`);
  }
  for (const [subpath, targets] of Object.entries(packedJSON.exports ?? {})) {
    for (const [kind, target] of Object.entries(targets)) {
      const normalized = String(target).replace(/^\.\//, '');
      if (!statSync(join(packageRoot, normalized)).isFile()) {
        throw new Error(`missing packed ${kind} target for ${subpath}: ${target}`);
      }
    }
  }
}

try {
  run(process.execPath, [join(root, 'scripts', 'build-public.mjs')]);
  const firstArtifact = pack(first);
  const secondArtifact = pack(second);
  const firstBytes = readFileSync(firstArtifact);
  const secondBytes = readFileSync(secondArtifact);
  if (!firstBytes.equals(secondBytes)) throw new Error('repeated npm packs are not byte-for-byte deterministic');
  inspectArtifact(firstArtifact);

  mkdirSync(destination, { recursive: true });
  const output = join(destination, basename(firstArtifact));
  copyFileSync(firstArtifact, output);
  process.stdout.write(`${JSON.stringify({
    name: packageJSON.name,
    version: packageJSON.version,
    filename: basename(output),
    size: firstBytes.length,
    sha256: digest(firstBytes, 'sha256'),
    integrity: `sha512-${digest(firstBytes, 'sha512')}`,
  })}\n`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
