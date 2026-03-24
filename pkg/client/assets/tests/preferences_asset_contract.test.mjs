import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = resolve(__dirname, '..');
const DIST_DIR = resolve(ASSETS_DIR, 'dist');
const TEMPLATE_PATH = resolve(ASSETS_DIR, '../templates/resources/preferences/form.html');
const DIST_BUNDLE_PATH = resolve(DIST_DIR, 'formgen/preferences.js');

test('preferences template references the built preferences bundle', () => {
  const template = readFileSync(TEMPLATE_PATH, 'utf-8');
  assert.match(template, /assets\/dist\/formgen\/preferences\.js/);
});

test('preferences bundle exists in dist', () => {
  assert.ok(existsSync(DIST_BUNDLE_PATH), `Expected preferences bundle to exist: ${DIST_BUNDLE_PATH}`);
});
