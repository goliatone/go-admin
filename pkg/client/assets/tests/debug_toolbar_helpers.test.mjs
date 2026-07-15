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

const testStyles = new Proxy({}, {
  get(_target, prop) {
    if (prop === 'badgeMethod' || prop === 'badgeStatus' || prop === 'badgeLevel') {
      return () => 'badge';
    }
    return String(prop);
  },
});

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
      headers: new Headers({ 'Content-Type': 'application/json' }),
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

test('debug toolbar helpers bound panel-definition discovery latency', async () => {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = async (_url, init = {}) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    });

    assert.deepEqual(await debugToolbar.fetchServerPanelDefinitions('/debug-hanging', 1), []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('debug toolbar helpers hydrate server panel definitions without overwriting client renderers', async () => {
  const originalFetch = globalThis.fetch;
  const clientRender = () => 'client-renderer';

  debugToolbar.panelRegistry.register({
    id: 'client-cache',
    label: 'Client Cache',
    snapshotKey: 'client-cache',
    eventTypes: 'client-cache',
    render: clientRender,
  });
  debugToolbar.panelRegistry.unregister('server-cache');

  try {
    globalThis.fetch = async (url) => {
      assert.equal(String(url), '/debug-hydration/api/panels');
      return {
        ok: true,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        async json() {
          return {
            panels: [
              {
                id: 'client-cache',
                label: 'Server Should Not Win',
                snapshot_key: 'server-cache',
                event_types: ['server-cache'],
                ui: { views: { console: { renderer: 'table', bind: 'items' } } },
              },
              {
                id: 'server-cache',
                label: 'Server Cache',
                snapshot_key: 'server-cache',
                event_types: ['cache-event'],
                supports_toolbar: true,
                category: 'data',
                order: 42,
                ui: {
                  views: { console: { renderer: 'table', bind: 'items' } },
                  count: { mode: 'array_length', bind: 'items' },
                  filters: [{ id: 'status', label: 'Status', kind: 'select', bind: 'status', options: ['ok'] }],
                  events: { mode: 'append', bind: 'entry', max_entries: 2 },
                  actions: [{ id: 'refresh', label: 'Refresh', refresh: true, payload: { source: 'test' } }],
                },
              },
              {
                id: 'future-cache',
                label: 'Future Cache',
                snapshot_key: 'future-cache',
                ui: {
                  schema_version: '999',
                  views: { console: { renderer: 'table', bind: 'items' } },
                  count: { mode: 'array_length', bind: 'items' },
                  actions: [{ id: 'future-action', label: 'Future Action' }],
                },
              },
            ],
          };
        },
      };
    };

    assert.equal(await debugToolbar.hydrateServerPanelDefinitions('/debug-hydration'), 2);
    assert.equal(debugToolbar.panelRegistry.get('client-cache')?.label, 'Client Cache');
    assert.equal(debugToolbar.panelRegistry.get('client-cache')?.render, clientRender);
    assert.equal(debugToolbar.panelRegistry.get('server-cache')?.label, 'Server Cache');
    assert.equal(debugToolbar.panelRegistry.isServerDefinition('server-cache'), true);
    assert.equal(debugToolbar.panelRegistry.get('future-cache')?.label, 'Future Cache');
    assert.equal(debugToolbar.panelRegistry.isServerDefinition('future-cache'), true);
    assert.equal(
      debugToolbar.panelRegistry.get('future-cache')?.getCount?.({ items: [1, 2, 3] }),
      undefined,
    );
    const futureHTML = debugToolbar.panelRegistry
      .get('future-cache')
      ?.renderConsole?.({ items: [{ key: 'future', value: 1 }] }, testStyles, {});
    assert.match(futureHTML || '', /Panel UI degraded/);
    assert.match(futureHTML || '', /Unsupported panel UI schema version/);
    assert.doesNotMatch(futureHTML || '', /\sdata-panel-action(\s|>)/);
    assert.equal(debugToolbar.buildEventToPanel()['cache-event'], 'server-cache');
    assert.equal(debugToolbar.panelRegistry.get('server-cache')?.getCount?.({ items: [1, 2, 3] }), 3);
    assert.deepEqual(
      debugToolbar.panelRegistry.get('server-cache')?.handleEvent?.([{ id: 1 }], { entry: { id: 2 } }),
      [{ id: 1 }, { id: 2 }],
    );
    assert.deepEqual(
      debugToolbar.panelRegistry.get('server-cache')?.handleEvent?.([{ id: 1 }, { id: 2 }], { entry: { id: 3 } }),
      [{ id: 2 }, { id: 3 }],
    );
    assert.deepEqual(
      debugToolbar.panelRegistry.get('server-cache')?.applyFilters?.(
        [{ status: 'ok' }, { status: 'warn' }],
        { status: 'ok' },
      ),
      [{ status: 'ok' }],
    );

    const html = debugToolbar.panelRegistry
      .get('server-cache')
      ?.renderConsole?.({ items: [{ key: 'a<b', value: 2 }] }, testStyles, {});
    assert.match(html || '', /<table/);
    assert.match(html || '', /data-panel-action/);
    assert.match(html || '', /data-action-id="refresh"/);
    assert.match(html || '', /a&lt;b/);
    assert.doesNotMatch(html || '', /a<b/);
  } finally {
    globalThis.fetch = originalFetch;
    debugToolbar.panelRegistry.unregister('client-cache');
    debugToolbar.panelRegistry.unregister('server-cache');
    debugToolbar.panelRegistry.unregister('future-cache');
  }
});
