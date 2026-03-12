import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const {
  buildFamilyActivityPreview,
  fetchTranslationFamilyDetailState,
  normalizeFamilyDetail,
  renderTranslationFamilyDetailState,
} = await import('../dist/translation-family/index.js');

const fixtureURL = new URL('./fixtures/translation_phase4/family_states.json', import.meta.url);
const fixtures = JSON.parse(await readFile(fixtureURL, 'utf8'));

test('translation-family phase 4: renders complete family detail surface from ready fixture', () => {
  const detail = normalizeFamilyDetail(fixtures.ready);
  const html = renderTranslationFamilyDetailState(
    { status: 'ready', detail, requestId: 'req-ready', traceId: 'trace-ready' },
    { basePath: '/admin', contentBasePath: '/admin/content' }
  );

  assert.match(html, /Translation family/i);
  assert.match(html, /Locale coverage/i);
  assert.match(html, /Assignments/i);
  assert.match(html, /Publish gate/i);
  assert.match(html, /Activity preview/i);
  assert.match(html, /Open locale/i);
  assert.match(html, /Request req-ready/);
  assert.match(html, /Trace trace-ready/);
});

test('translation-family phase 4: missing-locale fixture renders blocked locale row', () => {
  const detail = normalizeFamilyDetail(fixtures.missing_locale);
  const html = renderTranslationFamilyDetailState(
    { status: 'ready', detail },
    { basePath: '/admin', contentBasePath: '/admin/content' }
  );

  assert.match(html, /Missing required locale/i);
  assert.match(html, /FR/);
  assert.match(html, /Phase 6 create flow/i);
});

test('translation-family phase 4: blocker fixtures render canonical blocker labels', () => {
  const cases = [
    ['blocked', /Policy denied/i],
    ['missing_field', /Missing field/i],
    ['pending_review', /Pending review/i],
    ['outdated_source', /Outdated source/i],
  ];

  for (const [name, matcher] of cases) {
    const detail = normalizeFamilyDetail(fixtures[name]);
    const html = renderTranslationFamilyDetailState({ status: 'ready', detail });
    assert.match(html, matcher, `expected ${name} fixture to render ${matcher}`);
  }
});

test('translation-family phase 4: derives activity preview from variant and assignment timestamps', () => {
  const detail = normalizeFamilyDetail(fixtures.outdated_source);
  const preview = buildFamilyActivityPreview(detail, 3);

  assert.equal(preview.length, 3);
  assert.equal(preview[0].title.includes('variant published') || preview[0].title.includes('assignment'), true);
  assert.equal(preview[0].timestamp >= preview[1].timestamp, true);
});

test('translation-family phase 4: loading and conflict states render accessible feedback', async () => {
  const loadingHTML = renderTranslationFamilyDetailState({ status: 'loading' });
  assert.match(loadingHTML, /aria-busy="true"/);

  globalThis.fetch = async () => ({
    ok: false,
    status: 409,
    headers: {
      get(name) {
        const key = String(name).toLowerCase();
        if (key === 'content-type') return 'application/json';
        if (key === 'x-request-id') return 'req-conflict';
        if (key === 'x-trace-id') return 'trace-conflict';
        return null;
      },
    },
    clone() {
      return this;
    },
    async text() {
      return JSON.stringify({
        error: {
          text_code: 'VERSION_CONFLICT',
          message: 'record version mismatch',
        },
      });
    },
  });

  const state = await fetchTranslationFamilyDetailState('/admin/api/translations/families/family-conflict');
  assert.equal(state.status, 'conflict');
  assert.equal(state.requestId, 'req-conflict');
  assert.equal(state.traceId, 'trace-conflict');
  assert.equal(state.errorCode, 'VERSION_CONFLICT');

  const conflictHTML = renderTranslationFamilyDetailState(state);
  assert.match(conflictHTML, /Reload family detail/i);
  assert.match(conflictHTML, /Code VERSION_CONFLICT/);
});
