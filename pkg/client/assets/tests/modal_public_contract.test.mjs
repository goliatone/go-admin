import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

test('modal public contract has matching source, embedded, package, and declaration targets', () => {
  const packageJSON = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  const target = packageJSON.exports?.['./components/modal'];

  assert.ok(existsSync(resolve(root, 'src/components/modal.ts')), 'public modal facade source');
  assert.match(readFileSync(resolve(root, 'vite.config.ts'), 'utf8'), /['"]components\/modal['"]/);
  assert.match(readFileSync(resolve(root, 'vite.public.config.ts'), 'utf8'), /['"]components\/modal['"]/);
  assert.deepEqual(target, {
    types: './dist-public/types/components/modal.d.ts',
    import: './dist-public/components/modal.js',
    default: './dist-public/components/modal.js',
  });
  assert.ok(existsSync(resolve(root, 'dist/components/modal.js')), 'embedded JavaScript entry');
  assert.ok(existsSync(resolve(root, 'dist-public/components/modal.js')), 'package JavaScript entry');
  const publicEntry = resolve(root, 'dist-public/components/modal.js');
  const entrySource = readFileSync(publicEntry, 'utf8');
  const chunkReference = entrySource.match(/from\s+["']([^"']+\/chunks\/[^"']+\.js)["']/)?.[1];
  const sourceMap = existsSync(`${publicEntry}.map`)
    ? `${publicEntry}.map`
    : chunkReference
      ? resolve(dirname(publicEntry), `${chunkReference}.map`)
      : '';
  assert.ok(sourceMap && existsSync(sourceMap), 'package entry or implementation chunk source map');
  assert.ok(existsSync(resolve(root, 'dist-public/types/components/modal.d.ts')), 'package declaration');
  assert.ok(existsSync(resolve(root, 'dist-public/types/components/modal.d.ts.map')), 'package declaration map');
});

test('public facade is a zero-behavior selected re-export', async () => {
  const facade = readFileSync(resolve(root, 'src/components/modal.ts'), 'utf8');
  assert.match(facade, /from ['"]\.\.\/shared\/modal\.js['"]/);
  assert.doesNotMatch(facade, /class\s+(Modal|ConfirmModal|TextPromptModal)\b/);

  const publicModal = await import('../dist-public/components/modal.js');
  const embeddedModal = await import('../dist/components/modal.js');
  assert.deepEqual(Object.keys(publicModal).sort(), Object.keys(embeddedModal).sort());
  assert.deepEqual(Object.keys(publicModal).sort(), ['ConfirmModal', 'Modal', 'TextPromptModal']);
});
