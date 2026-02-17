import test from 'node:test';
import assert from 'node:assert/strict';

const { DataGrid } = await import('../dist/datatable/index.js');

function createGrid(defaultViewMode = 'flat') {
  return new DataGrid({
    tableId: 'translations-table',
    apiEndpoint: '/admin/api/panels/pages',
    columns: [],
    enableGroupedMode: true,
    defaultViewMode,
    groupByField: 'translation_group_id',
  });
}

test('datatable grouped pagination contract: grouped mode requests group_by', () => {
  const grid = createGrid('grouped');
  const url = grid.buildApiUrl();

  assert.ok(url.includes('group_by=translation_group_id'));
});

test('datatable grouped pagination contract: flat mode does not request group_by', () => {
  const grid = createGrid('flat');
  const url = grid.buildApiUrl();

  assert.equal(url.includes('group_by=translation_group_id'), false);
});
