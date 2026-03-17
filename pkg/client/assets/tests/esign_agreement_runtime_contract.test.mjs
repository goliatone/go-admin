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
const templatePath = path.resolve(testFileDir, '../../templates/resources/esign-agreements/form.html');
const signerReviewPath = path.resolve(testFileDir, '../src/esign/pages/signer-review.ts');
const signerReviewTemplatePath = path.resolve(testFileDir, '../../templates/esign-signer/review.html');

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
  assert.match(source, /disableWorker: true/);
  assert.doesNotMatch(source, /source_object_key/);
  assert.doesNotMatch(source, /loadPdfJs\(/);
  assert.doesNotMatch(source, /cdnjs\.cloudflare\.com\/ajax\/libs\/pdf\.js/);
});

test('Phase 5 contract: document preview card uses canonical PDF route with stale guards', () => {
  const source = read(previewCardPath);
  assert.match(source, /private requestVersion = 0/);
  assert.match(source, /requestVersion !== this\.requestVersion/);
  assert.match(source, /\/panels\/esign_documents\/\$\{encodeURIComponent\(documentId\)\}\/source\/pdf/);
  assert.match(source, /disableWorker: true/);
  assert.doesNotMatch(source, /source_object_key/);
  assert.doesNotMatch(source, /cdnjs\.cloudflare\.com\/ajax\/libs\/pdf\.js/);
});

test('Phase 5 contract: agreement form template uses conditional submit modes and pins PDF.js script', () => {
  const source = read(templatePath);
  assert.match(source, /"submit_mode": "\{% if is_edit %\}form\{% else %\}json\{% endif %\}"/);
  assert.match(source, /"agreement_id": "\{\{ resource_item\.id\|default:""\|escapejs \}\}"/);
  assert.match(source, /"sync": \{/);
  assert.match(source, /"client_base_path": "\{\{ base_path\|default:"\/admin" \}\}\/sync-client\/sync-core"/);
  assert.match(source, /"bootstrap_path": "\{\{ api_base_path\|default:"\/admin\/api\/v1" \}\}\/esign\/sync\/bootstrap\/agreement-draft"/);
  assert.match(source, /cdnjs\.cloudflare\.com\/ajax\/libs\/pdf\.js\/3\.11\.174\/pdf\.min\.js/);
  assert.match(source, /integrity="sha384-/);
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
