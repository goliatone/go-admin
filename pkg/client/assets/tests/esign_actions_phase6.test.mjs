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
  SchemaActionBuilder,
  initPanelDetailActions,
} = await importDatatableModule();

async function loadFixture() {
  const fixtureURL = new URL('./fixtures/examples_esign_action_contracts/esign_actions_phase6.json', import.meta.url);
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

function setupDOM(html, url = 'http://localhost/admin/content/esign_documents/doc-phase6-001?tenant_id=tenant-bootstrap&org_id=org-bootstrap') {
  const dom = new JSDOM(html, { url });
  setGlobals(dom.window);
  return dom;
}

function createBuilder(panel, overrides = {}) {
  return new SchemaActionBuilder({
    apiEndpoint: `/admin/api/v1/panels/${panel}`,
    actionBasePath: `/admin/content/${panel}`,
    panelName: panel,
    useDefaultFallback: true,
    ...overrides,
  });
}

test('Phase 6 fixture: e-sign document row actions expose disabled reason and remediation from canonical action state', async () => {
  const fixture = await loadFixture();
  const builder = createBuilder('esign_documents');
  const record = fixture.documents.list_contract.record;
  const actions = builder.buildRowActions(record, fixture.documents.list_contract.schema.actions);
  const deleteAction = actions.find((action) => action.id === 'delete');

  assert.equal(deleteAction?.disabled, true);
  assert.equal(deleteAction?.disabledReason, record._action_state.delete.reason);
  assert.deepEqual(deleteAction?.remediation, record._action_state.delete.remediation);
});

test('Phase 6 fixture: e-sign document detail actions render disabled delete with remediation link', async () => {
  const fixture = await loadFixture();
  const dom = setupDOM(`
    <div
      data-panel-detail-actions
      data-panel="esign_documents"
      data-record-id="${fixture.documents.detail_contract.data.id}"
      data-base-path="/admin"
      data-panel-base-path="/admin/content/esign_documents"
      data-api-base-path="/admin/api/v1"
      data-back-href="/admin/content/esign_documents"
    ></div>
  `);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify(fixture.documents.detail_contract), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  try {
    const [controller] = await initPanelDetailActions(dom.window.document);
    assert.ok(controller);

    const deleteButton = dom.window.document.querySelector('[data-detail-action-button="delete"]');
    const deleteReason = dom.window.document.querySelector('[data-detail-action-reason="delete"]');
    const remediation = dom.window.document.querySelector('[data-detail-action-remediation="delete"]');

    assert.equal(deleteButton?.getAttribute('aria-disabled'), 'true');
    assert.equal(deleteReason?.textContent?.trim(), fixture.documents.detail_contract.data._action_state.delete.reason);
    assert.equal(remediation?.getAttribute('href'), fixture.documents.detail_contract.data._action_state.delete.remediation.href);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Phase 6 fixture: stale e-sign document delete failures use structured copy and refresh disabled detail affordance', async () => {
  const fixture = await loadFixture();
  const initialDetail = structuredClone(fixture.documents.detail_contract);
  initialDetail.data._action_state.delete = { enabled: true };

  const toastErrors = [];
  const dom = setupDOM(`
    <div
      data-panel-detail-actions
      data-panel="esign_documents"
      data-record-id="${fixture.documents.detail_contract.data.id}"
      data-base-path="/admin"
      data-panel-base-path="/admin/content/esign_documents"
      data-api-base-path="/admin/api/v1"
      data-back-href="/admin/content/esign_documents"
    ></div>
  `);
  dom.window.toastManager = {
    success() {},
    error(message) {
      toastErrors.push(String(message));
    },
  };
  dom.window.confirm = () => true;
  globalThis.confirm = dom.window.confirm;

  let getCount = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    const method = String(options.method || 'GET').toUpperCase();
    if (method === 'DELETE') {
      return new Response(JSON.stringify(fixture.documents.execution_failures.delete), {
        status: fixture.documents.execution_failures.delete.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    getCount += 1;
    const payload = getCount === 1 ? initialDetail : fixture.documents.detail_contract;
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await initPanelDetailActions(dom.window.document);
    const deleteButton = dom.window.document.querySelector('[data-detail-action-button="delete"]');
    assert.equal(deleteButton?.getAttribute('aria-disabled'), 'false');

    deleteButton?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const refreshedButton = dom.window.document.querySelector('[data-detail-action-button="delete"]');
    const refreshedReason = dom.window.document.querySelector('[data-detail-action-reason="delete"]');

    assert.equal(refreshedButton?.getAttribute('aria-disabled'), 'true');
    assert.equal(refreshedReason?.textContent?.trim(), fixture.documents.detail_contract.data._action_state.delete.reason);
    assert.ok(toastErrors.some((message) => message.includes('RESOURCE_IN_USE')));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Phase 6 fixture: e-sign agreement detail actions render canonical shared actions and disabled reasons', async () => {
  const fixture = await loadFixture();
  const dom = setupDOM(`
    <div
      data-panel-detail-actions
      data-panel="esign_agreements"
      data-record-id="${fixture.agreements.detail_contract.data.id}"
      data-base-path="/admin"
      data-panel-base-path="/admin/content/esign_agreements"
      data-api-base-path="/admin/api/v1"
      data-back-href="/admin/content/esign_agreements"
    ></div>
  `, 'http://localhost/admin/content/esign_agreements/agreement-phase6-sent?tenant_id=tenant-bootstrap&org_id=org-bootstrap');

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify(fixture.agreements.detail_contract), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  try {
    await initPanelDetailActions(dom.window.document);

    const sendButton = dom.window.document.querySelector('[data-detail-action-button="send"]');
    const resendButton = dom.window.document.querySelector('[data-detail-action-button="resend"]');
    const deleteButton = dom.window.document.querySelector('[data-detail-action-button="delete"]');
    const sendReason = dom.window.document.querySelector('[data-detail-action-reason="send"]');

    assert.ok(sendButton);
    assert.ok(resendButton);
    assert.ok(deleteButton);
    assert.equal(sendButton?.getAttribute('aria-disabled'), 'true');
    assert.equal(deleteButton?.getAttribute('aria-disabled'), 'true');
    assert.equal(resendButton?.getAttribute('aria-disabled'), 'false');
    assert.equal(sendReason?.textContent?.trim(), fixture.agreements.detail_contract.data._action_state.send.reason);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Phase 6 template: agreements detail header no longer duplicates shared send/resend/void buttons', async () => {
  const templateURL = new URL('../../templates/resources/esign-agreements/detail.html', import.meta.url);
  const template = await readFile(templateURL, 'utf8');

  assert.equal(template.includes('data-action="send" data-agreement-id='), false);
  assert.equal(template.includes('data-action="resend" data-agreement-id='), false);
  assert.equal(template.includes('data-action="void" data-agreement-id='), false);
});

test('Phase 6 templates: e-sign list surfaces reconcile row actions after structured domain failures', async () => {
  const documentsTemplateURL = new URL('../../templates/resources/esign-documents/list.html', import.meta.url);
  const agreementsTemplateURL = new URL('../../templates/resources/esign-agreements/list.html', import.meta.url);
  const [documentsTemplate, agreementsTemplate] = await Promise.all([
    readFile(documentsTemplateURL, 'utf8'),
    readFile(agreementsTemplateURL, 'utf8'),
  ]);

  assert.match(documentsTemplate, /reconcileOnDomainFailure:\s*async\s*\(\)\s*=>\s*\{\s*await grid\.refresh\(\);/);
  assert.match(agreementsTemplate, /reconcileOnDomainFailure:\s*async\s*\(\)\s*=>\s*\{\s*await grid\.refresh\(\);/);
});
