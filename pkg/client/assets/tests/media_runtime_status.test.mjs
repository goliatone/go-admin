import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_MEDIA_PATH = resolve(__dirname, '../dist/media/index.js');

const { summarizeBatchMutation } = await import(pathToFileURL(DIST_MEDIA_PATH).href);

test('summarizeBatchMutation does not report upload success when every upload fails', () => {
  const feedback = summarizeBatchMutation('upload', {
    attempted: 2,
    succeeded: 0,
    failed: 2,
    failures: ['Failed to upload a.jpg: network error.', 'Failed to upload b.jpg: file too large.'],
  });

  assert.equal(feedback.status, '');
  assert.match(feedback.error, /Failed to upload a\.jpg/);
  assert.match(feedback.error, /Failed to upload b\.jpg/);
});

test('summarizeBatchMutation reports partial delete outcomes without pretending full success', () => {
  const feedback = summarizeBatchMutation('delete', {
    attempted: 3,
    succeeded: 2,
    failed: 1,
    failures: ['Failed to delete hero.jpg: forbidden.'],
  });

  assert.equal(feedback.status, '2 of 3 media items deleted.');
  assert.match(feedback.error, /Failed to delete hero\.jpg/);
});
