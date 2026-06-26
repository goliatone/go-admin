import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const esbuildBin = resolve(root, 'node_modules/.bin/esbuild');
const esbuildCmd = existsSync(esbuildBin) ? esbuildBin : 'esbuild';

async function loadCompiledIconRenderer() {
  const tempDir = mkdtempSync(join(tmpdir(), 'go-admin-icon-renderer-'));
  const outFile = resolve(tempDir, 'icon-renderer.mjs');
  const result = spawnSync(esbuildCmd, [
    resolve(root, 'src/shared/icon-renderer.ts'),
    '--bundle',
    '--format=esm',
    '--platform=node',
    '--target=es2020',
    `--outfile=${outFile}`,
  ], {
    cwd: root,
    encoding: 'utf8',
  });

  if (result.error) {
    rmSync(tempDir, { recursive: true, force: true });
    throw result.error;
  }
  assert.equal(result.status, 0, result.stderr || result.stdout);

  try {
    return await import(pathToFileURL(outFile).href);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

test('shared icon renderer aliases common unsupported Iconoir names at runtime', async () => {
  const { renderIcon } = await loadCompiledIconRenderer();

  for (const [input, expectedClass] of [
    ['file-text', 'iconoir-page'],
    ['file', 'iconoir-page'],
    ['alert-triangle', 'iconoir-warning-triangle'],
    ['iconoir:file-text', 'iconoir-page'],
    ['lucide:file-text', 'iconoir-page'],
    ['feather:alert-triangle', 'iconoir-warning-triangle'],
  ]) {
    const html = renderIcon(input);
    assert.match(html, new RegExp(`class="${expectedClass}\\b`), `${input} should render ${expectedClass}`);
    assert.doesNotMatch(html, /(?:lucide|feather)-(?:file-text|alert-triangle)\b/);
  }
});

test('shared icon renderer preserves unknown qualified library icons', async () => {
  const { renderIcon } = await loadCompiledIconRenderer();

  assert.match(renderIcon('lucide:home'), /class="lucide-home\b/);
  assert.match(renderIcon('feather:home'), /class="feather-home\b/);
  assert.match(renderIcon('custom:home'), /class="custom-home\b/);
  assert.doesNotMatch(renderIcon('lucide:home'), /class="iconoir-home\b/);
});
