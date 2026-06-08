import test from 'node:test';
import assert from 'node:assert/strict';

const {
  ENHANCED_ACTION_ACCEPT,
  ENHANCED_ACTION_HEADER,
  ENHANCED_ACTION_HEADER_VALUE,
  applyEnhancedEnvelope,
  initEnhancedActions,
} = await import('../dist/shared/enhanced-action.js');

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();

function setGlobals(win) {
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.Document = win.Document;
  globalThis.Node = win.Node;
  globalThis.Element = win.Element;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.HTMLFormElement = win.HTMLFormElement;
  globalThis.HTMLButtonElement = win.HTMLButtonElement;
  globalThis.HTMLInputElement = win.HTMLInputElement;
  globalThis.FormData = win.FormData;
  globalThis.CustomEvent = win.CustomEvent;
  Object.defineProperty(globalThis, 'navigator', { value: win.navigator, configurable: true });
  Object.defineProperty(globalThis, 'location', { value: win.location, configurable: true });
}

function setupDom(markup) {
  const dom = new JSDOM(markup, {
    url: 'http://localhost:8082/admin/translations/families/f1',
  });
  setGlobals(dom.window);
  return dom;
}

function nextTick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

test('enhanced-action runtime intercepts forms, sends headers, applies fragments, toasts, and focus', async () => {
  const dom = setupDom(`
    <meta name="csrf-token" content="enhanced-csrf">
    <form data-enhance-action action="/admin/api/assign" method="post">
      <input name="target_locale" value="fr">
      <button type="submit">Assign</button>
    </form>
    <section data-family-assignments><button id="old">Old</button></section>
  `);
  const requests = [];
  const toasts = [];
  let reinitialized = 0;
  dom.window.FormgenRelationships = {
    initRelationships() {
      reinitialized += 1;
    },
  };
  const fetchImpl = async (url, init) => {
    requests.push({ url, init });
    return new Response(JSON.stringify({
      ok: true,
      toasts: [{ type: 'success', message: 'Assigned.' }],
      fragments: [{
        selector: '[data-family-assignments]',
        mode: 'replace',
        html: '<section data-family-assignments><button id="new-focus">New</button></section>',
      }],
      focus: '#new-focus',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/vnd.admin.enhanced+json' },
    });
  };

  initEnhancedActions(dom.window.document, {
    fetch: fetchImpl,
    toast: { success(message) { toasts.push(message); } },
  });

  const form = dom.window.document.querySelector('form');
  const button = dom.window.document.querySelector('button[type="submit"]');
  let prevented = false;
  const event = new dom.window.Event('submit', { bubbles: true, cancelable: true });
  event.preventDefault = () => {
    prevented = true;
    dom.window.Event.prototype.preventDefault.call(event);
  };
  form.dispatchEvent(event);
  assert.equal(prevented, true);
  assert.equal(button.disabled, true);
  assert.equal(form.getAttribute('aria-busy'), 'true');
  await nextTick();

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/admin/api/assign');
  const headers = new Headers(requests[0].init.headers);
  assert.equal(headers.get(ENHANCED_ACTION_HEADER), '1');
  assert.equal(headers.get(ENHANCED_ACTION_HEADER), ENHANCED_ACTION_HEADER_VALUE);
  assert.equal(headers.get('Accept'), ENHANCED_ACTION_ACCEPT);
  assert.equal(headers.get('X-CSRF-Token'), 'enhanced-csrf');
  assert.equal(requests[0].init.method, 'POST');
  assert.equal(requests[0].init.body.get('target_locale'), 'fr');
  assert.equal(dom.window.document.querySelector('#old'), null);
  assert.ok(dom.window.document.querySelector('[data-family-assignments] #new-focus'));
  assert.deepEqual(toasts, ['Assigned.']);
  assert.equal(dom.window.document.activeElement.id, 'new-focus');
  assert.equal(reinitialized, 1);
  assert.equal(button.disabled, false);
  assert.equal(form.hasAttribute('aria-busy'), false);
});

test('enhanced-action runtime renders field errors without clearing user input', async () => {
  const dom = setupDom(`
    <form data-enhance-action action="/admin/api/assign" method="post" data-enhance-error-target="#action-error">
      <input name="assignee_id" value="translator-2">
      <button type="submit">Assign</button>
    </form>
    <div id="action-error" hidden></div>
  `);
  const errors = [];
  const fetchImpl = async () => new Response(JSON.stringify({
    ok: false,
    error: {
      message: 'Validation failed',
      fields: { assignee_id: 'Assignee is required' },
    },
    toasts: [{ type: 'error', message: 'Validation failed' }],
  }), {
    status: 400,
    headers: { 'Content-Type': 'application/vnd.admin.enhanced+json' },
  });

  initEnhancedActions(dom.window.document, {
    fetch: fetchImpl,
    toast: { error(message) { errors.push(message); } },
  });

  const form = dom.window.document.querySelector('form');
  form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await nextTick();

  const input = dom.window.document.querySelector('[name="assignee_id"]');
  assert.equal(input.value, 'translator-2');
  assert.equal(input.getAttribute('aria-invalid'), 'true');
  assert.equal(dom.window.document.querySelector('[data-enhance-field-error-for="assignee_id"]').textContent, 'Assignee is required');
  assert.equal(dom.window.document.querySelector('#action-error').textContent, 'Validation failed');
  assert.equal(dom.window.document.querySelector('#action-error').hasAttribute('hidden'), false);
  assert.deepEqual(errors, ['Validation failed']);
});

test('enhanced-action runtime serializes GET form data into the request URL', async () => {
  const dom = setupDom(`
    <form data-enhance-action action="/admin/api/search?existing=1#results" method="get">
      <input name="q" value="hello world">
      <button type="submit" name="intent" value="search">Search</button>
    </form>
  `);
  const requests = [];
  const fetchImpl = async (url, init) => {
    requests.push({ url, init });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/vnd.admin.enhanced+json' },
    });
  };

  initEnhancedActions(dom.window.document, { fetch: fetchImpl });

  const form = dom.window.document.querySelector('form');
  const button = dom.window.document.querySelector('button[type="submit"]');
  const event = new dom.window.Event('submit', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'submitter', { value: button });
  form.dispatchEvent(event);
  await nextTick();

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/admin/api/search?existing=1&q=hello+world&intent=search#results');
  assert.equal(requests[0].init.method, 'GET');
  assert.equal(requests[0].init.body, undefined);
});

test('enhanced-action runtime updates assignment fragments without reloading detail', async () => {
  const dom = setupDom(`
    <form data-enhance-action action="/admin/api/translations/families/f1/assignments" method="post">
      <input name="target_locale" value="fr">
      <input name="work_scope" value="localization">
      <input name="assignee_id" value="translator-2">
      <button type="submit">Assign</button>
    </form>
    <section data-family-locale-coverage>Missing</section>
    <section data-family-assignments>None</section>
  `);
  let reloads = 0;
  try {
    Object.defineProperty(dom.window.location, 'reload', {
      configurable: true,
      value() { reloads += 1; },
    });
  } catch {
    // jsdom may expose Location methods as non-configurable in some versions.
  }
  const toasts = [];
  const fetchImpl = async () => new Response(JSON.stringify({
    ok: true,
    toasts: [{ type: 'success', message: 'Assignment updated.' }],
    fragments: [
      {
        selector: '[data-family-locale-coverage]',
        mode: 'replace',
        html: '<section data-family-locale-coverage>Ready</section>',
      },
      {
        selector: '[data-family-assignments]',
        mode: 'replace',
        html: '<section data-family-assignments><a href="/editor/fr">Open editor</a></section>',
      },
    ],
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/vnd.admin.enhanced+json' },
  });

  initEnhancedActions(dom.window.document, {
    fetch: fetchImpl,
    toast: { success(message) { toasts.push(message); } },
  });

  dom.window.document.querySelector('form')
    .dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await nextTick();

  assert.equal(reloads, 0);
  assert.match(dom.window.document.querySelector('[data-family-locale-coverage]').textContent, /Ready/);
  assert.match(dom.window.document.querySelector('[data-family-assignments]').textContent, /Open editor/);
  assert.deepEqual(toasts, ['Assignment updated.']);
});

test('enhanced-action runtime accepts custom negotiation markers', async () => {
  const dom = setupDom(`
    <form data-enhance-action action="/admin/api/custom" method="post">
      <input name="target_locale" value="de">
      <button type="submit">Assign</button>
    </form>
  `);
  const requests = [];
  const fetchImpl = async (url, init) => {
    requests.push({ url, init });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/vnd.example.action+json' },
    });
  };

  initEnhancedActions(dom.window.document, {
    fetch: fetchImpl,
    requestHeader: 'X-App-Action',
    requestHeaderValue: 'opaque-marker',
    accept: 'application/vnd.example.action+json',
  });

  dom.window.document.querySelector('form')
    .dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await nextTick();

  assert.equal(requests.length, 1);
  const headers = new Headers(requests[0].init.headers);
  assert.equal(headers.get('X-App-Action'), 'opaque-marker');
  assert.equal(headers.get(ENHANCED_ACTION_HEADER), null);
  assert.equal(headers.get('Accept'), 'application/vnd.example.action+json');
});

test('enhanced-action runtime uses global fetch when no fetch option is provided', async () => {
  const dom = setupDom(`
    <form data-enhance-action action="/admin/api/global-fetch" method="post">
      <input name="target_locale" value="es">
      <button type="submit">Assign</button>
    </form>
  `);
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, init) => {
    requests.push({ url, init });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/vnd.admin.enhanced+json' },
    });
  };

  try {
    initEnhancedActions(dom.window.document);

    const form = dom.window.document.querySelector('form');
    let prevented = false;
    const event = new dom.window.Event('submit', { bubbles: true, cancelable: true });
    event.preventDefault = () => {
      prevented = true;
      dom.window.Event.prototype.preventDefault.call(event);
    };
    form.dispatchEvent(event);
    await nextTick();

    assert.equal(prevented, true);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, '/admin/api/global-fetch');
    const headers = new Headers(requests[0].init.headers);
    assert.equal(headers.get(ENHANCED_ACTION_HEADER), '1');
    assert.equal(headers.get('Accept'), ENHANCED_ACTION_ACCEPT);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('applyEnhancedEnvelope dispatches fragment event and skips unsupported modes', async () => {
  const dom = setupDom('<section id="target">Old</section>');
  const events = [];
  dom.window.document.addEventListener('go-admin:enhanced-fragments-applied', (event) => {
    events.push(event.detail.fragments.length);
  });

  await applyEnhancedEnvelope({
    ok: true,
    fragments: [
      { selector: '#target', mode: 'append', html: '<section id="target">Ignored</section>' },
      { selector: '#target', mode: 'replace', html: '<section id="target">New</section>' },
    ],
  }, { document: dom.window.document });

  assert.equal(dom.window.document.querySelector('#target').textContent, 'New');
  assert.deepEqual(events, [1]);
});
