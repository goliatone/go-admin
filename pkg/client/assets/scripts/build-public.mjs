#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'dist-public');
const declarationStaging = resolve(root, '.dist-public-types');

function localBinary(command) {
  const name = process.platform === 'win32' ? `${command}.cmd` : command;
  const candidate = resolve(root, 'node_modules', '.bin', name);
  return existsSync(candidate) ? candidate : command;
}

function run(command, args) {
  const result = spawnSync(localBinary(command), args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function copyDeclarations(source, destination) {
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const sourcePath = join(source, entry.name);
    const relativePath = relative(declarationStaging, sourcePath).replaceAll('\\', '/');
    const topLevel = relativePath.split('/')[0];
    const allowedTopLevels = new Set([
      'public.d.ts',
      'public.d.ts.map',
      'components',
      'shared',
      'services',
      'toast',
      'datatable',
      'translation-contracts',
      'renderers',
    ]);
    if (!allowedTopLevels.has(topLevel)) {
      continue;
    }
    const destinationPath = join(destination, entry.name);
    if (entry.isDirectory()) {
      mkdirSync(destinationPath, { recursive: true });
      copyDeclarations(sourcePath, destinationPath);
    } else if (entry.name.endsWith('.d.ts') || entry.name.endsWith('.d.ts.map')) {
      mkdirSync(dirname(destinationPath), { recursive: true });
      cpSync(sourcePath, destinationPath);
    }
  }
}

rmSync(output, { recursive: true, force: true });
rmSync(declarationStaging, { recursive: true, force: true });
run('vite', ['build', '--config', 'vite.public.config.ts']);
run('tsc', ['--emitDeclarationOnly', '--outDir', declarationStaging, '--declarationDir', declarationStaging]);
copyDeclarations(declarationStaging, resolve(output, 'types'));
rmSync(declarationStaging, { recursive: true, force: true });

const packageJSON = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
for (const [subpath, target] of Object.entries(packageJSON.exports ?? {})) {
  for (const field of ['types', 'import', 'default']) {
    if (target[field] && !existsSync(resolve(root, target[field]))) {
      throw new Error(`missing ${field} target for ${subpath}: ${target[field]}`);
    }
  }
}
