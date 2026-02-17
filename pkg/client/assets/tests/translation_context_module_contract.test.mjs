import test from 'node:test';
import assert from 'node:assert/strict';

const {
  extractTranslationReadiness,
  renderReadinessIndicator,
  renderStatusBadge,
} = await import('../dist/datatable/index.js');

test('translation-context module contract: extracts canonical readiness fields', () => {
  const readiness = extractTranslationReadiness({
    translation_group_id: 'tg_1',
    translation_readiness: {
      required_locales: ['en', 'es', 'fr'],
      available_locales: ['en'],
      missing_required_locales: ['es', 'fr'],
      readiness_state: 'missing_locales',
      ready_for_transition: { publish: false },
    },
  });

  assert.equal(readiness.translationGroupId, 'tg_1');
  assert.deepEqual(readiness.requiredLocales, ['en', 'es', 'fr']);
  assert.deepEqual(readiness.availableLocales, ['en']);
  assert.deepEqual(readiness.missingRequiredLocales, ['es', 'fr']);
  assert.equal(readiness.readinessState, 'missing_locales');
  assert.equal(readiness.readyForTransition.publish, false);
});

test('translation-context module contract: readiness and status badges render non-empty HTML', () => {
  const readinessBadge = renderReadinessIndicator({
    translation_readiness: {
      required_locales: ['en', 'es'],
      available_locales: ['en'],
      missing_required_locales: ['es'],
      readiness_state: 'missing_locales',
      ready_for_transition: { publish: false },
    },
  });
  const statusBadge = renderStatusBadge('missing_locales');

  assert.ok(readinessBadge.includes('data-readiness-state="missing_locales"'));
  assert.ok(statusBadge.length > 0);
});
