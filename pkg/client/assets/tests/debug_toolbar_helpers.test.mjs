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

const debugToolbar = await import('../dist/debug/shared-helpers.js');

debugToolbar.panelRegistry.register({
  id: 'requests',
  label: 'Requests',
  snapshotKey: 'requests',
  eventTypes: 'request',
  category: 'core',
  order: 10,
  render() {
    return '';
  },
});

debugToolbar.panelRegistry.register({
  id: 'sql',
  label: 'SQL',
  snapshotKey: 'sql',
  eventTypes: 'sql',
  category: 'core',
  order: 20,
  render() {
    return '';
  },
});

debugToolbar.panelRegistry.register({
  id: 'routes',
  label: 'Routes',
  snapshotKey: 'routes',
  eventTypes: [],
  category: 'system',
  order: 30,
  render() {
    return '';
  },
});

debugToolbar.panelRegistry.register({
  id: 'custom',
  label: 'Custom',
  snapshotKey: 'custom',
  eventTypes: 'custom',
  category: 'data',
  order: 40,
  handleEvent(current, payload) {
    return debugToolbar.applyCustomEventPayload(current, payload, 500);
  },
  render() {
    return '';
  },
});

test('debug toolbar helpers normalize repl commands and expose registry metadata', () => {
  const commands = debugToolbar.normalizeReplCommands([
    {
      command: '  help  ',
      description: '  Show help  ',
      tags: [' docs ', '', 10],
      aliases: [' h ', null],
      read_only: true,
    },
    null,
    { command: '   ' },
  ]);

  assert.deepEqual(commands, [
    {
      command: 'help',
      description: 'Show help',
      tags: ['docs'],
      aliases: ['h'],
      mutates: false,
    },
  ]);

  assert.equal(debugToolbar.getPanelLabel('sql'), 'SQL');
  assert.deepEqual(debugToolbar.getPanelEventTypes('routes'), []);
  assert.equal(debugToolbar.buildEventToPanel().request, 'requests');
  assert.ok(debugToolbar.getDefaultToolbarPanels().includes('requests'));
});

test('debug toolbar helpers apply nested custom events consistently', () => {
  const snapshot = {};
  const eventToPanel = debugToolbar.buildEventToPanel();

  const firstPanel = debugToolbar.applyDebugEventToSnapshot(
    snapshot,
    { type: 'custom', payload: { key: 'tenant.scope', value: 'acme' } },
    { eventToPanel }
  );
  const secondPanel = debugToolbar.applyDebugEventToSnapshot(
    snapshot,
    {
      type: 'custom',
      payload: { category: 'debug', message: 'Sync complete' },
    },
    { eventToPanel }
  );

  assert.equal(firstPanel, 'custom');
  assert.equal(secondPanel, 'custom');
  assert.deepEqual(snapshot.custom?.data, {
    tenant: { scope: 'acme' },
  });
  assert.equal(snapshot.custom?.logs?.length, 1);
  assert.equal(snapshot.custom?.logs?.[0]?.message, 'Sync complete');
});

test('debug toolbar helpers fetch snapshots and count summary state through one canonical path', async () => {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = async () => ({
      ok: true,
      async json() {
        return { requests: [{ status: 200 }] };
      },
    });

    assert.deepEqual(await debugToolbar.fetchDebugSnapshot('/admin/debug'), {
      requests: [{ status: 200 }],
    });

    globalThis.fetch = async () => {
      throw new Error('network');
    };

    assert.equal(await debugToolbar.fetchDebugSnapshot('/admin/debug'), null);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(
    debugToolbar.getToolbarCounts(
      {
        requests: [{ status: 200 }, { status: 503 }],
        sql: [{ duration: '10ms' }, { duration: '80ms', error: 'boom' }],
        logs: [{ level: 'info' }, { level: 'error' }],
        jserrors: [{}],
      },
      50
    ),
    {
      requests: 2,
      sql: 2,
      logs: 2,
      jserrors: 1,
      errors: 4,
      slowQueries: 1,
    }
  );
});
