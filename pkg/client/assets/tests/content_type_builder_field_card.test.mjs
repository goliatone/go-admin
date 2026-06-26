/**
 * T16 — Simplified, unified field-row controls
 *
 * Locks in the durable contract: reorder remains a pair of keyboard-reachable
 * <button>s with accessible names and correct disabled states, the trailing
 * controls (reorder + surface actions + expand) live in one cohesive cluster,
 * and the reorder no longer renders the old competing bordered box.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch (error) {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();
// Bootstrap a DOM before importing the bundle (its auto-init reads document).
const bootstrapDom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
globalThis.window = bootstrapDom.window;
globalThis.document = bootstrapDom.window.document;
Object.defineProperty(globalThis.document, 'readyState', { value: 'loading', configurable: true });

const { renderFieldCard } = await import('../dist/content-type-builder/index.js');

const baseField = { id: 'f1', name: 'title', type: 'text', label: 'Title', required: false, order: 0 };

test('field card renders keyboard-reachable reorder buttons with accessible names', () => {
  const html = renderFieldCard({ field: baseField, showReorderButtons: true });
  assert.match(html, /<button[^>]*data-field-move-up="f1"[^>]*aria-label="Move field up"/);
  assert.match(html, /<button[^>]*data-field-move-down="f1"[^>]*aria-label="Move field down"/);
});

test('field card disables move-up for the first field and move-down for the last', () => {
  const first = renderFieldCard({ field: baseField, showReorderButtons: true, isFirst: true });
  assert.match(first, /data-field-move-up="f1"[^>]*disabled/);
  assert.doesNotMatch(first, /data-field-move-down="f1"[^>]*disabled/);

  const last = renderFieldCard({ field: baseField, showReorderButtons: true, isLast: true });
  assert.match(last, /data-field-move-down="f1"[^>]*disabled/);
  assert.doesNotMatch(last, /data-field-move-up="f1"[^>]*disabled/);
});

test('field card groups trailing controls into one cohesive cluster', () => {
  const html = renderFieldCard({
    field: baseField,
    showReorderButtons: true,
    actionsHtml: '<button data-field-actions="f1">kebab</button>',
    renderExpandedContent: () => '<div>body</div>',
  });
  // A single trailing control container holds reorder + actions + expand.
  assert.match(html, /flex items-center gap-0\.5 flex-shrink-0/);
});

test('field card renders expand control as an accessible button', () => {
  const collapsed = renderFieldCard({
    field: baseField,
    renderExpandedContent: () => '<div>body</div>',
  });
  assert.match(collapsed, /<button[\s\S]*data-field-expand-toggle="f1"/);
  assert.match(collapsed, /aria-label="Expand field"/);
  assert.match(collapsed, /aria-expanded="false"/);

  const expanded = renderFieldCard({
    field: baseField,
    isExpanded: true,
    renderExpandedContent: () => '<div>body</div>',
  });
  assert.match(expanded, /aria-label="Collapse field"/);
  assert.match(expanded, /aria-expanded="true"/);
});

test('field card reorder no longer uses the old competing bordered box', () => {
  const html = renderFieldCard({ field: baseField, showReorderButtons: true });
  // The previous treatment wrapped up/down in a bordered box with a divider.
  assert.doesNotMatch(html, /block h-px bg-gray-200/);
});

test('field card omits reorder controls when not requested', () => {
  const html = renderFieldCard({ field: baseField, showReorderButtons: false });
  assert.doesNotMatch(html, /data-field-move-up/);
  assert.doesNotMatch(html, /data-field-move-down/);
});
