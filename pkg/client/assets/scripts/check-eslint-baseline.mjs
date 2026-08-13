#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { ESLint } from 'eslint';

const packageRoot = resolve(import.meta.dirname, '..');
const baselinePath = resolve(packageRoot, 'eslint-baseline.json');

function findingKey(finding) {
  return `${finding.file}:${finding.line}:${finding.column}:${finding.rule}`;
}

function countByKey(findings) {
  const counts = new Map();
  for (const finding of findings) {
    const key = findingKey(finding);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function difference(findings, available) {
  const remaining = new Map(available);
  return findings.filter((finding) => {
    const key = findingKey(finding);
    const count = remaining.get(key) ?? 0;
    if (count === 0) return true;
    remaining.set(key, count - 1);
    return false;
  });
}

export function compareFindings(current, baseline) {
  return {
    newFindings: difference(current, countByKey(baseline)),
    staleFindings: difference(baseline, countByKey(current)),
  };
}

export function evaluateFindings(current, baseline) {
  const errors = current.filter((finding) => finding.severity === 2 || finding.fatal);
  const reviewable = current.filter((finding) => finding.severity !== 2 && !finding.fatal);
  const comparison = compareFindings(reviewable, baseline);
  return {
    ...comparison,
    errors,
    shouldFail: errors.length > 0 || comparison.newFindings.length > 0,
  };
}

export function normalizeResults(results, root = packageRoot) {
  return results.flatMap((result) => result.messages.map((message) => ({
    file: relative(root, result.filePath).replaceAll('\\', '/'),
    line: message.line ?? 1,
    column: message.column ?? 1,
    rule: message.ruleId ?? 'fatal',
    severity: message.severity,
    fatal: Boolean(message.fatal),
    message: message.message,
  }))).sort((left, right) => findingKey(left).localeCompare(findingKey(right)));
}

function baselineDocument(findings) {
  return {
    version: 1,
    description: 'Reviewed frontend static-analysis debt. New locations fail; stale entries may be removed.',
    findings: findings
      .filter((finding) => finding.severity === 1 && !finding.fatal)
      .map(({ file, line, column, rule }) => ({ file, line, column, rule })),
  };
}

function printFinding(prefix, finding) {
  process.stderr.write(`${prefix} ${finding.file}:${finding.line}:${finding.column} ${finding.rule}: ${finding.message ?? ''}\n`);
}

export async function runLint() {
  const eslint = new ESLint({ cwd: packageRoot });
  return normalizeResults(await eslint.lintFiles(['src/**/*.{js,ts}']));
}

async function main() {
  const findings = await runLint();
  const errors = findings.filter((finding) => finding.severity === 2 || finding.fatal);
  if (errors.length > 0) {
    errors.forEach((finding) => printFinding('error', finding));
    process.stderr.write(`Static analysis failed with ${errors.length} zero-tolerance error(s).\n`);
    process.exitCode = 1;
    return;
  }

  if (process.argv.includes('--write-baseline')) {
    writeFileSync(baselinePath, `${JSON.stringify(baselineDocument(findings), null, 2)}\n`);
    process.stdout.write(`Wrote ${findings.length} reviewed finding(s) to eslint-baseline.json.\n`);
    return;
  }

  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
  if (baseline.version !== 1 || !Array.isArray(baseline.findings)) {
    throw new Error('eslint-baseline.json must use version 1 with a findings array');
  }

  const comparison = evaluateFindings(findings, baseline.findings);
  if (comparison.newFindings.length > 0) {
    comparison.newFindings.forEach((finding) => printFinding('new', finding));
    process.stderr.write(`Static analysis found ${comparison.newFindings.length} unreviewed finding(s).\n`);
    process.exitCode = 1;
    return;
  }

  if (comparison.staleFindings.length > 0) {
    for (const finding of comparison.staleFindings) {
      process.stdout.write(`stale ${finding.file}:${finding.line}:${finding.column} ${finding.rule}\n`);
    }
  }

  const counts = findings.reduce((result, finding) => {
    result[finding.rule] = (result[finding.rule] ?? 0) + 1;
    return result;
  }, {});
  const summary = Object.entries(counts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([rule, count]) => `${rule}=${count}`)
    .join(', ');
  process.stdout.write(`Static-analysis baseline accepted ${findings.length} reviewed finding(s)${summary ? ` (${summary})` : ''}.\n`);
  if (comparison.staleFindings.length > 0) {
    process.stdout.write(`${comparison.staleFindings.length} stale baseline entr${comparison.staleFindings.length === 1 ? 'y is' : 'ies are'} ready to remove.\n`);
  }
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  await main();
}
