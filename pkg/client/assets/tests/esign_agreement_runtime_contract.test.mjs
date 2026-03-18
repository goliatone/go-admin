import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const runtimePath = path.resolve(testFileDir, '../src/esign/pages/agreement-form-runtime.ts');
const documentSelectionPath = path.resolve(testFileDir, '../src/esign/pages/agreement-form/document-selection.ts');
const placementEditorPath = path.resolve(testFileDir, '../src/esign/pages/agreement-form/placement-editor.ts');
const formPayloadPath = path.resolve(testFileDir, '../src/esign/pages/agreement-form/form-payload.ts');
const previewCardPath = path.resolve(testFileDir, '../src/esign/pages/agreement-form/preview-card.ts');
const normalizationPath = path.resolve(testFileDir, '../src/esign/pages/agreement-form/normalization.ts');
const pdfRuntimePath = path.resolve(testFileDir, '../src/esign/pdf/runtime.ts');
const buildAssetsPath = path.resolve(testFileDir, '../scripts/build-assets.mjs');
const templatePath = path.resolve(testFileDir, '../../templates/resources/esign-agreements/form.html');
const signerReviewPath = path.resolve(testFileDir, '../src/esign/pages/signer-review.ts');
const signerReviewTemplatePath = path.resolve(testFileDir, '../../templates/esign-signer/review.html');
const esignDistPath = path.resolve(testFileDir, '../dist/esign/index.js');
const workerDistPath = path.resolve(testFileDir, '../dist/pdf.worker.min.mjs');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('Phase 5 contract: normalization preserves linked placement metadata in payload', () => {
  const source = read(normalizationPath);
  assert.match(source, /placement_source:/);
  assert.match(source, /link_group_id:/);
  assert.match(source, /linked_from_field_id:/);
  assert.match(source, /is_unlinked:/);
  assert.match(source, /case PLACEMENT_SOURCE\.AUTO_LINKED:/);
});

test('Phase 5 contract: agreement runtime typeahead search uses q and stale request guards', () => {
  const source = read(documentSelectionPath);
  assert.match(source, /typeaheadSearchRequestID/);
  assert.match(source, /typeaheadSearchAbortController/);
  assert.match(source, /q: trimmedQuery/);
  assert.doesNotMatch(source, /filters\[title_contains\]/);
  assert.match(source, /requestID !== typeaheadSearchRequestID/);
});

test('Phase 5 contract: agreement runtime uses canonical PDF route and no object-key asset fallback', () => {
  const source = read(placementEditorPath);
  assert.match(source, /\/panels\/esign_documents\/\$\{encodedDocumentID\}\/source\/pdf/);
  assert.match(source, /loadPdfDocument\(\{/);
  assert.match(source, /surface: 'agreement-placement-editor'/);
  assert.doesNotMatch(source, /source_object_key/);
  assert.doesNotMatch(source, /loadPdfJs\(/);
  assert.doesNotMatch(source, /window\.pdfjsLib/);
  assert.doesNotMatch(source, /cdnjs\.cloudflare\.com\/ajax\/libs\/pdf\.js/);
});

test('Phase 5 contract: document preview card uses canonical PDF route with stale guards', () => {
  const source = read(previewCardPath);
  assert.match(source, /private requestVersion = 0/);
  assert.match(source, /requestVersion !== this\.requestVersion/);
  assert.match(source, /\/panels\/esign_documents\/\$\{encodeURIComponent\(documentId\)\}\/source\/pdf/);
  assert.match(source, /loadPdfDocument\(\{/);
  assert.match(source, /surface: 'agreement-preview-card'/);
  assert.doesNotMatch(source, /source_object_key/);
  assert.doesNotMatch(source, /window\.pdfjsLib/);
  assert.doesNotMatch(source, /cdnjs\.cloudflare\.com\/ajax\/libs\/pdf\.js/);
});

test('Phase 5 contract: agreement form template uses conditional submit modes without CDN PDF.js bootstrap', () => {
  const source = read(templatePath);
  assert.match(source, /"submit_mode": "\{% if is_edit %\}form\{% else %\}json\{% endif %\}"/);
  assert.match(source, /"agreement_id": "\{\{ resource_item\.id\|default:""\|escapejs \}\}"/);
  assert.match(source, /"sync": \{/);
  assert.match(source, /"client_base_path": "\{\{ base_path\|default:"\/admin" \}\}\/sync-client\/sync-core"/);
  assert.match(source, /"bootstrap_path": "\{\{ api_base_path\|default:"\/admin\/api\/v1" \}\}\/esign\/sync\/bootstrap\/agreement-draft"/);
  assert.doesNotMatch(source, /cdnjs\.cloudflare\.com\/ajax\/libs\/pdf\.js/);
});

test('Phase 5 contract: runtime removes indexed placement fallback writes', () => {
  const source = `${read(placementEditorPath)}\n${read(formPayloadPath)}`;
  assert.doesNotMatch(source, /field_placements\[\$\{index\}\]\./);
  assert.match(source, /fieldPlacementsJSONInput\.value = JSON\.stringify\(placementEntries\)/);
});

test('Phase 5 contract: signer review includes typed live preview and draw save-current action', () => {
  const source = read(signerReviewPath);
  assert.match(source, /id="sig-type-preview"/);
  assert.match(source, /updateTypedSignaturePreview\(/);
  assert.match(source, /matches\('#sig-type-input'\)/);
  assert.match(source, /syncOverlay: true/);
  assert.match(source, /previewValueText/);
  assert.match(source, /previewSignatureUrl/);
  assert.match(source, /data-esign-action="save-current-signature-library"/);
});

test('Phase 5 contract: signer review uses shared PDF runtime and prefers preview_url', () => {
  const source = read(signerReviewPath);
  const template = read(signerReviewTemplatePath);
  assert.match(source, /loadPdfDocument as loadPdfSourceDocument/);
  assert.match(source, /logPdfLoadError/);
  assert.match(source, /assets\.preview_url \|\|/);
  assert.doesNotMatch(source, /pdfjs-dist\/build\/pdf\.min\.mjs/);
  assert.doesNotMatch(source, /pdf\.worker\.min\.mjs\?url/);
  assert.doesNotMatch(source, /cdnjs\.cloudflare\.com\/ajax\/libs\/pdf\.js/);
  assert.doesNotMatch(template, /cdnjs\.cloudflare\.com\/ajax\/libs\/pdf\.js/);
});

test('Phase 5 contract: e-sign PDF runtime owns worker configuration and worker asset path', () => {
  const source = read(pdfRuntimePath);
  assert.match(source, /import \* as pdfjsLib from 'pdfjs-dist\/build\/pdf\.min\.mjs'/);
  assert.match(source, /const PDF_WORKER_SRC = new URL\([\s\S]*'\.\.\/pdf\.worker\.min\.mjs'[\s\S]*import\.meta\.url[\s\S]*\)\.toString\(\)/);
  assert.match(source, /export function ensurePdfWorkerConfigured\(\): string/);
  assert.match(source, /export function loadPdfDocument/);
  assert.match(source, /export function normalizePdfLoadError/);
  assert.match(source, /export function logPdfLoadError/);
});

test('Phase 5 contract: build copies a same-origin PDF worker asset into dist', () => {
  const source = read(buildAssetsPath);
  assert.match(source, /node_modules\/pdfjs-dist\/build\/pdf\.worker\.min\.mjs/);
  assert.match(source, /distStagingDir, 'pdf\.worker\.min\.mjs'/);
  assert.ok(fs.existsSync(workerDistPath), 'dist/pdf.worker.min.mjs must exist after build');
  assert.match(read(workerDistPath), /WorkerMessageHandler/);
});

test('Phase 5 contract: built e-sign bundle references a local worker asset instead of a data URL', () => {
  const source = read(esignDistPath);
  assert.match(source, /pdf\.worker\.min\.mjs/);
  assert.doesNotMatch(source, /data:text\/javascript;base64/);
});

test('Phase 5 contract: signer review draw controls are iconized with labels and a11y names', () => {
  const source = read(signerReviewPath);
  assert.match(source, /data-esign-action="undo-signature-canvas"[\s\S]*iconoir-undo[\s\S]*<span>Undo<\/span>/);
  assert.match(source, /data-esign-action="redo-signature-canvas"[\s\S]*iconoir-redo[\s\S]*<span>Redo<\/span>/);
  assert.match(source, /data-esign-action="clear-signature-canvas"[\s\S]*iconoir-erase[\s\S]*<span>Clear<\/span>/);
  assert.match(source, /aria-label="Undo signature stroke"/);
  assert.match(source, /aria-label="Redo signature stroke"/);
  assert.match(source, /aria-label="Clear signature canvas"/);
});

test('Phase 5 contract: signer review pager controls sync after current page updates', () => {
  const source = read(signerReviewPath);
  assert.match(source, /state\.currentPage = pageNum;\s*document\.getElementById\('current-page'\)\.textContent = pageNum;\s*updatePageNavigation\(\);/);
  assert.doesNotMatch(source, /function prevPage\(\)\s*{[^}]*updatePageNavigation\(\)/);
  assert.doesNotMatch(source, /function nextPage\(\)\s*{[^}]*updatePageNavigation\(\)/);
  assert.doesNotMatch(source, /function goToPage\(pageNum\)\s*{[^}]*updatePageNavigation\(\)/);
});

test('Phase 5 contract: signer review exposes unified review state and actions', () => {
  const source = read(signerReviewPath);
  const template = read(signerReviewTemplatePath);
  assert.match(source, /sessionKind:\s*String\(config\.sessionKind \|\| 'signer'\)/);
  assert.match(source, /review:\s*normalizeReviewContext\(config\.review\)/);
  assert.match(source, /function renderReviewPanel\(\)/);
  assert.match(source, /function syncReviewContext\(reviewContext\)\s*{[\s\S]*renderReviewPanel\(\);\s*requestOverlayRender\(\);\s*updateSessionChrome\(\);\s*updateSubmitButton\(\);/);
  assert.match(source, /reviewAPIRequest\(suffix,\s*\{\s*method:\s*'POST'/);
  assert.match(source, /state\.reviewContext\?\.sign_blocked/);
  assert.match(template, /data-esign-action="approve-review"/);
  assert.match(template, /data-esign-action="request-review-changes"/);
  assert.match(template, /data-esign-action="create-review-thread"/);
});

test('Phase 5 contract: signer review request-changes persists rationale and separates marker reveal from anchor navigation', () => {
  const source = read(signerReviewPath);
  assert.match(source, /JSON\.stringify\(\{ comment \}\)/);
  assert.match(source, /updateReviewAnchorChips\(\);\s*updateReviewAnchorPointUI\(\);\s*\n\s*const allThreads/);
  assert.match(source, /function revealReviewThread\(threadID\)/);
  assert.match(source, /marker\.dataset\.esignAction = 'go-review-thread'/);
  assert.match(source, /trapFocusInModal\(modalContent\)/);
  assert.match(source, /e\.key === 'Escape'[\s\S]*hideReviewDecisionModal\(\);/);
});

test('Phase 5 contract: signer review normalizes PascalCase review thread payloads from Go JSON', () => {
  const source = read(signerReviewPath);
  assert.match(source, /function readNormalizedRecordValue\(record, \.\.\.keys\)/);
  assert.match(source, /id: readNormalizedRecordString\(thread, 'id', 'ID'\)/);
  assert.match(source, /anchor_type: readNormalizedRecordString\(thread, 'anchor_type', 'anchorType', 'AnchorType'\)/);
  assert.match(source, /body: readNormalizedRecordString\(message, 'body', 'Body'\)/);
  assert.match(source, /created_at: readNormalizedRecordString\(message, 'created_at', 'createdAt', 'CreatedAt'\)/);
});

test('Phase 5 contract: signer review captures page pin clicks from the shared PDF surface', () => {
  const source = read(signerReviewPath);
  assert.match(source, /const clickSurface = document\.getElementById\('pdf-container'\);/);
  assert.match(source, /if \(!clickSurface \|\| !pageContainer\) return;/);
  assert.match(source, /clickSurface\.addEventListener\('click', \(event\) => \{/);
  assert.match(source, /event\.preventDefault\(\);\s*event\.stopPropagation\(\);/);
});

test('Phase 5 contract: reviewer sessions stay read-only in the signer review UI', () => {
  const source = read(signerReviewPath);
  assert.match(source, /function signingInteractionsEnabled\(\)\s*{\s*return !isReviewOnlySession\(\);/);
  assert.match(source, /if \(!signingInteractionsEnabled\(\)\) {\s*renderReviewThreadMarkers\(overlaysContainer, pdfContainer\);\s*return;\s*}/);
  assert.match(source, /function activateField\(fieldId\)\s*{\s*if \(!signingInteractionsEnabled\(\)\)/);
  assert.match(source, /async function saveFieldFromEditor\(\)\s*{\s*if \(!signingInteractionsEnabled\(\)\)/);
  assert.match(source, /async function acceptConsent\(\)\s*{\s*if \(!signingInteractionsEnabled\(\)\)/);
});
