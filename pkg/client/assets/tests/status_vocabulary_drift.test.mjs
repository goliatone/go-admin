/**
 * Status Vocabulary Drift Test
 *
 * Guards the single-source-of-truth contract between the canonical status
 * registry (src/shared/status-vocabulary.ts) and the SSR renderers:
 *   - pkg/client/templates/partials/status-badge.html
 *   - pkg/client/templates/dashboard_widget_content.html
 *
 * Every status entry declared in the SSR partial must exist in the registry
 * with the same tone, label, and icon. The dashboard widget template must
 * render status chips through the partial instead of a local tone map.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const registrySource = readFileSync(
  resolve(here, '../src/shared/status-vocabulary.ts'),
  'utf8'
);
const partialSource = readFileSync(
  resolve(here, '../../templates/partials/status-badge.html'),
  'utf8'
);
const widgetSource = readFileSync(
  resolve(here, '../../templates/dashboard_widget_content.html'),
  'utf8'
);

/**
 * Parse TRANSLATION_STATUS_REGISTRY entries from the TS source.
 * Entries are intentionally single-line:
 *   draft: { tone: 'neutral', label: 'Draft', icon: 'edit-pencil' },
 */
function parseRegistry(source) {
  const blockMatch = source.match(
    /TRANSLATION_STATUS_REGISTRY[^=]*=\s*\{([\s\S]*?)\n\};/
  );
  assert.ok(blockMatch, 'TRANSLATION_STATUS_REGISTRY block not found in status-vocabulary.ts');
  const entries = {};
  const entryRe =
    /^\s*([a-z_]+):\s*\{\s*tone:\s*'([a-z]+)',\s*label:\s*'([^']+)',\s*icon:\s*'([a-z0-9-]+)'\s*\},?\s*$/gm;
  let match;
  while ((match = entryRe.exec(blockMatch[1])) !== null) {
    entries[match[1]] = { tone: match[2], label: match[3], icon: match[4] };
  }
  return entries;
}

/**
 * Parse the per-status `if/elif` entries from the SSR partial.
 * Entries are intentionally single-line:
 *   {% elif status == "open" %}{% set registry_tone = "info" %}{% set status_icon = "inbox" %}{% set status_label = "Open" %}
 */
function parsePartial(source) {
  const entries = {};
  const entryRe =
    /\{%\s*(?:el)?if status == "([a-z_]+)"\s*%\}\{% set registry_tone = "([a-z]+)" %\}\{% set status_icon = "([a-z0-9-]+)" %\}\{% set status_label = "([^"]+)" %\}/g;
  let match;
  while ((match = entryRe.exec(source)) !== null) {
    entries[match[1]] = { tone: match[2], label: match[4], icon: match[3] };
  }
  return entries;
}

const registry = parseRegistry(registrySource);
const partial = parsePartial(partialSource);

describe('status vocabulary drift', () => {
  it('parses a non-trivial registry and partial', () => {
    assert.ok(Object.keys(registry).length >= 40, `registry too small: ${Object.keys(registry).length}`);
    assert.ok(Object.keys(partial).length >= 40, `partial map too small: ${Object.keys(partial).length}`);
  });

  it('every SSR partial status matches the registry tone/label/icon', () => {
    const mismatches = [];
    for (const [status, entry] of Object.entries(partial)) {
      const expected = registry[status];
      if (!expected) {
        mismatches.push(`${status}: present in partial but missing from registry`);
        continue;
      }
      if (expected.tone !== entry.tone) {
        mismatches.push(`${status}: tone partial=${entry.tone} registry=${expected.tone}`);
      }
      if (expected.label !== entry.label) {
        mismatches.push(`${status}: label partial="${entry.label}" registry="${expected.label}"`);
      }
      if (expected.icon !== entry.icon) {
        mismatches.push(`${status}: icon partial=${entry.icon} registry=${expected.icon}`);
      }
    }
    assert.deepEqual(mismatches, [], `SSR partial drifted from registry:\n${mismatches.join('\n')}`);
  });

  it('every registry status is renderable by the SSR partial', () => {
    const missing = Object.keys(registry).filter((status) => !partial[status]);
    assert.deepEqual(missing, [], `registry statuses missing from SSR partial: ${missing.join(', ')}`);
  });

  it('documented conflict resolutions hold', () => {
    assert.equal(registry.in_review?.tone, 'warning', 'in_review must be warning');
    assert.equal(registry.review?.tone, 'warning', 'review must be warning');
    assert.equal(registry.changes_requested?.tone, 'error', 'changes_requested must be error');
    assert.equal(registry.missing_locale?.tone, 'warning', 'missing_locale must be warning');
    assert.equal(registry.missing_locales?.tone, 'warning', 'missing_locales must be warning');
    assert.equal(registry.in_progress?.tone, 'info', 'in_progress must be info');
    assert.equal(registry.pending_review?.tone, 'warning', 'pending_review must be warning');
  });

  it('dashboard widget renders status chips through the shared partial', () => {
    const translationSection = widgetSource.slice(
      widgetSource.indexOf('admin.widget.translation_progress')
    );
    assert.ok(
      translationSection.includes('{% include "partials/status-badge.html"'),
      'translation progress widget must include partials/status-badge.html'
    );
    assert.ok(
      !/status_lower\s*==/.test(translationSection),
      'translation progress widget must not carry a local status→tone switch'
    );
    assert.ok(
      !/bg-purple-100/.test(translationSection),
      'translation progress widget must not hardcode purple status tints'
    );
  });

  it('partial emits only status-chip tone classes', () => {
    const toneClassRe = /status-chip--([a-z]+)/g;
    const allowed = new Set(['neutral', 'info', 'success', 'warning', 'error', 'source']);
    let match;
    while ((match = toneClassRe.exec(partialSource)) !== null) {
      assert.ok(allowed.has(match[1]), `unexpected tone modifier status-chip--${match[1]}`);
    }
    assert.ok(
      !/bg-(amber|rose|emerald|sky|slate|gray)-\d/.test(partialSource),
      'partial must use status-chip tone classes, not inline Tailwind tints'
    );
  });
});
