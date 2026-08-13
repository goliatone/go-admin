import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  analyzeBundle,
  bundleBudgetPlugin,
  evaluateBundleBudgets,
  formatBudgetFailures,
  suggestedBudget,
  validateBundleBudgetConfig,
} from '../scripts/bundle-budget-plugin.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function chunk(fileName, { name = fileName, code = fileName, imports = [], dynamicImports = [], isEntry = false } = {}) {
  return { type: 'chunk', fileName, name, code, imports, dynamicImports, isEntry };
}

function generousBudget(entries) {
  return {
    entries: Object.fromEntries(entries.map((entry) => [entry, { rawBytes: 1_000_000, gzipBytes: 1_000_000 }])),
    maxChunk: { rawBytes: 1_000_000, gzipBytes: 1_000_000 },
    total: { rawBytes: 1_000_000, gzipBytes: 1_000_000 },
  };
}

test('bundle analysis traverses static imports once and excludes dynamic imports from initial load', () => {
  const analysis = analyzeBundle({
    'entry.js': chunk('entry.js', {
      name: 'entry',
      code: 'entry code',
      imports: ['shared.js', 'common.js'],
      dynamicImports: ['lazy.js'],
      isEntry: true,
    }),
    'shared.js': chunk('shared.js', { code: 'shared code', imports: ['common.js'] }),
    'common.js': chunk('common.js', { code: 'common code' }),
    'lazy.js': chunk('lazy.js', { code: 'lazy code' }),
    'style.css': { type: 'asset', fileName: 'style.css', source: '.fixture{}' },
  });

  assert.deepEqual(analysis.entries.entry.chunks.sort(), ['common.js', 'entry.js', 'shared.js']);
  assert.equal(
    analysis.entries.entry.rawBytes,
    analysis.chunks['entry.js'].rawBytes + analysis.chunks['shared.js'].rawBytes + analysis.chunks['common.js'].rawBytes,
  );
  assert.equal(
    analysis.entries.entry.gzipBytes,
    analysis.chunks['entry.js'].gzipBytes + analysis.chunks['shared.js'].gzipBytes + analysis.chunks['common.js'].gzipBytes,
  );
  assert.equal(analysis.entries.entry.chunks.includes('lazy.js'), false);
  assert.equal(analysis.total.rawBytes, 41);
});

test('budget evaluation rejects missing and unexpected entries', () => {
  const analysis = analyzeBundle({
    'actual.js': chunk('actual.js', { name: 'actual', isEntry: true }),
  });
  const failures = evaluateBundleBudgets(analysis, generousBudget(['configured']));

  assert.deepEqual(failures.map(({ kind, name }) => ({ kind, name })), [
    { kind: 'unexpected-entry', name: 'actual' },
    { kind: 'missing-entry', name: 'configured' },
  ]);
});

test('budget evaluation covers entry, chunk, and aggregate raw and gzip limits', () => {
  const analysis = analyzeBundle({
    'entry.js': chunk('entry.js', { name: 'entry', code: 'nontrivial bundle content'.repeat(20), isEntry: true }),
  });
  const limit = { rawBytes: 1, gzipBytes: 1 };
  const failures = evaluateBundleBudgets(analysis, {
    entries: { entry: limit },
    maxChunk: limit,
    total: limit,
  });

  assert.deepEqual(failures.map(({ kind, metric }) => `${kind}:${metric}`), [
    'entry:rawBytes',
    'entry:gzipBytes',
    'chunk:rawBytes',
    'chunk:gzipBytes',
    'total:rawBytes',
    'total:gzipBytes',
  ]);
  const message = formatBudgetFailures('fixture', failures);
  assert.match(message, /Bundle budget check failed \(fixture\)/);
  assert.match(message, /entry entry gzip/);
  assert.match(message, /update bundle-budgets\.json deliberately/);
});

test('budget configuration requires a supported version, profile, and positive limits', () => {
  const valid = {
    version: 1,
    profiles: { fixture: generousBudget(['entry']) },
  };
  assert.equal(validateBundleBudgetConfig(valid, 'fixture'), valid.profiles.fixture);
  assert.throws(() => validateBundleBudgetConfig({ ...valid, version: 2 }, 'fixture'), /unsupported/);
  assert.throws(() => validateBundleBudgetConfig(valid, 'missing'), /profile is missing/);
  assert.throws(
    () => validateBundleBudgetConfig({
      version: 1,
      profiles: { fixture: { ...generousBudget(['entry']), maxChunk: { rawBytes: 0, gzipBytes: 1 } } },
    }, 'fixture'),
    /positive integer/,
  );
});

test('suggested budgets add five percent with at least one KiB of rounded headroom', () => {
  assert.deepEqual(suggestedBudget({ rawBytes: 1000, gzipBytes: 100_000 }), {
    rawBytes: 2048,
    gzipBytes: 105472,
  });
});

test('the Vite plugin terminates generation when a reviewed limit is exceeded', () => {
  const fixtureDirectory = mkdtempSync(resolve(tmpdir(), 'go-admin-bundle-budget-'));
  const configPath = resolve(fixtureDirectory, 'budgets.json');
  writeFileSync(configPath, JSON.stringify({
    version: 1,
    profiles: {
      fixture: {
        entries: { entry: { rawBytes: 1, gzipBytes: 1 } },
        maxChunk: { rawBytes: 1_000_000, gzipBytes: 1_000_000 },
        total: { rawBytes: 1_000_000, gzipBytes: 1_000_000 },
      },
    },
  }));

  try {
    const plugin = bundleBudgetPlugin({ profile: 'fixture', configPath });
    assert.throws(() => plugin.generateBundle.call({
      error(message) {
        throw new Error(message);
      },
    }, {}, {
      'entry.js': chunk('entry.js', { name: 'entry', code: 'oversized', isEntry: true }),
    }), /Bundle budget check failed \(fixture\)/);
  } finally {
    rmSync(fixtureDirectory, { recursive: true, force: true });
  }
});

test('both Vite graphs own a profile and package reporting remains non-mutating', () => {
  const runtimeConfig = readFileSync(resolve(root, 'vite.config.ts'), 'utf8');
  const publicConfig = readFileSync(resolve(root, 'vite.public.config.ts'), 'utf8');
  const packageJSON = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

  assert.match(runtimeConfig, /bundleBudgetPlugin\(\{ profile: 'runtime' \}\)/);
  assert.match(publicConfig, /bundleBudgetPlugin\(\{ profile: 'public' \}\)/);
  assert.match(packageJSON.scripts['bundle:report'], /GO_ADMIN_BUNDLE_BUDGET_REPORT=1 npm run build/);
  assert.doesNotMatch(packageJSON.scripts['bundle:report'], /write|update/);
});
