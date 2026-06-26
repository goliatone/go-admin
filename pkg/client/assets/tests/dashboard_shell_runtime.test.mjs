import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDashboardShell } from './helpers/dashboard-shell.mjs';

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch (error) {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();
const shell = loadDashboardShell();

function setupDom() {
  const dom = new JSDOM(`
    <!doctype html>
    <html>
      <body>
        <section data-dashboard-shell
                 data-dashboard-shell-surface="content-types"
                 data-dashboard-shell-namespace="go-dashboard:shell"
                 data-dashboard-shell-version="1">
          <aside data-shell-region="list"
                 data-shell-resizable
                 data-shell-edge="trailing"
                 data-shell-min="240"
                 data-shell-max="420"
                 data-shell-default-size="320"></aside>
          <button type="button" data-shell-toggle="list" aria-expanded="true">List</button>
          <main data-shell-region="builder" data-shell-focus-target="builder"></main>
          <button type="button" data-shell-focus-toggle="builder" aria-pressed="false">Builder</button>
          <div data-shell-resize="list" tabindex="0"></div>
        </section>
      </body>
    </html>`,
    { url: 'http://localhost' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.localStorage = dom.window.localStorage;
  return dom;
}

test('go-dashboard shell runtime restores, toggles, and keyboard-resizes shared shell regions', () => {
  setupDom();
  window.localStorage.setItem('go-dashboard:shell:v1:content-types:viewer:anonymous', JSON.stringify({
    regions: {
      list: { collapsed: true, size: 360 },
    },
    focus: 'builder',
  }));

  const root = document.querySelector('[data-dashboard-shell]');
  const controller = shell.initShell(root);
  assert.ok(controller, 'expected shell controller');

  const list = root.querySelector('[data-shell-region="list"]');
  const toggle = root.querySelector('[data-shell-toggle="list"]');
  const focus = root.querySelector('[data-shell-focus-toggle="builder"]');
  const handle = root.querySelector('[data-shell-resize="list"]');

  assert.equal(list.getAttribute('data-collapsed'), 'true');
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(root.getAttribute('data-shell-focus'), 'builder');
  assert.equal(focus.getAttribute('aria-pressed'), 'true');

  toggle.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.equal(list.getAttribute('data-collapsed'), 'false');
  assert.equal(list.style.width, '360px');

  handle.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'End', bubbles: true }));
  assert.equal(list.style.width, '420px');
});
