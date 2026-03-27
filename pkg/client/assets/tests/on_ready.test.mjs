import test from 'node:test';
import assert from 'node:assert/strict';

const { onReady } = await import('../dist/shared/dom-ready.js');

test('onReady runs immediately when the DOM is already ready', () => {
  const originalDocument = globalThis.document;
  const calls = [];

  globalThis.document = {
    readyState: 'interactive',
    addEventListener() {
      throw new Error('addEventListener should not be used when DOM is already ready');
    },
  };

  try {
    onReady(() => {
      calls.push('ran');
    });
  } finally {
    globalThis.document = originalDocument;
  }

  assert.deepEqual(calls, ['ran']);
});

test('onReady waits for DOMContentLoaded when the DOM is still loading', () => {
  const originalDocument = globalThis.document;
  const calls = [];
  const listeners = [];

  globalThis.document = {
    readyState: 'loading',
    addEventListener(event, callback, options) {
      listeners.push({ event, callback, options });
    },
  };

  try {
    onReady(() => {
      calls.push('ran');
    });
  } finally {
    globalThis.document = originalDocument;
  }

  assert.equal(calls.length, 0);
  assert.equal(listeners.length, 1);
  assert.equal(listeners[0].event, 'DOMContentLoaded');
  assert.deepEqual(listeners[0].options, { once: true });

  listeners[0].callback();
  assert.deepEqual(calls, ['ran']);
});
