import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const { ImportModal } = await import('../dist/components/import-modal.js');
const { Modal } = await import('../dist/components/modal.js');

function setup() {
  const dom = new JSDOM(`<!doctype html><html><body>
    <button id="open">Import</button>
    <div id="import-users-modal" class="hidden" role="dialog" aria-modal="true" aria-labelledby="import-users-title">
      <div id="import-users-backdrop"></div>
      <div id="import-users-container" class="w-full max-w-3xl max-h-[90vh]">
        <h2 id="import-users-title">Import users</h2>
        <button id="import-users-close" type="button">Close</button>
        <button id="import-users-fullscreen" type="button">Fullscreen</button>
        <span id="import-users-expand-icon"></span>
        <span id="import-users-collapse-icon" class="hidden"></span>
        <input id="import-users-file" type="file" />
      </div>
    </div>
  </body></html>`, { url: 'http://localhost/admin/users', pretendToBeVisual: true });
  const win = dom.window;
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.Node = win.Node;
  globalThis.Element = win.Element;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.HTMLButtonElement = win.HTMLButtonElement;
  globalThis.HTMLInputElement = win.HTMLInputElement;
  globalThis.KeyboardEvent = win.KeyboardEvent;
  globalThis.MouseEvent = win.MouseEvent;
  globalThis.requestAnimationFrame = (callback) => callback(0);
  win.matchMedia = (query) => ({
    matches: query === '(prefers-reduced-motion: reduce)',
    media: query,
    addEventListener() {},
    removeEventListener() {},
  });
  return dom;
}

class GeneratedModal extends Modal {
  constructor() {
    super({ animationDuration: 0, ariaLabel: 'Generated dialog', initialFocus: '#generated-action' });
  }

  renderContent() {
    return '<button id="generated-action" type="button">Generated action</button>';
  }

  bindContentEvents() {}
}

function pressEscape() {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
}

test('template-backed ImportModal traps and returns focus without leaking body scroll state', () => {
  setup();
  const invoker = document.getElementById('open');
  invoker.focus();
  const modal = new ImportModal({ modalId: 'import-users-modal' });

  modal.open();
  assert.equal(document.getElementById('import-users-modal').classList.contains('hidden'), false);
  assert.equal(document.activeElement.id, 'import-users-file');
  assert.equal(document.body.classList.contains('overflow-hidden'), true);

  modal.close();
  assert.equal(document.activeElement, invoker);
  assert.equal(document.body.classList.contains('overflow-hidden'), false);
});

test('template-backed ImportModal uses Escape for fullscreen exit before dismissal', () => {
  setup();
  const modal = new ImportModal({ modalId: 'import-users-modal' });
  modal.open();
  modal.toggleFullscreen();

  document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(modal.isFullscreen, false);
  assert.equal(document.getElementById('import-users-modal').classList.contains('hidden'), false);

  document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(document.getElementById('import-users-modal').classList.contains('hidden'), true);
});

test('generated then template-backed dialogs share topmost Escape and scroll ownership', async () => {
  setup();
  const generated = new GeneratedModal();
  const imported = new ImportModal({ modalId: 'import-users-modal' });
  await generated.show();
  const generatedAction = document.getElementById('generated-action');
  imported.open();

  pressEscape();
  assert.equal(document.getElementById('import-users-modal').classList.contains('hidden'), true);
  assert.equal(generated.isOpen, true);
  assert.equal(document.activeElement, generatedAction);
  assert.equal(document.body.classList.contains('overflow-hidden'), true);

  pressEscape();
  assert.equal(generated.isOpen, false);
  assert.equal(document.body.classList.contains('overflow-hidden'), false);
});

test('template-backed then generated dialogs share topmost Escape and focus return ownership', async () => {
  setup();
  const invoker = document.getElementById('open');
  invoker.focus();
  const imported = new ImportModal({ modalId: 'import-users-modal' });
  const generated = new GeneratedModal();
  imported.open();
  const importFile = document.getElementById('import-users-file');
  await generated.show();

  pressEscape();
  assert.equal(generated.isOpen, false);
  assert.equal(document.getElementById('import-users-modal').classList.contains('hidden'), false);
  assert.equal(document.activeElement, importFile);
  assert.equal(document.body.classList.contains('overflow-hidden'), true);

  pressEscape();
  assert.equal(document.getElementById('import-users-modal').classList.contains('hidden'), true);
  assert.equal(document.activeElement, invoker);
  assert.equal(document.body.classList.contains('overflow-hidden'), false);
});

test('programmatically closing a background dialog does not steal top-layer focus or scroll lock', async () => {
  setup();
  const generated = new GeneratedModal();
  const imported = new ImportModal({ modalId: 'import-users-modal' });
  await generated.show();
  imported.open();
  const importFile = document.getElementById('import-users-file');

  generated.destroy();
  assert.equal(document.activeElement, importFile);
  assert.equal(document.body.classList.contains('overflow-hidden'), true);

  imported.close();
  assert.equal(document.body.classList.contains('overflow-hidden'), false);
});
