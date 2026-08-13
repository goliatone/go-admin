import assert from 'node:assert/strict';
import test from 'node:test';

import {
  configureLogging,
  createLogger,
  enableConsoleLogging,
  setLoggerSink,
} from '../dist/shared/logger.js';

test('logging is silent by default', () => {
  const original = {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };
  const calls = [];
  console.debug = (...args) => calls.push(['debug', ...args]);
  console.info = (...args) => calls.push(['info', ...args]);
  console.warn = (...args) => calls.push(['warn', ...args]);
  console.error = (...args) => calls.push(['error', ...args]);

  try {
    const logger = createLogger('Orders');
    logger.debug('loaded');
    logger.info('saved');
    logger.warn('stale');
    logger.error('failed');
    assert.deepEqual(calls, []);
  } finally {
    Object.assign(console, original);
  }
});

test('custom sinks receive scoped arguments at or above the configured level', () => {
  const calls = [];
  const restore = configureLogging({
    level: 'info',
    sink: {
      debug: (...args) => calls.push(['debug', ...args]),
      info: (...args) => calls.push(['info', ...args]),
      warn: (...args) => calls.push(['warn', ...args]),
      error: (...args) => calls.push(['error', ...args]),
    },
  });

  try {
    const logger = createLogger('Orders');
    const detail = { id: 42 };
    logger.debug('hidden');
    logger.info('saved', detail);
    logger.warn('stale');
    logger.error('failed', new Error('network'));

    assert.equal(calls.length, 3);
    assert.deepEqual(calls[0], ['info', '[Orders]', 'saved', detail]);
    assert.deepEqual(calls[1], ['warn', '[Orders]', 'stale']);
    assert.equal(calls[2][0], 'error');
    assert.equal(calls[2][1], '[Orders]');
    assert.equal(calls[2][2], 'failed');
    assert.match(calls[2][3].message, /network/);
  } finally {
    restore();
  }
});

test('restore callbacks recover nested configuration and are idempotent', () => {
  const outerCalls = [];
  const innerCalls = [];
  const restoreOuter = setLoggerSink({ info: (...args) => outerCalls.push(args) });
  const logger = createLogger();

  try {
    logger.info('outer one');
    const restoreInner = setLoggerSink({ info: (...args) => innerCalls.push(args) });
    logger.info('inner');
    restoreInner();
    restoreInner();
    logger.info('outer two');

    assert.deepEqual(innerCalls, [['inner']]);
    assert.deepEqual(outerCalls, [['outer one'], ['outer two']]);
  } finally {
    restoreOuter();
  }

  logger.info('silent again');
  assert.deepEqual(outerCalls, [['outer one'], ['outer two']]);
});

test('sink failures never interrupt the owning workflow', () => {
  const restore = setLoggerSink({
    error: () => {
      throw new Error('sink unavailable');
    },
  });

  try {
    assert.doesNotThrow(() => createLogger('Orders').error('failed'));
  } finally {
    restore();
  }
});

test('console output requires explicit enablement and observes the minimum level', () => {
  const original = { debug: console.debug, warn: console.warn };
  const calls = [];
  console.debug = (...args) => calls.push(['debug', ...args]);
  console.warn = (...args) => calls.push(['warn', ...args]);
  const restore = enableConsoleLogging('warn');

  try {
    const logger = createLogger('Orders');
    logger.debug('hidden');
    logger.warn('visible', 42);
    assert.deepEqual(calls, [['warn', '[Orders]', 'visible', 42]]);
  } finally {
    restore();
    Object.assign(console, original);
  }
});
