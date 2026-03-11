import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd());
const runtimePath = path.join(
  repoRoot,
  'pkg/client/assets/src/esign/pages/agreement-form-runtime.ts'
);
const templatePath = path.join(
  repoRoot,
  'pkg/client/templates/resources/esign-agreements/form.html'
);

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('resume modal template includes explicit proceed action', () => {
  const html = read(templatePath);
  assert.match(html, /id="resume-proceed-btn"/);
  assert.match(html, /This agreement is OK, proceed/);
});

test('wizard runtime scopes storage and channel keys by mode/user/route', () => {
  const source = read(runtimePath);
  assert.match(source, /wizardModeToken = isEditMode \? 'edit' : 'create'/);
  assert.match(source, /wizardScopeToken = \[/);
  assert.match(source, /WIZARD_STORAGE_KEY = `esign_wizard_state_v1:\$\{encodeURIComponent\(wizardScopeToken\)\}`/);
  assert.match(source, /WIZARD_CHANNEL_NAME = `esign_wizard_sync:\$\{encodeURIComponent\(wizardScopeToken\)\}`/);
});

test('resume check uses meaningful wizard progress helper', () => {
  const source = read(runtimePath);
  assert.match(source, /function hasMeaningfulWizardProgress\(state\)/);
  assert.match(source, /hasResumableState\(\)\s*\{\s*return hasMeaningfulWizardProgress\(this\.state\);/s);
  assert.doesNotMatch(source, /participantCount > 0/);
});

test('resume actions route through shared stale-state cleanup helper', () => {
  const source = read(runtimePath);
  assert.match(source, /async function clearSavedResumeState\(options = \{\}\)/);
  assert.match(source, /async function handleResumeAction\(action\)/);
  assert.match(source, /case 'start_new':[\s\S]*clearSavedResumeState\(\{ deleteServerDraft: false \}\)/);
  assert.match(source, /case 'proceed':[\s\S]*clearSavedResumeState\(\{ deleteServerDraft: true \}\)/);
  assert.match(source, /case 'discard':[\s\S]*clearSavedResumeState\(\{ deleteServerDraft: true \}\)/);
  assert.match(source, /resume-proceed-btn[\s\S]*handleResumeAction\('proceed'\)/);
});

test('legacy key migration writes scoped state and removes old key once', () => {
  const source = read(runtimePath);
  assert.match(source, /LEGACY_WIZARD_STORAGE_KEY = 'esign_wizard_state_v1'/);
  assert.match(source, /migrateLegacyStateIfNeeded\(\)/);
  assert.match(source, /storageMigrationVersion:\s*WIZARD_STORAGE_MIGRATION_VERSION/);
  assert.match(source, /sessionStorage\.removeItem\(LEGACY_WIZARD_STORAGE_KEY\)/);
  assert.match(source, /wizard_resume_migration_used/);
});

test('create flow title provenance prevents stale server seed from locking title', () => {
  const source = read(runtimePath);
  assert.match(source, /TITLE_SOURCE = \{/);
  assert.match(source, /setTitleSource\(TITLE_SOURCE\.SERVER_SEED, \{ syncPending: false \}\)/);
  assert.match(source, /if \(currentTitle && titleSource === TITLE_SOURCE\.USER\) \{/);
  assert.match(source, /titleInput\?\.addEventListener\('input', \(\) => \{/);
  assert.match(source, /TITLE_SOURCE\.USER/);
});

test('send flow performs pre-send handshake and stale draft recovery', () => {
  const source = read(runtimePath);
  assert.match(source, /async function ensureDraftReadyForSend\(\)/);
  assert.match(source, /wizard_send_stale_draft_recovered/);
  assert.match(source, /DRAFT_SEND_NOT_FOUND/);
  assert.match(source, /resyncAfterSendNotFound/);
  assert.match(source, /wizard_send_not_found/);
});
