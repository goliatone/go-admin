import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const documentTemplatePath = path.resolve(
  testFileDir,
  '../../templates/resources/esign-documents/detail.html',
);
const agreementTemplatePath = path.resolve(
  testFileDir,
  '../../templates/resources/esign-agreements/detail.html',
);

test('document detail template consumes normalized lineage_presentation model', () => {
  const source = fs.readFileSync(documentTemplatePath, 'utf8');

  assert.match(source, /resource_item\.lineage_presentation/);
  assert.match(source, /partials\/esign-lineage-card\.html/);
});

test('agreement detail template consumes normalized lineage_presentation model', () => {
  const source = fs.readFileSync(agreementTemplatePath, 'utf8');

  assert.match(source, /resource_item\.lineage_presentation/);
  assert.match(source, /partials\/esign-lineage-card\.html/);
  assert.match(source, /\{\%\s*block detail_content_pre\s*\%\}/);
  assert.doesNotMatch(source, /\{\%\s*block lineage_banner\s*\%\}/);
});
