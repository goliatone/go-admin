#!/usr/bin/env node

import { watch } from 'node:fs';
import { resolve } from 'node:path';
import { buildCSS } from './build-css.mjs';

const root = resolve(import.meta.dirname, '..');
let timer;
let running = false;
let pending = false;
let closing = false;

async function rebuild() {
  if (closing) return;
  pending = true;
  if (running) return;
  running = true;
  try {
    while (pending && !closing) {
      pending = false;
      try {
        await buildCSS();
      } catch (error) {
        console.error(error);
      }
    }
  } finally {
    running = false;
  }
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(rebuild, 75);
}

// Watch directories so editor atomic-renames do not detach file watchers.
// Source watching uses Node's supported recursive watcher, with no glob parser.
const watchers = [
  watch(root, (_event, file) => {
    if (['input.css', 'tailwind.config.cjs'].includes(String(file))) schedule();
  }),
  watch(resolve(root, 'src'), { recursive: true }, schedule),
  watch(resolve(root, '../templates'), { recursive: true }, schedule),
];

function close() {
  closing = true;
  clearTimeout(timer);
  watchers.forEach((watcher) => watcher.close());
}
process.on('SIGINT', close);
process.on('SIGTERM', close);
await rebuild();
