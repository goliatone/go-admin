import test from 'node:test';
import assert from 'node:assert/strict';

const {
  applyCreateLocaleToFamilyDetail,
  applyCreateLocaleToSummaryState,
  buildCreateLocaleURL,
  createTranslationCreateLocaleActionModel,
  createTranslationFamilyClient,
  normalizeCreateLocaleResult,
  normalizeFamilyDetail,
  serializeCreateLocaleRequest,
  toDateTimeLocalInputValue,
} = await import('../dist/translation-family/index.js');

function createLocaleEnvelope(overrides = {}) {
  return {
    data: {
      variant_id: 'variant-fr',
      family_id: 'tg-page-1',
      locale: 'fr',
      status: 'draft',
      record_id: 'page-fr-1',
      content_type: 'pages',
      navigation: {
        content_detail_url: '/admin/content/pages/page-fr-1?locale=fr',
        content_edit_url: '/admin/content/pages/page-fr-1/edit?locale=fr',
      },
      assignment: {
        assignment_id: 'asg-fr',
        status: 'assigned',
        target_locale: 'fr',
        work_scope: '__all__',
        assignee_id: 'translator-1',
        priority: 'high',
        due_date: '2026-03-20T00:00:00Z',
      },
      ...(overrides.data || {}),
    },
    meta: {
      idempotency_hit: false,
      assignment_reused: false,
      family: {
        family_id: 'tg-page-1',
        readiness_state: 'blocked',
        missing_required_locale_count: 0,
        pending_review_count: 1,
        outdated_locale_count: 0,
        blocker_codes: ['pending_review'],
        missing_locales: [],
        available_locales: ['en', 'es', 'fr'],
        quick_create: {
          enabled: false,
          missing_locales: [],
          recommended_locale: '',
          required_for_publish: ['es', 'fr'],
          default_assignment: {
            auto_create_assignment: false,
            work_scope: 'localization',
            priority: 'normal',
            assignee_id: '',
            due_date: '',
          },
          disabled_reason_code: 'no_missing_locales',
          disabled_reason: 'All required locales already exist for this family.',
        },
      },
      refresh: {
        family_detail: true,
        family_list: true,
        content_summary: true,
      },
      ...(overrides.meta || {}),
    },
  };
}

test('translation-family create-locale: action model serializes canonical request shape', () => {
  const action = createTranslationCreateLocaleActionModel({
    familyId: 'tg-page-1',
    basePath: '/admin/api',
    locale: 'FR',
    channel: 'production',
    autoCreateAssignment: true,
    assigneeId: 'translator-1',
    priority: 'HIGH',
    dueDate: '2026-03-20T00:00:00Z',
    idempotencyKey: 'idem-family-fr',
  });

  assert.equal(buildCreateLocaleURL('/admin/api', 'tg-page-1', 'production'), '/admin/api/translations/families/tg-page-1/variants?channel=production');
  assert.equal(action.endpoint, '/admin/api/translations/families/tg-page-1/variants?channel=production');
  assert.equal(action.headers['X-Idempotency-Key'], 'idem-family-fr');
  assert.deepEqual(serializeCreateLocaleRequest(action.request), {
    locale: 'fr',
    auto_create_assignment: true,
    assignee_id: 'translator-1',
    priority: 'high',
    due_date: '2026-03-20T00:00:00Z',
    channel: 'production',
  });

  const result = normalizeCreateLocaleResult(createLocaleEnvelope());
  assert.equal(result.variantId, 'variant-fr');
  assert.equal(result.recordId, 'page-fr-1');
  assert.equal(result.navigation.contentEditURL, '/admin/content/pages/page-fr-1/edit?locale=fr');
  assert.equal(result.assignment?.assignmentId, 'asg-fr');
  assert.equal(result.assignment?.workScope, '__all__');
  assert.equal(result.family.availableLocales.includes('fr'), true);
  assert.equal(result.family.quickCreate.enabled, false);
  assert.equal(result.refresh.contentSummary, true);
});

test('translation-family create-locale: optimistic detail update removes missing locale blockers and seeds assignment state', () => {
  const detail = normalizeFamilyDetail({
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
      fields: { title: 'Source page' },
    },
    locale_variants: [
      { id: 'variant-en', family_id: 'tg-page-1', locale: 'en', status: 'published', is_source: true, source_record_id: 'page-1' },
      { id: 'variant-es', family_id: 'tg-page-1', locale: 'es', status: 'approved', is_source: false, source_record_id: 'page-1-es' },
    ],
    blockers: [
      { id: 'blocker-fr', family_id: 'tg-page-1', blocker_code: 'missing_locale', locale: 'fr' },
      { id: 'blocker-es', family_id: 'tg-page-1', blocker_code: 'pending_review', locale: 'es' },
    ],
    active_assignments: [],
    publish_gate: {
      allowed: false,
      override_allowed: true,
      blocked_by: ['missing_locale', 'pending_review'],
      review_required: true,
    },
    quick_create: {
      enabled: true,
      missing_locales: ['fr'],
      recommended_locale: 'fr',
      required_for_publish: ['es', 'fr'],
      default_assignment: {
        auto_create_assignment: false,
        work_scope: 'localization',
        priority: 'normal',
        assignee_id: '',
        due_date: '',
      },
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
  });

  const next = applyCreateLocaleToFamilyDetail(detail, normalizeCreateLocaleResult(createLocaleEnvelope()));

  assert.equal(next.localeVariants.some((variant) => variant.locale === 'fr' && variant.id === 'variant-fr'), true);
  assert.equal(next.blockers.some((blocker) => blocker.blockerCode === 'missing_locale' && blocker.locale === 'fr'), false);
  assert.deepEqual(next.readinessSummary.availableLocales, ['en', 'es', 'fr']);
  assert.deepEqual(next.readinessSummary.missingLocales, []);
  assert.equal(next.activeAssignments[0].id, 'asg-fr');
  assert.equal(next.activeAssignments[0].workScope, '__all__');
  assert.deepEqual(next.publishGate.blockedBy, ['pending_review']);
  assert.equal(next.publishGate.reviewRequired, true);
  assert.equal(next.quickCreate.enabled, false);
});

test('translation-family create-locale: optimistic summary update clears fallback flags for the created locale', () => {
  const summary = {
    id: 'page-1',
    family_id: 'tg-page-1',
    requested_locale: 'fr',
    resolved_locale: 'en',
    missing_requested_locale: true,
    fallback_used: true,
    available_locales: ['en', 'es'],
    missing_required_locales: ['fr'],
    translation_readiness: {
      family_id: 'tg-page-1',
      state: 'blocked',
      available_locales: ['en', 'es'],
      missing_required_locales: ['fr'],
      blocker_codes: ['missing_locale'],
      missing_required_locale_count: 1,
      pending_review_count: 0,
      outdated_locale_count: 0,
      quick_create: {
        enabled: true,
        missing_locales: ['fr'],
        recommended_locale: 'fr',
        required_for_publish: ['fr'],
        default_assignment: {
          auto_create_assignment: false,
          work_scope: 'localization',
          priority: 'normal',
          assignee_id: '',
          due_date: '',
        },
      },
    },
  };

  const next = applyCreateLocaleToSummaryState(summary, normalizeCreateLocaleResult(createLocaleEnvelope()));

  assert.deepEqual(next.available_locales, ['en', 'es', 'fr']);
  assert.deepEqual(next.missing_required_locales, []);
  assert.equal(next.missing_requested_locale, false);
  assert.equal(next.fallback_used, false);
  assert.equal(next.resolved_locale, 'fr');
  assert.equal(next.translation_readiness.state, 'blocked');
  assert.deepEqual(next.translation_readiness.blocker_codes, ['pending_review']);
  assert.equal(next.translation_readiness.quick_create.enabled, false);
});

test('translation-family create-locale: due-date hints are normalized for datetime-local inputs', () => {
  const expected = new Date('2026-03-20T00:00:00Z');
  const expectedValue = [
    expected.getFullYear(),
    String(expected.getMonth() + 1).padStart(2, '0'),
    String(expected.getDate()).padStart(2, '0'),
  ].join('-') + `T${String(expected.getHours()).padStart(2, '0')}:${String(expected.getMinutes()).padStart(2, '0')}`;
  assert.equal(toDateTimeLocalInputValue('2026-03-20T00:00:00Z'), expectedValue);
  assert.equal(toDateTimeLocalInputValue('not-a-date'), '');
});

test('translation-family create-locale: client createLocale posts canonical payload and parses response', async () => {
  const requests = [];
  const client = createTranslationFamilyClient({
    basePath: '/admin/api',
    fetch: async (url, options = {}) => {
      requests.push({
        url: String(url),
        method: options.method,
        headers: options.headers,
        body: options.body,
      });
      return {
        ok: true,
        async json() {
          return createLocaleEnvelope({
            meta: {
              idempotency_hit: true,
              assignment_reused: true,
              family: {
                family_id: 'tg-page-1',
                readiness_state: 'ready',
                missing_required_locale_count: 0,
                pending_review_count: 0,
                outdated_locale_count: 0,
                blocker_codes: [],
                missing_locales: [],
                available_locales: ['en', 'es', 'fr'],
                quick_create: {
                  enabled: false,
                  missing_locales: [],
                  recommended_locale: '',
                  required_for_publish: ['es', 'fr'],
                  default_assignment: {
                    auto_create_assignment: false,
                    work_scope: 'localization',
                    priority: 'normal',
                    assignee_id: '',
                    due_date: '',
                  },
                },
              },
              refresh: {
                family_detail: true,
                family_list: true,
                content_summary: true,
              },
            },
          });
        },
      };
    },
  });

  const result = await client.createLocale('tg-page-1', {
    locale: 'fr',
    channel: 'production',
    autoCreateAssignment: true,
    assigneeId: 'translator-1',
    priority: 'high',
    idempotencyKey: 'idem-fr',
  });

  assert.equal(requests[0].url, '/admin/api/translations/families/tg-page-1/variants?channel=production');
  assert.equal(requests[0].method, 'POST');
  assert.equal(requests[0].headers['X-Idempotency-Key'], 'idem-fr');
  assert.equal(requests[0].headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(requests[0].body), {
    locale: 'fr',
    auto_create_assignment: true,
    assignee_id: 'translator-1',
    priority: 'high',
    channel: 'production',
  });
  assert.equal(result.idempotencyHit, true);
  assert.equal(result.assignmentReused, true);
  assert.equal(result.family.readinessState, 'ready');
  assert.equal(result.recordId, 'page-fr-1');
});

test('translation-family create-locale: client throws structured error on non-2xx responses', async () => {
  const client = createTranslationFamilyClient({
    basePath: '/admin/api',
    fetch: async () => ({
      ok: false,
      status: 409,
      headers: {
        get(name) {
          const key = String(name).toLowerCase();
          if (key === 'content-type') return 'application/json';
          if (key === 'x-request-id') return 'req-create-locale';
          if (key === 'x-trace-id') return 'trace-create-locale';
          return null;
        },
      },
      clone() {
        return this;
      },
      async text() {
        return JSON.stringify({
          error: {
            text_code: 'TRANSLATION_EXISTS',
            message: 'translation already exists',
            metadata: {
              locale: 'fr',
            },
          },
        });
      },
    }),
  });

  await assert.rejects(
    () => client.createLocale('tg-page-1', { locale: 'fr' }),
    (error) => {
      assert.equal(error.textCode, 'TRANSLATION_EXISTS');
      assert.equal(error.statusCode, 409);
      assert.equal(error.requestId, 'req-create-locale');
      assert.equal(error.traceId, 'trace-create-locale');
      return true;
    }
  );
});
