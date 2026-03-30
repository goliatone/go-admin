import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const jsonParse = await import('../dist/shared/json-parse.js');

const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const menuBuilderEditorSourcePath = path.resolve(testFileDir, '../src/menu-builder/editor.ts');
const translationFamilySourcePath = path.resolve(testFileDir, '../src/translation-family/index.ts');
const sourceManagementRuntimeSourcePath = path.resolve(testFileDir, '../src/esign/source-management-runtime.ts');
const agreementFormSourcePath = path.resolve(testFileDir, '../src/esign/pages/agreement-form.ts');
const documentFormSourcePath = path.resolve(testFileDir, '../src/esign/pages/document-form.ts');
const googleIntegrationSourcePath = path.resolve(testFileDir, '../src/esign/pages/google-integration.ts');
const landingSourcePath = path.resolve(testFileDir, '../src/esign/pages/landing.ts');
const agreementDetailSourcePath = path.resolve(testFileDir, '../src/esign/pages/agreement-detail.ts');
const esignDomHelpersSourcePath = path.resolve(testFileDir, '../src/esign/utils/dom-helpers.ts');
const timelineControllerSourcePath = path.resolve(testFileDir, '../src/esign/timeline/timeline-controller.ts');
const googleCallbackSourcePath = path.resolve(testFileDir, '../src/esign/pages/google-callback.ts');
const integrationMappingsSourcePath = path.resolve(testFileDir, '../src/esign/pages/integration-mappings.ts');
const signerReviewSourcePath = path.resolve(testFileDir, '../src/esign/pages/signer-review.ts');
const integrationConflictsSourcePath = path.resolve(testFileDir, '../src/esign/pages/integration-conflicts.ts');
const agreementFormStateManagerSourcePath = path.resolve(testFileDir, '../src/esign/pages/agreement-form/state-manager.ts');
const placementEditorSourcePath = path.resolve(testFileDir, '../src/esign/pages/agreement-form/placement-editor.ts');
const contentTypeBuilderIndexSourcePath = path.resolve(testFileDir, '../src/content-type-builder/index.ts');
const contentTypeEditorSourcePath = path.resolve(testFileDir, '../src/content-type-builder/content-type-editor.ts');
const blockEditorPanelSourcePath = path.resolve(testFileDir, '../src/content-type-builder/block-editor-panel.ts');
const blockLibraryIdeSourcePath = path.resolve(testFileDir, '../src/content-type-builder/block-library-ide.ts');
const fieldConfigFormSourcePath = path.resolve(testFileDir, '../src/content-type-builder/field-config-form.ts');

test('shared json parser preserves fallback and script bootstrap behavior', () => {
  assert.deepEqual(jsonParse.parseJSONValue('{"enabled":true}', {}), { enabled: true });
  assert.deepEqual(jsonParse.parseJSONValue('   ', { fallback: true }), { fallback: true });
  assert.equal(jsonParse.parseJSONValue('null', 'fallback'), null);

  let handledError = null;
  assert.deepEqual(
    jsonParse.parseJSONValue('{bad json}', { fallback: true }, {
      onError: (error) => {
        handledError = error;
      },
    }),
    { fallback: true }
  );
  assert.ok(handledError instanceof Error);

  const root = {
    getElementById(id) {
      if (id === 'config') {
        return { textContent: ' {"page":"runtime"} ' };
      }
      if (id === 'broken') {
        return { textContent: '{bad json}' };
      }
      return null;
    },
  };

  assert.deepEqual(jsonParse.readJSONScriptValue('config', null, { root }), { page: 'runtime' });
  assert.equal(jsonParse.readJSONScriptValue('missing', null, { root }), null);
  assert.deepEqual(jsonParse.readJSONScriptValue('broken', { safe: true }, { root }), { safe: true });

  const selectorRoot = {
    querySelector(selector) {
      if (selector === '#config') {
        return { textContent: ' {"page":"selector"} ' };
      }
      if (selector === '#broken') {
        return { textContent: '{bad json}' };
      }
      return null;
    },
  };

  assert.deepEqual(jsonParse.readJSONSelectorValue('#config', null, { root: selectorRoot }), {
    page: 'selector',
  });
  assert.equal(jsonParse.readJSONSelectorValue('#missing', null, { root: selectorRoot }), null);
  assert.deepEqual(
    jsonParse.readJSONSelectorValue('#broken', { safe: true }, { root: selectorRoot }),
    { safe: true }
  );
});

test('json/bootstrap callers now route through shared json-parse helper', () => {
  const menuBuilderEditorSource = readFileSync(menuBuilderEditorSourcePath, 'utf8');
  const translationFamilySource = readFileSync(translationFamilySourcePath, 'utf8');
  const sourceManagementRuntimeSource = readFileSync(sourceManagementRuntimeSourcePath, 'utf8');
  const agreementFormSource = readFileSync(agreementFormSourcePath, 'utf8');
  const documentFormSource = readFileSync(documentFormSourcePath, 'utf8');
  const googleIntegrationSource = readFileSync(googleIntegrationSourcePath, 'utf8');
  const landingSource = readFileSync(landingSourcePath, 'utf8');
  const agreementDetailSource = readFileSync(agreementDetailSourcePath, 'utf8');
  const esignDomHelpersSource = readFileSync(esignDomHelpersSourcePath, 'utf8');
  const timelineControllerSource = readFileSync(timelineControllerSourcePath, 'utf8');
  const googleCallbackSource = readFileSync(googleCallbackSourcePath, 'utf8');
  const integrationMappingsSource = readFileSync(integrationMappingsSourcePath, 'utf8');
  const signerReviewSource = readFileSync(signerReviewSourcePath, 'utf8');
  const integrationConflictsSource = readFileSync(integrationConflictsSourcePath, 'utf8');
  const agreementFormStateManagerSource = readFileSync(agreementFormStateManagerSourcePath, 'utf8');
  const placementEditorSource = readFileSync(placementEditorSourcePath, 'utf8');
  const contentTypeBuilderIndexSource = readFileSync(contentTypeBuilderIndexSourcePath, 'utf8');
  const contentTypeEditorSource = readFileSync(contentTypeEditorSourcePath, 'utf8');
  const blockEditorPanelSource = readFileSync(blockEditorPanelSourcePath, 'utf8');
  const blockLibraryIdeSource = readFileSync(blockLibraryIdeSourcePath, 'utf8');
  const fieldConfigFormSource = readFileSync(fieldConfigFormSourcePath, 'utf8');

  assert.match(menuBuilderEditorSource, /from '\.\.\/shared\/json-parse\.js'/);
  assert.ok(!menuBuilderEditorSource.includes('function parseJSONData('));

  assert.match(translationFamilySource, /from '\.\.\/shared\/json-parse\.js'/);
  assert.ok(!translationFamilySource.includes('function parseJSONAttribute('));

  assert.match(sourceManagementRuntimeSource, /from '\.\.\/shared\/json-parse\.js'/);
  assert.ok(!sourceManagementRuntimeSource.includes('function parseJSONScript('));

  assert.match(agreementFormSource, /getPageConfigFromScript/);
  assert.ok(!agreementFormSource.includes('JSON.parse('));

  assert.match(documentFormSource, /getPageConfigFromScript/);
  assert.ok(!documentFormSource.includes('JSON.parse('));

  assert.match(googleIntegrationSource, /getPageConfigFromScript/);
  assert.ok(!googleIntegrationSource.includes('JSON.parse('));

  assert.match(landingSource, /getPageConfig<Record<string, unknown>>/);
  assert.ok(!landingSource.includes('JSON.parse('));

  assert.match(agreementDetailSource, /getJSONScriptConfig/);
  assert.ok(!agreementDetailSource.includes('JSON.parse('));

  assert.match(esignDomHelpersSource, /from '\.\.\/\.\.\/shared\/json-parse\.js'/);
  assert.match(esignDomHelpersSource, /readJSONSelectorValue/);

  assert.match(timelineControllerSource, /from '\.\.\/\.\.\/shared\/json-parse\.js'/);
  assert.match(timelineControllerSource, /readJSONScriptValue/);
  assert.match(timelineControllerSource, /readJSONSelectorValue/);
  assert.ok(!timelineControllerSource.includes('JSON.parse('));

  assert.match(googleCallbackSource, /from '\.\.\/\.\.\/shared\/json-parse\.js'/);
  assert.match(googleCallbackSource, /parseJSONValue/);
  assert.ok(!googleCallbackSource.includes('JSON.parse('));

  assert.match(integrationMappingsSource, /from '\.\.\/\.\.\/shared\/json-parse\.js'/);
  assert.match(integrationMappingsSource, /parseJSONValue/);
  assert.ok(!integrationMappingsSource.includes('JSON.parse('));

  assert.match(signerReviewSource, /from '\.\.\/\.\.\/shared\/json-parse\.js'/);
  assert.match(signerReviewSource, /readJSONScriptValue/);
  assert.match(signerReviewSource, /parseJSONValue/);
  assert.ok(!signerReviewSource.includes('JSON.parse('));

  assert.match(integrationConflictsSource, /from '\.\.\/\.\.\/shared\/json-parse\.js'/);
  assert.match(integrationConflictsSource, /parseJSONValue/);
  assert.ok(!integrationConflictsSource.includes('JSON.parse('));

  assert.match(agreementFormStateManagerSource, /from '\.\.\/\.\.\/\.\.\/shared\/json-parse\.js'/);
  assert.match(agreementFormStateManagerSource, /parseJSONValue/);
  assert.ok(!agreementFormStateManagerSource.includes('JSON.parse('));

  assert.match(placementEditorSource, /from '\.\.\/\.\.\/\.\.\/shared\/json-parse\.js'/);
  assert.match(placementEditorSource, /parseJSONValue/);
  assert.ok(!placementEditorSource.includes('JSON.parse('));

  assert.match(contentTypeBuilderIndexSource, /from '\.\.\/shared\/json-parse\.js'/);
  assert.match(contentTypeBuilderIndexSource, /parseJSONValue/);
  assert.ok(!contentTypeBuilderIndexSource.includes('JSON.parse('));

  assert.match(contentTypeEditorSource, /from '\.\.\/shared\/json-parse\.js'/);
  assert.match(contentTypeEditorSource, /parseJSONValue/);
  assert.ok(!contentTypeEditorSource.includes('JSON.parse('));

  assert.match(blockEditorPanelSource, /from '\.\.\/shared\/json-parse\.js'/);
  assert.match(blockEditorPanelSource, /parseJSONValue/);
  assert.ok(!blockEditorPanelSource.includes('JSON.parse('));

  assert.match(blockLibraryIdeSource, /from '\.\.\/shared\/json-parse\.js'/);
  assert.match(blockLibraryIdeSource, /parseJSONValue/);
  assert.ok(!blockLibraryIdeSource.includes('JSON.parse('));

  assert.match(fieldConfigFormSource, /from '\.\.\/shared\/json-parse\.js'/);
  assert.match(fieldConfigFormSource, /parseJSONValue/);
  assert.ok(!fieldConfigFormSource.includes('JSON.parse('));
});
