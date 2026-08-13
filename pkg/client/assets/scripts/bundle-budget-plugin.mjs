import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultConfigPath = resolve(scriptDirectory, '..', 'bundle-budgets.json');

function bytes(value) {
  if (typeof value === 'string') return Buffer.byteLength(value);
  if (value instanceof Uint8Array) return value.byteLength;
  throw new TypeError('bundle content must be a string or Uint8Array');
}

function compressedBytes(value) {
  return gzipSync(value, { level: 9 }).byteLength;
}

function assertLimit(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${path} must be an object`);
  }
  for (const metric of ['rawBytes', 'gzipBytes']) {
    if (!Number.isSafeInteger(value[metric]) || value[metric] <= 0) {
      throw new Error(`${path}.${metric} must be a positive integer`);
    }
  }
}

export function validateBundleBudgetConfig(config, profile) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('bundle budget configuration must be an object');
  }
  if (config.version !== 1) {
    throw new Error(`unsupported bundle budget configuration version: ${String(config.version)}`);
  }
  const selected = config.profiles?.[profile];
  if (!selected || typeof selected !== 'object' || Array.isArray(selected)) {
    throw new Error(`bundle budget profile is missing: ${profile}`);
  }
  if (!selected.entries || typeof selected.entries !== 'object' || Array.isArray(selected.entries)) {
    throw new Error(`profiles.${profile}.entries must be an object`);
  }
  for (const [entry, limit] of Object.entries(selected.entries)) {
    if (!entry.trim()) throw new Error(`profiles.${profile}.entries contains a blank name`);
    assertLimit(limit, `profiles.${profile}.entries.${entry}`);
  }
  assertLimit(selected.maxChunk, `profiles.${profile}.maxChunk`);
  assertLimit(selected.total, `profiles.${profile}.total`);
  return selected;
}

export function analyzeBundle(bundle) {
  const chunks = {};
  const entryNames = new Set();

  for (const output of Object.values(bundle)) {
    if (output.type !== 'chunk') continue;
    const rawBytes = bytes(output.code);
    const gzipBytes = compressedBytes(output.code);
    chunks[output.fileName] = {
      fileName: output.fileName,
      name: output.name,
      isEntry: Boolean(output.isEntry),
      imports: [...(output.imports ?? [])],
      dynamicImports: [...(output.dynamicImports ?? [])],
      rawBytes,
      gzipBytes,
    };
    if (output.isEntry) {
      if (entryNames.has(output.name)) {
        throw new Error(`duplicate bundle entry name: ${output.name}`);
      }
      entryNames.add(output.name);
    }
  }

  const entries = {};
  for (const chunk of Object.values(chunks)) {
    if (!chunk.isEntry) continue;
    const reachable = new Set();
    const pending = [chunk.fileName];
    while (pending.length > 0) {
      const fileName = pending.pop();
      if (reachable.has(fileName)) continue;
      const current = chunks[fileName];
      if (!current) continue;
      reachable.add(fileName);
      for (const imported of current.imports) pending.push(imported);
    }
    const contributors = [...reachable]
      .map((fileName) => chunks[fileName])
      .sort((left, right) => right.gzipBytes - left.gzipBytes || left.fileName.localeCompare(right.fileName));
    entries[chunk.name] = {
      fileName: chunk.fileName,
      chunks: contributors.map((item) => item.fileName),
      rawBytes: contributors.reduce((total, item) => total + item.rawBytes, 0),
      gzipBytes: contributors.reduce((total, item) => total + item.gzipBytes, 0),
      contributors,
    };
  }

  const chunkList = Object.values(chunks).sort((left, right) => left.fileName.localeCompare(right.fileName));
  return {
    chunks,
    entries,
    total: {
      rawBytes: chunkList.reduce((total, chunk) => total + chunk.rawBytes, 0),
      gzipBytes: chunkList.reduce((total, chunk) => total + chunk.gzipBytes, 0),
    },
  };
}

function compareLimit(failures, kind, name, measurement, limit, contributors = []) {
  for (const metric of ['rawBytes', 'gzipBytes']) {
    if (measurement[metric] > limit[metric]) {
      failures.push({
        kind,
        name,
        metric,
        actual: measurement[metric],
        limit: limit[metric],
        contributors,
      });
    }
  }
}

export function evaluateBundleBudgets(analysis, profileBudget) {
  const failures = [];
  const actualEntries = new Set(Object.keys(analysis.entries));
  const configuredEntries = new Set(Object.keys(profileBudget.entries));

  for (const name of [...actualEntries].sort()) {
    if (!configuredEntries.has(name)) failures.push({ kind: 'unexpected-entry', name });
  }
  for (const name of [...configuredEntries].sort()) {
    if (!actualEntries.has(name)) failures.push({ kind: 'missing-entry', name });
  }
  for (const name of [...actualEntries].sort()) {
    const limit = profileBudget.entries[name];
    if (!limit) continue;
    const entry = analysis.entries[name];
    compareLimit(failures, 'entry', name, entry, limit, entry.contributors);
  }
  for (const chunk of Object.values(analysis.chunks).sort((left, right) => left.fileName.localeCompare(right.fileName))) {
    compareLimit(failures, 'chunk', chunk.fileName, chunk, profileBudget.maxChunk);
  }
  compareLimit(failures, 'total', 'all JavaScript chunks', analysis.total, profileBudget.total);
  return failures;
}

function kib(value) {
  return `${(value / 1024).toFixed(2)} KiB`;
}

function metricLabel(metric) {
  return metric === 'gzipBytes' ? 'gzip' : 'raw';
}

export function formatBudgetFailures(profile, failures) {
  const lines = [`Bundle budget check failed (${profile}):`];
  for (const failure of failures) {
    if (failure.kind === 'unexpected-entry') {
      lines.push(`- unexpected entry without a reviewed budget: ${failure.name}`);
      continue;
    }
    if (failure.kind === 'missing-entry') {
      lines.push(`- configured entry was not emitted: ${failure.name}`);
      continue;
    }
    lines.push(
      `- ${failure.kind} ${failure.name} ${metricLabel(failure.metric)}: ` +
        `${kib(failure.actual)} > ${kib(failure.limit)} ` +
        `(+${kib(failure.actual - failure.limit)})`,
    );
    if (failure.kind === 'entry' && failure.contributors.length > 1) {
      const contributors = failure.contributors
        .slice(0, 5)
        .map((chunk) => `${chunk.fileName} ${kib(chunk[failure.metric])}`)
        .join(', ');
      lines.push(`  largest contributors: ${contributors}`);
    }
  }
  lines.push('Review the dependency change or update bundle-budgets.json deliberately.');
  return lines.join('\n');
}

export function suggestedBudget(measurement) {
  return Object.fromEntries(['rawBytes', 'gzipBytes'].map((metric) => {
    const withHeadroom = Math.max(measurement[metric] * 1.05, measurement[metric] + 1024);
    return [metric, Math.ceil(withHeadroom / 1024) * 1024];
  }));
}

export function formatBundleReport(profile, analysis, profileBudget) {
  const lines = [`Bundle budget report (${profile}):`];
  for (const [name, entry] of Object.entries(analysis.entries).sort(([left], [right]) => left.localeCompare(right))) {
    const limit = profileBudget.entries[name];
    const suffix = limit
      ? ` (limits ${kib(limit.rawBytes)} raw / ${kib(limit.gzipBytes)} gzip)`
      : ' (unbudgeted)';
    lines.push(
      `- ${name}: ${kib(entry.rawBytes)} raw / ${kib(entry.gzipBytes)} gzip${suffix}; ` +
        `suggested ${JSON.stringify(suggestedBudget(entry))}`,
    );
  }
  const maximumChunk = Object.values(analysis.chunks).reduce((maximum, chunk) => ({
    rawBytes: Math.max(maximum.rawBytes, chunk.rawBytes),
    gzipBytes: Math.max(maximum.gzipBytes, chunk.gzipBytes),
  }), { rawBytes: 0, gzipBytes: 0 });
  lines.push(
    `- maximum chunk: ${kib(maximumChunk.rawBytes)} raw / ${kib(maximumChunk.gzipBytes)} gzip; ` +
      `suggested ${JSON.stringify(suggestedBudget(maximumChunk))}`,
  );
  lines.push(
    `- total: ${kib(analysis.total.rawBytes)} raw / ${kib(analysis.total.gzipBytes)} gzip; ` +
      `suggested ${JSON.stringify(suggestedBudget(analysis.total))}`,
  );
  return lines.join('\n');
}

export function bundleBudgetPlugin({ profile, configPath = defaultConfigPath } = {}) {
  if (!profile) throw new Error('bundle budget profile is required');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const profileBudget = validateBundleBudgetConfig(config, profile);

  return {
    name: `go-admin-bundle-budget-${profile}`,
    apply: 'build',
    generateBundle(_outputOptions, bundle) {
      const analysis = analyzeBundle(bundle);
      const failures = evaluateBundleBudgets(analysis, profileBudget);
      if (process.env.GO_ADMIN_BUNDLE_BUDGET_REPORT === '1') {
        console.log(formatBundleReport(profile, analysis, profileBudget));
      }
      if (failures.length > 0) this.error(formatBudgetFailures(profile, failures));
    },
  };
}
