import test from 'node:test';
import assert from 'node:assert/strict';
import { importDatatableModule } from './helpers/load-datatable-dist.mjs';

const { ActionRenderer } = await importDatatableModule();

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

test('ActionRenderer dropdown renders disabled reasons without remediation links', () => {
  const renderer = new ActionRenderer({ mode: 'dropdown' });
  const html = renderer.renderRowActions(
    { id: 'row_1' },
    [
      {
        id: 'delete',
        label: 'Delete',
        disabled: true,
        disabledReason: 'Document is used by 2 active agreements.',
        remediation: {
          label: 'View agreements',
          href: '/admin/esign_agreements?document_id=doc_123',
          kind: 'link',
        },
        action: () => {},
      },
    ]
  );

  assert.match(html, /Document is used by 2 active agreements\./);
  assert.match(html, /aria-describedby="id-delete-disabled-reason"/);
  assert.doesNotMatch(html, /View agreements/);
});

test('ActionRenderer click guard prevents disabled row actions from executing', async () => {
  const renderer = new ActionRenderer({ mode: 'inline' });
  let calls = 0;
  const action = {
    id: 'archive',
    label: 'Archive',
    disabled: true,
    disabledReason: 'Archive is unavailable.',
    action: async () => {
      calls += 1;
    },
  };
  renderer.renderRowActions({ id: 'row_1' }, [action]);

  const button = {
    dataset: { recordId: 'row_1', disabled: 'true' },
    getAttribute(name) {
      if (name === 'aria-disabled') return 'true';
      return null;
    },
    addEventListener(_event, handler) {
      this.handler = handler;
    },
  };
  const fakeContainer = {
    querySelectorAll() {
      return [button];
    },
  };

  renderer.attachRowActionListeners(fakeContainer, [action], { row_1: { id: 'row_1' } });
  await button.handler({ preventDefault() {} });

  assert.equal(calls, 0);
});
