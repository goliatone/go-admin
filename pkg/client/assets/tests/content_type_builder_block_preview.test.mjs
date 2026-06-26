/**
 * T14 — Block Library live preview
 *
 * Verifies that BlockEditorPanel renders the shared content-modeling preview
 * contract (read-only inline snapshot + Expand affordance), ignores stale
 * responses, and only re-fetches when the edited schema actually changes.
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

const bootstrapDom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
setGlobals(bootstrapDom.window);
Object.defineProperty(globalThis.document, 'readyState', { value: 'loading', configurable: true });

globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ items: [] }) });

const { BlockEditorPanel } = await import('../dist/content-type-builder/index.js');

function setGlobals(win) {
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.Node = win.Node;
  globalThis.Element = win.Element;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.HTMLInputElement = win.HTMLInputElement;
  globalThis.HTMLSelectElement = win.HTMLSelectElement;
  globalThis.HTMLTextAreaElement = win.HTMLTextAreaElement;
  globalThis.HTMLTemplateElement = win.HTMLTemplateElement;
  globalThis.Event = win.Event;
  globalThis.MouseEvent = win.MouseEvent;
  globalThis.KeyboardEvent = win.KeyboardEvent;
  globalThis.CustomEvent = win.CustomEvent;
  globalThis.MutationObserver = win.MutationObserver;
  globalThis.FormData = win.FormData;
  globalThis.requestAnimationFrame = win.requestAnimationFrame
    ? win.requestAnimationFrame.bind(win)
    : (cb) => setTimeout(cb, 0);
}

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
  setGlobals(dom.window);
  return dom;
}

function makePanel(overrides = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const block = {
    id: 'b1',
    name: 'Hero',
    slug: 'hero',
    type: 'hero',
    status: 'draft',
    category: 'layout',
    schema: {
      type: 'object',
      properties: { title: { type: 'string', title: 'Title' } },
      required: [],
    },
    ...overrides.block,
  };
  const api = {
    previewSchema: async () => ({ html: '<form data-form>FORM</form>' }),
    getBasePath: () => '/admin/api',
    ...overrides.api,
  };
  const panel = new BlockEditorPanel({
    container,
    block,
    categories: ['layout'],
    api,
    onMetadataChange: () => {},
    onSchemaChange: () => {},
  });
  panel.render();
  // Cancel the debounce scheduled by the initial render so tests drive it explicitly.
  if (panel.previewDebounceTimer) {
    clearTimeout(panel.previewDebounceTimer);
    panel.previewDebounceTimer = null;
  }
  return { panel, container };
}

test('BlockEditorPanel renders the shared preview section with Expand and Refresh', () => {
  setupDom();
  const { container } = makePanel();
  assert.ok(container.querySelector('[data-block-preview-section]'), 'preview section present');
  assert.ok(container.querySelector('[data-block-preview-container]'), 'preview container present');
  assert.ok(container.querySelector('[data-block-expand-preview]'), 'interactive Expand affordance present');
  assert.ok(container.querySelector('[data-block-refresh-preview]'), 'Refresh fallback present');
});

test('BlockEditorPanel preview ignores a stale response when a newer one wins', async () => {
  setupDom();
  const { panel, container } = makePanel();

  const deferred = [];
  panel.config.api.previewSchema = () =>
    new Promise((resolve) => {
      deferred.push(resolve);
    });

  const first = panel.previewSchema(); // seq N
  const second = panel.previewSchema(); // seq N+1 (supersedes)

  deferred[1]({ html: '<p data-fresh>FRESH</p>' });
  deferred[0]({ html: '<p data-stale>STALE</p>' });
  await Promise.all([first, second]);

  const previewContainer = container.querySelector('[data-block-preview-container]');
  assert.ok(previewContainer.innerHTML.includes('FRESH'), 'fresh response should render');
  assert.ok(!previewContainer.innerHTML.includes('STALE'), 'stale response must be ignored');
  assert.ok(previewContainer.querySelector('.ct-preview-readonly'), 'inline preview wrapped read-only');
});

test('BlockEditorPanel preview short-circuits (no fetch) when there are no fields', async () => {
  setupDom();
  const { panel, container } = makePanel({ block: { schema: { type: 'object', properties: {}, required: [] } } });
  let called = 0;
  panel.config.api.previewSchema = async () => {
    called++;
    return { html: '<form></form>' };
  };
  await panel.previewSchema();
  assert.equal(called, 0, 'no API call when the schema has no fields');
  const previewContainer = container.querySelector('[data-block-preview-container]');
  assert.ok(/live preview/i.test(previewContainer.textContent), 'empty-state copy shown');
});

test('BlockEditorPanel only re-fetches preview when the schema signature changes', () => {
  setupDom();
  const { panel } = makePanel();

  // Mark the current schema as previewed; an unchanged re-render must not reschedule.
  panel.lastPreviewSignature = panel.computeSchemaSignature();
  panel.previewDebounceTimer = null;
  panel.maybeSchedulePreview();
  assert.equal(panel.previewDebounceTimer, null, 'unchanged schema must not reschedule a preview');

  // A real field change must reschedule.
  panel.fields.push({ id: 'f2', name: 'subtitle', type: 'text', label: 'Subtitle', required: false });
  panel.maybeSchedulePreview();
  assert.ok(panel.previewDebounceTimer != null, 'changed schema schedules a preview');
  clearTimeout(panel.previewDebounceTimer);
  panel.previewDebounceTimer = null;
});
