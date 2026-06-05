import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const {
  buildTranslationFamilySyncRPCRequest,
  buildFamilyActivityPreview,
  dispatchTranslationFamilySync,
  fetchTranslationFamilyDetailState,
  initTranslationFamilyDetailPage,
  normalizeFamilyDetail,
  normalizeTranslationFamilySyncRecoveryCapability,
  renderTranslationFamilyDetailState,
} = await import('../dist/translation-family/index.js');

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();
const fixtureURL = new URL('./fixtures/translation_family_detail/family_states.json', import.meta.url);
const fixtures = JSON.parse(await readFile(fixtureURL, 'utf8'));

function setGlobals(win) {
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.Document = win.Document;
  globalThis.Node = win.Node;
  globalThis.Element = win.Element;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.HTMLButtonElement = win.HTMLButtonElement;
  globalThis.Event = win.Event;
  Object.defineProperty(globalThis, 'navigator', { value: win.navigator, configurable: true });
  Object.defineProperty(globalThis, 'location', { value: win.location, configurable: true });
}

function setupDom(markup) {
  const dom = new JSDOM(markup, {
    url: 'http://localhost:8082/admin/translations/families/missing-family',
  });
  setGlobals(dom.window);
  return dom;
}

function nextTick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function missingFamilyResponse({ canSync = true, status = 404, textCode = 'NOT_FOUND' } = {}) {
  return new Response(JSON.stringify({
    error: {
      text_code: textCode,
      message: textCode === 'NOT_FOUND' ? 'translation family not found' : 'translation family conflict',
      metadata: {
        family_id: 'missing-family',
        sync_recovery: canSync ? {
          can_sync: true,
          syncable: true,
          permission: 'admin.translations.sync',
          command_name: 'translation.families.sync',
          rpc_invoke_path: '/admin/api/rpc',
          environment: 'production',
          family_id: 'missing-family',
        } : {
          can_sync: false,
        },
      },
    },
  }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': 'req-missing',
      'X-Trace-Id': 'trace-missing',
    },
  });
}

function readyFamilyResponse() {
  return new Response(JSON.stringify({ data: fixtures.ready }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function cloneFixture(name) {
  return JSON.parse(JSON.stringify(fixtures[name]));
}

function assignmentActionFixture({ active = false, state = 'unassigned' } = {}) {
  const detail = cloneFixture(active ? 'ready' : 'missing_locale');
  const locale = active ? 'fr' : 'es';
  const key = `${locale}:localization`;
  const assignment = active ? {
    ...detail.active_assignments[0],
    row_version: 2,
    assignee_label: 'Marie Curie',
    due_state: 'on_track',
    actions: {},
  } : null;
  if (!active) {
    detail.active_assignments = [];
  }
  detail.locale_assignments = {
    [key]: {
      locale,
      work_scope: 'localization',
      state,
      assignment,
      actions: {
        assign_to_me: {
          enabled: !active,
          permission: 'admin.translations.assign',
          endpoint: '/admin/api/translations/families/family-missing/assignments',
          required_fields: ['target_locale'],
          payload: {
            target_locale: locale,
            work_scope: 'localization',
            assignee_id: 'translator-self',
          },
        },
        assign_to_user: {
          enabled: true,
          permission: 'admin.translations.assign',
          endpoint: '/admin/api/translations/families/family-missing/assignments',
          required_fields: ['target_locale', 'assignee_id'],
          payload: {
            target_locale: locale,
            work_scope: 'localization',
          },
        },
        claim: {
          enabled: active,
          permission: 'admin.translations.claim',
          endpoint: '/admin/api/translations/assignments/asg-ready-fr/actions/claim',
          required_fields: ['expected_version'],
          assignment_id: 'asg-ready-fr',
          expected_version: 2,
        },
        open_editor: active ? {
          enabled: true,
          label: 'Open editor',
          href: '/admin/translations/assignments/asg-ready-fr/edit',
        } : {
          enabled: false,
          reason: 'no active assignment to open',
          reason_code: 'invalid_status',
        },
      },
    },
  };
  return detail;
}

test('translation-family detail: renders complete surface from ready fixture', () => {
  const detail = normalizeFamilyDetail(fixtures.ready);
  const html = renderTranslationFamilyDetailState(
    { status: 'ready', detail, requestId: 'req-ready', traceId: 'trace-ready' },
    { basePath: '/admin', contentBasePath: '/admin/content' }
  );

  assert.match(html, /Translation family/i);
  assert.match(html, /Locale coverage/i);
  assert.match(html, /Assignments/i);
  assert.match(html, /Publish gate/i);
  assert.match(html, /Activity preview/i);
  assert.match(html, /Open locale/i);
  assert.match(html, /Open editor/i);
  assert.match(html, /href="\/admin\/translations\/assignments\/asg-ready-fr\/edit"/);
  assert.match(html, /data-family-assignment-editor-link="asg-ready-fr"/);
  assert.match(html, /Request req-ready/);
  assert.match(html, /Trace trace-ready/);
});

test('translation-family detail: publish gate stacks policy before blockers', () => {
  const detail = normalizeFamilyDetail(fixtures.blocked);
  const html = renderTranslationFamilyDetailState({ status: 'ready', detail });

  assert.doesNotMatch(html, /md:grid-cols-2/);
  const policyIndex = html.indexOf('>Policy</h3>');
  const blockersIndex = html.indexOf('>Blockers</h3>');
  assert.notEqual(policyIndex, -1);
  assert.notEqual(blockersIndex, -1);
  assert.equal(policyIndex < blockersIndex, true);
});

test('translation-family detail: missing-locale fixture renders blocked locale row', () => {
  const detail = normalizeFamilyDetail(fixtures.missing_locale);
  const html = renderTranslationFamilyDetailState(
    { status: 'ready', detail },
    { basePath: '/admin', contentBasePath: '/admin/content' }
  );

  assert.match(html, /Missing required locale/i);
  assert.match(html, /FR/);
  assert.match(html, /Create locale/i);
  assert.match(html, /data-family-create-locale="true"/i);
});

test('translation-family detail: renders server-authored assignment controls for unassigned locales', () => {
  const detail = normalizeFamilyDetail(assignmentActionFixture());
  const html = renderTranslationFamilyDetailState({ status: 'ready', detail }, {
    basePath: '/admin',
    contentBasePath: '/admin/content',
  });

  assert.equal(detail.localeAssignments['es:localization'].actions.assignToMe.payload.assignee_id, 'translator-self');
  assert.match(html, /data-family-empty-assignment-controls="true"/);
  assert.match(html, /data-family-assign-to-me="true"/);
  assert.match(html, /data-family-assign-to-user="true"/);
  assert.match(html, /data-family-locale-assignment-state="unassigned"/);
});

test('translation-family detail: assign-to-me posts server-authored family assignment payload and reloads detail', async () => {
  const dom = setupDom('<div id="root" data-endpoint="/admin/api/translations/families/family-missing?channel=default" data-base-path="/admin"></div>');
  const root = dom.window.document.getElementById('root');
  const payload = assignmentActionFixture();
  const requests = [];
  const fetchImpl = async (url, init = {}) => {
    requests.push({ url: String(url), init });
    if (init.method === 'POST') {
      return new Response(JSON.stringify({ data: { assignment_id: 'asg-es' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ data: payload }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  await initTranslationFamilyDetailPage(root, { fetch: fetchImpl });
  root.querySelector('[data-family-assign-to-me="true"][data-locale-assignment-source="empty-panel"]')
    .dispatchEvent(new dom.window.Event('click', { bubbles: true }));
  await nextTick();
  await nextTick();

  const post = requests.find((entry) => entry.init.method === 'POST');
  assert.equal(post.url, '/admin/api/translations/families/family-missing/assignments');
  const body = JSON.parse(String(post.init.body));
  assert.equal(body.target_locale, 'es');
  assert.equal(body.work_scope, 'localization');
  assert.equal(body.assignee_id, 'translator-self');
  assert.equal(body.channel, 'default');
  assert.equal(requests.filter((entry) => entry.url.includes('/translations/families/family-missing?channel=default')).length >= 2, true);
});

test('translation-family detail: assign-to-user posts selected assignee from empty assignment panel', async () => {
  const dom = setupDom('<div id="root" data-endpoint="/admin/api/translations/families/family-missing?channel=default" data-base-path="/admin"></div>');
  const root = dom.window.document.getElementById('root');
  const payload = assignmentActionFixture();
  const requests = [];
  const fetchImpl = async (url, init = {}) => {
    requests.push({ url: String(url), init });
    if (init.method === 'POST') {
      return new Response(JSON.stringify({ data: { assignment_id: 'asg-es' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ data: payload }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  await initTranslationFamilyDetailPage(root, { fetch: fetchImpl });
  root.querySelector('[data-family-assignee-input="__empty_panel__"]').value = 'translator-2';
  root.querySelector('[data-family-assign-to-user="true"][data-locale-assignment-source="empty-panel"]')
    .dispatchEvent(new dom.window.Event('click', { bubbles: true }));
  await nextTick();
  await nextTick();

  const post = requests.find((entry) => entry.init.method === 'POST');
  const body = JSON.parse(String(post.init.body));
  assert.equal(body.target_locale, 'es');
  assert.equal(body.assignee_id, 'translator-2');
});

test('translation-family detail: claim action posts expected row version', async () => {
  const dom = setupDom('<div id="root" data-endpoint="/admin/api/translations/families/family-ready?channel=default" data-base-path="/admin"></div>');
  const root = dom.window.document.getElementById('root');
  const payload = assignmentActionFixture({ active: true, state: 'assigned_to_me' });
  const requests = [];
  const fetchImpl = async (url, init = {}) => {
    requests.push({ url: String(url), init });
    if (init.method === 'POST') {
      return new Response(JSON.stringify({ data: { assignment_id: 'asg-ready-fr' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ data: payload }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  await initTranslationFamilyDetailPage(root, { fetch: fetchImpl });
  root.querySelector('[data-family-claim-assignment="true"][data-locale-assignment-key="fr:localization"]')
    .dispatchEvent(new dom.window.Event('click', { bubbles: true }));
  await nextTick();
  await nextTick();

  const post = requests.find((entry) => entry.init.method === 'POST');
  assert.equal(post.url, '/admin/api/translations/assignments/asg-ready-fr/actions/claim');
  assert.deepEqual(JSON.parse(String(post.init.body)), { expected_version: 2 });
});

test('translation-family detail: missing-locale quick create opens the create modal', async () => {
  const dom = setupDom('<div id="root" data-endpoint="/admin/api/translations/families/family-missing?channel=default" data-base-path="/admin"></div>');
  const root = dom.window.document.getElementById('root');
  const fetchImpl = async () => new Response(JSON.stringify({ data: fixtures.missing_locale }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  await initTranslationFamilyDetailPage(root, { fetch: fetchImpl });
  const button = root.querySelector('[data-family-create-locale="true"][data-locale="fr"]');

  assert.ok(button, 'expected FR quick-create button');
  assert.equal(button.hasAttribute('disabled'), false);
  button.dispatchEvent(new dom.window.Event('click', { bubbles: true }));

  assert.ok(dom.window.document.querySelector('[data-translation-create-locale-modal="true"]'));
  assert.match(dom.window.document.body.innerHTML, /Create FR locale/i);
});

test('translation-family detail: coverage missing locale buttons stay enabled when quick-create hints are stale or policy denied', async () => {
  const stale = JSON.parse(JSON.stringify(fixtures.missing_locale));
  stale.locale_variants = stale.locale_variants.filter((variant) => variant.locale !== 'es');
  stale.readiness_summary.available_locales = ['en'];
  stale.readiness_summary.missing_locales = ['es', 'fr'];
  stale.readiness_summary.missing_required_locale_count = 2;
  stale.quick_create.enabled = false;
  stale.quick_create.missing_locales = [];
  stale.quick_create.recommended_locale = '';
  stale.quick_create.disabled_reason_code = 'policy_denied';
  stale.quick_create.disabled_reason = 'Policy currently blocks creating additional locale variants for this family.';
  const dom = setupDom('<div id="root" data-endpoint="/admin/api/translations/families/family-missing?channel=default" data-base-path="/admin"></div>');
  const root = dom.window.document.getElementById('root');
  const fetchImpl = async () => new Response(JSON.stringify({ data: stale }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  await initTranslationFamilyDetailPage(root, { fetch: fetchImpl });
  const buttons = Array.from(root.querySelectorAll('[data-family-create-locale="true"]'));
  const esButtons = buttons.filter((button) => button.dataset.locale === 'es');
  const frButtons = buttons.filter((button) => button.dataset.locale === 'fr');

  assert.equal(esButtons.length > 0, true);
  assert.equal(frButtons.length > 0, true);
  assert.equal(esButtons.every((button) => button.getAttribute('aria-disabled') !== 'true'), true);
  assert.equal(frButtons.every((button) => button.getAttribute('aria-disabled') !== 'true'), true);

  esButtons[0].dispatchEvent(new dom.window.Event('click', { bubbles: true }));
  assert.ok(dom.window.document.querySelector('[data-translation-create-locale-modal="true"]'));
  assert.match(dom.window.document.body.innerHTML, /Create ES locale/i);
  assert.match(dom.window.document.body.innerHTML, />\s*ES/i);
  assert.match(dom.window.document.body.innerHTML, />\s*FR/i);
});

test('translation-family detail: policy unavailable keeps missing locale buttons disabled', async () => {
  const blocked = JSON.parse(JSON.stringify(fixtures.policy_unavailable));
  blocked.readiness_summary.required_locales = ['en', 'es'];
  blocked.readiness_summary.missing_locales = ['es'];
  blocked.readiness_summary.missing_required_locale_count = 1;
  blocked.quick_create.enabled = false;
  blocked.quick_create.missing_locales = ['es'];
  blocked.quick_create.recommended_locale = 'es';
  const dom = setupDom('<div id="root" data-endpoint="/admin/api/translations/families/family-policy-unavailable?channel=default" data-base-path="/admin"></div>');
  const root = dom.window.document.getElementById('root');
  const fetchImpl = async () => new Response(JSON.stringify({ data: blocked }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  await initTranslationFamilyDetailPage(root, { fetch: fetchImpl });
  const buttons = Array.from(root.querySelectorAll('[data-family-create-locale="true"][data-locale="es"]'));

  assert.equal(buttons.length > 0, true);
  assert.equal(buttons.every((button) => button.getAttribute('aria-disabled') === 'true'), true);
  buttons[0].dispatchEvent(new dom.window.Event('click', { bubbles: true }));
  assert.equal(dom.window.document.querySelector('[data-translation-create-locale-modal="true"]'), null);
});

test('translation-family detail: blocker fixtures render canonical blocker labels', () => {
  const cases = [
    ['blocked', /Policy denied/i],
    ['policy_unavailable', /Policy unavailable/i],
    ['missing_field', /Missing field/i],
    ['pending_review', /Pending review/i],
    ['outdated_source', /Outdated source/i],
  ];

  for (const [name, matcher] of cases) {
    const detail = normalizeFamilyDetail(fixtures[name]);
    const html = renderTranslationFamilyDetailState({ status: 'ready', detail });
    assert.match(html, matcher, `expected ${name} fixture to render ${matcher}`);
  }
});

test('translation-family detail: distinguishes host policy denial from unavailable policy wiring', () => {
  const denied = renderTranslationFamilyDetailState({
    status: 'ready',
    detail: normalizeFamilyDetail(fixtures.blocked),
  });
  assert.match(denied, /Policy denied/i);
  assert.match(denied, /Legal hold/i);
  assert.doesNotMatch(denied, /Policy unavailable/i);

  const unavailable = renderTranslationFamilyDetailState({
    status: 'ready',
    detail: normalizeFamilyDetail(fixtures.policy_unavailable),
  });
  assert.match(unavailable, /Policy unavailable/i);
  assert.match(unavailable, /policy_denied/i);
  assert.match(unavailable, /Content type/i);
  assert.match(unavailable, /news/i);
  assert.match(unavailable, /Environment/i);
  assert.match(unavailable, /default/i);
  assert.match(unavailable, /Configure translation policy requirements/i);
  assert.doesNotMatch(unavailable, /Legal hold/i);
});

test('translation-family detail: derives activity preview from variant and assignment timestamps', () => {
  const detail = normalizeFamilyDetail(fixtures.outdated_source);
  const preview = buildFamilyActivityPreview(detail, 3);

  assert.equal(preview.length, 3);
  assert.equal(preview[0].title.includes('variant published') || preview[0].title.includes('assignment'), true);
  assert.equal(preview[0].timestamp >= preview[1].timestamp, true);
});

test('translation-family detail: loading and conflict states render accessible feedback', async () => {
  const loadingHTML = renderTranslationFamilyDetailState({ status: 'loading' });
  assert.match(loadingHTML, /aria-busy="true"/);

  globalThis.fetch = async () => ({
    ok: false,
    status: 409,
    headers: {
      get(name) {
        const key = String(name).toLowerCase();
        if (key === 'content-type') return 'application/json';
        if (key === 'x-request-id') return 'req-conflict';
        if (key === 'x-trace-id') return 'trace-conflict';
        return null;
      },
    },
    clone() {
      return this;
    },
    async text() {
      return JSON.stringify({
        error: {
          text_code: 'VERSION_CONFLICT',
          message: 'record version mismatch',
        },
      });
    },
  });

  const state = await fetchTranslationFamilyDetailState('/admin/api/translations/families/family-conflict');
  assert.equal(state.status, 'conflict');
  assert.equal(state.requestId, 'req-conflict');
  assert.equal(state.traceId, 'trace-conflict');
  assert.equal(state.errorCode, 'VERSION_CONFLICT');

  const conflictHTML = renderTranslationFamilyDetailState(state);
  assert.match(conflictHTML, /Reload family detail/i);
  assert.match(conflictHTML, /Code VERSION_CONFLICT/);
});

test('translation-family detail: renders authorized sync recovery for not found responses', async () => {
  globalThis.fetch = async () => missingFamilyResponse();

  const state = await fetchTranslationFamilyDetailState('/admin/api/translations/families/missing-family');
  assert.equal(state.status, 'error');
  assert.equal(state.errorCode, 'NOT_FOUND');
  assert.equal(state.syncRecovery?.canSync, true);
  assert.equal(state.syncRecovery?.commandName, 'translation.families.sync');

  const html = renderTranslationFamilyDetailState(state);
  assert.match(html, /Sync translation families/i);
  assert.match(html, /data-family-sync-action="true"/);
  assert.match(html, /data-family-sync-rpc="\/admin\/api\/rpc"/);
  assert.match(html, /Request req-missing/);
  assert.match(html, /Trace trace-missing/);
});

test('translation-family detail: keeps sync action hidden without capability or not found error', async () => {
  globalThis.fetch = async () => missingFamilyResponse({ canSync: false });
  const noCapabilityState = await fetchTranslationFamilyDetailState('/admin/api/translations/families/missing-family');
  assert.equal(noCapabilityState.syncRecovery, null);
  assert.doesNotMatch(renderTranslationFamilyDetailState(noCapabilityState), /Sync translation families/i);

  globalThis.fetch = async () => new Response(JSON.stringify({
    error: {
      text_code: 'VERSION_CONFLICT',
      message: 'translation family conflict',
      metadata: {
        family_id: 'missing-family',
        sync_recovery: {
          can_sync: true,
          permission: 'admin.translations.sync',
          command_name: 'translation.families.sync',
          rpc_invoke_path: '/admin/api/rpc',
          environment: 'production',
          family_id: 'missing-family',
        },
      },
    },
  }), {
    status: 409,
    headers: { 'Content-Type': 'application/json' },
  });
  const conflictState = await fetchTranslationFamilyDetailState('/admin/api/translations/families/missing-family');
  assert.equal(conflictState.status, 'conflict');
  assert.doesNotMatch(renderTranslationFamilyDetailState(conflictState), /Sync translation families/i);
  assert.match(renderTranslationFamilyDetailState(conflictState), /Reload family detail/i);
});

test('translation-family detail: dispatches sync recovery with rpc command envelope', async () => {
  const recovery = normalizeTranslationFamilySyncRecoveryCapability({
    can_sync: true,
    permission: 'admin.translations.sync',
    command_name: 'translation.families.sync',
    rpc_invoke_path: '/admin/api/rpc',
    environment: 'production',
    family_id: 'missing-family',
  });
  assert.ok(recovery);

  const request = buildTranslationFamilySyncRPCRequest(recovery, 'corr-1');
  assert.equal(request.method, 'admin.commands.dispatch');
  assert.equal(request.params.data.name, 'translation.families.sync');
  assert.deepEqual(request.params.data.ids, ['missing-family']);
  assert.equal(request.params.data.payload.family_id, 'missing-family');
  assert.equal(request.params.data.payload.environment, 'production');
  assert.equal(request.params.meta.correlationId, 'corr-1');
  assert.equal(request.params.data.options.Mode, 'inline');
  assert.equal(request.params.data.options.CorrelationID, 'corr-1');
  assert.equal(request.params.data.options.IdempotencyKey, 'translation.families.sync:production:missing-family');
  assert.equal(request.params.data.options.Metadata.correlation_id, 'corr-1');

  setupDom('<meta name="csrf-token" content="family-sync-csrf">');
  const requests = [];
  const result = await dispatchTranslationFamilySync(recovery, {
    correlationId: 'corr-1',
    fetch: async (url, init = {}) => {
      requests.push({ url, init });
      return new Response(JSON.stringify({
        data: {
          receipt: {
            Accepted: true,
            CommandID: 'translation.families.sync',
          },
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });

  assert.equal(requests[0].url, '/admin/api/rpc');
  const body = JSON.parse(String(requests[0].init.body));
  assert.equal(body.method, 'admin.commands.dispatch');
  assert.equal(body.params.data.name, 'translation.families.sync');
  assert.equal(body.params.data.payload.channel, 'production');
  assert.equal(body.params.meta.correlationId, 'corr-1');
  assert.equal(body.params.data.options.Mode, 'inline');
  assert.equal(body.params.data.options.CorrelationID, 'corr-1');
  assert.equal(body.params.data.options.IdempotencyKey, 'translation.families.sync:production:missing-family');
  assert.equal(new Headers(requests[0].init.headers).get('X-CSRF-Token'), 'family-sync-csrf');
  assert.equal(result.receipt.CommandID, 'translation.families.sync');
});

test('translation-family detail: rejects malformed rpc success responses without receipts', async () => {
  const recovery = normalizeTranslationFamilySyncRecoveryCapability({
    can_sync: true,
    syncable: true,
    permission: 'admin.translations.sync',
    command_name: 'translation.families.sync',
    rpc_invoke_path: '/admin/api/rpc',
    environment: 'production',
    family_id: 'missing-family',
  });
  assert.ok(recovery);

  await assert.rejects(
    () => dispatchTranslationFamilySync(recovery, {
      fetch: async () => new Response(JSON.stringify({ data: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    }),
    /valid dispatch receipt/i
  );

  await assert.rejects(
    () => dispatchTranslationFamilySync(recovery, {
      fetch: async () => new Response(JSON.stringify({
        data: { receipt: { accepted: true } },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    }),
    /valid dispatch receipt/i
  );

  await assert.rejects(
    () => dispatchTranslationFamilySync(recovery, {
      fetch: async () => new Response(JSON.stringify({
        data: { receipt: { accepted: true, command_id: 'other.command' } },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    }),
    /valid dispatch receipt/i
  );
});

test('translation-family detail: sync action dispatches receipt and reloads detail', async () => {
  const dom = setupDom('<div id="root" data-endpoint="/admin/api/translations/families/missing-family" data-base-path="/admin"></div>');
  const root = dom.window.document.getElementById('root');
  const requests = [];
  const fetchImpl = async (url, init = {}) => {
    requests.push({ url: String(url), init });
    if (String(url).endsWith('/rpc')) {
      return new Response(JSON.stringify({
        data: {
          receipt: {
            accepted: true,
            command_id: 'translation.families.sync',
          },
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return requests.filter((entry) => entry.url === '/admin/api/translations/families/missing-family').length === 1
      ? missingFamilyResponse()
      : readyFamilyResponse();
  };

  await initTranslationFamilyDetailPage(root, { fetch: fetchImpl });
  root.querySelector('[data-family-sync-action="true"]').dispatchEvent(new dom.window.Event('click', { bubbles: true }));
  await nextTick();
  await nextTick();

  assert.ok(requests.some((entry) => entry.url === '/admin/api/rpc'));
  assert.equal(requests.filter((entry) => entry.url === '/admin/api/translations/families/missing-family').length >= 2, true);
  assert.match(root.innerHTML, /Translation family/i);
});

test('translation-family detail: post-sync not found keeps diagnostics in error panel', async () => {
  const dom = setupDom('<div id="root" data-endpoint="/admin/api/translations/families/missing-family" data-base-path="/admin"></div>');
  const root = dom.window.document.getElementById('root');
  const fetchImpl = async (url) => {
    if (String(url).endsWith('/rpc')) {
      return new Response(JSON.stringify({
        data: {
          receipt: {
            accepted: true,
            command_id: 'translation.families.sync',
          },
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return missingFamilyResponse();
  };

  await initTranslationFamilyDetailPage(root, { fetch: fetchImpl });
  root.querySelector('[data-family-sync-action="true"]').dispatchEvent(new dom.window.Event('click', { bubbles: true }));
  await nextTick();
  await nextTick();

  assert.match(root.innerHTML, /Sync completed; family detail still returned NOT_FOUND/i);
  assert.doesNotMatch(root.innerHTML, /data-family-sync-action="true"/);
  assert.match(root.innerHTML, /Reload family detail/i);
});

test('translation-family detail: post-sync non-not-found reload failure stays in error state', async () => {
  const dom = setupDom('<div id="root" data-endpoint="/admin/api/translations/families/missing-family" data-base-path="/admin"></div>');
  const root = dom.window.document.getElementById('root');
  const fetchImpl = async (url) => {
    if (String(url).endsWith('/rpc')) {
      return new Response(JSON.stringify({
        data: {
          receipt: {
            accepted: true,
            command_id: 'translation.families.sync',
          },
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const detailRequests = fetchImpl.detailRequests = (fetchImpl.detailRequests || 0) + 1;
    if (detailRequests === 1) {
      return missingFamilyResponse();
    }
    return new Response(JSON.stringify({
      error: {
        text_code: 'INTERNAL',
        message: 'detail reload failed',
      },
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  await initTranslationFamilyDetailPage(root, { fetch: fetchImpl });
  root.querySelector('[data-family-sync-action="true"]').dispatchEvent(new dom.window.Event('click', { bubbles: true }));
  await nextTick();
  await nextTick();

  assert.match(root.innerHTML, /detail reload failed/i);
  assert.match(root.innerHTML, /Reload family detail/i);
  assert.doesNotMatch(root.innerHTML, /Translation family<\/h1>/i);
});

test('translation-family detail: failed rpc sync surfaces structured error without losing controls', async () => {
  const dom = setupDom('<div id="root" data-endpoint="/admin/api/translations/families/missing-family" data-base-path="/admin"></div>');
  const root = dom.window.document.getElementById('root');
  const toastManager = {
    errors: [],
    error(message) {
      this.errors.push(message);
    },
  };
  globalThis.toastManager = toastManager;
  dom.window.toastManager = toastManager;
  const fetchImpl = async (url) => {
    if (String(url).endsWith('/rpc')) {
      return new Response(JSON.stringify({
        error: {
          text_code: 'FORBIDDEN',
          message: 'sync permission denied',
        },
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return missingFamilyResponse();
  };

  await initTranslationFamilyDetailPage(root, { fetch: fetchImpl });
  const button = root.querySelector('[data-family-sync-action="true"]');
  button.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
  await nextTick();
  await nextTick();

  assert.match(root.innerHTML, /sync permission denied/i);
  assert.equal(button.disabled, false);
  assert.match(root.innerHTML, /data-family-sync-action="true"/);
  assert.deepEqual(toastManager.errors, ['sync permission denied']);
});
