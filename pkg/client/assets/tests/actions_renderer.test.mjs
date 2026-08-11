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

  assert.match(html, /data-action-key="action-1-publish-draft"/);
  assert.match(html, /data-action-key="action-2-publish-live"/);
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
    querySelector(selector) {
      selectors.push(selector);
      return null;
    },
  };

  renderer.attachRowActionListeners(fakeContainer, actions, { id: 'row_1' });

  assert.deepEqual(selectors, [
    '[data-action-key="action-1-publish-draft"]',
    '[data-action-key="action-2-publish-live"]',
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
        disabledReason: 'Article is used by 2 active publishing schedules.',
        remediation: {
          label: 'View schedules',
          href: '/admin/publishing_schedules?article_id=article_123',
          kind: 'link',
        },
        action: () => {},
      },
    ]
  );

  assert.match(html, /Article is used by 2 active publishing schedules\./);
  assert.match(html, /aria-describedby="[^\"]*action-1-delete-disabled-reason"/);
  assert.doesNotMatch(html, /View schedules/);
});

test('ActionRenderer dropdown leaves overlay geometry to the shared menu contract', () => {
  const renderer = new ActionRenderer({ mode: 'dropdown' });
  const html = renderer.renderRowActions(
    { id: 'row_1' },
    [{ id: 'view', label: 'View', action: () => {} }]
  );
  const menuClass = html.match(/<div[^>]*class="([^"]*)"[^>]*role="menu"/)?.[1] || '';

  assert.ok(menuClass, 'expected an action-menu class list');
  assert.deepEqual(menuClass.split(/\s+/), ['action-menu__content', 'actions-menu', 'hidden']);
  assert.match(html, /data-action-menu-content/);
  for (const conflictingClass of ['absolute', 'right-0', 'mt-2', 'z-10', 'w-56', 'bg-white']) {
    assert.equal(
      menuClass.split(/\s+/).includes(conflictingClass),
      false,
      `menu must not emit ${conflictingClass}`
    );
  }
  assert.match(html, /aria-controls="[^\"]*-row-1-menu"/);
});

test('ActionRenderer closes a dropdown before invoking its enabled action', async () => {
  const renderer = new ActionRenderer({ mode: 'dropdown' });
  const calls = [];
  const action = { id: 'view', label: 'View', action: () => calls.push('action') };
  renderer.renderRowActions({ id: 'row_1' }, [action]);
  const menu = {
    classList: { add() { calls.push('close'); } },
    closest() { return null; },
  };
  const button = {
    dataset: { recordId: 'row_1', disabled: 'false' },
    getAttribute() { return null; },
    closest(selector) { return selector === '[data-action-menu-content]' ? menu : null; },
    addEventListener(_event, handler) { this.handler = handler; },
  };
  const container = { querySelector() { return button; } };

  renderer.attachRowActionListeners(container, [action], { id: 'row_1' });
  await button.handler({ preventDefault() {} });

  assert.deepEqual(calls, ['close', 'action']);
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
    querySelector() {
      return button;
    },
  };

  renderer.attachRowActionListeners(fakeContainer, [action], { id: 'row_1' });
  await button.handler({ preventDefault() {} });

  assert.equal(calls, 0);
});
