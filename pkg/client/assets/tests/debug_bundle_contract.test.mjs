import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = resolve(__dirname, '..');
const DIST_CHUNKS_DIR = resolve(ASSETS_DIR, 'dist/chunks');

function findBuiltinPanelsChunk() {
  return readdirSync(DIST_CHUNKS_DIR).find((name) =>
    name.startsWith('builtin-panels-') && name.endsWith('.js'),
  );
}

test('debug builtin-panels chunk imports without Prism global errors', async () => {
  const chunkName = findBuiltinPanelsChunk();
  assert.ok(chunkName, 'Expected dist/chunks/builtin-panels-*.js to exist');

  try {
    await import(pathToFileURL(resolve(DIST_CHUNKS_DIR, chunkName)).href);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    assert.doesNotMatch(message, /Prism is not defined/);

    if (
      message.includes('window is not defined') ||
      message.includes('document is not defined') ||
      message.includes('HTMLElement is not defined') ||
      message.includes('customElements is not defined')
    ) {
      return;
    }

    throw err;
  }
});
