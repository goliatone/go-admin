import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');

function staticClosure(entry) {
  const pending = [path.resolve(dist, entry)];
  const visited = new Set();
  while (pending.length > 0) {
    const file = pending.pop();
    if (visited.has(file)) continue;
    visited.add(file);
    const source = fs.readFileSync(file, 'utf8');
    const imports = [
      ...source.matchAll(/\b(?:import|export)\s+(?:[^"'()]*?\s+from\s*)?["']([^"']+)["']/g),
    ];
    for (const match of imports) {
      if (!match[1].startsWith('.')) continue;
      pending.push(path.resolve(path.dirname(file), match[1]));
    }
  }
  return visited;
}

function closureSources(entry) {
  const sources = [];
  for (const file of staticClosure(entry)) {
    const mapFile = `${file}.map`;
    if (!fs.existsSync(mapFile)) continue;
    sources.push(...JSON.parse(fs.readFileSync(mapFile, 'utf8')).sources);
  }
  return sources.join('\n');
}

test('initial debug graphs do not own deferred engines', () => {
  for (const entry of ['debug/index.js', 'debug/toolbar.js', 'debug/toolbar-bootstrap.js']) {
    const sources = closureSources(entry);
    assert.doesNotMatch(sources, /node_modules\/(?:@xterm|jsonpath-plus|prismjs|sql-formatter)/, entry);
  }
});

test('collapsed toolbar bootstrap does not own the full toolbar implementation', () => {
  const sources = closureSources('debug/toolbar-bootstrap.js');
  assert.doesNotMatch(sources, /src\/debug\/toolbar\/debug-toolbar\.ts/, sources);
  assert.match(sources, /src\/debug\/toolbar\/debug-fab\.ts/);
});
