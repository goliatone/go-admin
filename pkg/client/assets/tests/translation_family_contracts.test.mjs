import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const {
  buildFamilyDetailURL,
  buildFamilyListQuery,
  buildFamilyListURL,
  createFamilyFilters,
  createTranslationFamilyClient,
  getReadinessChip,
  normalizeFamilyDetail,
  normalizeFamilyListResponse,
  renderReadinessChip,
} = await import('../dist/translation-family/index.js');

const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const translationFamilySourcePath = path.resolve(testFileDir, '../src/translation-family/index.ts');

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
