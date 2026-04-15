import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = resolve(__dirname, '..');
const DIST_DIR = resolve(ASSETS_DIR, 'dist');
const GALLERY_TEMPLATE_PATH = resolve(ASSETS_DIR, '../templates/resources/media/gallery.html');
const LIST_TEMPLATE_PATH = resolve(ASSETS_DIR, '../templates/resources/media/list.html');
const DIST_BUNDLE_PATH = resolve(DIST_DIR, 'media/index.js');

test('media templates reference the built media bundle', () => {
  const gallery = readFileSync(GALLERY_TEMPLATE_PATH, 'utf-8');
  const list = readFileSync(LIST_TEMPLATE_PATH, 'utf-8');
  assert.match(gallery, /assets\/dist\/media\/index\.js/);
  assert.match(list, /assets\/dist\/media\/index\.js/);
});

test('media bundle exists in dist', () => {
  assert.ok(existsSync(DIST_BUNDLE_PATH), `Expected media bundle to exist: ${DIST_BUNDLE_PATH}`);
});

test('media bundle can be imported outside the browser', async () => {
  const mod = await import(pathToFileURL(DIST_BUNDLE_PATH).href);
  assert.equal(typeof mod.initMediaPages, 'function');
});
