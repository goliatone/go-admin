import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

test('component stylesheet artifacts are fresh and embedded exactly once from one source', () => {
  const source = readFileSync(resolve(root, 'src/styles/components.css'));
  const publicArtifact = readFileSync(resolve(root, 'dist-public/components.css'));
  const embeddedArtifact = readFileSync(resolve(root, 'dist/output.css'), 'utf8');
  const legacyArtifact = readFileSync(resolve(root, 'dist/styles/datatable-actions.css'));

  assert.deepEqual(publicArtifact, source, 'public CSS artifact drifted from canonical source');
  assert.ok(embeddedArtifact.endsWith(source.toString()), 'embedded admin CSS must compose canonical component source');
  assert.equal(embeddedArtifact.split(source.toString()).length - 1, 1, 'embedded admin CSS must contain one canonical component source');
  assert.deepEqual(legacyArtifact, source, 'legacy DataGrid compatibility CSS drifted from canonical source');
  assert.equal(existsSync(resolve(root, 'dist-public/components.css.map')), false, 'direct-copy CSS must not publish a source map');
});

test('every supported CSS workflow uses canonical composition without linking the compatibility copy', () => {
  const packageJSON = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  assert.equal(packageJSON.scripts['build:css'], 'node ./scripts/build-css.mjs');
  assert.equal(packageJSON.scripts['build:css:prod'], 'node ./scripts/build-css.mjs');
  assert.equal(packageJSON.scripts['watch:css'], 'node ./scripts/watch-css.mjs');

  const layout = readFileSync(resolve(root, '../templates/layout.html'), 'utf8');
  assert.match(layout, /assets\/output\.css/);
  assert.doesNotMatch(layout, /datatable-actions\.css/, 'canonical shell must not load the generated compatibility copy');
});

test('component stylesheet has a stable package export and CSS media type', () => {
  const packageJSON = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  assert.equal(packageJSON.exports?.['./components.css'], './dist-public/components.css');
  assert.equal(new Response(readFileSync(resolve(root, 'dist-public/components.css')), {
    headers: { 'Content-Type': 'text/css; charset=utf-8' },
  }).headers.get('Content-Type'), 'text/css; charset=utf-8');
});

test('every supported package export resolves inside the clean public artifact tree', () => {
  const packageJSON = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  const targets = [];
  const visit = (value) => {
    if (typeof value === 'string') {
      targets.push(value);
      return;
    }
    if (value && typeof value === 'object') Object.values(value).forEach(visit);
  };
  Object.values(packageJSON.exports || {}).forEach(visit);

  assert.ok(targets.length > 0, 'package must declare explicit public targets');
  for (const target of targets) {
    assert.match(target, /^\.\/dist-public\//, `public target escaped dist-public: ${target}`);
    assert.equal(target.includes('/src/'), false, `public target references source: ${target}`);
    assert.equal(existsSync(resolve(root, target)), true, `public target is missing: ${target}`);
  }
  const cssExports = Object.entries(packageJSON.exports || {}).filter(([, value]) => typeof value === 'string');
  assert.deepEqual(cssExports, [['./components.css', './dist-public/components.css']]);
});
