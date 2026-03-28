import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sizeFormatters = await import('../dist/shared/size-formatters.js');

const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const importModalSourcePath = path.resolve(testFileDir, '../src/components/import-modal.ts');
const fileUploaderSourcePath = path.resolve(testFileDir, '../src/formgen/file_uploader.ts');
const googleDriveUtilsSourcePath = path.resolve(testFileDir, '../src/esign/utils/google-drive-utils.ts');
const esignFormattersSourcePath = path.resolve(testFileDir, '../src/esign/utils/formatters.ts');
const lineagePresentationSourcePath = path.resolve(testFileDir, '../src/esign/lineage-presentation.ts');
const sourceDetailWorkspaceSourcePath = path.resolve(testFileDir, '../src/esign/source-detail-workspace.ts');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('shared size formatter preserves import modal file-size wording', () => {
  assert.equal(
    sizeFormatters.formatByteSize(0, {
      zeroFallback: '0 Bytes',
      invalidFallback: '0 Bytes',
      unitLabels: ['Bytes', 'KB', 'MB', 'GB'],
      precisionByUnit: [0, 2, 2, 2],
      trimTrailingZeros: true,
    }),
    '0 Bytes'
  );
  assert.equal(
    sizeFormatters.formatByteSize(1536, {
      zeroFallback: '0 Bytes',
      invalidFallback: '0 Bytes',
      unitLabels: ['Bytes', 'KB', 'MB', 'GB'],
      precisionByUnit: [0, 2, 2, 2],
      trimTrailingZeros: true,
    }),
    '1.5 KB'
  );
});

test('shared size formatter preserves uploader and eSign file-size contracts', () => {
  assert.equal(
    sizeFormatters.formatByteSize(1536, {
      emptyFallback: '0 B',
      zeroFallback: '0 B',
      invalidFallback: '0 B',
      precisionByUnit: [0, 1, 1, 1],
    }),
    '1.5 KB'
  );
  assert.equal(
    sizeFormatters.formatByteSize(1024, {
      emptyFallback: '-',
      zeroFallback: '-',
      invalidFallback: '-',
      precisionByUnit: [0, 1, 2, 2],
    }),
    '1.0 KB'
  );
  assert.equal(
    sizeFormatters.formatByteSize(1024 * 1024, {
      emptyFallback: '-',
      zeroFallback: '-',
      invalidFallback: '-',
      precisionByUnit: [0, 1, 2, 2],
    }),
    '1.00 MB'
  );
});

test('shared size formatter preserves lineage and source-detail empty behavior', () => {
  assert.equal(
    sizeFormatters.formatByteSize(undefined, {
      emptyFallback: undefined,
      zeroFallback: '0 B',
      invalidFallback: undefined,
      precisionByUnit: [0, 1, 1, 1],
    }),
    undefined
  );
  assert.equal(
    sizeFormatters.formatByteSize(0, {
      emptyFallback: '0 B',
      zeroFallback: '0 B',
      invalidFallback: '0 B',
      precisionByUnit: [0, 1, 1, 1],
    }),
    '0 B'
  );
});

test('shared size formatter source contract is used by each migrated frontend helper', () => {
  const importModalSource = read(importModalSourcePath);
  const fileUploaderSource = read(fileUploaderSourcePath);
  const googleDriveUtilsSource = read(googleDriveUtilsSourcePath);
  const esignFormattersSource = read(esignFormattersSourcePath);
  const lineagePresentationSource = read(lineagePresentationSourcePath);
  const sourceDetailWorkspaceSource = read(sourceDetailWorkspaceSourcePath);

  assert.match(importModalSource, /formatByteSize/);
  assert.match(fileUploaderSource, /formatByteSize/);
  assert.match(googleDriveUtilsSource, /formatByteSize/);
  assert.match(esignFormattersSource, /formatByteSize/);
  assert.match(lineagePresentationSource, /formatByteSize/);
  assert.match(sourceDetailWorkspaceSource, /formatSharedByteSize/);
});
