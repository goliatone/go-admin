import test from 'node:test';
import assert from 'node:assert/strict';

const {
  hasBackendGroupedRows,
  normalizeBackendGroupedRows,
} = await import('../dist/datatable/index.js');

test('grouped-mode module contract: detects backend grouped rows', () => {
  const rows = [
    {
      id: 'group:tg_alpha',
      group_by: 'translation_group_id',
      translation_group_id: 'tg_alpha',
      records: [
        { id: 'alpha_en', locale: 'en', title: 'Alpha EN' },
        { id: 'alpha_fr', locale: 'fr', title: 'Alpha FR' },
      ],
      translation_group_summary: {
        available_locales: ['en', 'fr'],
        missing_locales: ['es'],
        readiness_state: 'missing_locales',
        available_count: 2,
        required_count: 3,
      },
      _group: { row_type: 'group', id: 'tg_alpha' },
    },
  ];

  assert.equal(hasBackendGroupedRows(rows), true);
});

test('grouped-mode module contract: normalizes backend grouped payload to grouped data', () => {
  const rows = [
    {
      id: 'group:tg_alpha',
      group_by: 'translation_group_id',
      translation_group_id: 'tg_alpha',
      records: [
        { id: 'alpha_en', locale: 'en', title: 'Alpha EN' },
        { id: 'alpha_fr', locale: 'fr', title: 'Alpha FR' },
      ],
      translation_group_summary: {
        available_locales: ['en', 'fr'],
        missing_locales: ['es'],
        readiness_state: 'missing_locales',
        available_count: 2,
        required_count: 3,
      },
      _group: { row_type: 'group', id: 'tg_alpha' },
    },
  ];

  const normalized = normalizeBackendGroupedRows(rows);
  assert.ok(normalized);
  assert.equal(normalized.totalGroups, 1);
  assert.equal(normalized.totalRecords, 2);
  assert.equal(normalized.groups[0].groupId, 'tg_alpha');
  assert.equal(normalized.groups[0].records.length, 2);
  assert.equal(normalized.groups[0].records[0].id, 'alpha_en');
  assert.equal(normalized.groups[0].summary.readinessState, 'missing_locales');
});

test('grouped-mode module contract: rejects flat payload as unsupported grouped contract', () => {
  const flatRows = [
    { id: 'alpha_en', translation_group_id: 'tg_alpha', locale: 'en' },
    { id: 'alpha_fr', translation_group_id: 'tg_alpha', locale: 'fr' },
  ];

  assert.equal(hasBackendGroupedRows(flatRows), false);
  assert.equal(normalizeBackendGroupedRows(flatRows), null);
});

test('grouped-mode module contract: accepts backend ungrouped rows without forcing fallback', () => {
  const rows = [
    {
      id: 'orphan_en',
      title: 'Orphan EN',
      _group: { row_type: 'ungrouped', id: 'ungrouped:1' },
    },
  ];

  assert.equal(hasBackendGroupedRows(rows), true);
  const normalized = normalizeBackendGroupedRows(rows);
  assert.ok(normalized);
  assert.equal(normalized.totalGroups, 0);
  assert.equal(normalized.ungrouped.length, 1);
  assert.equal(normalized.ungrouped[0].id, 'orphan_en');
});
