import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const {
  buildEndpointURL,
  getNumberSearchParam,
  getStringSearchParam,
  readLocationSearchParams,
  setJoinedSearchParam,
  setNumberSearchParam,
  setSearchParam,
} = await import('../dist/shared/query-state/url-state.js');
const { buildTranslationDashboardURL } = await import('../dist/translation-dashboard/index.js');
const { buildCreateLocaleURL, buildFamilyDetailURL, buildFamilyListURL } = await import('../dist/translation-family/index.js');
const { buildTranslationMatrixURL } = await import('../dist/translation-matrix/index.js');
const { buildAssignmentListURL } = await import('../dist/translation-queue/index.js');

const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const dashboardSourcePath = path.resolve(testFileDir, '../src/translation-dashboard/index.ts');
const familySourcePath = path.resolve(testFileDir, '../src/translation-family/index.ts');
const matrixSourcePath = path.resolve(testFileDir, '../src/translation-matrix/index.ts');
const queueSourcePath = path.resolve(testFileDir, '../src/translation-queue/index.ts');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('shared query-state url builder preserves relative and absolute endpoint contracts', () => {
  assert.equal(
    buildEndpointURL('/admin/api/translations/dashboard', new URLSearchParams([['channel', 'production']])),
    '/admin/api/translations/dashboard?channel=production'
  );
  assert.equal(
    buildEndpointURL(
      'https://example.com/admin/api/translations/dashboard',
      new URLSearchParams([['channel', 'production']]),
      { preserveAbsolute: true }
    ),
    'https://example.com/admin/api/translations/dashboard?channel=production'
  );
  assert.equal(
    buildEndpointURL(
      '/admin/api/translations/assignments?status=open',
      new URLSearchParams([['review_state', 'qa_blocked']])
    ),
    '/admin/api/translations/assignments?status=open&review_state=qa_blocked'
  );
});

test('shared query-state search-param helpers preserve translation query semantics', () => {
  const params = new URLSearchParams();
  setSearchParam(params, 'channel', 'production');
  setSearchParam(params, 'blank', '   ');
  setNumberSearchParam(params, 'page', 2, { min: 1 });
  setNumberSearchParam(params, 'ignored_negative', -1, { min: 0 });
  setJoinedSearchParam(params, 'locales', ['fr', 'de']);

  assert.equal(params.get('channel'), 'production');
  assert.equal(params.has('blank'), false);
  assert.equal(params.get('page'), '2');
  assert.equal(params.has('ignored_negative'), false);
  assert.equal(params.get('locales'), 'fr,de');
  assert.equal(getNumberSearchParam(params, 'page'), 2);
  assert.equal(getNumberSearchParam(new URLSearchParams('page=abc'), 'page'), undefined);
  assert.equal(getStringSearchParam(new URLSearchParams('preset=review_inbox'), 'preset'), 'review_inbox');
  assert.equal(getStringSearchParam(new URLSearchParams('preset=   '), 'preset'), undefined);
});

test('shared query-state location readers preserve translation bootstrap semantics', () => {
  assert.equal(readLocationSearchParams({ search: '?channel=production&page=2' })?.get('channel'), 'production');
  assert.equal(readLocationSearchParams({ search: '' })?.get('channel'), null);
  assert.equal(readLocationSearchParams(null), null);
});

test('translation dashboard preserves absolute endpoints while matrix stays path-only and queue keeps existing query strings', () => {
  assert.equal(
    buildTranslationDashboardURL('https://example.com/admin/api/translations/dashboard', {
      channel: 'production',
      tenantId: 'tenant-1',
    }),
    'https://example.com/admin/api/translations/dashboard?channel=production&tenant_id=tenant-1'
  );
  assert.equal(
    buildTranslationMatrixURL('https://example.com/admin/api/translations/matrix', {
      channel: 'production',
      orgId: 'org-1',
    }),
    '/admin/api/translations/matrix?channel=production&org_id=org-1'
  );
  assert.equal(
    buildAssignmentListURL('https://example.com/admin/api/translations/assignments?status=open', {
      reviewerId: '__me__',
      reviewState: 'qa_blocked',
    }),
    'https://example.com/admin/api/translations/assignments?status=open&reviewer_id=__me__&review_state=qa_blocked'
  );
});

test('translation-family path builders route through shared query-state url-state while preserving list/detail/create contracts', () => {
  assert.equal(
    buildFamilyListURL('/admin/api', {
      contentType: 'pages',
      channel: 'production',
      perPage: 25,
    }),
    '/admin/api/translations/families?content_type=pages&channel=production&page=1&per_page=25'
  );
  assert.equal(
    buildFamilyDetailURL('/admin/api', 'tg-page-1', 'production'),
    '/admin/api/translations/families/tg-page-1?channel=production'
  );
  assert.equal(
    buildCreateLocaleURL('/admin/api', 'tg-page-1', 'production'),
    '/admin/api/translations/families/tg-page-1/variants?channel=production'
  );
});

test('translation dashboard, family, matrix, and queue callers now route through shared/query-state/url-state', () => {
  const dashboardSource = read(dashboardSourcePath);
  const familySource = read(familySourcePath);
  const matrixSource = read(matrixSourcePath);
  const queueSource = read(queueSourcePath);

  assert.match(dashboardSource, /from '\.\.\/shared\/query-state\/url-state\.js'/);
  assert.match(dashboardSource, /buildEndpointURL/);
  assert.doesNotMatch(dashboardSource, /new URL\(normalizedEndpoint,/);

  assert.match(familySource, /from '\.\.\/shared\/query-state\/url-state\.js'/);
  assert.match(familySource, /buildURL/);
  assert.match(familySource, /setSearchParam/);
  assert.match(familySource, /setNumberSearchParam/);
  assert.doesNotMatch(familySource, /const encoded = query\.toString\(\)/);
  assert.doesNotMatch(familySource, /return query \? `\$\{path\}\?\$\{query\}` : path/);

  assert.match(matrixSource, /from '\.\.\/shared\/query-state\/url-state\.js'/);
  assert.match(matrixSource, /buildEndpointURL/);
  assert.match(matrixSource, /setJoinedSearchParam/);
  assert.match(matrixSource, /getNumberSearchParam/);
  assert.match(matrixSource, /readLocationSearchParams/);
  assert.match(matrixSource, /getStringSearchParam/);
  assert.doesNotMatch(matrixSource, /new URL\(endpoint,\s*'http:\/\/localhost'\)/);
  assert.doesNotMatch(matrixSource, /typeof query\.page === 'number'/);
  assert.doesNotMatch(matrixSource, /new URLSearchParams\(globalThis\.location\.search\)/);

  assert.match(queueSource, /from '\.\.\/shared\/query-state\/url-state\.js'/);
  assert.match(queueSource, /buildEndpointURL/);
  assert.match(queueSource, /setNumberSearchParam/);
  assert.match(queueSource, /readLocationSearchParams/);
  assert.match(queueSource, /getStringSearchParam/);
  assert.doesNotMatch(queueSource, /endpoint\.includes\('\?'\)\s*\?\s*'&'\s*:\s*'\?'/);
  assert.doesNotMatch(queueSource, /state\.page && state\.page > 0/);
  assert.doesNotMatch(queueSource, /new URLSearchParams\(window\.location\.search\)/);
});
