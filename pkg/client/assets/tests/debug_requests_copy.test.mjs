// Regression test for the request-detail "Copy" buttons.
//
// Bug: the Request Body / Response Body copy buttons in an expanded request row
// did nothing. The body content was emitted in the trigger's OWN
// `data-copy-trigger` attribute with no enclosing `[data-copy-content]`, so the
// shared copy handler (which reads `btn.closest('[data-copy-content]')`) found
// nothing. Compounding it, the detail pane is lazy-mounted from a <template> on
// expand, after per-button listeners were attached.
//
// Fix: wrap each body in a `[data-copy-content]` container (SQL/JSON pattern) and
// delegate copy on the `[data-request-table]` element so lazily-mounted buttons
// work. These tests lock both halves in.

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

function setGlobals(win) {
  globalThis.window = win;
  globalThis.self = win;
  globalThis.document = win.document;
  Object.defineProperty(globalThis, 'navigator', { value: win.navigator, configurable: true, writable: true });
  globalThis.Node = win.Node;
  globalThis.Element = win.Element;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.HTMLInputElement = win.HTMLInputElement;
  globalThis.HTMLButtonElement = win.HTMLButtonElement;
  globalThis.Event = win.Event;
  globalThis.MouseEvent = win.MouseEvent;
}

const bootstrapDOM = new JSDOM(`<!doctype html><html><body></body></html>`, { url: 'http://127.0.0.1:9090/' });
setGlobals(bootstrapDOM.window);

// jsdom 29 has no navigator.clipboard; install a stub that records writes.
const clipboardWrites = [];
Object.defineProperty(bootstrapDOM.window.navigator, 'clipboard', {
  configurable: true,
  value: {
    writeText: (text) => {
      clipboardWrites.push(String(text));
      return Promise.resolve();
    },
  },
});

const { renderRequestsPanel, requestRowKey, attachRequestDetailListeners, consoleStyles } = await import(
  '../dist/debug/index.js'
);

function mount(html) {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
}

const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// Bodies exercise attribute escaping (`&`, `"`) so the round-trip through
// data-copy-content -> getAttribute is meaningful.
const REQ_BODY = '{"action":"create","name":"Acme & Co"}';
const RES_BODY = '{"id":42,"ok":true}';

function entry(over = {}) {
  return {
    id: 'r1',
    method: 'POST',
    path: '/api/x',
    status: 200,
    request_body: REQ_BODY,
    response_body: RES_BODY,
    ...over,
  };
}

test('request detail emits copy content on a [data-copy-content] container, trigger is a plain marker', () => {
  // Render already-expanded so the detail markup is inline (not in a <template>).
  const html = renderRequestsPanel([entry()], consoleStyles, {
    expandedRequestIds: new Set(['r1']),
  });

  // Content lives on a container, never on the trigger itself (the original bug).
  assert.match(html, /data-copy-content="[^"]*Acme/, 'body content carried on a [data-copy-content] container');
  assert.match(html, /data-copy-trigger title="Copy"/, 'trigger is a plain marker');
  assert.doesNotMatch(html, /data-copy-trigger="/, 'trigger never carries the content as its value');
});

test('Copy buttons in a lazily-expanded request detail copy the request/response body', async () => {
  const before = clipboardWrites.length;
  const e = entry();
  const key = requestRowKey(e); // 'r1'
  const expandedIds = new Set();

  const root = mount(renderRequestsPanel([e], consoleStyles, { expandedRequestIds: expandedIds }));
  // feedbackDuration: 0 keeps the per-button feedback timer from lingering.
  attachRequestDetailListeners(root, expandedIds, { feedbackDuration: 0 });

  const detailRow = root.querySelector(`tr[data-detail-for="${key}"]`);
  assert.ok(detailRow, 'detail row exists');

  // Lazy-mounted: the copy buttons live inside a <template>, not the live DOM,
  // so listeners attached at adopt time could never see them.
  assert.equal(detailRow.querySelector('[data-copy-trigger]'), null, 'copy buttons not yet in the live DOM');
  assert.ok(detailRow.querySelector('template[data-request-detail-template]'), 'detail is lazy-mounted via <template>');

  // Expand by clicking a non-interactive part of the summary row.
  const summary = root.querySelector(`tr[data-request-id="${key}"]`);
  click(summary.querySelector('[data-expand-icon]'));

  assert.ok(expandedIds.has(key), 'row recorded as expanded');
  assert.equal(detailRow.style.display, 'table-row', 'detail row shown');

  const triggers = detailRow.querySelectorAll('[data-copy-trigger]');
  assert.equal(triggers.length, 2, 'request + response copy buttons mounted from template');

  // Request Body copy.
  const reqBtn = triggers[0];
  const reqContainer = reqBtn.closest('[data-copy-content]');
  assert.ok(reqContainer, 'trigger resolves an enclosing [data-copy-content] container');
  assert.equal(reqContainer.getAttribute('data-copy-content'), REQ_BODY, 'container holds the raw request body');
  assert.equal(reqBtn.getAttribute('data-copy-trigger'), '', 'trigger is a plain marker, not the content');

  click(reqBtn);
  await flush();
  assert.equal(clipboardWrites.at(-1), REQ_BODY, 'clicking request-body Copy writes the request body');
  assert.equal(detailRow.style.display, 'table-row', 'copying does not collapse the detail row');

  // Response Body copy (delegated handler resolves a different container).
  const resBtn = triggers[1];
  assert.equal(resBtn.closest('[data-copy-content]').getAttribute('data-copy-content'), RES_BODY);

  click(resBtn);
  await flush();
  assert.equal(clipboardWrites.at(-1), RES_BODY, 'clicking response-body Copy writes the response body');

  assert.equal(clipboardWrites.length, before + 2, 'exactly two copies happened (no double-copy)');
});
