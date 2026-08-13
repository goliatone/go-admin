import assert from 'node:assert/strict';
import test from 'node:test';

import { ESLint } from 'eslint';

import {
  compareFindings,
  evaluateFindings,
  normalizeResults,
} from '../scripts/check-eslint-baseline.mjs';

const finding = (file, line, rule, column = 1) => ({ file, line, column, rule });

test('baseline comparison distinguishes reviewed, new, stale, and duplicate findings', () => {
  const reviewed = finding('src/a.ts', 4, 'complexity');
  const duplicate = finding('src/b.ts', 8, '@typescript-eslint/no-unused-vars');
  const added = finding('src/c.ts', 12, 'complexity');
  const removed = finding('src/d.ts', 16, 'complexity');
  const comparison = compareFindings(
    [reviewed, duplicate, duplicate, added],
    [reviewed, duplicate, removed],
  );

  assert.deepEqual(comparison.newFindings, [duplicate, added]);
  assert.deepEqual(comparison.staleFindings, [removed]);
});

test('normalization retains fatal and error severity for zero-tolerance handling', () => {
  const normalized = normalizeResults([{
    filePath: '/workspace/src/a.ts',
    messages: [{
      line: 3,
      column: 7,
      ruleId: null,
      severity: 2,
      fatal: true,
      message: 'Parsing failed',
    }],
  }], '/workspace');

  assert.deepEqual(normalized, [{
    file: 'src/a.ts',
    line: 3,
    column: 7,
    rule: 'fatal',
    severity: 2,
    fatal: true,
    message: 'Parsing failed',
  }]);
});

test('evaluation fails new findings but permits removed findings', () => {
  const reviewed = { ...finding('src/a.ts', 4, 'complexity'), severity: 1, fatal: false };
  const added = { ...finding('src/b.ts', 8, 'complexity'), severity: 1, fatal: false };
  const removed = finding('src/c.ts', 12, 'complexity');

  assert.equal(evaluateFindings([reviewed, added], [reviewed]).shouldFail, true);
  const reduced = evaluateFindings([reviewed], [reviewed, removed]);
  assert.equal(reduced.shouldFail, false);
  assert.deepEqual(reduced.staleFindings, [removed]);
});

test('ESLint enforces console, import, complexity, and unused-code policies', async () => {
  const eslint = new ESLint();
  const branches = Array.from({ length: 26 }, (_, index) => `if (value === ${index}) value += 1;`).join('\n');
  const [result] = await eslint.lintText(`
    import client from '@goliatone/go-admin-client/services';
    import generated from '../dist/services.js';
    const unused = client;
    void generated;
    function oversized(value) {
      const abandoned = true;
      console.warn(value);
      ${branches}
      return value;
    }
    void oversized;
  `, { filePath: 'src/lint-fixture.js' });
  const ruleIDs = new Set(result.messages.map((message) => message.ruleId));

  assert.equal(ruleIDs.has('no-console'), true);
  assert.equal(result.messages.filter((message) => message.ruleId === 'no-restricted-imports').length, 2);
  assert.equal(ruleIDs.has('complexity'), true);
  assert.equal(ruleIDs.has('no-unused-vars'), true);
});

test('the shared logger remains the only ESLint console owner', async () => {
  const eslint = new ESLint();
  const [result] = await eslint.lintText("console.warn('explicit owner');", {
    filePath: 'src/shared/logger.ts',
  });

  assert.equal(result.messages.some((message) => message.ruleId === 'no-console'), false);
});
