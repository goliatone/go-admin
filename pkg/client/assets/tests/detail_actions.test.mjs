import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { importDatatableModule } from './helpers/load-datatable-dist.mjs';

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch (error) {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();
const {
  initPanelDetailActions,
  renderDetailActions,
} = await importDatatableModule();

async function loadFixture() {
  const fixtureURL = new URL('./fixtures/action_affordances_phase4/enriched_affordances.json', import.meta.url);
  return JSON.parse(await readFile(fixtureURL, 'utf8'));
}

function setGlobals(win) {
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.Event = win.Event;
  globalThis.MouseEvent = win.MouseEvent;
  globalThis.Response = win.Response || globalThis.Response;
}

function setupDOM(html) {
  const dom = new JSDOM(html, { url: 'http://localhost/admin/content/documents/doc_123?locale=fr' });
  setGlobals(dom.window);
  return dom;
}

test('renderDetailActions includes disabled reasons and remediation links for detail surfaces', () => {
  const html = renderDetailActions([
    {
      id: 'delete',
      label: 'Delete',
      disabled: true,
      disabledReason: 'Document is used by 2 active agreements.',
      remediation: {
        label: 'View agreements',
        href: '/admin/esign_agreements?document_id=doc_123',
        kind: 'link',
      },
      action: () => {},
    },
  ]);

  assert.match(html, /data-detail-action-button="delete"/);
  assert.match(html, /aria-describedby="detail-action-reason-delete"/);
  assert.match(html, /Document is used by 2 active agreements\./);
  assert.match(html, /View agreements/);
});

test('initPanelDetailActions renders canonical detail actions and keeps disabled actions non-clickable', async () => {
  const fixture = await loadFixture();
  const dom = setupDOM(`
    <div
      data-panel-detail-actions
      data-panel="content"
      data-record-id="doc_123"
      data-base-path="/admin"
      data-panel-base-path="/admin/content"
      data-api-base-path="/admin/api"
      data-back-href="/admin/content"
    ></div>
  `);

  const requests = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    return new Response(JSON.stringify(fixture.detail_contract), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const [controller] = await initPanelDetailActions(dom.window.document);
    assert.ok(controller);

    const mount = dom.window.document.querySelector('[data-panel-detail-actions]');
    assert.equal(mount.getAttribute('aria-busy'), 'false');
    assert.match(mount.innerHTML, /Submit for approval/);
    assert.match(mount.innerHTML, /Open translation family/);

    const deleteButton = dom.window.document.querySelector('[data-detail-action-button="delete"]');
    assert.equal(deleteButton.getAttribute('aria-disabled'), 'true');
    assert.equal(deleteButton.getAttribute('aria-describedby'), 'detail-action-reason-delete');

    deleteButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(requests.length, 1);
    assert.match(requests[0].url, /\/admin\/api\/panels\/content\/doc_123\?locale=fr/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
