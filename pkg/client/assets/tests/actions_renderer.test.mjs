import test from 'node:test';
import assert from 'node:assert/strict';

const { ActionRenderer } = await import('../dist/datatable/index.js');

test('ActionRenderer renders unique data-action-key attributes for duplicate labels', () => {
  const renderer = new ActionRenderer({ mode: 'inline' });
  const html = renderer.renderRowActions(
    { id: 'row_1' },
    [
      { id: 'publish_draft', label: 'Publish', action: () => {} },
      { id: 'publish_live', label: 'Publish', action: () => {} },
    ]
  );

  assert.match(html, /data-action-key="id-publish-draft"/);
  assert.match(html, /data-action-key="id-publish-live"/);
});

test('ActionRenderer attaches listeners by data-action-key instead of label selector', () => {
  const renderer = new ActionRenderer({ mode: 'inline' });
  const actions = [
    { id: 'publish_draft', label: 'Publish', action: () => {} },
    { id: 'publish_live', label: 'Publish', action: () => {} },
  ];
  // Prime keys through render.
  renderer.renderRowActions({ id: 'row_1' }, actions);

  const selectors = [];
  const fakeContainer = {
    querySelectorAll(selector) {
      selectors.push(selector);
      return [];
    },
  };

  renderer.attachRowActionListeners(fakeContainer, actions, { row_1: { id: 'row_1' } });

  assert.deepEqual(selectors, [
    '[data-action-key="id-publish-draft"]',
    '[data-action-key="id-publish-live"]',
  ]);
});
