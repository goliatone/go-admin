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
  TranslationEditorScreen,
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
  };
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

function makeAutosaveConflictFixture() {
  return {
    error: {
      text_code: 'VERSION_CONFLICT',
      message: 'translation variant version conflict',
      metadata: {
        actual_version: 3,
        latest_server_state_record: {
          row_version: 3,
          fields: {
            title: 'Guide de publication serveur',
          },
        },
      },
    },
  };
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

test('translation editor runtime: field inputs keep the natural document tab order', async () => {
  const { root } = setupDom();
  globalThis.fetch = mock.fn(async () => createJsonResponse(fixtures.detail));

  const screen = new TranslationEditorScreen({
    endpoint: '/admin/api/translations/assignments/asg-editor-1',
    variantEndpointBase: '/admin/api/translations/variants',
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
  assert.doesNotMatch(html, /data-editor-panel="review-actions"/);
  assert.match(html, /data-editor-panel="management-actions"/);

  const assistUnavailable = normalizeAssignmentEditorDetail(makeAssistUnavailableFixture());
  const unavailableHTML = renderTranslationEditorState({ status: 'ready', detail: assistUnavailable });
  assert.match(unavailableHTML, /Glossary matches unavailable/i);
  assert.match(unavailableHTML, /Style-guide guidance is unavailable/i);
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
  let fetchCalls = 0;
  globalThis.fetch = mock.fn(async (input, init = {}) => {
    fetchCalls += 1;
    const method = String(init.method || 'GET').toUpperCase();
    const url = String(input);
    if (method === 'GET' && url.includes('/api/translations/assignments/asg-editor-1')) {
      return createJsonResponse(fixtures.detail);
    }
    return createJsonResponse({ error: { message: 'unexpected request' } }, 500, {
      'content-type': 'application/json',
    });
  });

  const screen = new TranslationEditorScreen({
    endpoint: '/admin/api/translations/assignments/asg-editor-1',
    variantEndpointBase: '/admin/api/translations/variants',
    actionEndpointBase: '/admin/api/translations/assignments',
  });
  const container = createContainer();
  screen.mount(container);
  await flushAsync();
  await flushAsync();

  await screen.submitForReview();

  assert.equal(fetchCalls, 1);
  assert.match(container.innerHTML, /Resolve QA blockers before submitting for review\./i);
  assert.match(container.innerHTML, /data-editor-feedback-kind="conflict"/);
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
