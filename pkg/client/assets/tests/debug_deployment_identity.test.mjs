import test from 'node:test';
import assert from 'node:assert/strict';

const definedElements = new Map();
globalThis.HTMLElement = class HTMLElement {};
globalThis.self = globalThis;
globalThis.customElements = {
  get(name) {
    return definedElements.get(name);
  },
  define(name, ctor) {
    definedElements.set(name, ctor);
  },
};

const toolbar = await import('../dist/debug/shared-helpers.js');

test('deployment indicator renders canonical compact identity', () => {
  assert.deepEqual(toolbar.deploymentIndicator({
    deployment: {
      environment: { name: 'staging', color: '#f97316' },
      runtime: { instance_name: 'brisk-otter' },
    },
  }), {
    label: 'STAGING · brisk-otter',
    color: '#f97316',
  });
});

test('deployment indicator rejects unsafe colors and tolerates legacy snapshots', () => {
  assert.deepEqual(toolbar.deploymentIndicator({
    deployment: {
      environment: { name: 'qa', color: 'url(javascript:bad)' },
      runtime: { instance_name: '<unsafe>' },
    },
  }), {
    label: 'QA · <unsafe>',
    color: '#64748b',
  });
  assert.equal(toolbar.deploymentIndicator({}), null);
  assert.equal(toolbar.deploymentIndicator({ deployment: { environment: { name: 'prod' } } }), null);
});

test('deployment indicator honors toolbar panel configuration', () => {
  const snapshot = {
    deployment: {
      environment: { name: 'production', color: '#22c55e' },
      runtime: { instance_name: 'steady-heron' },
    },
  };
  assert.equal(toolbar.deploymentIndicator(snapshot, ['requests', 'sql']), null);
  assert.deepEqual(toolbar.deploymentIndicator(snapshot, ['requests', 'DEPLOYMENT']), {
    label: 'PRODUCTION · steady-heron',
    color: '#22c55e',
  });
});
