import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd());
const runtimePath = path.join(
  repoRoot,
  'pkg/client/assets/src/esign/pages/agreement-form-runtime.ts'
);
const bootstrapConfigPath = path.join(
  repoRoot,
  'pkg/client/assets/src/esign/pages/agreement-form/bootstrap-config.ts'
);
const stateManagerPath = path.join(
  repoRoot,
  'pkg/client/assets/src/esign/pages/agreement-form/state-manager.ts'
);
const documentSelectionPath = path.join(
  repoRoot,
  'pkg/client/assets/src/esign/pages/agreement-form/document-selection.ts'
);
const formSubmitPath = path.join(
  repoRoot,
  'pkg/client/assets/src/esign/pages/agreement-form/form-submit.ts'
);
const templatePath = path.join(
  repoRoot,
  'pkg/client/templates/resources/esign-agreements/form.html'
);
const resumeFlowPath = path.join(
  repoRoot,
  'pkg/client/assets/src/esign/pages/agreement-form/resume-flow.ts'
);
const stateBindingPath = path.join(
  repoRoot,
  'pkg/client/assets/src/esign/pages/agreement-form/state-binding.ts'
);
const compositionPath = path.join(
  repoRoot,
  'pkg/client/assets/src/esign/pages/agreement-form/composition.ts'
);

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('resume modal template includes explicit proceed action', () => {
  const html = read(templatePath);
  assert.match(html, /id="resume-proceed-btn"/);
  assert.match(html, /This agreement is OK, proceed/);
});

test('wizard runtime scopes storage and channel keys by server-authored storage scope, mode, and route', () => {
  const source = read(bootstrapConfigPath);
  assert.match(source, /storageScopeToken = String\(config\.sync\?\.storage_scope \|\| ''\)\.trim\(\) \|\| 'anonymous'/);
  assert.match(source, /wizardModeToken = isEditMode \? 'edit' : 'create'/);
  assert.match(source, /wizardScopeToken = \[/);
  assert.match(source, /WIZARD_STORAGE_KEY:\s*`esign_wizard_state_v2:\$\{encodeURIComponent\(wizardScopeToken\)\}`/);
  assert.match(source, /WIZARD_CHANNEL_NAME:\s*`esign_wizard_sync:\$\{encodeURIComponent\(wizardScopeToken\)\}`/);
});

test('sync request helpers rely on authenticated transport context instead of user_id request hints', () => {
  const source = read(bootstrapConfigPath);
  assert.match(source, /export function createSyncRequestHeaders\(includeContentType = true\): Record<string, string>/);
  assert.doesNotMatch(source, /user_id=/);
  assert.doesNotMatch(source, /X-User-ID/);
});

test('resume check uses meaningful wizard progress helper', () => {
  const bootstrapSource = read(bootstrapConfigPath);
  const stateManagerSource = read(stateManagerPath);
  assert.match(bootstrapSource, /export function hasMeaningfulWizardProgress\(/);
  assert.match(stateManagerSource, /hasResumableState\(\): boolean \{\s*return this\.options\.hasMeaningfulWizardProgress\(this\.getState\(\)\);/s);
  assert.doesNotMatch(bootstrapSource, /participantCount > 0/);
});

test('resume actions route through shared stale-state cleanup helper', () => {
  const source = read(resumeFlowPath);
  assert.match(source, /async function clearSavedResumeState\(options: \{ deleteServerDraft\?: boolean \} = \{\}\)/);
  assert.match(source, /async function handleResumeAction\(action: ResumeAction\): Promise<void>/);
  assert.match(source, /case 'start_new':[\s\S]*clearSavedResumeState\(\{ deleteServerDraft: false \}\)/);
  assert.match(source, /case 'proceed':[\s\S]*clearSavedResumeState\(\{ deleteServerDraft: true \}\)/);
  assert.match(source, /case 'discard':[\s\S]*clearSavedResumeState\(\{ deleteServerDraft: true \}\)/);
  assert.match(source, /resume-proceed-btn[\s\S]*handleResumeAction\('proceed'\)/);
});

test('resume runtime uses explicit rehydration callbacks instead of boot-time window flags', () => {
  const resumeSource = read(resumeFlowPath);
  const stateBindingSource = read(stateBindingPath);
  const compositionSource = read(compositionPath);

  assert.match(resumeSource, /applyResumedState\(stateManager\.getState\(\)\)/);
  assert.doesNotMatch(resumeSource, /_resumeToStep/);
  assert.match(stateBindingSource, /applyStateToUI\(/);
  assert.doesNotMatch(stateBindingSource, /_resumeToStep/);
  assert.match(compositionSource, /applyRehydratedState/);
  assert.match(compositionSource, /applyStateToUI: \(nextState\) => applyRehydratedState/);
});

test('wizard state manager no longer carries legacy storage migration bridges', () => {
  const bootstrapSource = read(bootstrapConfigPath);
  const stateManagerSource = read(stateManagerPath);
  assert.doesNotMatch(bootstrapSource, /LEGACY_WIZARD_STORAGE_KEY/);
  assert.doesNotMatch(bootstrapSource, /WIZARD_STORAGE_MIGRATION_VERSION/);
  assert.doesNotMatch(stateManagerSource, /migrateLegacyStateIfNeeded\(\)/);
  assert.doesNotMatch(stateManagerSource, /storageMigrationVersion/);
  assert.doesNotMatch(stateManagerSource, /legacyStorageKey/);
});

test('create flow title provenance prevents stale server seed from locking title', () => {
  const bootstrapSource = read(bootstrapConfigPath);
  const documentSelectionSource = read(documentSelectionPath);
  assert.match(bootstrapSource, /AGREEMENT_TITLE_SOURCE = \{/);
  assert.match(documentSelectionSource, /setTitleSource\(titleSource\.SERVER_SEED, \{ syncPending: false \}\)/);
  assert.match(documentSelectionSource, /normalizeTitleSource\(/);
});

test('send flow performs pre-send handshake and stale draft recovery', () => {
  const source = read(formSubmitPath);
  assert.match(source, /async function ensureDraftReadyForSend\(\)/);
  assert.match(source, /DRAFT_SEND_NOT_FOUND/);
  assert.match(source, /resyncAfterSendNotFound/);
  assert.match(source, /wizard_send_not_found/);
  assert.match(source, /wizard_send_conflict/);
  assert.doesNotMatch(source, /wizard_send_stale_draft_recovered/);
});
