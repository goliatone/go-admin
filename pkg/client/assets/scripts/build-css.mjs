#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  composeAdminStylesheet,
  copyAdminStylesheet,
  writeLegacyComponentStylesheet,
} from './component-styles.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function localBinary(command) {
  const name = process.platform === 'win32' ? `${command}.cmd` : command;
  const candidate = resolve(root, 'node_modules', '.bin', name);
  return existsSync(candidate) ? candidate : command;
}

const temporaryDir = mkdtempSync(join(tmpdir(), 'go-admin-css-'));
const compiledPath = resolve(temporaryDir, 'tailwind.css');
const outputPath = resolve(root, 'output.css');
let exitStatus = 0;

try {
  const result = spawnSync(localBinary('tailwindcss'), [
    '-i', './input.css',
    '-o', compiledPath,
    '--minify',
  ], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  exitStatus = result.status ?? 1;
  if (exitStatus === 0) {
    composeAdminStylesheet(root, compiledPath, outputPath);
    copyAdminStylesheet(outputPath, resolve(root, 'dist/output.css'));
    writeLegacyComponentStylesheet(root, resolve(root, 'dist/styles/datatable-actions.css'));
  }
} finally {
  rmSync(temporaryDir, { recursive: true, force: true });
}

process.exitCode = exitStatus;
