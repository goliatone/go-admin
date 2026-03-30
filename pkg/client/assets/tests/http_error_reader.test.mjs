import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const httpClient = await import('../dist/shared/transport/http-client.js');
const datatable = await import('../dist/datatable/index.js');
const esign = await import('../dist/esign/index.js');

const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const httpClientSourcePath = path.resolve(testFileDir, '../src/shared/transport/http-client.ts');
const fileUploaderSourcePath = path.resolve(testFileDir, '../src/formgen/file_uploader.ts');
const featureFlagsSourcePath = path.resolve(testFileDir, '../src/feature-flags/feature-flags-manager.ts');
const exportSourcePath = path.resolve(testFileDir, '../src/datatable/go-crud/export.ts');
const translationBulkActionsSourcePath = path.resolve(testFileDir, '../src/datatable/translation-bulk-actions.ts');
const sourceManagementPagesSourcePath = path.resolve(testFileDir, '../src/esign/source-management-pages.ts');
const esignApiClientSourcePath = path.resolve(testFileDir, '../src/esign/api-client.ts');
const googleIntegrationSourcePath = path.resolve(testFileDir, '../src/esign/pages/google-integration.ts');
const integrationMappingsSourcePath = path.resolve(testFileDir, '../src/esign/pages/integration-mappings.ts');
const integrationConflictsSourcePath = path.resolve(testFileDir, '../src/esign/pages/integration-conflicts.ts');
const integrationSyncRunsSourcePath = path.resolve(testFileDir, '../src/esign/pages/integration-sync-runs.ts');
const documentFormSourcePath = path.resolve(testFileDir, '../src/esign/pages/document-form.ts');
const googleDrivePickerSourcePath = path.resolve(testFileDir, '../src/esign/pages/google-drive-picker.ts');
const signerCompleteSourcePath = path.resolve(testFileDir, '../src/esign/pages/signer-complete.ts');
const signerReviewSourcePath = path.resolve(testFileDir, '../src/esign/pages/signer-review.ts');
const draftSyncServiceSourcePath = path.resolve(testFileDir, '../src/esign/pages/agreement-form/draft-sync-service.ts');
const agreementFeedbackSourcePath = path.resolve(testFileDir, '../src/esign/pages/agreement-form/feedback.ts');
const translationEditorSourcePath = path.resolve(testFileDir, '../src/translation-editor/index.ts');
const translationExchangeSourcePath = path.resolve(testFileDir, '../src/translation-exchange/translation-exchange-manager.ts');
const datatableActionsSourcePath = path.resolve(testFileDir, '../src/datatable/actions.ts');

test('shared http error reader unwraps json and preserves fallback options', async () => {
  const jsonMessageResponse = new Response(JSON.stringify({ message: 'Load failed' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
  assert.equal(await httpClient.readHTTPError(jsonMessageResponse, 'fallback'), 'Load failed');

  const nestedErrorResponse = new Response(JSON.stringify({ error: { message: 'Nested failure' } }), {
    status: 422,
    headers: { 'Content-Type': 'application/json' },
  });
  assert.equal(await httpClient.readHTTPError(nestedErrorResponse, 'fallback'), 'Nested failure');

  const plainTextResponse = new Response(' plain text failure ', { status: 500 });
  assert.equal(await httpClient.readHTTPError(plainTextResponse, 'fallback'), 'plain text failure');

  const emptyResponse = new Response('', { status: 503 });
  assert.equal(await httpClient.readHTTPError(emptyResponse, 'Request failed'), 'Request failed: 503');
  assert.equal(
    await httpClient.readHTTPError(emptyResponse, 'Failed to load flags.', { appendStatusToFallback: false }),
    'Failed to load flags.'
  );

  const detailedResponse = new Response(JSON.stringify({
    error: { code: 'AUTH_REQUIRED', message: 'Reconnect Google Drive', details: { scope: 'drive.file' } },
  }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
  const detailed = await httpClient.readHTTPErrorResult(detailedResponse, 'fallback', {
    appendStatusToFallback: false,
  });
  assert.equal(detailed.message, 'Reconnect Google Drive');
  assert.deepEqual(detailed.payload, {
    error: { code: 'AUTH_REQUIRED', message: 'Reconnect Google Drive', details: { scope: 'drive.file' } },
  });
  assert.match(detailed.rawText, /Reconnect Google Drive/);

  const structuredResponse = new Response(JSON.stringify({
    error: { code: 'NOT_FOUND', message: 'Draft missing', details: { entity: 'drafts' } },
  }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
  const structured = await httpClient.readHTTPStructuredErrorResult(structuredResponse, 'fallback', {
    appendStatusToFallback: false,
  });
  assert.equal(structured.message, 'Draft missing');
  assert.equal(structured.code, 'NOT_FOUND');
  assert.deepEqual(structured.details, { entity: 'drafts' });

  const jsonPayloadResponse = new Response(JSON.stringify({ ok: true, count: 2 }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
  const jsonPayload = await httpClient.readHTTPResponsePayload(jsonPayloadResponse);
  assert.deepEqual(jsonPayload.payload, { ok: true, count: 2 });
  assert.equal(jsonPayload.rawText, '{"ok":true,"count":2}');

  const textPayloadResponse = new Response(' exported ok ', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
  const textPayload = await httpClient.readHTTPResponsePayload(textPayloadResponse);
  assert.equal(textPayload.payload, 'exported ok');
  assert.equal(textPayload.rawText, 'exported ok');

  const jsonValueResponse = new Response(JSON.stringify({ ok: true, count: 3 }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
  assert.deepEqual(await httpClient.readHTTPJSONValue(jsonValueResponse, null), { ok: true, count: 3 });

  const typedJSONResponse = new Response(JSON.stringify({ ok: true, count: 4 }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
  assert.deepEqual(await httpClient.readHTTPJSON(typedJSONResponse), { ok: true, count: 4 });

  const invalidJsonValueResponse = new Response('{bad', {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
  assert.equal(await httpClient.readHTTPJSONValue(invalidJsonValueResponse, null), null);

  const jsonObjectResponse = new Response(JSON.stringify({ ok: true, nested: { count: 1 } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
  assert.deepEqual(await httpClient.readHTTPJSONObject(jsonObjectResponse), { ok: true, nested: { count: 1 } });

  const scalarJsonResponse = new Response(JSON.stringify('value'), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
  assert.deepEqual(await httpClient.readHTTPJSONObject(scalarJsonResponse), {});
});

test('http error reader callers now route through shared transport helper', () => {
  const fileUploaderSource = readFileSync(fileUploaderSourcePath, 'utf8');
  const httpClientSource = readFileSync(httpClientSourcePath, 'utf8');
  const featureFlagsSource = readFileSync(featureFlagsSourcePath, 'utf8');
  const exportSource = readFileSync(exportSourcePath, 'utf8');
  const translationBulkActionsSource = readFileSync(translationBulkActionsSourcePath, 'utf8');
  const sourceManagementPagesSource = readFileSync(sourceManagementPagesSourcePath, 'utf8');
  const esignApiClientSource = readFileSync(esignApiClientSourcePath, 'utf8');
  const googleIntegrationSource = readFileSync(googleIntegrationSourcePath, 'utf8');
  const integrationMappingsSource = readFileSync(integrationMappingsSourcePath, 'utf8');
  const integrationConflictsSource = readFileSync(integrationConflictsSourcePath, 'utf8');
  const integrationSyncRunsSource = readFileSync(integrationSyncRunsSourcePath, 'utf8');
  const documentFormSource = readFileSync(documentFormSourcePath, 'utf8');
  const googleDrivePickerSource = readFileSync(googleDrivePickerSourcePath, 'utf8');
  const signerCompleteSource = readFileSync(signerCompleteSourcePath, 'utf8');
  const signerReviewSource = readFileSync(signerReviewSourcePath, 'utf8');
  const draftSyncServiceSource = readFileSync(draftSyncServiceSourcePath, 'utf8');
  const agreementFeedbackSource = readFileSync(agreementFeedbackSourcePath, 'utf8');
  const translationEditorSource = readFileSync(translationEditorSourcePath, 'utf8');
  const translationExchangeSource = readFileSync(translationExchangeSourcePath, 'utf8');
  const datatableActionsSource = readFileSync(datatableActionsSourcePath, 'utf8');

  assert.match(fileUploaderSource, /from '\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(fileUploaderSource, /readHTTPError\(response, `Upload failed/);
  assert.ok(!fileUploaderSource.includes('const text = await response.text();'));

  assert.match(featureFlagsSource, /from '\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(featureFlagsSource, /readHTTPError\(response, 'Failed to load flags\./);
  assert.match(featureFlagsSource, /readHTTPError\(response, 'Failed to update flag\./);
  assert.ok(!featureFlagsSource.includes('const text = await response.text();'));

  assert.match(exportSource, /from '\.\.\/\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(exportSource, /return readHTTPError\(response, `Export failed/);
  assert.match(exportSource, /async function readExportJSONRecord<T extends object>\(response: Response\): Promise<T>/);
  assert.match(exportSource, /readHTTPJSONObject\(response\)/);
  assert.match(exportSource, /const result = await readExportJSONRecord<ExportAsyncResponse>\(response\);/);
  assert.match(exportSource, /const record = await readExportJSONRecord<ExportStatusRecord>\(response\);/);
  assert.ok(!exportSource.includes("const contentType = response.headers.get('content-type') || '';"));
  assert.equal((exportSource.match(/response\.json\(\)\.catch\(\(\) => \(\{\}\)\)/g) || []).length, 0);

  assert.match(translationBulkActionsSource, /from '\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(translationBulkActionsSource, /readHTTPError\(response, `Request failed:/);
  assert.ok(!translationBulkActionsSource.includes('const errorBody = await response.text();'));

  assert.match(sourceManagementPagesSource, /from '\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(sourceManagementPagesSource, /readHTTPError\(response, `HTTP \$\{response\.status\}`/);
  assert.match(sourceManagementPagesSource, /readHTTPJSON<T>\(response\)/);
  assert.ok(!sourceManagementPagesSource.includes('const errorText = await response.text();'));
  assert.equal((sourceManagementPagesSource.match(/response\.json\(\) as Promise</g) || []).length, 0);

  assert.match(httpClientSource, /export async function readHTTPJSON<T>\(/);
  assert.match(httpClientSource, /return await response\.json\(\) as T;/);

  assert.match(esignApiClientSource, /from '\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(esignApiClientSource, /readHTTPErrorResult\(response, fallback/);
  assert.match(esignApiClientSource, /readHTTPJSON<T>\(response\)/);
  assert.ok(!esignApiClientSource.includes('const errorData = await response.json();'));
  assert.equal((esignApiClientSource.match(/response\.json\(\) as Promise</g) || []).length, 0);

  assert.match(googleIntegrationSource, /from '\.\.\/\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(googleIntegrationSource, /readHTTPError\(response, `Failed to check status:/);
  assert.match(googleIntegrationSource, /readHTTPError\(response, 'Failed to connect'/);
  assert.match(googleIntegrationSource, /readHTTPError\(response, 'Failed to disconnect'/);
  assert.ok(!googleIntegrationSource.includes('const errorData = await response.json();'));

  assert.match(integrationMappingsSource, /from '\.\.\/\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(integrationMappingsSource, /readHTTPError\(response, `HTTP \$\{response\.status\}`/);
  assert.ok(!integrationMappingsSource.includes('result.error?.message || `HTTP ${response.status}`'));

  assert.match(integrationConflictsSource, /from '\.\.\/\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(integrationConflictsSource, /readHTTPError\(response, `HTTP \$\{response\.status\}`/);
  assert.ok(!integrationConflictsSource.includes('result.error?.message || `HTTP ${response.status}`'));

  assert.match(integrationSyncRunsSource, /from '\.\.\/\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(integrationSyncRunsSource, /readHTTPError\(response, `HTTP \$\{response\.status\}`/);
  assert.ok(!integrationSyncRunsSource.includes('result.error?.message || `HTTP ${response.status}`'));

  assert.match(documentFormSource, /from '\.\.\/\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(documentFormSource, /async function readUploadResponseBody\(response: Response\): Promise<Record<string, unknown>>/);
  assert.match(documentFormSource, /return readHTTPJSONObject\(response\);/);
  assert.match(documentFormSource, /const body = await readUploadResponseBody\(response\);/);
  assert.match(documentFormSource, /readHTTPError\(response, 'Upload failed\. Please try again\.'/);
  assert.match(documentFormSource, /readHTTPErrorResult\(response, 'Failed to start import'/);
  assert.match(documentFormSource, /readHTTPError\(response, 'Failed to load files'/);
  assert.match(documentFormSource, /readHTTPError\(response, 'Failed to check import status'/);
  assert.equal((documentFormSource.match(/response\.json\(\)\.catch\(\(\) => \(\{\}\)\)/g) || []).length, 0);
  assert.ok(!documentFormSource.includes("body?.error?.message || body?.message || 'Upload failed. Please try again.'"));
  assert.ok(!documentFormSource.includes("data.error?.message || 'Failed to load files'"));
  assert.ok(!documentFormSource.includes("payload.error?.message || 'Failed to check import status'"));

  assert.match(googleDrivePickerSource, /from '\.\.\/\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(googleDrivePickerSource, /readHTTPError\(response, `Failed to load files: \$\{response\.status\}`/);
  assert.match(googleDrivePickerSource, /readHTTPError\(response, 'Import failed'/);
  assert.ok(!googleDrivePickerSource.includes('const errorData = await response.json();'));
  assert.ok(!googleDrivePickerSource.includes("throw new Error(`Failed to load files: ${response.status}`)"));

  assert.match(signerCompleteSource, /from '\.\.\/\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(signerCompleteSource, /readHTTPError\(response, 'Failed to load artifacts'/);
  assert.ok(!signerCompleteSource.includes("throw new Error('Failed to load artifacts')"));

  assert.match(signerReviewSource, /from '\.\.\/\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(signerReviewSource, /readHTTPError\(response, 'Failed to load saved signatures'/);
  assert.match(signerReviewSource, /readHTTPErrorResult\(response, 'Failed to save signature'/);
  assert.match(signerReviewSource, /readHTTPError\(response, 'Failed to delete signature'/);
  assert.match(signerReviewSource, /async function readReviewAPIResponseBody\(response: Response\): Promise<Record<string, unknown>>/);
  assert.match(signerReviewSource, /return readHTTPJSONObject\(response\);/);
  assert.match(signerReviewSource, /return readReviewAPIResponseBody\(response\);/);
  assert.equal((signerReviewSource.match(/response\.json\(\)\.catch\(\(\) => \(\{\}\)\)/g) || []).length, 0);
  assert.ok(!signerReviewSource.includes("payload?.error?.message || 'Failed to load saved signatures'"));
  assert.ok(!signerReviewSource.includes("payload?.error?.message || 'Failed to save signature'"));
  assert.ok(!signerReviewSource.includes("payload?.error?.message || 'Failed to delete signature'"));

  assert.match(draftSyncServiceSource, /from '\.\.\/\.\.\/\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(draftSyncServiceSource, /readHTTPError\(response, `HTTP \$\{response\.status\}`/);
  assert.match(draftSyncServiceSource, /readHTTPJSONObject\(response\)/);
  assert.equal((draftSyncServiceSource.match(/response\.json\(\)\.catch\(\(\) => \(\{\} as any\)\)/g) || []).length, 0);
  assert.ok(!draftSyncServiceSource.includes("String(payload?.error?.message || `HTTP ${response.status}`)"));

  assert.match(agreementFeedbackSource, /from '\.\.\/\.\.\/\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(agreementFeedbackSource, /readHTTPStructuredErrorResult\(/);
  assert.ok(!agreementFeedbackSource.includes('payload?.error?.code'));
  assert.ok(!agreementFeedbackSource.includes('payload?.error?.message'));
  assert.ok(!agreementFeedbackSource.includes('payload.error.details'));

  assert.match(translationEditorSource, /from '\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(translationEditorSource, /readHTTPErrorResult\(response, 'Autosave conflict'/);
  assert.match(translationEditorSource, /async function readEditorAutosaveConflictPayload/);
  assert.ok(!translationEditorSource.includes("response.json().catch(async () => ({ error: { message: await readHTTPError(response, 'Autosave conflict') } }))"));

  assert.match(translationExchangeSource, /from '\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(translationExchangeSource, /readHTTPResponsePayload\(response\)/);
  assert.ok(!translationExchangeSource.includes('const contentType = response.headers.get("content-type") ?? ""'));
  assert.ok(!translationExchangeSource.includes('contentType.includes("json") ? await response.json() : await response.text()'));

  assert.match(datatableActionsSource, /from '\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(datatableActionsSource, /readHTTPJSONValue<unknown>\(response, undefined\)/);
  assert.equal((datatableActionsSource.match(/response\.json\(\)\.catch\(\(\) => undefined\)/g) || []).length, 0);

  const detailActionsSourcePath = path.resolve(testFileDir, '../src/datatable/detail-actions.ts');
  const commandRuntimeSourcePath = path.resolve(testFileDir, '../src/services/command-runtime.ts');
  const detailActionsSource = readFileSync(detailActionsSourcePath, 'utf8');
  const commandRuntimeSource = readFileSync(commandRuntimeSourcePath, 'utf8');

  assert.match(detailActionsSource, /from '\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(detailActionsSource, /readHTTPJSONValue<unknown>\(response, null\)/);
  assert.equal((detailActionsSource.match(/response\.json\(\)\.catch\(\(\) => null\)/g) || []).length, 0);

  assert.match(commandRuntimeSource, /from '\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(commandRuntimeSource, /readHTTPJSONValue<unknown>\(response, null\)/);
  assert.equal((commandRuntimeSource.match(/response\.json\(\)\.catch\(\(\) => null\)/g) || []).length, 0);
});

test('translation bulk actions use the shared http error reader for notifier copy', async () => {
  const originalFetch = globalThis.fetch;
  const notifierErrors = [];

  globalThis.fetch = async () => new Response(JSON.stringify({
    error: { message: 'Missing locale selection' },
  }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });

  try {
    await assert.rejects(
      datatable.executeBulkCreateMissing(
        {
          apiEndpoint: '/admin/api/panels/pages',
          notifier: {
            success() {},
            info() {},
            warning() {},
            error(message) {
              notifierErrors.push(message);
            },
          },
        },
        ['page_123'],
        { locales: ['es'] }
      ),
      /Missing locale selection/
    );

    assert.deepEqual(notifierErrors, ['Failed to create translations: Missing locale selection']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('esign api client preserves typed errors while using shared http error parsing', async () => {
  const originalFetch = globalThis.fetch;
  const client = new esign.ESignAPIClient({
    basePath: '/admin',
    apiBasePath: '/admin/api',
  });

  globalThis.fetch = async () => new Response(JSON.stringify({
    error: {
      code: 'GOOGLE_REAUTH_REQUIRED',
      message: 'Reconnect required',
      details: { provider: 'google' },
    },
  }), {
    status: 401,
    statusText: 'Unauthorized',
    headers: { 'Content-Type': 'application/json' },
  });

  try {
    await assert.rejects(
      client.getGoogleIntegrationStatus(),
      (error) => {
        assert.ok(error instanceof esign.ESignAPIError);
        assert.equal(error.code, 'GOOGLE_REAUTH_REQUIRED');
        assert.equal(error.message, 'Reconnect required');
        assert.deepEqual(error.details, { provider: 'google' });
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
