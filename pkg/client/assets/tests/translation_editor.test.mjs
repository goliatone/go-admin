import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();

const fixtureURL = new URL('../../../../admin/testdata/translation_editor_contract_fixtures.json', import.meta.url);
const fixtures = JSON.parse(await readFile(fixtureURL, 'utf8'));

const {
  normalizeAssignmentEditorDetail,
  normalizeEditorAssistPayload,
  createTranslationEditorState,
  applyEditorFieldChange,
  markEditorAutosavePending,
  applyEditorAutosaveConflict,
  applyEditorUpdateResponse,
  fetchTranslationEditorDetailState,
  renderTranslationEditorState,
  buildTranslationSuggestionRPCRequest,
  dispatchTranslationSuggestion,
  TranslationEditorScreen,
  initTranslationEditorPage,
} = await import('../dist/translation-editor/index.js');

function createContainer(dataset = {}) {
  return {
    dataset,
    innerHTML: '',
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };
}

function createJsonResponse(body, status = 200, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        const key = String(name).toLowerCase();
        return headers[key] ?? headers[name] ?? null;
      },
    },
    clone() {
      return this;
    },
    async json() {
      return body;
    },
    async text() {
      return JSON.stringify(body);
    },
  };
}

async function flushAsync() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function waitForCondition(predicate, attempts = 20) {
  for (let i = 0; i < attempts; i += 1) {
    if (predicate()) return true;
    await flushAsync();
  }
  return predicate();
}

function setGlobals(win) {
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.Document = win.Document;
  globalThis.Element = win.Element;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.HTMLButtonElement = win.HTMLButtonElement;
  globalThis.HTMLInputElement = win.HTMLInputElement;
  globalThis.HTMLTextAreaElement = win.HTMLTextAreaElement;
  globalThis.Event = win.Event;
  globalThis.KeyboardEvent = win.KeyboardEvent;
  globalThis.URL = win.URL;
  globalThis.URLSearchParams = win.URLSearchParams;
  Object.defineProperty(globalThis, 'navigator', { value: win.navigator, configurable: true });
  Object.defineProperty(globalThis, 'location', { value: win.location, configurable: true });
}

function setupDom(url = 'http://localhost/admin/translations/assignments/asg-editor-1/edit') {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url });
  setGlobals(dom.window);
  return {
    root: dom.window.document.getElementById('root'),
    window: dom.window,
  };
}

function installTranslationSyncCoreStub(win) {
  const harness = {
    transportOptions: null,
    engineOptions: null,
  };
  const resourceURL = (baseURL, ref) => {
    const url = `${String(baseURL || '').replace(/\/+$/, '')}/sync/resources/${encodeURIComponent(ref.kind)}/${encodeURIComponent(ref.id)}`;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(ref.scope || {})) {
      if (String(key).trim() && String(value).trim()) {
        params.set(String(key).trim(), String(value).trim());
      }
    }
    const query = params.toString();
    return query ? `${url}?${query}` : url;
  };
  win.__translationSyncCoreModule = {
    createInMemoryCache() {
      return {
        get() {
          return null;
        },
        set() {},
        invalidate() {
          return { snapshot: null, invalidated: true };
        },
        clear() {},
      };
    },
    createFetchSyncTransport(options = {}) {
      harness.transportOptions = options;
      return {
        async load(ref) {
          const url = resourceURL(options.baseURL, ref);
          const response = await globalThis.fetch(url, { method: 'GET' });
          const payload = await response.json();
          if (!response.ok) {
            const error = payload.error || {};
            throw new Error(error.message || 'sync load failed');
          }
          return {
            ref,
            data: payload.data,
            revision: payload.revision,
            updatedAt: payload.updated_at,
            metadata: payload.metadata,
          };
        },
        async mutate(input) {
          const ref = input.ref;
          const url = resourceURL(options.baseURL, ref);
          const headerFactory = typeof options.headers === 'function' ? options.headers : () => ({});
          const response = await globalThis.fetch(url, {
            method: 'PATCH',
            credentials: options.credentials,
            headers: {
              'Content-Type': 'application/json',
              ...headerFactory({ method: 'PATCH', ref }),
            },
            body: JSON.stringify({
              operation: input.operation,
              payload: input.payload,
              expected_revision: input.expectedRevision,
              idempotency_key: input.idempotencyKey,
              metadata: input.metadata,
            }),
          });
          const payload = await response.json();
          if (!response.ok) {
            const error = payload.error || {};
            const details = error.details || {};
            throw {
              code: error.code || 'TEMPORARY_FAILURE',
              message: error.message || 'sync operation failed',
              details,
              currentRevision: details.current_revision,
              resource: details.resource
                ? {
                    ref,
                    data: details.resource.data,
                    revision: details.resource.revision,
                    updatedAt: details.resource.updated_at,
                    metadata: details.resource.metadata,
                  }
                : undefined,
            };
          }
          return {
            snapshot: {
              ref,
              data: payload.data,
              revision: payload.revision,
              updatedAt: payload.updated_at,
              metadata: payload.metadata,
            },
            applied: payload.applied,
            replay: payload.replay,
          };
        },
      };
    },
    createSyncEngine(options = {}) {
      harness.engineOptions = options;
      return {
        resource(ref) {
          let snapshot = null;
          return {
            getSnapshot() {
              return snapshot;
            },
            async load() {
              snapshot = await options.transport.load(ref);
              return snapshot;
            },
            async mutate(input) {
              const response = await options.transport.mutate({ ...input, ref: input.ref || ref });
              snapshot = response.snapshot;
              return response;
            },
            async refresh() {
              snapshot = await options.transport.load(ref);
              return snapshot;
            },
          };
        },
      };
    },
    parseReadEnvelope(ref, payload) {
      return {
        ref,
        data: payload.data,
        revision: payload.revision,
        updatedAt: payload.updated_at,
        metadata: payload.metadata,
      };
    },
  };
  return harness;
}

function makeSubmitReadyFixture() {
  const next = structuredClone(fixtures.detail);
  next.data.qa_results = {
    ...next.data.qa_results,
    findings: [],
    submit_blocked: false,
    summary: {
      finding_count: 0,
      warning_count: 0,
      blocker_count: 0,
    },
    categories: {
      style: {
        ...next.data.qa_results.categories.style,
        finding_count: 0,
        warning_count: 0,
        blocker_count: 0,
      },
      terminology: {
        ...next.data.qa_results.categories.terminology,
        finding_count: 0,
        warning_count: 0,
        blocker_count: 0,
      },
    },
  };
  return next;
}

function makeSubmitReadyUpdateFixture() {
  const next = structuredClone(fixtures.variant_update);
  next.data.qa_results = {
    ...next.data.qa_results,
    findings: [],
    submit_blocked: false,
    summary: {
      finding_count: 0,
      warning_count: 0,
      blocker_count: 0,
    },
    categories: {
      style: {
        ...next.data.qa_results.categories.style,
        finding_count: 0,
        warning_count: 0,
        blocker_count: 0,
      },
      terminology: {
        ...next.data.qa_results.categories.terminology,
        finding_count: 0,
        warning_count: 0,
        blocker_count: 0,
      },
    },
  };
  return next;
}

function makeReviewReadyFixture() {
  const next = makeSubmitReadyFixture();
  next.data.status = 'review';
  next.data.translation_assignment = {
    ...next.data.translation_assignment,
    status: 'review',
    queue_state: 'review',
  };
  next.data.assignment_action_states = {
    ...next.data.assignment_action_states,
    submit_review: {
      ...next.data.assignment_action_states.submit_review,
      enabled: false,
      reason: 'assignment must be in review',
      reason_code: 'INVALID_STATUS',
    },
  };
  next.data.review_action_states = {
    ...next.data.review_action_states,
    approve: {
      enabled: true,
      permission: 'admin.translations.approve',
    },
    reject: {
      enabled: true,
      permission: 'admin.translations.approve',
    },
    archive: {
      enabled: true,
      permission: 'admin.translations.manage',
    },
  };
  return next;
}

function makeWorkflowBlockedFixture() {
  const next = makeSubmitReadyFixture();
  next.data.status = 'assigned';
  next.data.translation_assignment = {
    ...next.data.translation_assignment,
    status: 'assigned',
    queue_state: 'assigned',
  };
  next.data.assignment_action_states = {
    ...next.data.assignment_action_states,
    submit_review: {
      enabled: false,
      permission: 'admin.translations.edit',
      reason: 'assignment must be in progress',
      reason_code: 'INVALID_STATUS',
    },
  };
  return next;
}

function makeApprovedAssignmentFixture() {
  const next = makeSubmitReadyFixture();
  next.data.status = 'approved';
  next.data.translation_assignment = {
    ...next.data.translation_assignment,
    status: 'approved',
    queue_state: 'approved',
    version: 6,
    row_version: 6,
  };
  next.data.assignment_action_states = {
    ...next.data.assignment_action_states,
    submit_review: {
      enabled: false,
      permission: 'admin.translations.edit',
      reason: 'assignment must be in progress',
      reason_code: 'INVALID_STATUS',
    },
  };
  return next;
}

function makeInReviewAssignmentFixture() {
  const next = makeSubmitReadyFixture();
  next.data.status = 'in_review';
  next.data.translation_assignment = {
    ...next.data.translation_assignment,
    status: 'in_review',
    queue_state: 'in_review',
    version: 5,
    row_version: 5,
  };
  next.data.assignment_action_states = {
    ...next.data.assignment_action_states,
    submit_review: {
      enabled: false,
      permission: 'admin.translations.edit',
      reason: 'assignment must be in progress',
      reason_code: 'INVALID_STATUS',
    },
  };
  return next;
}

function makeChangesRequestedAssignmentFixture({ claimEnabled = true } = {}) {
  const next = makeSubmitReadyFixture();
  next.data.status = 'changes_requested';
  next.data.assignment_row_version = 7;
  next.data.row_version = 7;
  next.data.version = 7;
  next.data.last_rejection_reason = 'Please preserve the CTA token.';
  next.data.translation_assignment = {
    ...next.data.translation_assignment,
    status: 'changes_requested',
    queue_state: 'changes_requested',
    version: 7,
    row_version: 7,
  };
  next.data.assignment_action_states = {
    ...next.data.assignment_action_states,
    claim: claimEnabled
      ? {
          enabled: true,
          permission: 'admin.translations.claim',
        }
      : {
          enabled: false,
          permission: 'admin.translations.claim',
          reason: 'assignment is assigned to a different translator',
          reason_code: 'permission_denied',
        },
    submit_review: {
      enabled: false,
      permission: 'admin.translations.edit',
      reason: 'assignment must be in progress',
      reason_code: 'INVALID_STATUS',
    },
  };
  next.data.review_action_states = {
    ...next.data.review_action_states,
    approve: {
      enabled: false,
      permission: 'admin.translations.approve',
      reason: 'assignment must be in review',
      reason_code: 'INVALID_STATUS',
    },
    reject: {
      enabled: false,
      permission: 'admin.translations.approve',
      reason: 'assignment must be in review',
      reason_code: 'INVALID_STATUS',
    },
  };
  return next;
}

function makePreviewUnavailableFixture() {
  const next = structuredClone(fixtures.detail);
  next.data.preview_action = {
    ...next.data.preview_action,
    enabled: false,
    reason: 'Preview is unavailable because the target content has no preview path.',
    reason_code: 'preview_path_missing',
  };
  return next;
}

function makeAssistUnavailableFixture() {
  const next = structuredClone(fixtures.detail);
  next.data.assist = {
    glossary_matches: [],
    style_guide_summary: {
      available: false,
      title: '',
      summary: '',
      rules: [],
    },
    translation_memory_suggestions: [],
  };
  return next;
}

function makeTranslationMemoryScaleFixture() {
  const next = structuredClone(fixtures.detail);
  next.data.assist.translation_memory_suggestions = [
    {
      id: 'tm-decimal',
      score: 0.95,
      source_label: 'Prior publish guide',
      locale_pair: 'en:fr',
      field_path: 'body',
      suggested_text: 'Guide precedent pour les workflows de publication.',
      stale_source: false,
    },
    {
      id: 'tm-percent',
      score: 85,
      source_label: 'Prior help article',
      locale_pair: 'en:fr',
      field_path: 'title',
      suggested_text: 'Guide de publication confirme.',
      stale_source: true,
    },
  ];
  return next;
}

function makeEmptySourceFixture() {
  const next = structuredClone(fixtures.detail);
  next.data.fields = next.data.fields.map((field) => {
    if (field.path === 'path') {
      return {
        ...field,
        source_value: '',
        required: false,
        completeness: {
          required: false,
          complete: true,
          missing: false,
        },
      };
    }
    if (field.path === 'title') {
      return {
        ...field,
        source_value: '',
        required: true,
        completeness: {
          required: true,
          complete: false,
          missing: true,
        },
      };
    }
    return field;
  });
  next.data.source_fields = {
    ...next.data.source_fields,
    path: '',
    title: '',
  };
  return next;
}

function makeHashOnlyDriftFixture() {
  const next = structuredClone(fixtures.detail);
  next.data.field_drift = Object.fromEntries(
    Object.entries(next.data.field_drift).map(([path, drift]) => [
      path,
      {
        ...drift,
        changed: true,
        comparison_mode: 'hash_only',
        previous_source_value: '',
      },
    ])
  );
  next.data.fields = next.data.fields.map((field) => ({
    ...field,
    drift: {
      ...field.drift,
      changed: true,
      comparison_mode: 'hash_only',
      previous_source_value: '',
    },
  }));
  return next;
}

function makeSourceDriftClearedFixture() {
  const next = structuredClone(fixtures.detail);
  next.data.source_target_drift = {
    ...next.data.source_target_drift,
    source_hash: next.data.source_target_drift.current_source_hash,
    changed_fields_summary: {
      count: 0,
      fields: [],
    },
    fields_by_path: Object.fromEntries(
      Object.entries(next.data.source_target_drift.fields_by_path || {}).map(([path, drift]) => [
        path,
        {
          ...drift,
          changed: false,
          previous_source_value: drift.current_source_value,
        },
      ])
    ),
  };
  next.data.field_drift = Object.fromEntries(
    Object.entries(next.data.field_drift).map(([path, drift]) => [
      path,
      {
        ...drift,
        changed: false,
        previous_source_value: drift.current_source_value,
      },
    ])
  );
  next.data.fields = next.data.fields.map((field) => ({
    ...field,
    drift: {
      ...field.drift,
      changed: false,
      previous_source_value: field.drift.current_source_value,
    },
  }));
  return next;
}

function makeAutosaveConflictFixture() {
  const latest = makeSubmitReadyUpdateFixture();
  latest.data.row_version = 3;
  latest.data.version = 3;
  latest.data.target_fields = {
    ...latest.data.target_fields,
    title: 'Guide de publication serveur',
  };
  latest.data.fields = {
    ...latest.data.fields,
    title: 'Guide de publication serveur',
  };
  return {
    error: {
      code: 'STALE_REVISION',
      message: 'stale translation variant draft',
      details: {
        current_revision: 3,
        resource: {
          data: latest.data,
          revision: 3,
          updated_at: '2026-01-01T00:00:00Z',
        },
      },
    },
  };
}

function makeSuggestionReadyFixture() {
  const next = makeSubmitReadyFixture();
  const baseAction = {
    enabled: true,
    permission: 'admin.translations.suggest',
    command_name: 'translations.suggestions.generate',
    transport: 'rpc',
    rpc_method: 'admin.commands.dispatch',
    execution_mode: 'inline',
    endpoint: '/admin/api/rpc',
    rpc_invoke_path: '/admin/api/rpc',
    payload: {
      assignment_id: next.data.assignment_id,
    },
  };
  next.data.suggest_translation_action = baseAction;
  next.data.fields = next.data.fields.map((field) => ({
    ...field,
    suggest_translation_action: {
      ...baseAction,
      field_path: field.path,
      payload: {
        assignment_id: next.data.assignment_id,
        field_path: field.path,
      },
    },
  }));
  return next;
}

function makeSuggestionDeniedFixture(reasonCode = 'provider_policy_denied', reason = 'Provider policy denied this assignment.') {
  const next = makeSuggestionReadyFixture();
  next.data.suggest_translation_action = {
    ...next.data.suggest_translation_action,
    enabled: false,
    reason,
    reason_code: reasonCode,
  };
  next.data.fields = next.data.fields.map((field) => ({
    ...field,
    suggest_translation_action: {
      ...field.suggest_translation_action,
      enabled: false,
      reason,
      reason_code: reasonCode,
    },
  }));
  return next;
}

test('translation editor contracts: normalize detail fixture with assist and action envelopes', () => {
  const detail = normalizeAssignmentEditorDetail(fixtures.detail);

  assert.equal(detail.assignment_id, 'asg-editor-1');
  assert.equal(detail.assignment_row_version, 2);
  assert.equal(detail.variant_id, '97537bc7-23b1-52ea-b3be-1143eaa575db');
  assert.equal(detail.assignment_action_states.submit_review.enabled, true);
  assert.equal(detail.review_action_states.approve.enabled, false);
  assert.equal(detail.assist.glossary_matches.length, 5);
  assert.equal(detail.assist.style_guide_summary.available, true);
  assert.equal(detail.field_drift.title.changed, true);
  assert.equal(detail.history.total, 3);
  assert.equal(detail.attachments.length, 2);
  assert.equal(detail.translation_assignment.version, 2);
  assert.equal(detail.qa_results.submit_blocked, true);
  assert.equal(detail.locale_navigation.family_id, 'tg-page-1');
  assert.equal(detail.locale_navigation.current_locale, 'fr');
  assert.equal(detail.locale_navigation.source_locale, 'en');
  assert.equal(detail.locale_navigation.current_work_scope, '__all__');
  assert.equal(detail.locale_navigation.locales.length, 4);
  assert.equal(detail.locale_navigation.locales.find((entry) => entry.locale === 'es')?.href, '/admin/translations/assignments/asg-editor-es/edit');
  assert.equal(detail.locale_navigation.locales.find((entry) => entry.locale === 'es')?.work_scope, '__all__');
  assert.equal(detail.locale_navigation.locales.find((entry) => entry.locale === 'de')?.disabled, true);
  assert.equal(detail.locale_navigation.locales.find((entry) => entry.locale === 'de')?.href, undefined);
  assert.equal(detail.locale_navigation.locales.find((entry) => entry.locale === 'it')?.disabled, true);
  assert.equal(detail.locale_navigation.locales.find((entry) => entry.locale === 'it')?.href, undefined);
  assert.equal(detail.preview_action.enabled, true);
  assert.equal(detail.preview_action.assignment_id, 'asg-editor-1');
  assert.equal(detail.preview_action.entity_type, 'pages');
  assert.equal(detail.preview_action.target_record_id, 'page-1-fr');
  assert.equal(detail.preview_action.target_locale, 'fr');
  assert.equal(detail.preview_action.channel, 'production');
  assert.equal(detail.preview_action.url, undefined);
});

test('translation editor contracts: normalize suggestion action state for assignment fields', () => {
  const detail = normalizeAssignmentEditorDetail(makeSuggestionReadyFixture());
  const titleAction = detail.fields.find((field) => field.path === 'title')?.suggest_translation_action;

  assert.equal(detail.suggest_translation_action.enabled, true);
  assert.equal(detail.suggest_translation_action.command_name, 'translations.suggestions.generate');
  assert.equal(titleAction?.enabled, true);
  assert.equal(titleAction?.assignment_id, 'asg-editor-1');
  assert.equal(titleAction?.field_path, 'title');
  assert.equal(titleAction?.endpoint, '/admin/api/rpc');
  assert.equal(titleAction?.execution_mode, 'inline');
  assert.equal(titleAction?.payload.assignment_id, 'asg-editor-1');
  assert.equal(titleAction?.payload.field_path, 'title');
});

test('translation editor runtime: builds translation suggestion RPC dispatch envelope', () => {
  const detail = normalizeAssignmentEditorDetail(makeSuggestionReadyFixture());
  const action = detail.fields.find((field) => field.path === 'title')?.suggest_translation_action;
  assert.ok(action);

  const request = buildTranslationSuggestionRPCRequest(action, 'req-editor');
  assert.equal(request.method, 'admin.commands.dispatch');
  assert.deepEqual(request.params.data.ids, ['asg-editor-1']);
  assert.equal(request.params.data.name, 'translations.suggestions.generate');
  assert.equal(request.params.data.payload.assignment_id, 'asg-editor-1');
  assert.equal(request.params.data.payload.field_path, 'title');
  assert.equal(request.params.data.options.Mode, 'inline');
  assert.equal(request.params.data.options.IdempotencyKey, undefined);
  assert.equal(request.params.data.options.Metadata.idempotency_key, undefined);
  assert.equal(request.params.data.options.CorrelationID, 'req-editor');
  assert.equal(request.params.meta.correlationId, 'req-editor');
});

test('translation editor runtime: only sends suggestion mode and idempotency when action supplies them', () => {
  const detail = normalizeAssignmentEditorDetail(makeSuggestionReadyFixture());
  const action = detail.fields.find((field) => field.path === 'title')?.suggest_translation_action;
  assert.ok(action);

  const policyDriven = buildTranslationSuggestionRPCRequest({
    ...action,
    execution_mode: '',
    idempotency_key: '',
    payload: {
      ...action.payload,
      idempotency_key: undefined,
    },
  }, 'req-policy');
  assert.equal(policyDriven.params.data.options.Mode, undefined);
  assert.equal(policyDriven.params.data.options.IdempotencyKey, undefined);
  assert.deepEqual(policyDriven.params.data.options.Metadata, {
    correlation_id: 'req-policy',
  });

  const explicit = buildTranslationSuggestionRPCRequest({
    ...action,
    execution_mode: 'inline',
    idempotency_key: 'suggestion-attempt-1',
  }, 'req-explicit');
  assert.equal(explicit.params.data.options.Mode, 'inline');
  assert.equal(explicit.params.data.options.IdempotencyKey, 'suggestion-attempt-1');
  assert.equal(explicit.params.data.options.Metadata.idempotency_key, 'suggestion-attempt-1');
});

test('translation editor contracts: render assignment actor display labels instead of UUIDs', () => {
  const payload = structuredClone(fixtures.detail);
  payload.data.translation_assignment = {
    ...payload.data.translation_assignment,
    assignee_id: '9e838c81-6d3e-49d7-ad8f-b6616a040a44',
    assignee_label: 'translator.jane',
    display_assignee: 'translator.jane',
    reviewer_id: '173c7e5b-50cb-37d0-8ced-a24b570863e6',
    reviewer_label: 'reviewer.sam@example.com',
    display_reviewer: 'reviewer.sam@example.com',
  };
  const detail = normalizeAssignmentEditorDetail(payload);
  const html = renderTranslationEditorState(
    { status: 'ready', detail },
    createTranslationEditorState(detail)
  );

  assert.match(html, /Assignee translator\.jane/);
  assert.match(html, /Reviewer reviewer\.sam@example\.com/);
  assert.doesNotMatch(html, /Assignee 9e838c81-6d3e-49d7-ad8f-b6616a040a44/);
  assert.doesNotMatch(html, /Reviewer 173c7e5b-50cb-37d0-8ced-a24b570863e6/);
});

test('translation editor contracts: legacy assist keys and missing assets degrade cleanly', () => {
  const legacy = normalizeEditorAssistPayload(undefined, fixtures.assist_backcompat.legacy_top_level);
  assert.equal(legacy.glossary_matches.length, 1);
  assert.equal(legacy.style_guide_summary.title, 'Legacy Style Guide');

  const missing = normalizeEditorAssistPayload(fixtures.assist_backcompat.missing_assets.assist, fixtures.assist_backcompat.missing_assets);
  assert.deepEqual(missing.glossary_matches, []);
  assert.equal(missing.style_guide_summary.available, false);
});

test('translation editor state model: dirty fields, validation, autosave conflict, and server sync', () => {
  const detail = normalizeAssignmentEditorDetail(makeSubmitReadyFixture());
  const initial = createTranslationEditorState(detail);

  assert.equal(initial.can_submit_review, true);
  assert.equal(initial.assignment_row_version, 2);

  const dirty = applyEditorFieldChange(initial, 'body', '');
  assert.equal(dirty.dirty_fields.body, '');
  assert.equal(dirty.detail.fields.find((field) => field.path === 'body')?.target_value, '');
  assert.equal(dirty.detail.field_completeness.body.missing, true);
  assert.equal(dirty.can_submit_review, false);

  const pending = markEditorAutosavePending(dirty);
  assert.equal(pending.autosave.pending, true);

  const conflicted = applyEditorAutosaveConflict(pending, makeAutosaveConflictFixture());
  assert.equal(conflicted.autosave.pending, false);
  assert.equal(conflicted.autosave.conflict.row_version, 3);

  const synced = applyEditorUpdateResponse(conflicted, makeSubmitReadyUpdateFixture());
  assert.equal(synced.row_version, 4);
  assert.equal(synced.assignment_row_version, 2);
  assert.deepEqual(synced.dirty_fields, {});
  assert.equal(synced.detail.target_fields.title, 'Guide de publication');
  assert.equal(synced.can_submit_review, true);
});

test('translation editor state model: save response refreshes preview availability', () => {
  const detail = normalizeAssignmentEditorDetail(makePreviewUnavailableFixture());
  const initial = createTranslationEditorState(detail);
  assert.equal(initial.detail.preview_action.enabled, false);
  assert.equal(initial.detail.preview_action.reason_code, 'preview_path_missing');

  const update = makeSubmitReadyUpdateFixture();
  update.data.preview_action = {
    ...makeSubmitReadyFixture().data.preview_action,
    enabled: true,
    reason: '',
    reason_code: '',
  };
  const synced = applyEditorUpdateResponse(initial, update);

  assert.equal(synced.detail.preview_action.enabled, true);
  assert.equal(synced.detail.preview_action.reason, '');
  assert.equal(synced.detail.preview_action.reason_code, '');
  assert.equal(synced.detail.preview_action.target_record_id, 'page-1-fr');
});

test('translation editor runtime: SSR root hydrates from embedded detail without first-render fetch', async () => {
  const { root, window } = setupDom();
  installTranslationSyncCoreStub(window);
  root.dataset.ssrEnhanced = 'true';
  root.innerHTML = `<section data-translation-editor-ssr="true">Server editor</section><script type="application/json" data-translation-editor-initial-state>${JSON.stringify(fixtures.detail.data)}</script>`;
  globalThis.fetch = mock.fn(async () => {
    throw new Error('unexpected first-render fetch');
  });

  const screen = await initTranslationEditorPage(root, {
    endpoint: '/admin/api/translations/assignments/asg-editor-1',
    actionEndpointBase: '/admin/api/translations/assignments',
    syncBaseURL: '/admin/api/translations',
    syncClientBasePath: '/admin/sync-client/sync-core',
  });

  assert.equal(root.dataset.translationEditorEnhanced, 'true');
  assert.equal(globalThis.fetch.mock.callCount(), 0);
  assert.match(root.innerHTML, /Homepage localization brief/i);
  assert.ok(root.querySelector('[data-field-input="title"]'));

  screen.unmount();
});

test('translation editor runtime: field inputs keep the natural document tab order', async () => {
  const { root, window } = setupDom();
  installTranslationSyncCoreStub(window);
  globalThis.fetch = mock.fn(async (input, init = {}) => {
    const method = String(init.method || 'GET').toUpperCase();
    const url = String(input);
    if (method === 'GET' && url.includes('/api/translations/assignments/asg-editor-1')) {
      return createJsonResponse(fixtures.detail);
    }
    if (method === 'GET' && url.includes('/api/translations/sync/resources/translation_variant_draft/')) {
      return createJsonResponse({
        data: fixtures.detail.data,
        revision: 3,
        updated_at: '2026-01-01T00:00:00Z',
      });
    }
    return createJsonResponse({ error: { message: 'unexpected request' } }, 500, {
      'content-type': 'application/json',
    });
  });

  const screen = new TranslationEditorScreen({
    endpoint: '/admin/api/translations/assignments/asg-editor-1',
    actionEndpointBase: '/admin/api/translations/assignments',
  });
  screen.mount(root);
  await flushAsync();
  await flushAsync();

  const fields = Array.from(root.querySelectorAll('[data-field-input]'));
  assert.ok(fields.length > 0);
  fields.forEach((field) => {
    assert.equal(field.hasAttribute('tabindex'), false);
  });
});

test('translation editor runtime: copy source fills target field and autosaves copied text', async () => {
  const { root, window } = setupDom();
  installTranslationSyncCoreStub(window);
  window.scrollTo = mock.fn();
  const writeText = mock.fn(async () => {});
  Object.defineProperty(window.navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
  const requests = [];
  const detail = makeSubmitReadyFixture();
  const sourceValue = detail.data.fields.find((field) => field.path === 'body')?.source_value;
  assert.ok(sourceValue);
  globalThis.fetch = mock.fn(async (input, init = {}) => {
    const method = String(init.method || 'GET').toUpperCase();
    const url = String(input);
    requests.push({ url, method, init });
    if (method === 'GET' && url.includes('/api/translations/assignments/asg-editor-1')) {
      return createJsonResponse(detail);
    }
    if (method === 'GET' && url.includes('/api/translations/sync/resources/translation_variant_draft/')) {
      return createJsonResponse({
        data: detail.data,
        revision: 3,
        updated_at: '2026-01-01T00:00:00Z',
      });
    }
    if (method === 'PATCH' && url.includes('/api/translations/sync/resources/translation_variant_draft/')) {
      const body = JSON.parse(init.body);
      const next = makeSubmitReadyUpdateFixture();
      assert.equal(body.payload.fields.body, sourceValue);
      return createJsonResponse({
        data: {
          ...next.data,
          fields: { ...next.data.fields, body: sourceValue },
          target_fields: { ...next.data.target_fields, body: sourceValue },
        },
        revision: 4,
        updated_at: '2026-01-01T00:00:00Z',
        applied: true,
        replay: false,
      });
    }
    return createJsonResponse({ error: { message: 'unexpected request' } }, 500, {
      'content-type': 'application/json',
    });
  });

  const screen = new TranslationEditorScreen({
    endpoint: '/admin/api/translations/assignments/asg-editor-1',
    actionEndpointBase: '/admin/api/translations/assignments',
  });
  screen.mount(root);
  await flushAsync();
  await flushAsync();

  const button = root.querySelector('[data-copy-source="body"]');
  assert.ok(button);
  assert.match(button.className, /text-\[11px\]/);
  assert.ok(button.querySelector('.iconoir-copy'));
  assert.equal(button.querySelector('.iconoir-copy')?.nextElementSibling?.textContent, 'Copy source');
  button.click();

  const input = root.querySelector('[data-field-input="body"]');
  assert.equal(input.value, sourceValue);
  assert.equal(window.document.activeElement?.dataset.fieldInput, 'body');
  await flushAsync();
  assert.equal(writeText.mock.callCount(), 1);
  assert.equal(writeText.mock.calls[0].arguments[0], sourceValue);

  await new Promise((resolve) => setTimeout(resolve, 650));
  await flushAsync();
  assert.ok(requests.some((request) => request.method === 'PATCH'));

  screen.unmount();
});

test('translation editor runtime: dispatches suggestion command and inserts returned text', async () => {
  const { root, window } = setupDom();
  installTranslationSyncCoreStub(window);
  window.scrollTo = mock.fn();
  const requests = [];
  const detail = makeSuggestionReadyFixture();
  const suggestedText = 'Guide de publication suggere';
  globalThis.fetch = mock.fn(async (input, init = {}) => {
    const method = String(init.method || 'GET').toUpperCase();
    const url = String(input);
    requests.push({ url, method, init });
    if (method === 'GET' && url.includes('/api/translations/assignments/asg-editor-1')) {
      return createJsonResponse(detail);
    }
    if (method === 'GET' && url.includes('/api/translations/sync/resources/translation_variant_draft/')) {
      return createJsonResponse({
        data: detail.data,
        revision: 3,
        updated_at: '2026-01-01T00:00:00Z',
      });
    }
    if (method === 'POST' && url.includes('/admin/api/rpc')) {
      const body = JSON.parse(init.body);
      assert.equal(body.method, 'admin.commands.dispatch');
      assert.equal(body.params.data.name, 'translations.suggestions.generate');
      assert.deepEqual(body.params.data.ids, ['asg-editor-1']);
      assert.equal(body.params.data.payload.field_path, 'title');
      assert.equal(body.params.data.options.Mode, 'inline');
      return createJsonResponse({
        data: {
          receipt: {
            accepted: true,
            command_id: 'translations.suggestions.generate',
          },
          result: {
            assignment_id: 'asg-editor-1',
            field_path: 'title',
            suggested_text: suggestedText,
            provider: 'fixture',
            model: 'fixture-model',
          },
        },
      });
    }
    return createJsonResponse({ error: { message: 'unexpected request' } }, 500, {
      'content-type': 'application/json',
    });
  });

  const screen = new TranslationEditorScreen({
    endpoint: '/admin/api/translations/assignments/asg-editor-1',
    actionEndpointBase: '/admin/api/translations/assignments',
  });
  screen.mount(root);
  await flushAsync();
  await flushAsync();

  const button = root.querySelector('[data-suggest-translation="title"]');
  assert.ok(button);
  assert.equal(button.disabled, false);
  assert.match(button.textContent, /Generate suggestion/);

  button.click();
  assert.equal(await waitForCondition(() => root.querySelector('[data-field-input="title"]')?.value === suggestedText), true);
  assert.equal(root.querySelector('[data-field-input="title"]')?.value, suggestedText);
  assert.equal(window.document.activeElement?.dataset.fieldInput, 'title');
  assert.match(root.innerHTML, /Translation suggestion inserted\./);
  assert.ok(requests.some((request) => request.method === 'POST' && request.url.includes('/admin/api/rpc')));

  screen.unmount();
});

test('translation editor runtime: stale suggestion response does not overwrite a newer field edit', async () => {
  const { root, window } = setupDom();
  installTranslationSyncCoreStub(window);
  window.scrollTo = mock.fn();
  const detail = makeSuggestionReadyFixture();
  const manualText = 'Manual edit while suggestion is pending';
  const suggestedText = 'Late suggestion should not apply';
  let postStarted = false;
  let resolveSuggestion;
  const suggestionResponse = new Promise((resolve) => {
    resolveSuggestion = resolve;
  });

  globalThis.fetch = mock.fn(async (input, init = {}) => {
    const method = String(init.method || 'GET').toUpperCase();
    const url = String(input);
    if (method === 'GET' && url.includes('/api/translations/assignments/asg-editor-1')) {
      return createJsonResponse(detail);
    }
    if (method === 'GET' && url.includes('/api/translations/sync/resources/translation_variant_draft/')) {
      return createJsonResponse({
        data: detail.data,
        revision: 3,
        updated_at: '2026-01-01T00:00:00Z',
      });
    }
    if (method === 'POST' && url.includes('/admin/api/rpc')) {
      postStarted = true;
      return suggestionResponse;
    }
    return createJsonResponse({ error: { message: 'unexpected request' } }, 500, {
      'content-type': 'application/json',
    });
  });

  const screen = new TranslationEditorScreen({
    endpoint: '/admin/api/translations/assignments/asg-editor-1',
    actionEndpointBase: '/admin/api/translations/assignments',
  });
  screen.mount(root);
  await flushAsync();
  await flushAsync();

  root.querySelector('[data-suggest-translation="title"]').click();
  assert.equal(await waitForCondition(() => postStarted), true);

  const input = root.querySelector('[data-field-input="title"]');
  input.value = manualText;
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  await flushAsync();

  resolveSuggestion(createJsonResponse({
    data: {
      receipt: {
        accepted: true,
        command_id: 'translations.suggestions.generate',
      },
      result: {
        assignment_id: 'asg-editor-1',
        field_path: 'title',
        suggested_text: suggestedText,
        provider: 'fixture',
        model: 'fixture-model',
      },
    },
  }));

  assert.equal(await waitForCondition(() => /field changed while the suggestion was generating/i.test(root.innerHTML)), true);
  assert.equal(root.querySelector('[data-field-input="title"]')?.value, manualText);
  assert.doesNotMatch(root.innerHTML, /Translation suggestion inserted\./);

  screen.unmount();
});

test('translation editor runtime: suggestion button visibility follows server action state', () => {
  const unavailable = normalizeAssignmentEditorDetail(fixtures.detail);
  const unavailableHTML = renderTranslationEditorState(
    { status: 'ready', detail: unavailable },
    createTranslationEditorState(unavailable)
  );
  const unavailableDOM = new JSDOM(unavailableHTML);
  assert.equal(unavailableDOM.window.document.querySelector('[data-suggest-translation]'), null);

  const denied = normalizeAssignmentEditorDetail(makeSuggestionDeniedFixture());
  const deniedHTML = renderTranslationEditorState(
    { status: 'ready', detail: denied },
    createTranslationEditorState(denied)
  );
  const deniedDOM = new JSDOM(deniedHTML);
  const deniedButton = deniedDOM.window.document.querySelector('[data-suggest-translation="title"]');
  assert.ok(deniedButton);
  assert.equal(deniedButton.disabled, true);
  assert.match(deniedButton.getAttribute('title') || '', /Provider policy denied/);
});

test('translation editor runtime: read-only assignment disables suggestion controls', () => {
  const fixture = makeApprovedAssignmentFixture();
  const suggestionFixture = makeSuggestionReadyFixture();
  fixture.data.suggest_translation_action = suggestionFixture.data.suggest_translation_action;
  fixture.data.fields = fixture.data.fields.map((field) => ({
    ...field,
    suggest_translation_action: suggestionFixture.data.fields.find((candidate) => candidate.path === field.path)?.suggest_translation_action,
  }));
  const detail = normalizeAssignmentEditorDetail(fixture);
  const html = renderTranslationEditorState(
    { status: 'ready', detail },
    createTranslationEditorState(detail)
  );
  const dom = new JSDOM(html);
  const button = dom.window.document.querySelector('[data-suggest-translation="title"]');

  assert.ok(button);
  assert.equal(button.disabled, true);
  assert.match(html, /data-editor-read-only="true"/);
});

test('translation editor runtime: autosave conflict blocks suggestion dispatch and insertion', async () => {
  const { root, window } = setupDom();
  installTranslationSyncCoreStub(window);
  const detail = makeSuggestionReadyFixture();
  const originalText = detail.data.fields.find((field) => field.path === 'title')?.target_value;
  globalThis.fetch = mock.fn(async () => {
    throw new Error('suggestion transport should not run during conflict');
  });

  const screen = new TranslationEditorScreen({
    endpoint: '/admin/api/translations/assignments/asg-editor-1',
    actionEndpointBase: '/admin/api/translations/assignments',
  });
  screen.mountWithInitialDetail(root, detail);
  screen.editorState.autosave.conflict = { row_version: 4, message: 'server draft changed' };
  screen.render();

  root.querySelector('[data-suggest-translation="title"]').click();
  assert.equal(await waitForCondition(() => /Reload the latest server draft before generating a suggestion\./.test(root.innerHTML)), true);
  assert.equal(root.querySelector('[data-field-input="title"]')?.value, originalText);
  assert.equal(globalThis.fetch.mock.callCount(), 0);

  screen.unmount();
});

test('translation editor runtime: suggestion failure leaves field value unchanged', async () => {
  const { root, window } = setupDom();
  installTranslationSyncCoreStub(window);
  window.scrollTo = mock.fn();
  const detail = makeSuggestionReadyFixture();
  const originalText = detail.data.fields.find((field) => field.path === 'title')?.target_value;
  globalThis.fetch = mock.fn(async (input, init = {}) => {
    const method = String(init.method || 'GET').toUpperCase();
    const url = String(input);
    if (method === 'GET' && url.includes('/api/translations/assignments/asg-editor-1')) {
      return createJsonResponse(detail);
    }
    if (method === 'GET' && url.includes('/api/translations/sync/resources/translation_variant_draft/')) {
      return createJsonResponse({
        data: detail.data,
        revision: 3,
        updated_at: '2026-01-01T00:00:00Z',
      });
    }
    if (method === 'POST' && url.includes('/admin/api/rpc')) {
      return createJsonResponse({
        error: {
          message: 'suggestion quota exhausted',
        },
      }, 429, {
        'content-type': 'application/json',
      });
    }
    return createJsonResponse({ error: { message: 'unexpected request' } }, 500, {
      'content-type': 'application/json',
    });
  });

  const screen = new TranslationEditorScreen({
    endpoint: '/admin/api/translations/assignments/asg-editor-1',
    actionEndpointBase: '/admin/api/translations/assignments',
  });
  screen.mount(root);
  await flushAsync();
  await flushAsync();

  root.querySelector('[data-suggest-translation="title"]').click();
  assert.equal(await waitForCondition(() => /suggestion quota exhausted/.test(root.innerHTML)), true);
  assert.equal(root.querySelector('[data-field-input="title"]')?.value, originalText);

  screen.unmount();
});

test('translation editor runtime: dispatch helper returns structured suggestion result', async () => {
  const { window } = setupDom();
  const detail = normalizeAssignmentEditorDetail(makeSuggestionReadyFixture());
  const action = detail.fields.find((field) => field.path === 'title')?.suggest_translation_action;
  assert.ok(action);
  globalThis.fetch = mock.fn(async (input, init = {}) => {
    assert.equal(String(input), '/admin/api/rpc');
    const body = JSON.parse(init.body);
    assert.equal(body.params.data.payload.assignment_id, 'asg-editor-1');
    assert.equal(body.params.data.payload.field_path, 'title');
    return createJsonResponse({
      data: {
        result: {
          assignment_id: 'asg-editor-1',
          field_path: 'title',
          suggested_text: 'Suggestion structuree',
          provider: 'fixture',
          model: 'fixture-model',
        },
      },
    });
  });

  const result = await dispatchTranslationSuggestion(action, 'req-dispatch');
  assert.deepEqual(result, {
    assignment_id: 'asg-editor-1',
    field_path: 'title',
    suggested_text: 'Suggestion structuree',
    provider: 'fixture',
    model: 'fixture-model',
    diagnostics: {},
  });
  window.close();
});

test('translation editor runtime: renders full screen with history, attachments, and assist fallbacks', () => {
  const detail = normalizeAssignmentEditorDetail(fixtures.detail);
  const state = createTranslationEditorState(detail);
  const html = renderTranslationEditorState(
    { status: 'ready', detail, requestId: 'req-editor', traceId: 'trace-editor' },
    state,
    { basePath: '/admin' },
    { lastSavedMessage: 'Draft saved automatically' }
  );

  assert.match(html, /Assignment editor/i);
  assert.match(html, /Draft saved automatically/i);
  assert.match(html, /Copy source/i);
  assert.match(html, /Homepage localization brief/i);
  assert.match(html, /Workflow timeline/i);
  assert.match(html, /Reviewer feedback/i);
  assert.match(html, /Current QA findings/i);
  assert.match(html, /FR Pages Style Guide/i);
  assert.match(html, /Request req-editor/);
  assert.match(html, /Resolve QA blockers before submitting for review\./i);
  assert.match(html, /data-action="preview-assignment"/);
  assert.match(html, />\s*Preview\s*</);
  assert.doesNotMatch(html, /preview_token/);
  assert.doesNotMatch(html, /data-editor-panel="review-actions"/);
  assert.match(html, /data-editor-panel="management-actions"/);

  const assistUnavailable = normalizeAssignmentEditorDetail(makeAssistUnavailableFixture());
  const unavailableHTML = renderTranslationEditorState({ status: 'ready', detail: assistUnavailable });
  assert.match(unavailableHTML, /Glossary matches unavailable/i);
  assert.match(unavailableHTML, /Style-guide guidance is unavailable/i);
});

test('translation editor runtime: disabled preview action renders server reason', () => {
  const detail = normalizeAssignmentEditorDetail(makePreviewUnavailableFixture());
  const html = renderTranslationEditorState(
    { status: 'ready', detail },
    createTranslationEditorState(detail)
  );

  assert.match(html, /Preview unavailable/);
  assert.match(html, /data-preview-unavailable-reason="true"/);
  assert.match(html, /target content has no preview path/);
  assert.match(html, /data-preview-reason-code="preview_path_missing"/);
});

test('translation editor runtime: sidebar tabs use shared icon library classes', () => {
  const detail = normalizeAssignmentEditorDetail(fixtures.detail);
  const html = renderTranslationEditorState(
    { status: 'ready', detail },
    createTranslationEditorState(detail)
  );
  const dom = new JSDOM(html);
  const tablist = dom.window.document.querySelector('[aria-label="Editor sidebar sections"]');
  assert.ok(tablist);
  assert.equal(tablist.querySelectorAll('svg').length, 0);

  const expectedIcons = {
    actions: 'iconoir-flash',
    qa: 'iconoir-shield',
    assist: 'iconoir-chat-bubble',
    files: 'iconoir-page',
    history: 'iconoir-clock',
  };
  for (const [tab, iconClass] of Object.entries(expectedIcons)) {
    const button = tablist.querySelector(`[data-sidebar-tab="${tab}"]`);
    assert.ok(button, `expected ${tab} tab`);
    assert.ok(button.querySelector(`.${iconClass}`), `expected ${tab} tab to render ${iconClass}`);
  }
});

test('translation editor runtime: active autosave conflict disables preview action', () => {
  const detail = normalizeAssignmentEditorDetail(makeSubmitReadyFixture());
  const state = createTranslationEditorState(detail);
  state.autosave.conflict = { row_version: 4, message: 'server draft changed' };
  const html = renderTranslationEditorState(
    { status: 'ready', detail },
    state
  );

  assert.match(html, /data-action="preview-assignment"/);
  assert.match(html, /data-action="preview-assignment"[\s\S]*disabled aria-disabled="true"/);
  assert.match(html, /Reload the latest server draft before opening preview\./);
});

test('translation editor runtime: field completion copy is distinct from submit workflow state', () => {
  const detail = normalizeAssignmentEditorDetail(makeWorkflowBlockedFixture());
  const html = renderTranslationEditorState(
    { status: 'ready', detail },
    createTranslationEditorState(detail)
  );

  assert.match(html, /Field complete/);
  assert.doesNotMatch(html, /Ready to submit/);
  assert.match(html, /data-action="submit-review"[\s\S]*disabled aria-disabled="true"/);
  assert.match(html, /Submit review/);
  assert.match(html, /data-submit-unavailable-reason="true"/);
  assert.match(html, /assignment must be in progress/);
});

test('translation editor runtime: approved assignments render as read-only inspection views', () => {
  const detail = normalizeAssignmentEditorDetail(makeApprovedAssignmentFixture());
  const html = renderTranslationEditorState(
    { status: 'ready', detail },
    createTranslationEditorState(detail)
  );
  const dom = new JSDOM(html);
  const previewButton = dom.window.document.querySelector('[data-action="preview-assignment"]');

  assert.match(html, /data-editor-read-only="true"/);
  assert.match(html, /can be inspected but not edited/);
  assert.match(html, /data-action="save-draft"[\s\S]*disabled aria-disabled="true"/);
  assert.ok(previewButton);
  assert.equal(previewButton.disabled, false);
  assert.doesNotMatch(html, /data-action="submit-review"/);
  assert.match(html, /status-chip status-chip--success/);
  assert.match(html, /Approved/);
  assert.match(html, /data-copy-source="body"[\s\S]*disabled aria-disabled="true"/);
  assert.match(html, /data-field-input="body"[\s\S]*disabled aria-disabled="true"/);
});

test('translation editor runtime: in-review assignments render submit state as a status chip', () => {
  const detail = normalizeAssignmentEditorDetail(makeInReviewAssignmentFixture());
  const html = renderTranslationEditorState(
    { status: 'ready', detail },
    createTranslationEditorState(detail)
  );
  const dom = new JSDOM(html);
  const previewButton = dom.window.document.querySelector('[data-action="preview-assignment"]');

  assert.match(html, /data-editor-read-only="true"/);
  assert.match(html, /status-chip status-chip--warning/);
  assert.match(html, /In Review/);
  assert.doesNotMatch(html, /data-action="submit-review"/);
  assert.doesNotMatch(html, /Submit unavailable/);
  assert.ok(previewButton);
  assert.equal(previewButton.disabled, false);
});

test('translation editor runtime: changes-requested assignments expose resume workflow state', () => {
  const detail = normalizeAssignmentEditorDetail(makeChangesRequestedAssignmentFixture());
  const html = renderTranslationEditorState(
    { status: 'ready', detail },
    createTranslationEditorState(detail)
  );
  const dom = new JSDOM(html);
  const resumeButtons = dom.window.document.querySelectorAll('[data-action="resume-work"]');

  assert.match(html, /Changes Requested/);
  assert.match(html, /Resume work/);
  assert.equal(resumeButtons.length, 2);
  assert.equal(resumeButtons[0].disabled, false);
  assert.match(html, /data-editor-panel="resume-actions"/);
  assert.match(html, /assignment must be in progress/);
  assert.doesNotMatch(html, /data-action="approve"/);
  assert.doesNotMatch(html, /data-action="reject"/);

  const blocked = normalizeAssignmentEditorDetail(makeChangesRequestedAssignmentFixture({ claimEnabled: false }));
  const blockedHTML = renderTranslationEditorState(
    { status: 'ready', detail: blocked },
    createTranslationEditorState(blocked)
  );
  const blockedDOM = new JSDOM(blockedHTML);
  const blockedResume = blockedDOM.window.document.querySelector('[data-action="resume-work"]');

  assert.ok(blockedResume);
  assert.equal(blockedResume.disabled, true);
  assert.match(blockedHTML, /assignment is assigned to a different translator/);
  assert.match(blockedHTML, /data-resume-unavailable-reason="true"/);

  const missingClaimPayload = makeChangesRequestedAssignmentFixture();
  delete missingClaimPayload.data.assignment_action_states.claim;
  const missingClaim = normalizeAssignmentEditorDetail(missingClaimPayload);
  const missingClaimHTML = renderTranslationEditorState(
    { status: 'ready', detail: missingClaim },
    createTranslationEditorState(missingClaim)
  );
  const missingClaimDOM = new JSDOM(missingClaimHTML);
  const missingClaimResume = missingClaimDOM.window.document.querySelector('[data-action="resume-work"]');

  assert.ok(missingClaimResume);
  assert.equal(missingClaimResume.disabled, true);
  assert.match(missingClaimHTML, /Resume work on this assignment\./);
});

test('translation editor runtime: autosave conflict disables changes-requested resume controls', () => {
  const detail = normalizeAssignmentEditorDetail(makeChangesRequestedAssignmentFixture());
  const conflicted = applyEditorAutosaveConflict(
    createTranslationEditorState(detail),
    makeAutosaveConflictFixture()
  );
  const html = renderTranslationEditorState(
    { status: 'ready', detail },
    conflicted
  );
  const dom = new JSDOM(html);
  const resumeButtons = Array.from(dom.window.document.querySelectorAll('[data-action="resume-work"]'));

  assert.equal(resumeButtons.length, 2);
  assert.equal(resumeButtons.every((button) => button.disabled), true);
  assert.match(html, /Reload the latest server draft before resuming work\./);
  assert.match(html, /data-resume-unavailable-reason="true"/);
});

test('translation editor runtime: renders locale navigation without missing-locale fallbacks', () => {
  const detail = normalizeAssignmentEditorDetail(fixtures.detail);
  const html = renderTranslationEditorState(
    { status: 'ready', detail },
    createTranslationEditorState(detail)
  );
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`);
  const summary = dom.window.document.querySelector('[data-editor-locale-summary="true"]');
  assert.ok(summary);
  assert.equal(summary.getAttribute('data-family-id'), 'tg-page-1');
  assert.equal(summary.getAttribute('data-current-locale'), 'fr');

  const current = summary.querySelector('[data-locale-chip="fr"]');
  assert.equal(current?.tagName, 'A');
  assert.equal(current?.getAttribute('aria-current'), 'page');
  assert.equal(current?.getAttribute('href'), '/admin/translations/assignments/asg-editor-1/edit');

  const sibling = summary.querySelector('[data-locale-chip="es"]');
  assert.equal(sibling?.tagName, 'A');
  assert.equal(sibling?.getAttribute('href'), '/admin/translations/assignments/asg-editor-es/edit');
  assert.equal(sibling?.getAttribute('data-assignment-id'), 'asg-editor-es');

  const missing = summary.querySelector('[data-locale-chip="de"]');
  assert.equal(missing?.tagName, 'SPAN');
  assert.equal(missing?.getAttribute('aria-disabled'), 'true');
  assert.equal(missing?.hasAttribute('href'), false);
  assert.match(missing?.getAttribute('title') || '', /No translation assignment exists/);

  const variantOnly = summary.querySelector('[data-locale-chip="it"]');
  assert.equal(variantOnly?.tagName, 'SPAN');
  assert.equal(variantOnly?.getAttribute('aria-disabled'), 'true');
  assert.equal(variantOnly?.hasAttribute('href'), false);

  const familyLink = summary.querySelector('[data-family-detail-link="true"]');
  assert.equal(familyLink?.getAttribute('href'), '/admin/translations/families/tg-page-1');
});

test('translation editor runtime: QA finding jump targets the finding field', async () => {
  const { root, window } = setupDom();
  installTranslationSyncCoreStub(window);
  const scrolledFields = [];
  window.Element.prototype.scrollIntoView = mock.fn(function scrollIntoView() {
    scrolledFields.push(this.getAttribute('data-editor-field'));
  });
  globalThis.fetch = mock.fn(async (input, init = {}) => {
    const method = String(init.method || 'GET').toUpperCase();
    const url = String(input);
    if (method === 'GET' && url.includes('/api/translations/assignments/asg-editor-1')) {
      return createJsonResponse(fixtures.detail);
    }
    if (method === 'GET' && url.includes('/api/translations/sync/resources/translation_variant_draft/')) {
      return createJsonResponse({
        data: fixtures.detail.data,
        revision: 3,
        updated_at: '2026-01-01T00:00:00Z',
      });
    }
    return createJsonResponse({ error: { message: 'unexpected request' } }, 500, {
      'content-type': 'application/json',
    });
  });

  const screen = new TranslationEditorScreen({
    endpoint: '/admin/api/translations/assignments/asg-editor-1',
    actionEndpointBase: '/admin/api/translations/assignments',
  });
  screen.mount(root);
  await flushAsync();
  await flushAsync();

  root.querySelector('[data-sidebar-tab="qa"]').click();
  const titleJump = root.querySelector('[data-sidebar-panel="qa"] [data-jump-to-field="title"]');
  assert.ok(titleJump);
  titleJump.click();
  await new Promise((resolve) => setTimeout(resolve, 350));

  assert.equal(scrolledFields.at(-1), 'title');
  assert.equal(window.document.activeElement?.dataset.fieldInput, 'title');

  screen.unmount();
});

test('translation editor runtime: renders translation-memory scores on one percent scale', () => {
  const detail = normalizeAssignmentEditorDetail(makeTranslationMemoryScaleFixture());
  const html = renderTranslationEditorState(
    { status: 'ready', detail },
    createTranslationEditorState(detail),
    {},
    { activeSidebarTab: 'assist' }
  );

  assert.match(html, /High 95%/);
  assert.match(html, /High 85%/);
  assert.match(html, /Source changed/);
  assert.doesNotMatch(html, /0\.95%/);
});

test('translation editor runtime: distinguishes optional and required empty source copy', () => {
  const detail = normalizeAssignmentEditorDetail(makeEmptySourceFixture());
  const html = renderTranslationEditorState(
    { status: 'ready', detail },
    createTranslationEditorState(detail)
  );

  assert.match(html, /Optional source content not provided/);
  assert.match(html, /Source text pending - required field/);
  assert.doesNotMatch(html, /No source text for this field/);
});

test('translation editor runtime: suppresses repeated hash-only drift field warnings', () => {
  const detail = normalizeAssignmentEditorDetail(makeHashOnlyDriftFixture());
  const html = renderTranslationEditorState(
    { status: 'ready', detail },
    createTranslationEditorState(detail)
  );

  assert.match(html, /source changed/);
  assert.doesNotMatch(html, />Source changed<\/span>/);
  assert.doesNotMatch(html, /Previous value unavailable/);
  assert.doesNotMatch(html, /Before\/after values unavailable/);
  assert.doesNotMatch(html, /data-field-drift=/);
});

test('translation editor runtime: translation-memory insert keeps inline editing and autosave path', async () => {
  const { root, window } = setupDom();
  installTranslationSyncCoreStub(window);
  globalThis.fetch = mock.fn(async (input, init = {}) => {
    const method = String(init.method || 'GET').toUpperCase();
    const url = String(input);
    if (method === 'GET' && url.includes('/api/translations/assignments/asg-editor-1')) {
      return createJsonResponse(makeTranslationMemoryScaleFixture());
    }
    if (method === 'GET' && url.includes('/api/translations/sync/resources/translation_variant_draft/')) {
      return createJsonResponse({
        data: makeTranslationMemoryScaleFixture().data,
        revision: 3,
        updated_at: '2026-01-01T00:00:00Z',
      });
    }
    return createJsonResponse({ error: { message: 'unexpected request' } }, 500, {
      'content-type': 'application/json',
    });
  });

  const screen = new TranslationEditorScreen({
    endpoint: '/admin/api/translations/assignments/asg-editor-1',
    actionEndpointBase: '/admin/api/translations/assignments',
  });
  screen.mount(root);
  await flushAsync();
  await flushAsync();

  root.querySelector('[data-insert-tm="tm-decimal"]').click();

  const bodyInput = root.querySelector('[data-field-input="body"]');
  assert.equal(bodyInput.value, 'Guide precedent pour les workflows de publication.');
  assert.match(root.innerHTML, /Translation memory suggestion inserted/);

  screen.unmount();
});

test('translation editor runtime: save draft mutates the sync resource through sync-core', async () => {
  const { root, window } = setupDom();
  const syncHarness = installTranslationSyncCoreStub(window);
  const requests = [];
  window.document.head.innerHTML = '<meta name="csrf-token" content="csrf-sync-test">';
  globalThis.fetch = mock.fn(async (input, init = {}) => {
    const method = String(init.method || 'GET').toUpperCase();
    const url = String(input);
    requests.push({ url, method, init });
    if (method === 'GET' && url.includes('/api/translations/assignments/asg-editor-1')) {
      const detail = makeSubmitReadyFixture();
      detail.data.row_version = 15;
      detail.data.version = 15;
      return createJsonResponse(detail);
    }
    if (method === 'GET' && url.includes('/admin/api/translations/sync/resources/translation_variant_draft/')) {
      const detail = makeSubmitReadyFixture();
      detail.data.row_version = 15;
      detail.data.version = 15;
      return createJsonResponse({
        data: detail.data,
        revision: 3,
        updated_at: '2026-01-01T00:00:00Z',
      });
    }
    if (method === 'PATCH' && url.includes('/admin/api/translations/sync/resources/translation_variant_draft/')) {
      return createJsonResponse({
        data: makeSubmitReadyUpdateFixture().data,
        revision: 4,
        updated_at: '2026-01-01T00:00:00Z',
        applied: true,
        replay: false,
      });
    }
    return createJsonResponse({ error: { message: 'unexpected request' } }, 500, {
      'content-type': 'application/json',
    });
  });

  const screen = new TranslationEditorScreen({
    endpoint: '/admin/api/translations/assignments/asg-editor-1?channel=staging',
    actionEndpointBase: '/admin/api/translations/assignments',
    syncBaseURL: '/admin/api/translations',
    syncClientBasePath: '/admin/sync-client/sync-core',
  });
  screen.mount(root);
  await flushAsync();
  await flushAsync();

  const titleInput = root.querySelector('[data-field-input="title"]');
  titleInput.value = 'Guide de publication final';
  titleInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  root.querySelector('[data-action="save-draft"]').click();
  await flushAsync();
  await flushAsync();

  const patch = requests.find((request) => request.method === 'PATCH');
  const syncRead = requests.find((request) => request.method === 'GET' && request.url.includes('/sync/resources/translation_variant_draft/'));
  assert.ok(syncRead);
  assert.ok(requests.indexOf(syncRead) < requests.indexOf(patch));
  assert.match(syncRead.url, /[?&]channel=staging(?:&|$)/);
  assert.doesNotMatch(syncRead.url, /\/sync\/sync\/resources\//);
  assert.ok(patch);
  assert.match(patch.url, /\/admin\/api\/translations\/sync\/resources\/translation_variant_draft\//);
  assert.match(patch.url, /[?&]channel=staging(?:&|$)/);
  assert.doesNotMatch(patch.url, /\/sync\/sync\/resources\//);
  const body = JSON.parse(patch.init.body);
  assert.equal(body.operation, 'autosave');
  assert.equal(body.expected_revision, 3);
  assert.equal(body.payload.autosave, false);
  assert.equal(body.payload.fields.title, 'Guide de publication final');
  assert.equal(body.payload.acknowledged_source_hash, makeSubmitReadyFixture().data.source_target_drift.current_source_hash);
  assert.equal(body.metadata.autosave, false);
  assert.equal(body.idempotency_key, undefined);
  assert.equal(patch.init.headers['X-CSRF-Token'], 'csrf-sync-test');
  assert.equal(syncHarness.engineOptions.retry.maxAttempts, 1);
  assert.match(root.innerHTML, /Draft saved/);

  screen.unmount();
});

test('translation editor runtime: preview opens blank tab synchronously, saves dirty fields, then navigates', async () => {
  const { root, window } = setupDom();
  installTranslationSyncCoreStub(window);
  const requests = [];
  const openCalls = [];
  const previewTab = {
    closed: false,
    navigatedTo: '',
    opener: {},
    close() {
      this.closed = true;
    },
    location: {
      href: '',
      assign(url) {
        previewTab.navigatedTo = url;
        this.href = url;
      },
    },
  };
  window.open = mock.fn((url, target, features) => {
    openCalls.push({ url, target, features });
    if (String(features || '').includes('noopener')) {
      return null;
    }
    return previewTab;
  });
  globalThis.fetch = mock.fn(async (input, init = {}) => {
    const method = String(init.method || 'GET').toUpperCase();
    const url = String(input);
    requests.push({ url, method, init });
    if (method === 'GET' && url.includes('/api/translations/assignments/asg-editor-1') && !url.includes('/preview')) {
      return createJsonResponse(makeSubmitReadyFixture());
    }
    if (method === 'GET' && url.includes('/admin/api/translations/sync/resources/translation_variant_draft/')) {
      return createJsonResponse({
        data: makeSubmitReadyFixture().data,
        revision: 3,
        updated_at: '2026-01-01T00:00:00Z',
      });
    }
    if (method === 'PATCH' && url.includes('/admin/api/translations/sync/resources/translation_variant_draft/')) {
      return createJsonResponse({
        data: makeSubmitReadyUpdateFixture().data,
        revision: 4,
        updated_at: '2026-01-01T00:00:00Z',
        applied: true,
        replay: false,
      });
    }
    if (method === 'GET' && url.includes('/api/translations/assignments/asg-editor-1/preview')) {
      return createJsonResponse({
        data: {
          ...makeSubmitReadyFixture().data.preview_action,
          enabled: true,
          url: '/fr/guide?preview_token=fresh-token',
        },
      });
    }
    return createJsonResponse({ error: { message: 'unexpected request' } }, 500, {
      'content-type': 'application/json',
    });
  });

  const screen = new TranslationEditorScreen({
    endpoint: '/admin/api/translations/assignments/asg-editor-1?channel=production',
    actionEndpointBase: '/admin/api/translations/assignments',
    syncBaseURL: '/admin/api/translations',
  });
  screen.mount(root);
  await flushAsync();
  await flushAsync();

  const titleInput = root.querySelector('[data-field-input="title"]');
  titleInput.value = 'Guide de publication final';
  titleInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  root.querySelector('[data-action="preview-assignment"]').click();
  assert.equal(window.open.mock.callCount(), 1);

  await flushAsync();
  await flushAsync();

  const patchIndex = requests.findIndex((request) => request.method === 'PATCH');
  const previewIndex = requests.findIndex((request) => request.method === 'GET' && request.url.includes('/preview'));
  assert.ok(patchIndex >= 0);
  assert.ok(previewIndex > patchIndex);
  assert.match(requests[previewIndex].url, /[?&]channel=production(?:&|$)/);
  assert.deepEqual(openCalls, [{ url: 'about:blank', target: '_blank', features: undefined }]);
  assert.equal(previewTab.opener, null);
  assert.equal(previewTab.closed, false);
  assert.equal(previewTab.navigatedTo, '/fr/guide?preview_token=fresh-token');

  screen.unmount();
});

test('translation editor runtime: preview closes blank tab and skips endpoint on save conflict', async () => {
  const { root, window } = setupDom();
  installTranslationSyncCoreStub(window);
  const requests = [];
  const previewTab = {
    closed: false,
    close() {
      this.closed = true;
    },
    location: {
      href: '',
      assign() {},
    },
  };
  window.open = mock.fn(() => previewTab);
  globalThis.fetch = mock.fn(async (input, init = {}) => {
    const method = String(init.method || 'GET').toUpperCase();
    const url = String(input);
    requests.push({ url, method, init });
    if (method === 'GET' && url.includes('/api/translations/assignments/asg-editor-1') && !url.includes('/preview')) {
      return createJsonResponse(makeSubmitReadyFixture());
    }
    if (method === 'GET' && url.includes('/admin/api/translations/sync/resources/translation_variant_draft/')) {
      return createJsonResponse({
        data: makeSubmitReadyFixture().data,
        revision: 3,
        updated_at: '2026-01-01T00:00:00Z',
      });
    }
    if (method === 'PATCH' && url.includes('/admin/api/translations/sync/resources/translation_variant_draft/')) {
      return createJsonResponse(makeAutosaveConflictFixture(), 409, {
        'content-type': 'application/json',
      });
    }
    return createJsonResponse({ error: { message: 'unexpected request' } }, 500, {
      'content-type': 'application/json',
    });
  });

  const screen = new TranslationEditorScreen({
    endpoint: '/admin/api/translations/assignments/asg-editor-1?channel=production',
    actionEndpointBase: '/admin/api/translations/assignments',
    syncBaseURL: '/admin/api/translations',
  });
  screen.mount(root);
  await flushAsync();
  await flushAsync();

  const titleInput = root.querySelector('[data-field-input="title"]');
  titleInput.value = 'Guide de publication conflict';
  titleInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  root.querySelector('[data-action="preview-assignment"]').click();
  assert.equal(window.open.mock.callCount(), 1);

  await flushAsync();
  await flushAsync();

  assert.equal(previewTab.closed, true);
  assert.equal(requests.some((request) => request.url.includes('/preview')), false);
  assert.match(root.innerHTML, /Autosave conflict detected/);
  const previewButton = root.querySelector('[data-action="preview-assignment"]');
  assert.equal(previewButton.disabled, true);
  previewButton.click();
  assert.equal(window.open.mock.callCount(), 1);

  screen.unmount();
});

test('translation editor runtime: acknowledged source hash clears source-changed summary after save', () => {
  const before = normalizeAssignmentEditorDetail(makeHashOnlyDriftFixture());
  const beforeHTML = renderTranslationEditorState(
    { status: 'ready', detail: before },
    createTranslationEditorState(before)
  );
  assert.match(beforeHTML, /source changed/i);

  const after = normalizeAssignmentEditorDetail(makeSourceDriftClearedFixture());
  const afterHTML = renderTranslationEditorState(
    { status: 'ready', detail: after },
    createTranslationEditorState(after)
  );
  assert.doesNotMatch(afterHTML, /source changed/i);
});

test('translation editor runtime: autosave sync renders preserve active field and scroll position', async () => {
  const { root, window } = setupDom();
  installTranslationSyncCoreStub(window);
  const requests = [];
  const scrollCalls = [];
  let scrollX = 18;
  let scrollY = 640;
  Object.defineProperty(window, 'scrollX', { get: () => scrollX, configurable: true });
  Object.defineProperty(window, 'pageXOffset', { get: () => scrollX, configurable: true });
  Object.defineProperty(window, 'scrollY', { get: () => scrollY, configurable: true });
  Object.defineProperty(window, 'pageYOffset', { get: () => scrollY, configurable: true });
  window.scrollTo = mock.fn((x, y) => {
    scrollX = Number(x);
    scrollY = Number(y);
    scrollCalls.push([scrollX, scrollY]);
  });

  globalThis.fetch = mock.fn(async (input, init = {}) => {
    const method = String(init.method || 'GET').toUpperCase();
    const url = String(input);
    requests.push({ url, method, init });
    if (method === 'GET' && url.includes('/api/translations/assignments/asg-editor-1')) {
      return createJsonResponse(makeSubmitReadyFixture());
    }
    if (method === 'GET' && url.includes('/admin/api/translations/sync/resources/translation_variant_draft/')) {
      return createJsonResponse({
        data: makeSubmitReadyFixture().data,
        revision: 3,
        updated_at: '2026-01-01T00:00:00Z',
      });
    }
    if (method === 'PATCH' && url.includes('/admin/api/translations/sync/resources/translation_variant_draft/')) {
      const body = JSON.parse(init.body);
      const next = makeSubmitReadyUpdateFixture();
      next.data.fields = {
        ...next.data.fields,
        body: body.payload.fields.body,
      };
      next.data.target_fields = {
        ...next.data.target_fields,
        body: body.payload.fields.body,
      };
      return createJsonResponse({
        data: next.data,
        revision: 4,
        updated_at: '2026-01-01T00:00:00Z',
        applied: true,
        replay: false,
      });
    }
    return createJsonResponse({ error: { message: 'unexpected request' } }, 500, {
      'content-type': 'application/json',
    });
  });

  const screen = new TranslationEditorScreen({
    endpoint: '/admin/api/translations/assignments/asg-editor-1?channel=staging',
    actionEndpointBase: '/admin/api/translations/assignments',
    syncBaseURL: '/admin/api/translations',
    syncClientBasePath: '/admin/sync-client/sync-core',
  });
  screen.mount(root);
  await flushAsync();
  await flushAsync();

  const bodyDraft = 'Texte traduit sans saut de page';
  const bodyInput = root.querySelector('[data-field-input="body"]');
  bodyInput.focus();
  bodyInput.value = bodyDraft;
  bodyInput.setSelectionRange(11, 11);
  bodyInput.dispatchEvent(new window.Event('input', { bubbles: true }));

  let activeInput = window.document.activeElement;
  assert.equal(activeInput?.dataset.fieldInput, 'body');
  assert.equal(activeInput.selectionStart, 11);
  assert.equal(scrollX, 18);
  assert.equal(scrollY, 640);

  await new Promise((resolve) => setTimeout(resolve, 650));
  await flushAsync();
  await flushAsync();

  const patch = requests.find((request) => request.method === 'PATCH');
  assert.ok(patch);
  activeInput = window.document.activeElement;
  assert.equal(activeInput?.dataset.fieldInput, 'body');
  assert.equal(activeInput.value, bodyDraft);
  assert.equal(activeInput.selectionStart, 11);
  assert.equal(activeInput.selectionEnd, 11);
  assert.equal(scrollX, 18);
  assert.equal(scrollY, 640);
  assert.ok(scrollCalls.some(([x, y]) => x === 18 && y === 640));

  screen.unmount();
});

test('translation editor runtime: sync conflict reload applies latest snapshot revision', async () => {
  const { root, window } = setupDom();
  installTranslationSyncCoreStub(window);
  const requests = [];
  let patchCount = 0;
  const latest = makeSubmitReadyUpdateFixture();
  latest.data.row_version = 4;
  latest.data.version = 4;
  latest.data.fields = {
    ...latest.data.fields,
    title: 'Guide de publication serveur',
  };
  latest.data.target_fields = {
    ...latest.data.target_fields,
    title: 'Guide de publication serveur',
  };
  globalThis.fetch = mock.fn(async (input, init = {}) => {
    const method = String(init.method || 'GET').toUpperCase();
    const url = String(input);
    requests.push({ url, method, init });
    if (method === 'GET' && url.includes('/api/translations/assignments/asg-editor-1')) {
      return createJsonResponse(makeSubmitReadyFixture());
    }
    if (method === 'GET' && url.includes('/admin/api/translations/sync/resources/translation_variant_draft/')) {
      return createJsonResponse({
        data: makeSubmitReadyFixture().data,
        revision: 3,
        updated_at: '2026-01-01T00:00:00Z',
      });
    }
    if (method === 'PATCH' && url.includes('/admin/api/translations/sync/resources/translation_variant_draft/')) {
      patchCount += 1;
      if (patchCount === 1) {
        return createJsonResponse({
          error: {
            code: 'STALE_REVISION',
            message: 'stale translation variant draft',
            details: {
              current_revision: 4,
              resource: {
                data: latest.data,
                revision: 4,
                updated_at: '2026-01-01T00:00:00Z',
              },
            },
          },
        }, 409);
      }
      return createJsonResponse({
        data: {
          ...latest.data,
          row_version: 5,
          version: 5,
          fields: {
            ...latest.data.fields,
            title: 'Guide de publication apres reload',
          },
          target_fields: {
            ...latest.data.target_fields,
            title: 'Guide de publication apres reload',
          },
        },
        revision: 5,
        updated_at: '2026-01-01T00:00:00Z',
        applied: true,
        replay: false,
      });
    }
    return createJsonResponse({ error: { message: 'unexpected request' } }, 500, {
      'content-type': 'application/json',
    });
  });

  const screen = new TranslationEditorScreen({
    endpoint: '/admin/api/translations/assignments/asg-editor-1',
    actionEndpointBase: '/admin/api/translations/assignments',
    syncBaseURL: '/admin/api/translations',
    syncClientBasePath: '/admin/sync-client/sync-core',
  });
  screen.mount(root);
  await flushAsync();
  await flushAsync();

  const titleInput = root.querySelector('[data-field-input="title"]');
  titleInput.value = 'Guide conflit local';
  titleInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  root.querySelector('[data-action="save-draft"]').click();
  await flushAsync();
  await flushAsync();

  await flushAsync();
  assert.match(root.innerHTML, /Autosave conflict/);
  root.querySelector('[data-action="reload-server-state"]').click();
  assert.equal(root.querySelector('[data-field-input="title"]').value, 'Guide de publication serveur');

  const reloadedTitle = root.querySelector('[data-field-input="title"]');
  reloadedTitle.value = 'Guide de publication apres reload';
  reloadedTitle.dispatchEvent(new window.Event('input', { bubbles: true }));
  root.querySelector('[data-action="save-draft"]').click();
  await flushAsync();
  await flushAsync();

  const patchBodies = requests
    .filter((request) => request.method === 'PATCH')
    .map((request) => JSON.parse(request.init.body));
  assert.equal(patchBodies.length, 2);
  assert.equal(patchBodies[1].expected_revision, 4);
  assert.equal(patchBodies[1].payload.fields.title, 'Guide de publication apres reload');

  screen.unmount();
});

test('translation editor runtime: sync conflict reload refreshes resource when latest snapshot is absent', async () => {
  const { root, window } = setupDom();
  installTranslationSyncCoreStub(window);
  const requests = [];
  let syncReadCount = 0;
  const refreshed = makeSubmitReadyUpdateFixture();
  refreshed.data.row_version = 4;
  refreshed.data.version = 4;
  refreshed.data.fields = {
    ...refreshed.data.fields,
    title: 'Guide rafraichi serveur',
  };
  refreshed.data.target_fields = {
    ...refreshed.data.target_fields,
    title: 'Guide rafraichi serveur',
  };
  globalThis.fetch = mock.fn(async (input, init = {}) => {
    const method = String(init.method || 'GET').toUpperCase();
    const url = String(input);
    requests.push({ url, method, init });
    if (method === 'GET' && url.includes('/api/translations/assignments/asg-editor-1')) {
      return createJsonResponse(makeSubmitReadyFixture());
    }
    if (method === 'GET' && url.includes('/admin/api/translations/sync/resources/translation_variant_draft/')) {
      syncReadCount += 1;
      return createJsonResponse({
        data: syncReadCount === 1 ? makeSubmitReadyFixture().data : refreshed.data,
        revision: syncReadCount === 1 ? 3 : 4,
        updated_at: '2026-01-01T00:00:00Z',
      });
    }
    if (method === 'PATCH' && url.includes('/admin/api/translations/sync/resources/translation_variant_draft/')) {
      return createJsonResponse({
        error: {
          code: 'STALE_REVISION',
          message: 'stale translation variant draft',
          details: {
            current_revision: 4,
          },
        },
      }, 409);
    }
    return createJsonResponse({ error: { message: 'unexpected request' } }, 500, {
      'content-type': 'application/json',
    });
  });

  const screen = new TranslationEditorScreen({
    endpoint: '/admin/api/translations/assignments/asg-editor-1',
    actionEndpointBase: '/admin/api/translations/assignments',
    syncBaseURL: '/admin/api/translations',
    syncClientBasePath: '/admin/sync-client/sync-core',
  });
  screen.mount(root);
  await flushAsync();
  await flushAsync();

  const titleInput = root.querySelector('[data-field-input="title"]');
  titleInput.value = 'Guide conflit local';
  titleInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  root.querySelector('[data-action="save-draft"]').click();
  await flushAsync();
  await flushAsync();

  root.querySelector('[data-action="reload-server-state"]').click();
  await flushAsync();
  await flushAsync();

  const assignmentReads = requests.filter((request) => request.method === 'GET' && request.url.includes('/api/translations/assignments/asg-editor-1'));
  const syncReads = requests.filter((request) => request.method === 'GET' && request.url.includes('/sync/resources/translation_variant_draft/'));
  assert.equal(assignmentReads.length, 1);
  assert.equal(syncReads.length, 2);
  assert.equal(root.querySelector('[data-field-input="title"]').value, 'Guide rafraichi serveur');

  screen.unmount();
});

test('translation editor runtime: conflict reload does not fall back to assignment detail when sync refresh fails', async () => {
  const { root, window } = setupDom();
  installTranslationSyncCoreStub(window);
  const requests = [];
  let assignmentReadCount = 0;
  let syncReadCount = 0;

  globalThis.fetch = mock.fn(async (input, init = {}) => {
    const method = String(init.method || 'GET').toUpperCase();
    const url = String(input);
    requests.push({ url, method, init });
    if (method === 'GET' && url.includes('/api/translations/assignments/asg-editor-1')) {
      assignmentReadCount += 1;
      return createJsonResponse(makeSubmitReadyFixture());
    }
    if (method === 'GET' && url.includes('/admin/api/translations/sync/resources/translation_variant_draft/')) {
      syncReadCount += 1;
      if (syncReadCount > 1) {
        return createJsonResponse({ error: { message: 'sync refresh unavailable' } }, 503, {
          'content-type': 'application/json',
        });
      }
      return createJsonResponse({
        data: makeSubmitReadyFixture().data,
        revision: 3,
        updated_at: '2026-01-01T00:00:00Z',
      });
    }
    if (method === 'PATCH' && url.includes('/admin/api/translations/sync/resources/translation_variant_draft/')) {
      return createJsonResponse({
        error: {
          code: 'STALE_REVISION',
          message: 'stale translation variant draft',
          details: {
            current_revision: 4,
          },
        },
      }, 409);
    }
    return createJsonResponse({ error: { message: 'unexpected request' } }, 500, {
      'content-type': 'application/json',
    });
  });

  const screen = new TranslationEditorScreen({
    endpoint: '/admin/api/translations/assignments/asg-editor-1',
    actionEndpointBase: '/admin/api/translations/assignments',
    syncBaseURL: '/admin/api/translations',
    syncClientBasePath: '/admin/sync-client/sync-core',
  });
  screen.mount(root);
  await flushAsync();
  await flushAsync();

  const titleInput = root.querySelector('[data-field-input="title"]');
  titleInput.value = 'Guide conflit local';
  titleInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  root.querySelector('[data-action="save-draft"]').click();
  await flushAsync();
  await flushAsync();

  root.querySelector('[data-action="reload-server-state"]').click();
  for (let i = 0; i < 8; i += 1) {
    await flushAsync();
    const fallbackReads = requests.filter((request) => request.method === 'GET' && request.url.includes('/api/translations/assignments/asg-editor-1'));
    if (fallbackReads.length >= 2) break;
  }

  const syncReads = requests.filter((request) => request.method === 'GET' && request.url.includes('/sync/resources/translation_variant_draft/'));
  const assignmentReads = requests.filter((request) => request.method === 'GET' && request.url.includes('/api/translations/assignments/asg-editor-1'));
  assert.equal(syncReads.length, 2);
  assert.equal(assignmentReads.length, 1);
  assert.doesNotMatch(syncReads[1].url, /\/sync\/sync\/resources\//);
  assert.match(root.innerHTML, /Sync draft load did not return a usable draft snapshot|sync refresh unavailable/);

  screen.unmount();
});

test('translation editor runtime: separates review actions from management actions', () => {
  const nonReviewDetail = normalizeAssignmentEditorDetail(fixtures.detail);
  const nonReviewHTML = renderTranslationEditorState(
    { status: 'ready', detail: nonReviewDetail },
    createTranslationEditorState(nonReviewDetail)
  );

  assert.doesNotMatch(nonReviewHTML, /data-editor-panel="review-actions"/);
  assert.doesNotMatch(nonReviewHTML, /data-action="approve"/);
  assert.doesNotMatch(nonReviewHTML, /data-action="reject"/);
  assert.match(nonReviewHTML, /data-editor-panel="management-actions"/);
  assert.match(nonReviewHTML, /Management actions/);
  assert.match(nonReviewHTML, /data-action="archive"/);

  const reviewDetail = normalizeAssignmentEditorDetail(makeReviewReadyFixture());
  const reviewHTML = renderTranslationEditorState(
    { status: 'ready', detail: reviewDetail },
    createTranslationEditorState(reviewDetail)
  );

  assert.match(reviewHTML, /data-editor-panel="review-actions"/);
  assert.match(reviewHTML, /Review actions/);
  assert.match(reviewHTML, /data-action="approve"/);
  assert.match(reviewHTML, /data-action="reject"/);
  assert.match(reviewHTML, /Request changes/);
  assert.match(reviewHTML, /data-editor-panel="management-actions"/);
});

test('translation editor runtime: reject modal renders reviewer inputs', () => {
  const reviewDetail = normalizeAssignmentEditorDetail(makeReviewReadyFixture());
  const html = renderTranslationEditorState(
    { status: 'ready', detail: reviewDetail },
    createTranslationEditorState(reviewDetail),
    {},
    {
      rejectDraft: {
        reason: 'Please preserve the CTA token.',
        comment: 'Keep the glossary term consistent.',
      },
    }
  );

  assert.match(html, /data-reject-modal="true"/);
  assert.match(html, /Request changes/);
  assert.match(html, /Reject reason/);
  assert.match(html, /Reviewer note/);
});

test('translation editor runtime: submit guard blocks QA-blocked actions before transport', async () => {
  const { window } = setupDom();
  installTranslationSyncCoreStub(window);
  let fetchCalls = 0;
  globalThis.fetch = mock.fn(async (input, init = {}) => {
    fetchCalls += 1;
    const method = String(init.method || 'GET').toUpperCase();
    const url = String(input);
    if (method === 'GET' && url.includes('/api/translations/assignments/asg-editor-1')) {
      return createJsonResponse(fixtures.detail);
    }
    if (method === 'GET' && url.includes('/api/translations/sync/resources/translation_variant_draft/')) {
      return createJsonResponse({
        data: fixtures.detail.data,
        revision: 3,
        updated_at: '2026-01-01T00:00:00Z',
      });
    }
    return createJsonResponse({ error: { message: 'unexpected request' } }, 500, {
      'content-type': 'application/json',
    });
  });

  const screen = new TranslationEditorScreen({
    endpoint: '/admin/api/translations/assignments/asg-editor-1',
    actionEndpointBase: '/admin/api/translations/assignments',
  });
  const container = createContainer();
  screen.mount(container);
  await flushAsync();
  await flushAsync();

  await screen.submitForReview();

  assert.equal(fetchCalls, 2);
  assert.match(container.innerHTML, /Resolve QA blockers before submitting for review\./i);
  assert.match(container.innerHTML, /data-editor-feedback-kind="conflict"/);
});

test('translation editor runtime: successful submit reloads terminal action state', async () => {
  const { root, window } = setupDom();
  installTranslationSyncCoreStub(window);
  let detailReads = 0;
  globalThis.fetch = mock.fn(async (input, init = {}) => {
    const method = String(init.method || 'GET').toUpperCase();
    const url = String(input);
    if (method === 'GET' && url.includes('/api/translations/assignments/asg-editor-1')) {
      detailReads += 1;
      return createJsonResponse(detailReads === 1 ? makeSubmitReadyFixture() : makeApprovedAssignmentFixture());
    }
    if (method === 'GET' && url.includes('/api/translations/sync/resources/translation_variant_draft/')) {
      return createJsonResponse({
        data: makeSubmitReadyFixture().data,
        revision: 6,
        updated_at: '2026-01-01T00:00:00Z',
      });
    }
    if (method === 'POST' && url.includes('/actions/submit_review')) {
      return createJsonResponse({
        data: {
          status: 'approved',
        },
      });
    }
    return createJsonResponse({ error: { message: 'unexpected request' } }, 500, {
      'content-type': 'application/json',
    });
  });

  const screen = new TranslationEditorScreen({
    endpoint: '/admin/api/translations/assignments/asg-editor-1',
    actionEndpointBase: '/admin/api/translations/assignments',
  });
  screen.mount(root);
  await flushAsync();
  await flushAsync();

  root.querySelector('[data-action="submit-review"]').click();
  for (let i = 0; i < 8; i += 1) {
    await flushAsync();
    if (detailReads >= 2) break;
  }

  assert.equal(detailReads, 2);
  assert.match(root.innerHTML, /data-editor-read-only="true"/);
  assert.equal(root.querySelector('[data-action="submit-review"]'), null);
  assert.match(root.innerHTML, /status-chip status-chip--success/);
  assert.match(root.innerHTML, /Approved/);
  assert.equal(root.querySelector('[data-action="preview-assignment"]').disabled, false);

  screen.unmount();
});

test('translation editor runtime: resume work posts claim and reloads in-progress state', async () => {
  const { root, window } = setupDom();
  installTranslationSyncCoreStub(window);
  const requests = [];
  let detailReads = 0;
  globalThis.fetch = mock.fn(async (input, init = {}) => {
    const method = String(init.method || 'GET').toUpperCase();
    const url = String(input);
    requests.push({ url, method, init });
    if (method === 'GET' && url.includes('/api/translations/assignments/asg-editor-1')) {
      detailReads += 1;
      return createJsonResponse(detailReads === 1 ? makeChangesRequestedAssignmentFixture() : makeSubmitReadyFixture());
    }
    if (method === 'GET' && url.includes('/api/translations/sync/resources/translation_variant_draft/')) {
      return createJsonResponse({
        data: makeSubmitReadyFixture().data,
        revision: 7,
        updated_at: '2026-01-01T00:00:00Z',
      });
    }
    if (method === 'POST' && url.includes('/actions/claim')) {
      const body = JSON.parse(init.body);
      assert.equal(body.expected_version, 7);
      return createJsonResponse({
        data: {
          status: 'in_progress',
        },
      });
    }
    return createJsonResponse({ error: { message: 'unexpected request' } }, 500, {
      'content-type': 'application/json',
    });
  });

  const screen = new TranslationEditorScreen({
    endpoint: '/admin/api/translations/assignments/asg-editor-1?channel=staging&tenant_id=tenant-1&org_id=org-1',
    actionEndpointBase: '/admin/api/translations/assignments',
  });
  screen.mount(root);
  await flushAsync();
  await flushAsync();

  assert.equal(await waitForCondition(() => {
    const button = root.querySelector('[data-action="resume-work"]');
    return Boolean(button && !button.disabled);
  }), true);
  const resumeButton = root.querySelector('[data-action="resume-work"]');
  assert.ok(resumeButton);
  assert.equal(resumeButton.disabled, false);
  assert.equal(root.querySelector('[data-action="submit-review"]'), null);
  assert.match(root.innerHTML, /Changes Requested/);

  resumeButton.click();
  assert.equal(await waitForCondition(() => detailReads >= 2 && root.querySelector('[data-action="resume-work"]') === null), true);

  const claim = requests.find((request) => request.method === 'POST' && request.url.includes('/actions/claim'));
  assert.ok(claim);
  assert.match(claim.url, /[?&]channel=staging(?:&|$)/);
  assert.match(claim.url, /[?&]tenant_id=tenant-1(?:&|$)/);
  assert.match(claim.url, /[?&]org_id=org-1(?:&|$)/);
  assert.equal(detailReads, 2);
  assert.equal(root.querySelector('[data-action="resume-work"]'), null);
  assert.equal(root.querySelector('[data-action="submit-review"]').disabled, false);
  assert.match(root.innerHTML, /Submit review/);

  screen.unmount();
});

test('translation editor runtime: resume work saves dirty fields before claim', async () => {
  const { root, window } = setupDom();
  installTranslationSyncCoreStub(window);
  const requests = [];
  let detailReads = 0;
  globalThis.fetch = mock.fn(async (input, init = {}) => {
    const method = String(init.method || 'GET').toUpperCase();
    const url = String(input);
    requests.push({ url, method, init });
    if (method === 'GET' && url.includes('/api/translations/assignments/asg-editor-1')) {
      detailReads += 1;
      return createJsonResponse(detailReads === 1 ? makeChangesRequestedAssignmentFixture() : makeSubmitReadyFixture());
    }
    if (method === 'GET' && url.includes('/api/translations/sync/resources/translation_variant_draft/')) {
      return createJsonResponse({
        data: makeChangesRequestedAssignmentFixture().data,
        revision: 7,
        updated_at: '2026-01-01T00:00:00Z',
      });
    }
    if (method === 'PATCH' && url.includes('/api/translations/sync/resources/translation_variant_draft/')) {
      const body = JSON.parse(init.body);
      assert.equal(body.payload.autosave, false);
      assert.equal(body.payload.fields.title, 'Hola actualizado');
      return createJsonResponse({
        data: makeChangesRequestedAssignmentFixture().data,
        revision: 8,
        updated_at: '2026-01-01T00:00:01Z',
        applied: true,
        replay: false,
      });
    }
    if (method === 'POST' && url.includes('/actions/claim')) {
      return createJsonResponse({
        data: {
          status: 'in_progress',
        },
      });
    }
    return createJsonResponse({ error: { message: 'unexpected request' } }, 500, {
      'content-type': 'application/json',
    });
  });

  const screen = new TranslationEditorScreen({
    endpoint: '/admin/api/translations/assignments/asg-editor-1?channel=staging',
    actionEndpointBase: '/admin/api/translations/assignments',
    syncBaseURL: '/admin/api/translations',
  });
  screen.mount(root);
  assert.equal(await waitForCondition(() => {
    const button = root.querySelector('[data-action="resume-work"]');
    return Boolean(button && !button.disabled);
  }), true);

  const titleInput = root.querySelector('[data-field-input="title"]');
  titleInput.value = 'Hola actualizado';
  titleInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  root.querySelector('[data-action="resume-work"]').click();

  assert.equal(await waitForCondition(() => detailReads >= 2 && root.querySelector('[data-action="resume-work"]') === null), true);
  const patch = requests.find((request) => request.method === 'PATCH');
  const claim = requests.find((request) => request.method === 'POST' && request.url.includes('/actions/claim'));
  assert.ok(patch);
  assert.ok(claim);
  assert.ok(requests.indexOf(patch) < requests.indexOf(claim));

  screen.unmount();
});

test('translation editor runtime: stale resume work response reloads assignment state', async () => {
  const { root, window } = setupDom();
  installTranslationSyncCoreStub(window);
  let detailReads = 0;
  globalThis.fetch = mock.fn(async (input, init = {}) => {
    const method = String(init.method || 'GET').toUpperCase();
    const url = String(input);
    if (method === 'GET' && url.includes('/api/translations/assignments/asg-editor-1')) {
      detailReads += 1;
      return createJsonResponse(detailReads === 1 ? makeChangesRequestedAssignmentFixture() : makeSubmitReadyFixture());
    }
    if (method === 'GET' && url.includes('/api/translations/sync/resources/translation_variant_draft/')) {
      return createJsonResponse({
        data: makeSubmitReadyFixture().data,
        revision: 7,
        updated_at: '2026-01-01T00:00:00Z',
      });
    }
    if (method === 'POST' && url.includes('/actions/claim')) {
      return createJsonResponse({
        error: {
          code: 'INVALID_STATUS',
          message: 'assignment is already in progress',
        },
      }, 409, {
        'content-type': 'application/json',
      });
    }
    return createJsonResponse({ error: { message: 'unexpected request' } }, 500, {
      'content-type': 'application/json',
    });
  });

  const screen = new TranslationEditorScreen({
    endpoint: '/admin/api/translations/assignments/asg-editor-1?channel=staging',
    actionEndpointBase: '/admin/api/translations/assignments',
  });
  screen.mount(root);
  assert.equal(await waitForCondition(() => {
    const button = root.querySelector('[data-action="resume-work"]');
    return Boolean(button && !button.disabled);
  }), true);

  root.querySelector('[data-action="resume-work"]').click();
  assert.equal(await waitForCondition(() => detailReads >= 2 && root.querySelector('[data-action="resume-work"]') === null), true);
  assert.equal(root.querySelector('[data-action="submit-review"]').disabled, false);

  screen.unmount();
});

test('translation editor runtime: stale submit status reloads approved read-only state', async () => {
  const { root, window } = setupDom();
  installTranslationSyncCoreStub(window);
  const requests = [];
  let detailReads = 0;
  globalThis.fetch = mock.fn(async (input, init = {}) => {
    const method = String(init.method || 'GET').toUpperCase();
    const url = String(input);
    requests.push({ url, method, init });
    if (method === 'GET' && url.includes('/api/translations/assignments/asg-editor-1')) {
      detailReads += 1;
      return createJsonResponse(detailReads === 1 ? makeSubmitReadyFixture() : makeApprovedAssignmentFixture());
    }
    if (method === 'GET' && url.includes('/api/translations/sync/resources/translation_variant_draft/')) {
      return createJsonResponse({
        data: makeSubmitReadyFixture().data,
        revision: 6,
        updated_at: '2026-01-01T00:00:00Z',
      });
    }
    if (method === 'POST' && url.includes('/actions/submit_review')) {
      return createJsonResponse({
        error: {
          text_code: 'INVALID_STATUS_TRANSITION',
          message: 'assignment must be in progress before it can be submitted',
          metadata: {
            status: 'approved',
          },
        },
      }, 409, {
        'content-type': 'application/json',
      });
    }
    return createJsonResponse({ error: { message: 'unexpected request' } }, 500, {
      'content-type': 'application/json',
    });
  });

  const screen = new TranslationEditorScreen({
    endpoint: '/admin/api/translations/assignments/asg-editor-1',
    actionEndpointBase: '/admin/api/translations/assignments',
  });
  screen.mount(root);
  await flushAsync();
  await flushAsync();

  root.querySelector('[data-action="submit-review"]').click();
  for (let i = 0; i < 8; i += 1) {
    await flushAsync();
    if (detailReads >= 2) break;
  }

  assert.equal(detailReads, 2);
  assert.ok(requests.some((request) => request.method === 'POST' && request.url.includes('/actions/submit_review')));
  assert.match(root.innerHTML, /assignment must be in progress before it can be submitted/);
  assert.match(root.innerHTML, /data-editor-read-only="true"/);
  assert.equal(root.querySelector('[data-action="submit-review"]'), null);
  assert.match(root.innerHTML, /status-chip status-chip--success/);
  assert.equal(root.querySelector('[data-action="preview-assignment"]').disabled, false);

  screen.unmount();
});

test('translation editor runtime: fetch detail maps conflict diagnostics', async () => {
  globalThis.fetch = mock.fn(async () => ({
    ok: false,
    status: 409,
    headers: {
      get(name) {
        const key = String(name).toLowerCase();
        if (key === 'content-type') return 'application/json';
        if (key === 'x-request-id') return 'req-editor-conflict';
        if (key === 'x-trace-id') return 'trace-editor-conflict';
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
          message: 'stale assignment detail',
        },
      });
    },
  }));

  const state = await fetchTranslationEditorDetailState('/admin/api/translations/assignments/asg-editor-1');
  assert.equal(state.status, 'conflict');
  assert.equal(state.requestId, 'req-editor-conflict');
  assert.equal(state.traceId, 'trace-editor-conflict');
  assert.equal(state.errorCode, 'VERSION_CONFLICT');
});
