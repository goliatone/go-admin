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
  assert.match(html, /Request req-ready/);
  assert.match(html, /Trace trace-ready/);
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
