import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const {
  buildFamilyDetailURL,
  buildFamilyDetailUIURL,
  buildFamilyListBrowserSearch,
  buildFamilyListQuery,
  buildFamilyListURL,
  buildFamilyMatrixURL,
  buildFamilyQueueURL,
  createFamilyFilters,
  createTranslationFamilyClient,
  fetchTranslationFamilyListState,
  getReadinessChip,
  initTranslationFamilyListPage,
  normalizeFamilyDetail,
  normalizeFamilyListResponse,
  parseFamilyListFiltersFromSearchParams,
  renderReadinessChip,
  renderTranslationFamilyListState,
} = await import('../dist/translation-family/index.js');

const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const translationFamilySourcePath = path.resolve(testFileDir, '../src/translation-family/index.ts');

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();

function setGlobals(win) {
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.Document = win.Document;
  globalThis.Node = win.Node;
  globalThis.Element = win.Element;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.HTMLFormElement = win.HTMLFormElement;
  globalThis.HTMLSelectElement = win.HTMLSelectElement;
  globalThis.FormData = win.FormData;
  globalThis.Event = win.Event;
  Object.defineProperty(globalThis, 'navigator', { value: win.navigator, configurable: true });
  Object.defineProperty(globalThis, 'location', { value: win.location, configurable: true });
}

function nextTick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

test('translation-family contracts: normalize list payloads and filter query state', () => {
  const filters = createFamilyFilters({
    contentType: 'pages',
    readinessState: 'blocked',
    blockerCode: 'missing_locale',
    missingLocale: 'fr',
    perPage: 25,
  });

  assert.deepEqual(filters, {
    contentType: 'pages',
    readinessState: 'blocked',
    blockerCode: 'missing_locale',
    missingLocale: 'fr',
    page: 1,
    perPage: 25,
    channel: '',
  });

  const query = buildFamilyListQuery(filters);
  assert.equal(query.get('content_type'), 'pages');
  assert.equal(query.get('readiness_state'), 'blocked');
  assert.equal(query.get('blocker_code'), 'missing_locale');
  assert.equal(query.get('missing_locale'), 'fr');
  assert.equal(query.get('per_page'), '25');
  assert.equal(buildFamilyListURL('/admin/api', filters), '/admin/api/translations/families?content_type=pages&readiness_state=blocked&blocker_code=missing_locale&missing_locale=fr&page=1&per_page=25');

  const payload = normalizeFamilyListResponse({
    data: {
      items: [
        {
          family_id: 'tg-page-1',
          content_type: 'pages',
          source_locale: 'en',
          readiness_state: 'blocked',
          blocker_codes: ['missing_locale', 'pending_review'],
          blocker_labels: { missing_locale: 'Missing locale', pending_review: 'Pending review' },
          missing_locales: ['fr'],
          available_locales: ['en', 'es'],
        },
      ],
    },
    meta: {
      total: 1,
      page: 1,
      per_page: 25,
      channel: 'production',
    },
  });

  assert.equal(payload.total, 1);
  assert.equal(payload.channel, 'production');
  assert.equal(payload.items[0].familyId, 'tg-page-1');
  assert.deepEqual(payload.items[0].blockerCodes, ['missing_locale', 'pending_review']);
  assert.deepEqual(payload.items[0].blockerLabels, { missing_locale: 'Missing locale', pending_review: 'Pending review' });
});

test('translation-family list page: parses URL filters and preserves unrelated query state', () => {
  const filters = parseFamilyListFiltersFromSearchParams(new URLSearchParams(
    'channel=default&content_type=pages&readiness_state=blocked&blocker_code=missing_locale&missing_locale=fr&page=2&per_page=25'
  ));

  assert.deepEqual(filters, {
    contentType: 'pages',
    readinessState: 'blocked',
    blockerCode: 'missing_locale',
    missingLocale: 'fr',
    page: 2,
    perPage: 25,
    channel: 'default',
  });

  const nextSearch = buildFamilyListBrowserSearch(new URLSearchParams('debug=1&channel=old'), {
    ...filters,
    readinessState: 'ready',
    page: 1,
  });
  assert.equal(nextSearch, 'debug=1&content_type=pages&readiness_state=ready&blocker_code=missing_locale&missing_locale=fr&channel=default&page=1&per_page=25');
});

test('translation-family list page: renders loading empty error and populated states', () => {
  const filters = createFamilyFilters({ channel: 'production', readinessState: 'blocked', blockerCode: 'missing_locale' });
  const row = normalizeFamilyListResponse({
    data: {
      items: [{
        family_id: 'tg-page-1',
        content_type: 'pages',
        source_locale: 'en',
        source_title: 'Landing Page',
        source_record_id: 'page-1',
        readiness_state: 'blocked',
        blocker_codes: ['missing_locale'],
        blocker_labels: { missing_locale: 'Missing locale' },
        missing_required_locale_count: 1,
        pending_review_count: 2,
        outdated_locale_count: 3,
        missing_locales: ['fr'],
        available_locales: ['en', 'es'],
      }, {
        family_id: 'tg-policy-unavailable',
        content_type: 'news',
        source_locale: 'en',
        source_title: 'News Policy',
        source_record_id: 'news-1',
        readiness_state: 'blocked',
        blocker_codes: ['policy_denied'],
        blocker_labels: { policy_denied: 'Policy denied', policy_unavailable: 'Policy unavailable' },
        missing_required_locale_count: 0,
        pending_review_count: 0,
        outdated_locale_count: 0,
        missing_locales: [],
        available_locales: ['en'],
      }],
    },
    meta: { total: 2, page: 1, per_page: 50, channel: 'production' },
  });
  assert.equal(row.items[1].blockerLabels.policy_denied, 'Policy denied');
  assert.equal(row.items[1].blockerLabels.policy_unavailable, 'Policy unavailable');

  const options = {
    basePath: '/admin',
    familyBasePath: '/admin/translations/families',
    matrixPath: '/admin/translations/matrix',
    queuePath: '/admin/translations/queue',
  };
  const loadingHTML = renderTranslationFamilyListState({ status: 'loading', filters }, options);
  assert.match(loadingHTML, /Loading translation families/);

  const emptyHTML = renderTranslationFamilyListState({ status: 'empty', filters, response: { ...row, items: [], total: 0 } }, options);
  assert.match(emptyHTML, /No translation families found/);

  const errorHTML = renderTranslationFamilyListState({
    status: 'error',
    filters,
    message: 'backend unavailable',
    requestURL: '/admin/api/translations/families?readiness_state=blocked',
    requestId: 'req-1',
    traceId: 'trace-1',
    errorCode: 'INTERNAL_ERROR',
  }, options);
  assert.match(errorHTML, /backend unavailable/);
  assert.match(errorHTML, /Retry/);
  assert.match(errorHTML, /Request req-1/);

  const readyHTML = renderTranslationFamilyListState({ status: 'ready', filters, response: row }, options);
  assert.match(readyHTML, /Landing Page/);
  assert.match(readyHTML, /Missing locale/);
  assert.match(readyHTML, /Policy unavailable/);
  assert.match(readyHTML, /FR/);
  assert.match(readyHTML, /Open family/);
  assert.match(readyHTML, /href="\/admin\/translations\/families\/tg-page-1\?channel=production"/);
  assert.match(readyHTML, /href="\/admin\/translations\/matrix\?family_id=tg-page-1&amp;channel=production/);
  assert.match(readyHTML, /href="\/admin\/translations\/queue\?family_id=tg-page-1&amp;channel=production"/);
  assert.equal(/data-family-primary-action="true"[^>]*href="\/admin\/api\//.test(readyHTML), false);
});

test('translation-family list page: builds UI context URLs without API paths', () => {
  const filters = createFamilyFilters({ channel: 'production', readinessState: 'blocked', blockerCode: 'missing_locale' });
  const row = normalizeFamilyListResponse({
    families: [{
      family_id: 'tg-page-1',
      content_type: 'pages',
      source_locale: 'en',
      readiness_state: 'blocked',
    }],
    total: 1,
  }).items[0];

  assert.equal(buildFamilyDetailUIURL('/admin/translations/families', row.familyId, 'production'), '/admin/translations/families/tg-page-1?channel=production');
  assert.equal(buildFamilyMatrixURL('/admin/translations/matrix', row, filters), '/admin/translations/matrix?family_id=tg-page-1&channel=production&content_type=pages&readiness_state=blocked&blocker_code=missing_locale');
  assert.equal(buildFamilyQueueURL('/admin/translations/queue', row, filters), '/admin/translations/queue?family_id=tg-page-1&channel=production');
});

test('translation-family list page: fetches through endpoint-derived API base', async () => {
  const requests = [];
  const state = await fetchTranslationFamilyListState('/admin/api/translations/families', createFamilyFilters({
    channel: 'production',
    readinessState: 'blocked',
    perPage: 25,
  }), {
    fetch: async (url) => {
      requests.push(String(url));
      return new Response(JSON.stringify({
        data: { items: [{ family_id: 'tg-page-1', content_type: 'pages', source_locale: 'en', readiness_state: 'blocked' }] },
        meta: { total: 1, page: 1, per_page: 25, channel: 'production' },
      }), { status: 200, headers: { 'Content-Type': 'application/json', 'X-Request-Id': 'req-list' } });
    },
  });

  assert.equal(requests[0], '/admin/api/translations/families?readiness_state=blocked&channel=production&page=1&per_page=25');
  assert.equal(state.status, 'ready');
  assert.equal(state.requestId, 'req-list');
  assert.equal(state.response.items[0].familyId, 'tg-page-1');
});

test('translation-family list page: initializer hydrates filters and updates browser URL on filter changes', async () => {
  const dom = new JSDOM(`
    <div
      id="root"
      data-endpoint="/admin/api/translations/families"
      data-base-path="/admin"
      data-family-base-path="/admin/translations/families"
      data-matrix-path="/admin/translations/matrix"
    ></div>
  `, { url: 'http://localhost:8082/admin/translations/families?channel=default&content_type=pages&readiness_state=blocked&debug=1' });
  setGlobals(dom.window);
  const requests = [];
  const fetchImpl = async (url) => {
    requests.push(String(url));
    const page = Number(new URL(String(url), 'http://localhost:8082').searchParams.get('page') || '1');
    return new Response(JSON.stringify({
      data: { items: [{ family_id: 'tg-page-1', content_type: 'pages', source_locale: 'en', readiness_state: 'blocked' }] },
      meta: { total: 75, page, per_page: 50, channel: 'default' },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const root = dom.window.document.getElementById('root');
  const state = await initTranslationFamilyListPage(root, { fetch: fetchImpl });
  assert.equal(state.status, 'ready');
  assert.equal(requests[0], '/admin/api/translations/families?content_type=pages&readiness_state=blocked&channel=default&page=1&per_page=50');
  assert.match(root.innerHTML, /Open family/);
  assert.match(root.innerHTML, /data-family-list-page="next"/);
  assert.match(root.innerHTML, /Page 1/);

  const readiness = root.querySelector('select[name="readiness_state"]');
  readiness.value = 'ready';
  readiness.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await nextTick();
  await nextTick();

  assert.equal(requests[1], '/admin/api/translations/families?content_type=pages&readiness_state=ready&channel=default&page=1&per_page=50');
  assert.equal(dom.window.location.search, '?debug=1&content_type=pages&readiness_state=ready&channel=default&page=1&per_page=50');

  const contentType = root.querySelector('input[name="content_type"]');
  contentType.value = '';
  root.querySelector('[data-family-list-filters="true"]').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await nextTick();
  await nextTick();

  assert.equal(requests[2], '/admin/api/translations/families?readiness_state=ready&channel=default&page=1&per_page=50');
  assert.equal(dom.window.location.search, '?debug=1&readiness_state=ready&channel=default&page=1&per_page=50');

  root.querySelector('[data-family-list-page="next"]').dispatchEvent(new dom.window.Event('click', { bubbles: true }));
  await nextTick();
  await nextTick();

  assert.equal(requests[3], '/admin/api/translations/families?readiness_state=ready&channel=default&page=2&per_page=50');
  assert.equal(dom.window.location.search, '?debug=1&readiness_state=ready&channel=default&page=2&per_page=50');
});

test('translation-family contracts: normalize detail payloads and render readiness chips', () => {
  const detail = normalizeFamilyDetail({
    data: {
      family_id: 'tg-page-1',
      content_type: 'pages',
      source_locale: 'en',
      readiness_state: 'blocked',
      source_variant: {
        id: 'variant-en',
        family_id: 'tg-page-1',
        locale: 'en',
        status: 'published',
        is_source: true,
        source_record_id: 'page-1',
        fields: { title: 'Page 1' },
      },
      locale_variants: [
        { id: 'variant-en', family_id: 'tg-page-1', locale: 'en', status: 'published', is_source: true, source_record_id: 'page-1' },
        { id: 'variant-es', family_id: 'tg-page-1', locale: 'es', status: 'in_review', is_source: false, source_record_id: 'page-1-es' },
      ],
      blockers: [
        { id: 'blocker-1', family_id: 'tg-page-1', blocker_code: 'missing_locale', locale: 'fr' },
        { id: 'blocker-2', family_id: 'tg-page-1', blocker_code: 'pending_review', locale: 'es' },
      ],
      active_assignments: [
        { id: 'asg-1', family_id: 'tg-page-1', source_locale: 'en', target_locale: 'es', work_scope: '__all__', status: 'in_progress' },
      ],
      publish_gate: {
        allowed: false,
        override_allowed: true,
        blocked_by: ['missing_locale', 'pending_review'],
        review_required: true,
      },
      readiness_summary: {
        state: 'blocked',
        required_locales: ['es', 'fr'],
        missing_locales: ['fr'],
        available_locales: ['en', 'es'],
        blocker_codes: ['missing_locale', 'pending_review'],
        missing_required_locale_count: 1,
        pending_review_count: 1,
        outdated_locale_count: 0,
        publish_ready: false,
      },
    },
  });

  assert.equal(detail.sourceVariant?.locale, 'en');
  assert.equal(detail.blockers[0].blockerCode, 'missing_locale');
  assert.equal(detail.publishGate.overrideAllowed, true);
  assert.equal(detail.readinessSummary.pendingReviewCount, 1);

  assert.deepEqual(getReadinessChip('ready'), { state: 'ready', label: 'Ready', tone: 'success' });
  assert.equal(renderReadinessChip('blocked').includes('data-readiness-state="blocked"'), true);
});

test('translation-family contracts: client builds canonical endpoints for list and detail', async () => {
  const requests = [];
  const client = createTranslationFamilyClient({
    basePath: '/admin/api',
    fetch: async (url) => {
      requests.push(String(url));
      return {
        async json() {
          if (String(url).includes('/translations/families/tg-page-1')) {
            return {
              data: {
                family_id: 'tg-page-1',
                content_type: 'pages',
                source_locale: 'en',
                readiness_state: 'ready',
                source_variant: { id: 'variant-en', family_id: 'tg-page-1', locale: 'en', status: 'published', is_source: true },
                locale_variants: [],
                blockers: [],
                active_assignments: [],
                publish_gate: { allowed: true, override_allowed: false, blocked_by: [], review_required: false },
                readiness_summary: { state: 'ready', required_locales: ['es'], missing_locales: [], available_locales: ['en', 'es'], blocker_codes: [], missing_required_locale_count: 0, pending_review_count: 0, outdated_locale_count: 0, publish_ready: true },
              },
            };
          }
          return {
            data: {
              items: [{ family_id: 'tg-page-1', content_type: 'pages', source_locale: 'en', readiness_state: 'ready' }],
            },
            meta: {
              total: 1,
              page: 1,
              per_page: 10,
              channel: 'production',
            },
          };
        },
      };
    },
  });

  const list = await client.list({ contentType: 'pages', perPage: 10, channel: 'production' });
  const detail = await client.detail('tg-page-1', 'production');

  assert.equal(requests[0], '/admin/api/translations/families?content_type=pages&channel=production&page=1&per_page=10');
  assert.equal(requests[1], buildFamilyDetailURL('/admin/api', 'tg-page-1', 'production'));
  assert.equal(list.items[0].familyId, 'tg-page-1');
  assert.equal(detail.familyId, 'tg-page-1');
});

test('translation-family contracts: client routes typed response readers through shared transport helper', () => {
  const source = fs.readFileSync(translationFamilySourcePath, 'utf8');

  assert.match(source, /from '\.\.\/shared\/transport\/http-client\.js'/);
  assert.match(source, /async function readTranslationFamilyClientRecord\(response: Response\): Promise<Record<string, unknown>>/);
  assert.match(source, /return readHTTPJSON<Record<string, unknown>>\(response\)/);
  assert.equal((source.match(/readTranslationFamilyClientRecord\(response\)/g) || []).length, 3);
  assert.equal((source.match(/response\.json\(\) as Record<string, unknown>/g) || []).length, 0);
});
