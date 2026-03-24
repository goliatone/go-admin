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

test('renderDetailActions restores compact header layout with primary action and overflow menu', () => {
  const html = renderDetailActions([
    {
      id: 'edit',
      label: 'Edit',
      action: () => {},
    },
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

  assert.match(html, /data-detail-action-button="edit"/);
  assert.match(html, /data-detail-actions-dropdown-trigger/);
  assert.match(html, /data-detail-action-button="delete"/);
  assert.match(html, /data-detail-action-reason="delete"/);
  assert.match(html, /title="Document is used by 2 active agreements\."/);
});

test('renderDetailActions renders aria-describedby for disabled dropdown actions', () => {
  const html = renderDetailActions([
    {
      id: 'edit',
      label: 'Edit',
      action: () => {},
    },
    {
      id: 'archive',
      label: 'Archive',
      disabled: true,
      disabledReason: 'Cannot archive active documents.',
      action: () => {},
    },
  ]);

  assert.match(html, /data-detail-action-button="archive"/);
  assert.match(html, /aria-describedby="detail-action-reason-archive"/);
  assert.match(html, /id="detail-action-reason-archive"/);
  assert.match(html, /data-detail-action-reason="archive"/);
});

test('renderDetailActions renders remediation link for disabled dropdown actions', () => {
  const html = renderDetailActions([
    {
      id: 'edit',
      label: 'Edit',
      action: () => {},
    },
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

  assert.match(html, /data-detail-action-remediation="delete"/);
  assert.match(html, /href="\/admin\/esign_agreements\?document_id=doc_123"/);
  assert.match(html, />\s*View agreements\s*</);
});

test('renderDetailActions renders aria-describedby for disabled primary action', () => {
  const html = renderDetailActions([
    {
      id: 'edit',
      label: 'Edit',
      disabled: true,
      disabledReason: 'Document is locked for editing.',
      action: () => {},
    },
  ]);

  assert.match(html, /data-detail-action-button="edit"/);
  assert.match(html, /aria-describedby="detail-action-reason-edit"/);
  assert.match(html, /id="detail-action-reason-edit"/);
  assert.match(html, /data-detail-action-reason="edit"/);
});

test('renderDetailActions renders remediation link for disabled primary action', () => {
  const html = renderDetailActions([
    {
      id: 'edit',
      label: 'Edit',
      disabled: true,
      disabledReason: 'Document is locked.',
      remediation: {
        label: 'Request unlock',
        href: '/admin/unlock?doc_id=123',
        kind: 'link',
      },
      action: () => {},
    },
  ]);

  assert.match(html, /data-detail-action-remediation="edit"/);
  assert.match(html, /href="\/admin\/unlock\?doc_id=123"/);
  assert.match(html, />\s*Request unlock\s*</);
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
    assert.match(mount.innerHTML, /data-detail-actions-dropdown-trigger/);
    assert.match(mount.innerHTML, /data-detail-action-button="submit-for-approval"/);

    const deleteButton = dom.window.document.querySelector('[data-detail-action-button="delete"]');
    const deleteReason = dom.window.document.querySelector('[data-detail-action-reason="delete"]');
    assert.equal(deleteButton.getAttribute('aria-disabled'), 'true');
    assert.equal(deleteButton.getAttribute('title'), 'Document is used by 2 active agreements.');
    assert.equal(deleteButton.getAttribute('aria-describedby'), deleteReason?.id || null);
    assert.equal(deleteReason?.textContent?.trim(), 'Document is used by 2 active agreements.');

    deleteButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(requests.length, 1);
    assert.match(requests[0].url, /\/admin\/api\/panels\/content\/doc_123\?locale=fr/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('initPanelDetailActions renders aria-describedby for both primary and dropdown disabled actions', async () => {
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

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return new Response(JSON.stringify(fixture.detail_contract), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await initPanelDetailActions(dom.window.document);

    const deleteButton = dom.window.document.querySelector('[data-detail-action-button="delete"]');
    const deleteReasonId = deleteButton?.getAttribute('aria-describedby');
    const deleteReasonNode = dom.window.document.getElementById(deleteReasonId);

    assert.ok(deleteReasonId, 'dropdown disabled action should have aria-describedby');
    assert.ok(deleteReasonNode, 'aria-describedby should reference existing element');
    assert.equal(deleteReasonNode?.getAttribute('data-detail-action-reason'), 'delete');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('initPanelDetailActions renders remediation links for dropdown disabled actions', async () => {
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

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return new Response(JSON.stringify(fixture.detail_contract), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await initPanelDetailActions(dom.window.document);

    const remediation = dom.window.document.querySelector('[data-detail-action-remediation="delete"]');
    assert.ok(remediation, 'dropdown disabled action with remediation should render remediation link');
    assert.equal(remediation?.getAttribute('href'), '/admin/esign_agreements?document_id=doc_123');
    assert.match(remediation?.textContent, /View agreements/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('disabled dropdown actions do not close the overflow menu when clicked', async () => {
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

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return new Response(JSON.stringify(fixture.detail_contract), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await initPanelDetailActions(dom.window.document);

    const trigger = dom.window.document.querySelector('[data-detail-actions-dropdown-trigger]');
    const menu = dom.window.document.querySelector('[data-detail-actions-dropdown-menu]');
    const deleteButton = dom.window.document.querySelector('[data-detail-action-button="delete"]');

    assert.ok(trigger);
    assert.ok(menu);
    assert.ok(deleteButton);

    trigger.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    assert.equal(menu.classList.contains('hidden'), false, 'menu should open before clicking disabled action');

    deleteButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    assert.equal(menu.classList.contains('hidden'), false, 'disabled dropdown action should not close the menu');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('repeated refresh() does not accumulate document event listeners', async () => {
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

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return new Response(JSON.stringify(fixture.detail_contract), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const [controller] = await initPanelDetailActions(dom.window.document);
    assert.ok(controller);

    // Refresh multiple times to simulate repeated data updates
    await controller.refresh();
    await controller.refresh();
    await controller.refresh();

    // Open the dropdown
    const trigger = dom.window.document.querySelector('[data-detail-actions-dropdown-trigger]');
    const menu = dom.window.document.querySelector('[data-detail-actions-dropdown-menu]');
    assert.ok(trigger);
    assert.ok(menu);

    trigger.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    assert.equal(menu.classList.contains('hidden'), false, 'menu should be open');

    // Track how many times the menu gets closed
    let closeCount = 0;
    const originalAdd = menu.classList.add.bind(menu.classList);
    menu.classList.add = (...args) => {
      if (args.includes('hidden')) {
        closeCount++;
      }
      return originalAdd(...args);
    };

    // Click outside to close - should only trigger once, not multiple times
    dom.window.document.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

    // If listeners accumulated, closeCount would be > 1
    assert.equal(closeCount, 1, 'outside click should close menu exactly once (no listener accumulation)');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('refresh() removes stale document click listeners when detail actions become unavailable', async () => {
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
  dom.window.toastManager = {
    success() {},
    error() {},
  };

  let fetchCount = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchCount += 1;
    if (fetchCount === 1) {
      return new Response(JSON.stringify(fixture.detail_contract), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ message: 'unavailable' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const [controller] = await initPanelDetailActions(dom.window.document);
    const trigger = dom.window.document.querySelector('[data-detail-actions-dropdown-trigger]');
    const menu = dom.window.document.querySelector('[data-detail-actions-dropdown-menu]');

    assert.ok(controller);
    assert.ok(trigger);
    assert.ok(menu);

    trigger.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    assert.equal(menu.classList.contains('hidden'), false, 'menu should open before refresh');

    let closeCount = 0;
    const originalAdd = menu.classList.add.bind(menu.classList);
    menu.classList.add = (...args) => {
      if (args.includes('hidden')) {
        closeCount += 1;
      }
      return originalAdd(...args);
    };

    await controller.refresh();
    const mount = dom.window.document.querySelector('[data-panel-detail-actions]');
    assert.equal(mount?.innerHTML, '');

    dom.window.document.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    assert.equal(closeCount, 0, 'stale document click handlers should be removed before refresh exits early');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('refresh() removes stale document keydown listeners when detail actions become unavailable', async () => {
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
  dom.window.toastManager = {
    success() {},
    error() {},
  };

  let fetchCount = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchCount += 1;
    if (fetchCount === 1) {
      return new Response(JSON.stringify(fixture.detail_contract), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ message: 'unavailable' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const [controller] = await initPanelDetailActions(dom.window.document);
    const trigger = dom.window.document.querySelector('[data-detail-actions-dropdown-trigger]');
    const menu = dom.window.document.querySelector('[data-detail-actions-dropdown-menu]');

    assert.ok(controller);
    assert.ok(trigger);
    assert.ok(menu);

    trigger.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    assert.equal(menu.classList.contains('hidden'), false, 'menu should open before refresh');

    let focusCount = 0;
    trigger.focus = () => {
      focusCount += 1;
    };

    await controller.refresh();
    const mount = dom.window.document.querySelector('[data-panel-detail-actions]');
    assert.equal(mount?.innerHTML, '');

    dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
    assert.equal(focusCount, 0, 'stale document keydown handlers should be removed before refresh exits early');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
