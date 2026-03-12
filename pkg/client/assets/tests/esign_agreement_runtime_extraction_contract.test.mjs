import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const runtimePath = path.resolve(testFileDir, '../src/esign/pages/agreement-form-runtime.ts');
const pageControllerPath = path.resolve(testFileDir, '../src/esign/pages/agreement-form.ts');
const bootPath = path.resolve(testFileDir, '../src/esign/pages/agreement-form/boot.ts');
const boundariesPath = path.resolve(testFileDir, '../src/esign/pages/agreement-form/EXTRACTION_BOUNDARIES.md');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('runtime extraction contract: agreement runtime boots through extracted refs, state, sync, and lifecycle modules', () => {
  const source = read(runtimePath);

  assert.match(source, /from '\.\/agreement-form\/composition'/);
  assert.match(source, /createAgreementFormRuntimeCoordinator\(inputConfig\)/);
  assert.match(source, /runtime\.start\(\)/);
});

test('runtime extraction contract: page controller destroy delegates to runtime teardown', () => {
  const source = read(pageControllerPath);
  assert.match(source, /destroyAgreementFormRuntime/);
  assert.match(source, /destroy\(\): void {\s*destroyAgreementFormRuntime\(\);/);
});

test('runtime extraction contract: extracted boot runtime starts sync side effects explicitly', () => {
  const source = read(bootPath);
  assert.match(source, /context\.syncController\.start\(\)/);
  assert.match(source, /context\.syncController\.destroy\(\)/);
});

test('runtime extraction contract: extracted composition module owns controller assembly', () => {
  const source = read(path.resolve(testFileDir, '../src/esign/pages/agreement-form/composition.ts'));
  assert.match(source, /from '\.\/boot'/);
  assert.match(source, /from '\.\/refs'/);
  assert.match(source, /from '\.\/state-manager'/);
  assert.match(source, /from '\.\/draft-sync-service'/);
  assert.match(source, /from '\.\/active-tab-controller'/);
  assert.match(source, /from '\.\/sync-controller'/);
  assert.match(source, /from '\.\/document-selection'/);
  assert.match(source, /from '\.\/telemetry'/);
  assert.match(source, /from '\.\/participants'/);
  assert.match(source, /from '\.\/field-definitions'/);
  assert.match(source, /from '\.\/placement-editor'/);
  assert.match(source, /from '\.\/form-payload'/);
  assert.match(source, /from '\.\/state-binding'/);
  assert.match(source, /from '\.\/wizard-validation'/);
  assert.match(source, /from '\.\/resume-flow'/);
  assert.match(source, /from '\.\/feedback'/);
  assert.match(source, /from '\.\/runtime-actions'/);
  assert.match(source, /from '\.\/wizard-navigation'/);
  assert.match(source, /from '\.\/send-readiness'/);
  assert.match(source, /from '\.\/form-submit'/);
  assert.match(source, /const agreementRefs = collectAgreementFormRefs\(document\)/);
  assert.match(source, /const agreementRuntime = bootAgreementFormRuntime\(/);
  assert.match(source, /return agreementRuntime;/);
});

test('runtime extraction contract: agreement-form extraction boundaries are documented', () => {
  const source = read(boundariesPath);
  assert.match(source, /Agreement Form Runtime Internal Boundaries/);
  assert.match(source, /Boot Phase Order/);
  assert.match(source, /Current Extraction Scope/);
});

test('runtime extraction contract: typed helper modules do not use ts-nocheck', () => {
  const helperModules = [
    '../src/esign/pages/agreement-form/bootstrap-config.ts',
    '../src/esign/pages/agreement-form/telemetry.ts',
    '../src/esign/pages/agreement-form/runtime-actions.ts',
    '../src/esign/pages/agreement-form/form-payload.ts',
    '../src/esign/pages/agreement-form/feedback.ts',
    '../src/esign/pages/agreement-form/state-binding.ts',
    '../src/esign/pages/agreement-form/resume-flow.ts',
  ];

  for (const relativePath of helperModules) {
    const source = read(path.resolve(testFileDir, relativePath));
    assert.doesNotMatch(source, /@ts-nocheck/);
  }
});

test('runtime extraction contract: smaller DOM controllers do not use ts-nocheck', () => {
  const controllerModules = [
    '../src/esign/pages/agreement-form/wizard-navigation.ts',
    '../src/esign/pages/agreement-form/wizard-validation.ts',
    '../src/esign/pages/agreement-form/send-readiness.ts',
    '../src/esign/pages/agreement-form/participants.ts',
    '../src/esign/pages/agreement-form/document-selection.ts',
    '../src/esign/pages/agreement-form/field-definitions.ts',
    '../src/esign/pages/agreement-form/placement-editor.ts',
  ];

  for (const relativePath of controllerModules) {
    const source = read(path.resolve(testFileDir, relativePath));
    assert.doesNotMatch(source, /@ts-nocheck/);
  }
});
