import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const { ImportModal } = await import('../dist/components/import-modal.js');

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
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.HTMLButtonElement = win.HTMLButtonElement;
  globalThis.HTMLInputElement = win.HTMLInputElement;
  globalThis.KeyboardEvent = win.KeyboardEvent;
  return dom;
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

test('template-backed ImportModal does not unlock scrolling while another dialog is open', () => {
  setup();
  const modal = new ImportModal({ modalId: 'import-users-modal' });
  modal.open();
  const otherDialog = document.createElement('div');
  otherDialog.setAttribute('role', 'dialog');
  otherDialog.setAttribute('data-go-admin-modal-scroll-lock', 'true');
  document.body.appendChild(otherDialog);

  modal.close();

  assert.equal(document.body.classList.contains('overflow-hidden'), true);
});
