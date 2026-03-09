import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const runtimePath = path.resolve(testFileDir, '../src/esign/pages/agreement-form-runtime.ts');
const previewCardPath = path.resolve(testFileDir, '../src/esign/pages/agreement-form/preview-card.ts');
const normalizationPath = path.resolve(testFileDir, '../src/esign/pages/agreement-form/normalization.ts');
const templatePath = path.resolve(testFileDir, '../../templates/resources/esign-agreements/form.html');
const signerReviewPath = path.resolve(testFileDir, '../src/esign/pages/signer-review.ts');

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
  const source = read(runtimePath);
  assert.match(source, /typeaheadSearchRequestID/);
  assert.match(source, /typeaheadSearchAbortController/);
  assert.match(source, /q: trimmedQuery/);
  assert.doesNotMatch(source, /filters\[title_contains\]/);
  assert.match(source, /requestID !== typeaheadSearchRequestID/);
});

test('Phase 5 contract: agreement runtime uses canonical PDF route and no object-key asset fallback', () => {
  const source = read(runtimePath);
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

test('Phase 5 contract: agreement form template defaults to JSON submit mode and pins PDF.js script', () => {
  const source = read(templatePath);
  assert.match(source, /"submit_mode": "json"/);
  assert.match(source, /cdnjs\.cloudflare\.com\/ajax\/libs\/pdf\.js\/3\.11\.174\/pdf\.min\.js/);
  assert.match(source, /integrity="sha384-/);
});

test('Phase 5 contract: runtime removes indexed placement fallback writes', () => {
  const source = read(runtimePath);
  assert.doesNotMatch(source, /field_placements\[\$\{index\}\]\./);
  assert.match(source, /fieldPlacementsJSONInput\.value = JSON\.stringify\(placementEntries\)/);
});

test('Phase 5 contract: signer review includes typed live preview and draw save-current action', () => {
  const source = read(signerReviewPath);
  assert.match(source, /id="sig-type-preview"/);
  assert.match(source, /updateTypedSignaturePreview\(/);
  assert.match(source, /matches\('#sig-type-input'\)/);
  assert.match(source, /data-esign-action="save-current-signature-library"/);
});

test('Phase 5 contract: signer review draw controls are iconized with labels and a11y names', () => {
  const source = read(signerReviewPath);
  assert.match(source, /data-esign-action="undo-signature-canvas"[\s\S]*iconoir-undo[\s\S]*<span>Undo<\/span>/);
  assert.match(source, /data-esign-action="redo-signature-canvas"[\s\S]*iconoir-redo[\s\S]*<span>Redo<\/span>/);
  assert.match(source, /data-esign-action="clear-signature-canvas"[\s\S]*iconoir-eraser[\s\S]*<span>Clear<\/span>/);
  assert.match(source, /aria-label="Undo signature stroke"/);
  assert.match(source, /aria-label="Redo signature stroke"/);
  assert.match(source, /aria-label="Clear signature canvas"/);
});
