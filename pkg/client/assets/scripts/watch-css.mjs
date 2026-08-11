#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, watch, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canonicalComponentStylesPath,
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

const temporaryDir = mkdtempSync(join(tmpdir(), 'go-admin-css-watch-'));
const compiledPath = resolve(temporaryDir, 'tailwind.css');
const outputPath = resolve(root, 'output.css');
writeFileSync(compiledPath, '');

let publishTimer;
function publish() {
  clearTimeout(publishTimer);
  publishTimer = setTimeout(() => {
    try {
      composeAdminStylesheet(root, compiledPath, outputPath);
      copyAdminStylesheet(outputPath, resolve(root, 'dist/output.css'));
      writeLegacyComponentStylesheet(root, resolve(root, 'dist/styles/datatable-actions.css'));
    } catch (error) {
      // Tailwind may be between its atomic write steps. Its next filesystem event
      // retries publication without terminating the development watcher.
      if (error?.code !== 'ENOENT') console.error(error);
    }
  }, 25);
}

const watchers = [
  watch(compiledPath, publish),
  watch(canonicalComponentStylesPath(root), publish),
];
const child = spawn(localBinary('tailwindcss'), [
  '-i', './input.css',
  '-o', compiledPath,
  '--watch',
], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

let closing = false;
function close(signal) {
  if (closing) return;
  closing = true;
  clearTimeout(publishTimer);
  watchers.forEach((watcher) => watcher.close());
  if (!child.killed) child.kill(signal);
  rmSync(temporaryDir, { recursive: true, force: true });
}

process.on('SIGINT', () => close('SIGINT'));
process.on('SIGTERM', () => close('SIGTERM'));
child.on('exit', (code, signal) => {
  close(signal ?? 'SIGTERM');
  process.exitCode = code ?? (signal ? 1 : 0);
});
