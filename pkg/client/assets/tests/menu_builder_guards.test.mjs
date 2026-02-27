import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const {
  parseMenuContracts,
  parseMenuRecord,
  parseNavigationOverrides,
  MenuBuilderStore,
} = await import('../dist/menu-builder/index.js');

const fixturePath = fileURLToPath(new URL('./fixtures/menu_builder_contracts.json', import.meta.url));
const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8'));

test('parseMenuContracts reads endpoint and error mappings from fixture payload', () => {
  const parsed = parseMenuContracts(fixture.contracts);
  assert.equal(parsed.endpoints['menus'], '/admin/api/menus');
  assert.equal(parsed.endpoints['content.navigation'], '/admin/api/content/:type/:id/navigation');
  assert.equal(parsed.error_codes['cycle'], 'MENU_VALIDATION_CYCLE');
});

test('parseMenuRecord normalizes menu shape', () => {
  const parsed = parseMenuRecord({
    id: 'main',
    code: 'main',
    name: 'Main Menu',
    status: 'published',
  });

  assert.equal(parsed.id, 'main');
  assert.equal(parsed.code, 'main');
  assert.equal(parsed.name, 'Main Menu');
  assert.equal(parsed.status, 'published');
});

test('parseNavigationOverrides validates values and allowed locations', () => {
  const parsed = parseNavigationOverrides(
    {
      'site.main': 'show',
      'site.footer': 'hide',
    },
    ['site.main', 'site.footer']
  );

  assert.equal(parsed['site.main'], 'show');
  assert.equal(parsed['site.footer'], 'hide');

  assert.throws(
    () => parseNavigationOverrides({ 'site.main': 'invalid' }, ['site.main']),
    /invalid navigation value/i
  );

  assert.throws(
    () => parseNavigationOverrides({ 'site.unknown': 'show' }, ['site.main']),
    /invalid navigation location/i
  );
});

test('MenuBuilderStore emits validation issues for depth, cycle, duplicate target, and invalid target', () => {
  const store = new MenuBuilderStore({});

  const tooDeep = {
    id: 'depth-1',
    label: 'Depth 1',
    target: { type: 'route', path: '/ok' },
    children: [
      {
        id: 'depth-2',
        label: 'Depth 2',
        target: { type: 'route', path: '/ok-2' },
        children: [
          {
            id: 'depth-3',
            label: 'Depth 3',
            target: { type: 'route', path: '/ok-3' },
            children: [
              {
                id: 'depth-4',
                label: 'Depth 4',
                target: { type: 'route', path: '/ok-4' },
                children: [
                  {
                    id: 'depth-5',
                    label: 'Depth 5',
                    target: { type: 'route', path: '/ok-5' },
                    children: [
                      {
                        id: 'depth-6',
                        label: 'Depth 6',
                        target: { type: 'route', path: '/ok-6' },
                        children: [
                          {
                            id: 'depth-7',
                            label: 'Depth 7',
                            target: { type: 'route', path: '/ok-7' },
                            children: [
                              {
                                id: 'depth-8',
                                label: 'Depth 8',
                                target: { type: 'route', path: '/ok-8' },
                                children: [
                                  {
                                    id: 'depth-9',
                                    label: 'Depth 9',
                                    target: { type: 'route', path: '/ok-9' },
                                    children: [],
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  const cycle = {
    id: 'cycle-a',
    label: 'Cycle A',
    target: { type: 'route', path: '/cycle-a' },
    children: [
      {
        id: 'cycle-a',
        label: 'Cycle A (nested)',
        target: { type: 'route', path: '/cycle-a-nested' },
        children: [],
      },
    ],
  };

  const duplicateTargetA = {
    id: 'dup-1',
    label: 'Duplicate 1',
    target: { type: 'external', url: 'https://example.com' },
    children: [],
  };

  const duplicateTargetB = {
    id: 'dup-2',
    label: 'Duplicate 2',
    target: { type: 'external', url: 'https://example.com' },
    children: [],
  };

  const invalidTarget = {
    id: 'invalid-target',
    label: 'Invalid Target',
    target: { type: 'route', path: 'missing-leading-slash' },
    children: [],
  };

  store.setDraftItems([tooDeep, cycle, duplicateTargetA, duplicateTargetB, invalidTarget]);
  const issues = store.snapshot().validation_issues;

  const codes = new Set(issues.map(issue => issue.code));
  assert.ok(codes.has('depth'));
  assert.ok(codes.has('cycle'));
  assert.ok(codes.has('duplicate_target'));
  assert.ok(codes.has('invalid_target'));
});
