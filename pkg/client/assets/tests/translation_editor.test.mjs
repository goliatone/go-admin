import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

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
} = await import('../dist/translation-editor/index.js');

test('translation editor contracts: normalize detail fixture with assist and action envelopes', () => {
  const detail = normalizeAssignmentEditorDetail(fixtures.detail);

  assert.equal(detail.assignment_id, 'asg-editor-1');
  assert.equal(detail.assignment_row_version, 2);
  assert.equal(detail.variant_id, 'variant-page-1-fr');
  assert.equal(detail.assignment_action_states.submit_review.enabled, true);
  assert.equal(detail.review_action_states.approve.enabled, false);
  assert.equal(detail.assist.glossary_matches.length, 1);
  assert.equal(detail.assist.style_guide_summary.available, true);
  assert.equal(detail.field_drift.title.changed, true);
  assert.equal(detail.history.total, 3);
  assert.equal(detail.attachments.length, 2);
  assert.equal(detail.translation_assignment.version, 2);
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
  const detail = normalizeAssignmentEditorDetail(fixtures.detail);
  const initial = createTranslationEditorState(detail);

  assert.equal(initial.can_submit_review, true);
  assert.equal(initial.assignment_row_version, 2);

  const dirty = applyEditorFieldChange(initial, 'body', '');
  assert.equal(dirty.dirty_fields.body, '');
  assert.equal(dirty.detail.field_completeness.body.missing, true);
  assert.equal(dirty.can_submit_review, false);

  const pending = markEditorAutosavePending(dirty);
  assert.equal(pending.autosave.pending, true);

  const conflicted = applyEditorAutosaveConflict(pending, fixtures.autosave_conflict);
  assert.equal(conflicted.autosave.pending, false);
  assert.equal(conflicted.autosave.conflict.row_version, 3);

  const synced = applyEditorUpdateResponse(conflicted, fixtures.variant_update);
  assert.equal(synced.row_version, 4);
  assert.equal(synced.assignment_row_version, 2);
  assert.deepEqual(synced.dirty_fields, {});
  assert.equal(synced.detail.target_fields.title, 'Guide de publication');
  assert.equal(synced.can_submit_review, true);
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
  assert.match(html, /Review feedback/i);
  assert.match(html, /FR Pages Style Guide/i);
  assert.match(html, /Request req-editor/);

  const assistUnavailable = normalizeAssignmentEditorDetail(fixtures.assist_unavailable);
  const unavailableHTML = renderTranslationEditorState({ status: 'ready', detail: assistUnavailable });
  assert.match(unavailableHTML, /Glossary matches unavailable/i);
  assert.match(unavailableHTML, /Style-guide guidance is unavailable/i);
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
