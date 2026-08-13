import assert from 'node:assert/strict';
import test from 'node:test';

import { findDirectConsoleAccess } from '../scripts/check-no-direct-console.mjs';

test('direct-console guard detects supported global access forms', () => {
  const source = `
    console.warn('direct');
    window.console.error('window');
    globalThis['console']['log']('global');
    self.console.info('worker');
  `;

  const violations = findDirectConsoleAccess('fixture.ts', source);
  assert.equal(violations.length, 4);
});

test('direct-console guard ignores comments, strings, and domain properties', () => {
  const source = `
    // console.warn('comment');
    const example = "console.error('string')";
    const panel = ui.views.console;
    void example;
    void panel;
  `;

  assert.deepEqual(findDirectConsoleAccess('fixture.ts', source), []);
});
