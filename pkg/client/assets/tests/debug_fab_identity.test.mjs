import test from 'node:test';
import assert from 'node:assert/strict';

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://127.0.0.1:9090/' });
globalThis.window = dom.window;
globalThis.self = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true, writable: true });
globalThis.Node = dom.window.Node;
globalThis.Element = dom.window.Element;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.CustomEvent = dom.window.CustomEvent;
globalThis.KeyboardEvent = dom.window.KeyboardEvent;
globalThis.customElements = dom.window.customElements;
globalThis.localStorage = dom.window.localStorage;

const SNAPSHOT = {
  deployment: {
    application: { id: 'acme', name: 'Acme Admin', version: 'v1.24.3' },
    environment: { name: 'staging', color: '#f97316' },
    persona: {
      name: 'lively-raven',
      visual: { kind: 'monogram', text: 'LR', alt: 'Lively raven', background: '#0f766e', foreground: '#f0fdfa' },
    },
    build: { commit_sha: '9f2c1ab7de5540b6a0f31e77c9bd42a1e8b6d310', commit_short: '9f2c1ab' },
    runtime: { instance_name: 'brisk-otter', instance_id: 'abc-123', uptime: '3h17m22s' },
  },
  requests: [{ id: '1' }, { id: '2' }],
  sql: [{ id: 's1' }],
  logs: [{ level: 'error', message: 'boom' }],
};

// Serve empty panel definitions so hydration is deterministic, and the snapshot
// above so the FAB derives its identity from real snapshot data.
globalThis.fetch = async (input) => {
  const url = String(input && input.url ? input.url : input);
  const body = url.includes('/api/panels') ? { panels: [] } : SNAPSHOT;
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

await import('../dist/debug/toolbar.js');

async function mountFab(panels = 'requests,sql,logs,deployment') {
  const fab = document.createElement('debug-fab');
  fab.setAttribute('debug-path', '/admin/debug');
  fab.setAttribute('live-transport', 'false');
  fab.setAttribute('panels', panels);
  document.body.appendChild(fab);
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (fab.shadowRoot?.querySelector('.fab-identity, .fab-collapsed')) {
      // Wait one more turn so the async snapshot fetch has been applied.
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (fab.shadowRoot.querySelector('.fab-identity') || panels.indexOf('deployment') < 0) {
        return fab;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error('debug-fab did not render');
}

test('collapsed FAB shows a compact, color-coded deployment identity', async () => {
  const fab = await mountFab();
  const root = fab.shadowRoot;
  const collapsed = root.querySelector('.fab-collapsed');

  assert.ok(collapsed.classList.contains('has-identity'));
  assert.equal(collapsed.getAttribute('style'), '--fab-environment:#f97316');
  assert.equal(root.querySelector('.fab-identity-env-full').textContent, 'STAGING');
  assert.equal(root.querySelector('.fab-identity-env-short').textContent, 'STG');
  assert.equal(root.querySelector('.fab-identity-name').textContent, 'lively-raven');
  assert.equal(root.querySelector('.fab-persona-avatar').textContent, 'LR');
  assert.equal(root.querySelector('.fab-persona-avatar').getAttribute('aria-label'), 'Lively raven');

  // The environment accent also drives the FAB-level status dot placement.
  assert.ok(root.querySelector('.fab').classList.contains('has-identity'));
  fab.remove();
});

test('collapsed FAB is keyboard operable and carries an accessible name', async () => {
  const fab = await mountFab();
  const root = fab.shadowRoot;
  const button = root.querySelector('.fab');

  assert.equal(button.getAttribute('role'), 'button');
  assert.equal(button.getAttribute('tabindex'), '0');
  assert.equal(button.getAttribute('aria-hidden'), 'false');
  const label = button.getAttribute('aria-label');
  assert.match(label, /Open debug toolbar/);
  assert.match(label, /Environment: staging/);
  assert.match(label, /Instance: brisk-otter/);
  assert.match(label, /Persona: lively-raven/);
  assert.match(label, /2 requests, 1 query, 1 log/);
  assert.match(label, /1 error/);
  assert.match(label, /Debug stream/);
  assert.match(button.getAttribute('title'), /Instance: brisk-otter/);

  let expanded = 0;
  fab.addEventListener('debug-expand', () => { expanded += 1; });
  button.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  assert.equal(expanded, 1, 'Enter must activate the FAB');

  // After expanding, the hidden FAB leaves the tab order.
  const hidden = fab.shadowRoot.querySelector('.fab');
  assert.ok(hidden.classList.contains('hidden'));
  assert.equal(hidden.getAttribute('tabindex'), '-1');
  assert.equal(hidden.getAttribute('aria-hidden'), 'true');

  fab.setToolbarExpanded(false);
  fab.shadowRoot.querySelector('.fab').dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: ' ', bubbles: true }));
  assert.equal(expanded, 2, 'Space must activate the FAB');

  fab.setToolbarExpanded(false);
  fab.shadowRoot.querySelector('.fab').dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(expanded, 2, 'unrelated keys must not activate the FAB');
  fab.remove();
});

test('collapsed FAB keeps its counters and connection state', async () => {
  const fab = await mountFab();
  const root = fab.shadowRoot;
  const counters = [...root.querySelectorAll('.fab-counter')].map((node) => [
    node.querySelector('.counter-label').textContent,
    node.querySelector('.counter-value').textContent,
  ]);
  assert.deepEqual(counters, [['Req', '2'], ['SQL', '1'], ['Logs', '1'], ['Err', '1']]);
  assert.equal(root.querySelector('.fab').getAttribute('data-status'), 'disconnected');
  assert.ok(root.querySelector('.fab-status-dot'));
  fab.remove();
});

test('collapsed FAB hides deployment identity when the panel is not configured', async () => {
  const fab = await mountFab('requests,sql');
  const root = fab.shadowRoot;
  assert.equal(root.querySelector('.fab-identity'), null);
  assert.equal(root.querySelector('.fab-collapsed').classList.contains('has-identity'), false);
  assert.equal(root.querySelector('.fab').classList.contains('has-identity'), false);
  // Counters and the accessible name survive without deployment data.
  assert.ok(root.querySelector('.fab-counter'));
  assert.match(root.querySelector('.fab').getAttribute('aria-label'), /Open debug toolbar/);
  fab.remove();
});
