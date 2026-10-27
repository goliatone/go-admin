import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const packageRoot = resolve(import.meta.dirname, '..');

// Exercise the production packer with real local npm/tar archives. Only the
// compiler is replaced: these cases isolate artifact policy from compilation.
function packFixture(t, configure = () => {}) {
  const temporary = mkdtempSync(join(tmpdir(), 'go-admin-release-package-test-'));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const root = join(temporary, 'source');
  const destination = join(temporary, 'artifacts');
  mkdirSync(join(root, 'scripts'), { recursive: true });
  mkdirSync(join(root, 'dist-public'));
  copyFileSync(join(packageRoot, 'scripts/pack-public-package.mjs'), join(root, 'scripts/pack-public-package.mjs'));
  writeFileSync(join(root, 'scripts/build-public.mjs'), 'export {};\n');
  const manifest = {
    name: 'go-admin-release-package-fixture',
    version: '1.0.0',
    type: 'module',
    files: ['dist-public/', 'README.md', 'LICENSE'],
    exports: {
      '.': { types: './dist-public/index.d.ts', import: './dist-public/index.js' },
      './style.css': './dist-public/style.css',
    },
  };
  writeFileSync(join(root, 'dist-public/index.js'), 'export const value = 1;\n');
  writeFileSync(join(root, 'dist-public/index.d.ts'), 'export declare const value: number;\n');
  writeFileSync(join(root, 'dist-public/style.css'), ':root { color: black; }\n');
  configure(root, manifest);
  writeFileSync(join(root, 'package.json'), JSON.stringify(manifest));
  const result = spawnSync(process.execPath, [join(root, 'scripts/pack-public-package.mjs'), '--destination', destination], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.ifError(result.error);
  return { ...result, destination };
}

test('release packing accepts absent documentation and arbitrary README prose', (t) => {
  for (const readme of [undefined, 'No e-sign integration. [Stale link](missing.md).\n']) {
    const result = packFixture(t, (root) => {
      if (readme !== undefined) writeFileSync(join(root, 'README.md'), readme);
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readdirSync(result.destination).length, 1);
  }
});

test('release packing still rejects application-specific code, declarations, maps and paths', (t) => {
  for (const [path, content] of [
    ['index.js', 'export const value = "e-sign";\n'],
    ['index.d.ts', 'export declare const value: "e-sign";\n'],
    ['index.js.map', '{"sources":["e-sign.ts"]}\n'],
    ['e-sign.js', 'export {};\n'],
  ]) {
    const result = packFixture(t, (root) => writeFileSync(join(root, 'dist-public', path), content));
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /application-specific (?:content|path) leaked into package/);
  }
});

test('release packing requires runtime, declaration and string export targets', (t) => {
  for (const path of ['index.js', 'index.d.ts', 'style.css']) {
    const result = packFixture(t, (root) => rmSync(join(root, 'dist-public', path)));
    assert.notEqual(result.status, 0);
    assert.ok(result.stderr.includes(path), result.stderr);
  }
});
