import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const require = createRequire(import.meta.url);
const packageJSON = require('../package.json');
const lock = require('../package-lock.json');
const source = readFileSync(new URL('../src/debug/repl/repl-terminal.ts', import.meta.url), 'utf8');

test('debug REPL uses only the maintained scoped xterm packages', () => {
  assert.equal(packageJSON.devDependencies['@xterm/xterm'], '^6.0.0');
  assert.equal(packageJSON.devDependencies['@xterm/addon-fit'], '^0.11.0');
  assert.equal(packageJSON.devDependencies.xterm, undefined);
  assert.equal(packageJSON.devDependencies['xterm-addon-fit'], undefined);
  assert.equal(lock.packages['node_modules/xterm'], undefined);
  assert.equal(lock.packages['node_modules/xterm-addon-fit'], undefined);
  assert.equal(lock.packages['node_modules/@xterm/xterm']?.version, '6.0.0');
  assert.equal(lock.packages['node_modules/@xterm/addon-fit']?.version, '0.11.0');
});

test('scoped xterm packages retain the REPL runtime API contract', () => {
  const { Terminal } = require('@xterm/xterm');
  const { FitAddon } = require('@xterm/addon-fit');
  const terminal = new Terminal();
  const fitAddon = new FitAddon();

  try {
    terminal.loadAddon(fitAddon);
    for (const method of [
      'attachCustomKeyEventHandler',
      'clear',
      'focus',
      'getSelection',
      'loadAddon',
      'onData',
      'open',
      'reset',
      'write',
    ]) {
      assert.equal(typeof terminal[method], 'function', `Terminal.${method}`);
    }
    assert.equal(typeof fitAddon.fit, 'function');
    assert.equal(typeof fitAddon.proposeDimensions, 'function');
    assert.match(require.resolve('@xterm/xterm/css/xterm.css'), /@xterm\/xterm\/css\/xterm\.css$/);
  } finally {
    fitAddon.dispose();
    terminal.dispose();
  }
});

test('REPL source imports the scoped runtime, addon, and stylesheet entrypoints', () => {
  assert.match(source, /from '@xterm\/xterm'/);
  assert.match(source, /from '@xterm\/addon-fit'/);
  assert.match(source, /from '@xterm\/xterm\/css\/xterm\.css\?inline'/);
  assert.doesNotMatch(source, /from 'xterm(?:-addon-fit)?(?:\/|')/);
});
