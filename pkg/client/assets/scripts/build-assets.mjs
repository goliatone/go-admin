#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const distDir = resolve(root, 'dist');
const distStagingDir = resolve(root, '.dist-staging');
const distPrevDir = resolve(root, '.dist-prev');
const distTypesDir = resolve(root, 'dist-types');

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function removeDir(dirPath) {
  rmSync(dirPath, { recursive: true, force: true });
}

function ensureDir(dirPath) {
  mkdirSync(dirPath, { recursive: true });
}

function copyFile(from, to) {
  ensureDir(dirname(to));
  copyFileSync(from, to);
}

function writeConcatenatedFile(target, sources) {
  const content = sources.map((filePath) => readFileSync(filePath, 'utf8')).join('\n');
  ensureDir(dirname(target));
  writeFileSync(target, content);
}

function stageRuntimeAssets() {
  // Build JS bundles into a staging directory first to avoid exposing partial outputs.
  run('vite', ['build', '--outDir', distStagingDir, '--emptyOutDir']);

  // Keep declaration artifacts outside dist so Go embed only tracks runtime assets.
  run('tsc', ['--emitDeclarationOnly', '--outDir', distTypesDir, '--declarationDir', distTypesDir]);

  run('tailwindcss', ['-i', './input.css', '-o', './output.css', '--minify']);
  copyFile(resolve(root, 'output.css'), resolve(distStagingDir, 'output.css'));

  copyFile(resolve(root, 'src/datatable/actions.css'), resolve(distStagingDir, 'styles/datatable-actions.css'));
  writeConcatenatedFile(resolve(distStagingDir, 'styles/debug.css'), [
    resolve(root, 'src/styles/debug/console.css'),
    resolve(root, 'src/styles/debug/prism-catppuccin.css'),
    resolve(root, 'src/styles/debug/expandable-rows.css'),
  ]);
  copyFile(resolve(root, 'src/styles/widgets.css'), resolve(distStagingDir, 'styles/widgets.css'));
  copyFile(resolve(root, 'src/styles/error-page.css'), resolve(distStagingDir, 'styles/error-page.css'));
  copyFile(resolve(root, 'src/styles/export.css'), resolve(distStagingDir, 'styles/export.css'));
  copyFile(resolve(root, 'src/styles/activity.css'), resolve(distStagingDir, 'styles/activity.css'));
  copyFile(resolve(root, 'src/styles/site-runtime.css'), resolve(distStagingDir, 'styles/site-runtime.css'));

  copyFile(resolve(root, 'src/site/site-runtime.js'), resolve(distStagingDir, 'runtime/site-runtime.js'));
}

function swapDistAtomically() {
  let movedPrevious = false;
  try {
    if (existsSync(distDir)) {
      renameSync(distDir, distPrevDir);
      movedPrevious = true;
    }
    renameSync(distStagingDir, distDir);
    removeDir(distPrevDir);
  } catch (err) {
    // Roll back to previous dist if swap failed mid-way.
    if (existsSync(distStagingDir)) {
      removeDir(distStagingDir);
    }
    if (movedPrevious && !existsSync(distDir) && existsSync(distPrevDir)) {
      renameSync(distPrevDir, distDir);
    }
    throw err;
  }
}

function main() {
  removeDir(distStagingDir);
  removeDir(distPrevDir);
  removeDir(distTypesDir);
  ensureDir(distStagingDir);

  stageRuntimeAssets();
  swapDistAtomically();
}

main();
