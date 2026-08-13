import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const here = fileURLToPath(new URL('.', import.meta.url));
const assetsRoot = resolve(here, '..');
const activityCSS = readFileSync(resolve(assetsRoot, 'src/styles/activity.css'), 'utf8');
const activityTemplate = readFileSync(
  resolve(assetsRoot, '../templates/resources/activity/list.html'),
  'utf8',
);

const dom = new JSDOM('<!doctype html><html><body><table><tbody id="activity-table-body"></tbody></table></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.HTMLTableRowElement = dom.window.HTMLTableRowElement;

const activity = await import('../dist/activity/index.js');

function cssRule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = activityCSS.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `missing CSS rule ${selector}`);
  return match[1];
}

function activityEntry() {
  const metadata = {};
  for (let index = 1; index <= 14; index += 1) {
    metadata[`field_${index}`] = `value_${index}`;
  }
  return {
    id: 'activity-layout-1',
    actor: 'Owner User',
    action: 'customer_pii.reveal',
    action_key: 'customer_pii.reveal',
    object: 'customer:customer-1',
    channel: 'admin',
    metadata,
    created_at: '2026-08-12T12:00:00Z',
  };
}

test('Activity table row uses compact semantic controls for representative long labels', () => {
  const manager = new activity.ActivityManager({
    apiPath: '/admin/api/activity',
    basePath: '/admin',
    actionLabels: { 'customer_pii.reveal': 'Revealed customer PII' },
  });
  const { mainRow, detailsRow } = manager.createRowPair(activityEntry());

  const actionCell = mainRow.querySelector('.activity-action-cell');
  const actionBadge = mainRow.querySelector('.activity-action-badge');
  const actionLabel = mainRow.querySelector('.activity-action-label');
  const metadataToggle = mainRow.querySelector('.activity-metadata-toggle');
  const metadataLabel = mainRow.querySelector('.activity-metadata-toggle-label');
  const chevron = mainRow.querySelector('.activity-metadata-chevron');

  assert.ok(actionCell);
  assert.ok(actionBadge);
  assert.equal(actionBadge.getAttribute('style'), null);
  assert.equal(actionBadge.getAttribute('title'), 'Revealed customer PII');
  assert.equal(actionLabel?.textContent, 'Revealed customer PII');
  assert.equal(metadataToggle?.getAttribute('style'), null);
  assert.equal(metadataLabel?.textContent, '14 fields');
  assert.equal(chevron?.getAttribute('style'), null);

  document.querySelector('#activity-table-body').replaceChildren(mainRow, detailsRow);
  manager.wireMetadataToggles();
  metadataToggle.click();

  assert.equal(metadataToggle.getAttribute('aria-expanded'), 'true');
  assert.equal(detailsRow.style.display, 'table-row');
  assert.equal(metadataToggle.style.background, '');
  assert.equal(chevron.style.transform, '');
});

test('Activity stylesheet keeps action and Details controls on one line with bounded overflow', () => {
  assert.match(cssRule('.activity-action-badge'), /flex-wrap:\s*nowrap/);
  assert.match(cssRule('.activity-action-badge'), /max-width:\s*100%/);
  assert.match(cssRule('.activity-action-badge'), /white-space:\s*nowrap/);
  assert.match(cssRule('.activity-action-label'), /overflow:\s*hidden/);
  assert.match(cssRule('.activity-action-label'), /text-overflow:\s*ellipsis/);
  assert.match(cssRule('.activity-metadata-toggle'), /flex-wrap:\s*nowrap/);
  assert.match(cssRule('.activity-metadata-toggle'), /white-space:\s*nowrap/);
  assert.match(cssRule('.activity-metadata-chevron'), /flex:\s*0 0 auto/);
});

test('Activity template uses named columns and a horizontally scrollable minimum table width', () => {
  assert.match(cssRule('.activity-table'), /min-width:\s*900px/);
  assert.match(cssRule('.activity-table'), /table-layout:\s*fixed/);
  assert.match(cssRule('.activity-table__col--action'), /width:\s*220px/);
  assert.match(cssRule('.activity-table__col--details'), /width:\s*120px/);
  assert.match(activityTemplate, /class="overflow-x-auto"/);
  assert.match(activityTemplate, /class="activity-table__col activity-table__col--action"/);
  assert.match(activityTemplate, /class="activity-table__col activity-table__col--details"/);
  assert.doesNotMatch(activityTemplate, /<table[^>]+style="[^"]*table-layout/);
});

