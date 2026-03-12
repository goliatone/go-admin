import test from 'node:test';
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
} = await import('../dist/translation-editor/index.js');

test('translation editor contracts: normalize detail fixture with assist and action envelopes', () => {
  const detail = normalizeAssignmentEditorDetail(fixtures.detail);

  assert.equal(detail.assignment_id, 'asg-editor-1');
  assert.equal(detail.variant_id, 'variant-page-1-fr');
  assert.equal(detail.assignment_action_states.submit_review.enabled, true);
  assert.equal(detail.review_action_states.approve.enabled, false);
  assert.equal(detail.assist.glossary_matches.length, 1);
  assert.equal(detail.assist.style_guide_summary.available, true);
  assert.equal(detail.field_drift.title.changed, true);
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
  assert.deepEqual(synced.dirty_fields, {});
  assert.equal(synced.detail.target_fields.title, 'Guide de publication');
  assert.equal(synced.can_submit_review, true);
});
