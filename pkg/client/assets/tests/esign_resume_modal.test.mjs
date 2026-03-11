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
  assert.match(source, /resume-proceed-btn[\s\S]*clearSavedResumeState\(\{ deleteServerDraft: true \}\)/);
  assert.match(source, /resume-new-btn[\s\S]*clearSavedResumeState\(\{ deleteServerDraft: false \}\)/);
  assert.match(source, /resume-discard-btn[\s\S]*clearSavedResumeState\(\{ deleteServerDraft: true \}\)/);
});
