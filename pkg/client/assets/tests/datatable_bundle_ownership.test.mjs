import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const assetsRoot = path.resolve(here, '..');
const dist = path.resolve(assetsRoot, 'dist');
const templatesRoot = path.resolve(assetsRoot, '../templates');

function staticClosure(entry) {
  const pending = [path.resolve(dist, entry)];
  const visited = new Set();
  while (pending.length > 0) {
    const file = pending.pop();
    if (visited.has(file)) continue;
    visited.add(file);
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/\b(?:import|export)\s+(?:[^"'()]*?\s+from\s*)?["']([^"']+)["']/g)) {
      if (match[1].startsWith('.')) pending.push(path.resolve(path.dirname(file), match[1]));
    }
  }
  return visited;
}

function closureSources(entry) {
  const sources = [];
  for (const file of staticClosure(entry)) {
    const mapFile = `${file}.map`;
    if (fs.existsSync(mapFile)) {
      sources.push(...JSON.parse(fs.readFileSync(mapFile, 'utf8')).sources);
    }
  }
  return sources.join('\n');
}

test('focused DataTable entries do not statically own FilterBuilder', () => {
  for (const entry of [
    'datatable/runtime.js',
    'datatable/content-runtime.js',
    'datatable/detail-runtime.js',
    'datatable/filter-builder-loader.js',
  ]) {
    assert.doesNotMatch(closureSources(entry), /src\/datatable\/filter-builder\.ts/, entry);
  }
  assert.match(closureSources('datatable/index.js'), /src\/datatable\/filter-builder\.ts/);
});

test('first-party templates compose focused DataTable entries', () => {
  const sources = fs.readdirSync(path.resolve(templatesRoot, 'resources'), { recursive: true })
    .filter((name) => String(name).endsWith('.html'))
    .map((name) => fs.readFileSync(path.resolve(templatesRoot, 'resources', name), 'utf8'))
    .join('\n');

  assert.doesNotMatch(sources, /assets\/dist\/datatable\/index\.js/);
  assert.doesNotMatch(sources, /\bnew FilterBuilder\s*\(/);
  assert.match(sources, /assets\/dist\/datatable\/runtime\.js/);
  assert.match(sources, /assets\/dist\/datatable\/filter-builder-loader\.js/);
  assert.match(sources, /assets\/dist\/datatable\/content-runtime\.js/);
  assert.match(sources, /assets\/dist\/datatable\/detail-runtime\.js/);
});

