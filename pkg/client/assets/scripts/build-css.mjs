#!/usr/bin/env node

import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  composeAdminStylesheet,
  copyAdminStylesheet,
  writeLegacyComponentStylesheet,
} from './component-styles.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// A fresh processor also reloads config and source candidates during watch builds.
export async function buildCSS(outputPath = resolve(root, 'output.css')) {
  const inputPath = resolve(root, 'input.css');
  const result = await postcss([tailwindcss({ base: root, optimize: true })]).process(
    readFileSync(inputPath, 'utf8'),
    { from: inputPath, to: outputPath, map: false },
  );
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, result.css);
  composeAdminStylesheet(root, outputPath);
  if (outputPath === resolve(root, 'output.css')) {
    copyAdminStylesheet(outputPath, resolve(root, 'dist/output.css'));
    writeLegacyComponentStylesheet(root, resolve(root, 'dist/styles/datatable-actions.css'));
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--output')) {
    throw new Error('Usage: build-css.mjs [--output path]');
  }
  await buildCSS(args.length ? resolve(args[1]) : undefined);
}
