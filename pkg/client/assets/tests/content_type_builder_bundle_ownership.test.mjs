import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const assetsRoot = path.resolve(here, '..');
const dist = path.resolve(assetsRoot, 'dist');
const templatesRoot = path.resolve(assetsRoot, '../templates/resources');

function staticClosure(entry) {
  const pending = [path.resolve(dist, entry)];
  const visited = new Set();
  while (pending.length > 0) {
    const file = pending.pop();
    if (visited.has(file)) continue;
    visited.add(file);
    const source = fs.readFileSync(file, 'utf8');
    for (const line of source.split('\n')) {
      const match = line.match(/^(?:import|export).*?from ["']([^"']+)["']/);
      if (match?.[1].startsWith('.')) pending.push(path.resolve(path.dirname(file), match[1]));
    }
  }
  return visited;
}

function closureSources(entry) {
  const sources = [];
  for (const file of staticClosure(entry)) {
    const mapFile = `${file}.map`;
    if (fs.existsSync(mapFile)) sources.push(...JSON.parse(fs.readFileSync(mapFile, 'utf8')).sources);
  }
  return sources.join('\n');
}

test('content-type-builder bootstrap owns neither editor application', () => {
  const sources = closureSources('content-type-builder/bootstrap.js');
  assert.doesNotMatch(sources, /content-type-builder\/content-type-editor\.ts/);
  assert.doesNotMatch(sources, /content-type-builder\/block-library-ide\.ts/);
  assert.doesNotMatch(sources, /content-type-builder\/block-editor-panel\.ts/);
});

test('focused content-type-builder runtimes do not own the sibling application', () => {
  const editorSources = closureSources('content-type-builder/content-editor-runtime.js');
  const blockSources = closureSources('content-type-builder/block-library-runtime.js');
  assert.match(editorSources, /content-type-builder\/content-type-editor\.ts/);
  assert.doesNotMatch(editorSources, /content-type-builder\/block-library-ide\.ts/);
  assert.doesNotMatch(editorSources, /content-type-builder\/block-editor-panel\.ts/);
  assert.match(blockSources, /content-type-builder\/block-library-ide\.ts/);
  assert.match(blockSources, /content-type-builder\/block-editor-panel\.ts/);
  assert.doesNotMatch(blockSources, /content-type-builder\/content-type-editor\.ts/);
});

test('first-party builder templates use the root-aware bootstrap', () => {
  const editor = fs.readFileSync(path.resolve(templatesRoot, 'content-types/editor.html'), 'utf8');
  const blocks = fs.readFileSync(path.resolve(templatesRoot, 'block-definitions/index.html'), 'utf8');
  for (const source of [editor, blocks]) {
    assert.match(source, /assets\/dist\/content-type-builder\/bootstrap\.js/);
    assert.doesNotMatch(source, /assets\/dist\/content-type-builder\/index\.js/);
  }
});

