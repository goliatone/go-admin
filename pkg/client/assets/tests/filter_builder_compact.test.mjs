import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importDatatableModule } from './helpers/load-datatable-dist.mjs';

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();
const { FilterBuilder } = await importDatatableModule();
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function withDOM(markup, url, run) {
  const dom = new JSDOM(markup, { url });
  const previous = {};
  for (const key of [
    'window',
    'document',
    'HTMLElement',
    'HTMLInputElement',
    'HTMLSelectElement',
    'Event',
    'KeyboardEvent',
    'localStorage',
    'location',
  ]) {
    previous[key] = globalThis[key];
    globalThis[key] = dom.window[key];
  }

  try {
    return run(dom.window);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
    dom.window.close();
  }
}

const fields = [
  { name: 'name', label: 'Name', type: 'text', group: 'Profile' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    group: 'Profile',
    operators: [{ label: 'is exactly', value: 'eq' }],
    options: [
      { label: 'Active', value: 'active' },
      { label: 'Archived', value: 'archived' },
    ],
  },
];

test('compact FilterBuilder scopes hosts, hydrates cloned state, and emits cloned semantic changes', () => {
  withDOM('<div id="builder-a"></div><div id="builder-b"></div>', 'http://localhost/admin/items', window => {
    const changes = [];
    const initialStructure = {
      groups: [{ logic: 'and', conditions: [{ field: 'status', operator: 'eq', value: 'active' }] }],
      groupLogic: [],
    };
    const builderA = new FilterBuilder({
      mode: 'compact',
      host: '#builder-a',
      fields,
      initialStructure,
      onChange(structure) {
        changes.push(structure);
      },
    });
    const builderB = new FilterBuilder({ mode: 'compact', host: '#builder-b', fields });

    initialStructure.groups[0].conditions[0].value = 'archived';
    assert.equal(builderA.getStructure().groups[0].conditions[0].value, 'active');
    assert.equal(window.document.querySelector('#builder-a [data-filter-builder-part="value"]').value, 'active');
    assert.equal(window.document.querySelector('#builder-b [data-filter-builder-part="value"]').value, '');
    assert.equal(window.document.querySelector('#builder-a optgroup').label, 'Profile');
    assert.equal(window.document.querySelectorAll('[id="filter-groups-container"]').length, 0);
    assert.equal(window.document.querySelector('#builder-a [data-filter-builder-sql-preview]'), null);
    assert.equal(window.document.querySelector('#builder-a [data-filter-builder-actions]'), null);

    const value = window.document.querySelector('#builder-a [data-filter-builder-part="value"]');
    value.value = 'archived';
    value.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.equal(changes.length, 1);
    assert.equal(changes[0].groups[0].conditions[0].value, 'archived');
    changes[0].groups[0].conditions[0].value = 'mutated outside';
    assert.equal(builderA.getStructure().groups[0].conditions[0].value, 'archived');

    window.document.querySelector('#builder-a [data-filter-builder-action="add-group"]').click();
    assert.equal(builderA.getStructure().groups.length, 2);
    assert.equal(builderB.getStructure().groups.length, 1);
    assert.equal(changes.length, 2);
    assert.equal(
      window.document.activeElement,
      window.document.querySelector('#builder-a [data-filter-builder-part="field"][data-group-index="1"]'),
    );

    const textValue = window.document.querySelector('#builder-b input[data-filter-builder-part="value"]');
    textValue.value = 'Ada';
    textValue.dispatchEvent(new window.Event('input', { bubbles: true }));
    textValue.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.equal(builderB.getStructure().groups[0].conditions[0].value, 'Ada');

    const returned = builderA.getStructure();
    returned.groups.length = 0;
    assert.equal(builderA.getStructure().groups.length, 2);

    builderA.destroy();
    assert.equal(window.document.getElementById('builder-a').childElementCount, 0);
    assert.equal(window.document.getElementById('builder-a').hasAttribute('data-filter-builder-instance'), false);
    builderB.destroy();
  });
});

test('compact FilterBuilder supports optional chrome/actions, destroy, and modal-style reopen', () => {
  withDOM('<div id="modal-host"></div>', 'http://localhost/admin/items', window => {
    let applies = 0;
    let clears = 0;
    const createBuilder = () => new FilterBuilder({
      mode: 'compact',
      host: '#modal-host',
      fields,
      chrome: { header: true, title: 'Filter rules', sqlPreview: true },
      actions: { apply: true, clear: true, save: false },
      onApply() { applies += 1; },
      onClear() { clears += 1; },
    });

    const first = createBuilder();
    assert.equal(window.document.querySelector('#modal-host h3').textContent, 'Filter rules');
    assert.ok(window.document.querySelector('#modal-host [data-filter-builder-sql-preview]'));
    assert.ok(window.document.querySelector('#modal-host [data-filter-builder-action="apply"]'));
    assert.equal(window.document.querySelector('#modal-host [data-filter-builder-action="save"]'), null);

    window.document.querySelector('#modal-host [data-filter-builder-action="apply"]').click();
    window.document.querySelector('#modal-host [data-filter-builder-action="clear"]').click();
    assert.equal(applies, 1);
    assert.equal(clears, 0, 'built-in clear changes local structure; external clear owns onClear');

    first.destroy();
    const second = createBuilder();
    assert.equal(window.document.querySelectorAll('#modal-host [data-filter-builder-groups]').length, 1);
    window.document.querySelector('#modal-host [data-filter-builder-action="apply"]').click();
    assert.equal(applies, 2);
    second.destroy();
  });
});

test('compact FilterBuilder localizes visible copy, default operators, previews, and accessible names', () => {
  withDOM('<div id="host"></div><div id="preview"></div>', 'http://localhost/admin/items', window => {
    const builder = new FilterBuilder({
      mode: 'compact',
      host: '#host',
      previewElement: '#preview',
      fields: [{ name: 'name', label: 'Ñom', type: 'text' }],
      chrome: { header: true },
      messages: {
        filtersTitle: 'Fïltres très détaillés',
        addFilterGroup: 'Ajouter un groupe de filtres',
        removeGroup: 'Retirer le groupe',
        and: 'ET',
        or: 'OU',
        enterValue: 'Saisir une valeur très longue',
        operatorContains: 'contient',
        fieldControlLabel: (group, condition) => `Champ ${condition} du groupe ${group}`,
        operatorControlLabel: (group, condition) => `Opérateur ${condition} du groupe ${group}`,
        valueControlLabel: (group, condition) => `Valeur ${condition} du groupe ${group}`,
        removeConditionLabel: condition => `Retirer le filtre ${condition}`,
        addConditionLabel: (logic, group) => `Ajouter ${logic} au groupe ${group}`,
        addLogicConditionLabel: logic => `Ajouter une condition ${logic}`,
      },
    });

    const host = window.document.getElementById('host');
    assert.equal(host.querySelector('h3').textContent, 'Fïltres très détaillés');
    assert.equal(host.querySelector('[data-filter-builder-action="add-group"]').getAttribute('aria-label'), 'Ajouter un groupe de filtres');
    assert.equal(host.querySelector('[data-filter-builder-part="field"]').getAttribute('aria-label'), 'Champ 1 du groupe 1');
    assert.equal(host.querySelector('[data-filter-builder-part="operator"]').getAttribute('aria-label'), 'Opérateur 1 du groupe 1');
    assert.equal(host.querySelector('[data-filter-builder-part="operator"] option').textContent.trim(), 'contient');
    assert.equal(host.querySelector('[data-filter-builder-part="value"]').placeholder, 'Saisir une valeur très longue');
    assert.equal(host.querySelector('[data-filter-builder-action="remove-condition"]').getAttribute('aria-label'), 'Retirer le filtre 1');
    assert.equal(host.querySelector('[data-filter-builder-action="remove-group"]').textContent.trim(), 'Retirer le groupe');

    host.querySelector('[data-filter-builder-action="add-condition-or"]').click();
    assert.match(host.textContent, /OU/);
    const value = host.querySelector('[data-filter-builder-part="value"]');
    value.value = 'Ada';
    value.dispatchEvent(new window.Event('input', { bubbles: true }));
    assert.match(window.document.getElementById('preview').textContent, /Ñom contient "Ada"/);
    builder.destroy();
  });
});

test('compact FilterBuilder enforces configured editing limits without truncating hydrated structures', () => {
  withDOM('<div id="host"></div>', 'http://localhost/admin/items', window => {
    const builder = new FilterBuilder({
      mode: 'compact',
      host: '#host',
      fields,
      limits: { maxGroups: 2, maxConditionsPerGroup: 2, maxTotalConditions: 3 },
    });
    const host = window.document.getElementById('host');

    host.querySelector('[data-filter-builder-action="add-condition"]').click();
    assert.equal(builder.getStructure().groups[0].conditions.length, 2);
    assert.equal(host.querySelector('[data-filter-builder-action="add-condition"]').disabled, true);

    host.querySelector('[data-filter-builder-action="add-group"]').click();
    assert.equal(builder.getStructure().groups.length, 2);
    assert.equal(builder.getStructure().groups.flatMap(group => group.conditions).length, 3);
    assert.equal(host.querySelector('[data-filter-builder-action="add-group"]').disabled, true);
    assert.match(host.querySelector('[data-filter-builder-action="add-group"]').title, /maximum of 2 filter groups|maximum of 3 total conditions/i);

    builder.setStructure({
      groups: [
        { logic: 'or', conditions: [{ field: 'name', operator: 'ilike', value: 'A' }] },
        { logic: 'or', conditions: [{ field: 'name', operator: 'ilike', value: 'B' }] },
        { logic: 'or', conditions: [{ field: 'name', operator: 'ilike', value: 'C' }] },
      ],
      groupLogic: ['and', 'or'],
    }, false);
    assert.equal(builder.getStructure().groups.length, 3, 'over-limit hydration must not be truncated');
    const limitStatus = host.querySelector('[data-filter-builder-limit-status]');
    assert.equal(limitStatus.classList.contains('hidden'), false);
    assert.match(limitStatus.textContent, /exceeds the editing limits/i);

    host.querySelector('[data-filter-builder-action="remove-group"][data-group-index="2"]').click();
    assert.equal(builder.getStructure().groups.length, 2);
    assert.equal(host.querySelector('[data-filter-builder-limit-status]').classList.contains('hidden'), true);
    builder.destroy();
  });

  withDOM('<div></div>', 'http://localhost/admin/items', () => {
    assert.throws(
      () => new FilterBuilder({ mode: 'compact', host: 'div', fields, limits: { maxGroups: 0 } }),
      /maxGroups must be a positive integer/,
    );
  });
});

test('overlay FilterBuilder preserves URL restore, apply/clear, focus, and listener cleanup', () => {
  const filters = encodeURIComponent(JSON.stringify([{ column: 'name', operator: 'ilike', value: 'Ada' }]));
  withDOM(`
    <button id="filter-toggle-btn" type="button" aria-expanded="false">Filters</button>
    <button id="clear-filters-btn" type="button">Clear</button>
    <div id="applied-filter-preview" class="hidden"><span id="filter-preview-text"></span></div>
    <div id="filter-panel" class="hidden"></div>
    <div id="filter-overlay" class="hidden"></div>
  `, `http://localhost/admin/customers?filters=${filters}`, window => {
    const applied = [];
    let cleared = 0;
    const builder = new FilterBuilder({
      fields,
      onApply(structure) { applied.push(structure); },
      onClear() { cleared += 1; },
    });

    assert.equal(builder.getStructure().groups[0].conditions[0].value, 'Ada');
    assert.match(window.document.getElementById('filter-preview-text').textContent, /Ada/);
    assert.equal(window.document.getElementById('applied-filter-preview').classList.contains('hidden'), false);

    const toggle = window.document.getElementById('filter-toggle-btn');
    toggle.click();
    window.document.querySelector('#filter-panel [data-filter-builder-action="apply"]').click();
    assert.equal(applied.length, 1);
    assert.equal(applied[0].groups[0].conditions[0].value, 'Ada');
    assert.equal(window.document.activeElement, toggle);

    window.document.getElementById('clear-filters-btn').click();
    assert.equal(cleared, 1);
    assert.equal(builder.getStructure().groups[0].conditions[0].value, '');
    assert.equal(window.document.getElementById('applied-filter-preview').classList.contains('hidden'), true);

    builder.destroy();
    assert.equal(window.document.getElementById('filter-panel').childElementCount, 0);
    toggle.click();
    assert.equal(window.document.getElementById('filter-panel').classList.contains('hidden'), true);
  });
});

test('FilterBuilder keeps unavailable hydrated rules truthful and repairable', () => {
  withDOM('<div id="host"></div><div id="preview"></div>', 'http://localhost/admin/items', window => {
    const changes = [];
    const builder = new FilterBuilder({
      mode: 'compact',
      host: '#host',
      previewElement: '#preview',
      fields: [
        ...fields,
        {
          name: 'retired_data',
          label: 'Retired data',
          type: 'text',
          disabled: true,
          disabledReason: 'Requires an archived-data provider',
        },
      ],
      initialStructure: {
        groups: [{ logic: 'or', conditions: [{ field: 'removed_field', operator: 'removed_op', value: 'Ada' }] }],
        groupLogic: [],
      },
      onChange(structure) { changes.push(structure); },
    });

    const field = window.document.querySelector('[data-filter-builder-part="field"]');
    const operator = window.document.querySelector('[data-filter-builder-part="operator"]');
    const value = window.document.querySelector('[data-filter-builder-part="value"]');
    const status = window.document.querySelector('[data-filter-builder-field-status]');
    const disabledField = [...field.options].find(option => option.value === 'retired_data');

    assert.equal(field.value, 'removed_field');
    assert.equal(operator.value, 'removed_op');
    assert.equal(value.disabled, true);
    assert.equal(field.getAttribute('aria-label'), 'Group 1 filter 1 field');
    assert.match(status.textContent, /removed_field.*no longer available/i);
    assert.equal(field.getAttribute('aria-describedby'), status.id);
    assert.match(disabledField.textContent, /Requires an archived-data provider/);
    assert.match(window.document.getElementById('preview').textContent, /Unavailable field \(removed_field\)/);
    assert.equal(builder.getStructure().groups[0].conditions[0].field, 'removed_field');

    field.value = 'name';
    field.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.deepEqual(builder.getStructure().groups[0].conditions[0], {
      field: 'name',
      operator: 'ilike',
      value: '',
    });
    assert.equal(changes.length, 1);

    builder.setStructure({
      groups: [{ logic: 'or', conditions: [{ field: 'name', operator: 'removed_op', value: 'Ada' }] }],
      groupLogic: [],
    }, false);
    const repairedOperator = window.document.querySelector('[data-filter-builder-part="operator"]');
    assert.equal(repairedOperator.value, 'removed_op');
    assert.equal(window.document.querySelector('[data-filter-builder-part="value"]').disabled, true);
    repairedOperator.value = 'ilike';
    repairedOperator.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.equal(builder.getStructure().groups[0].conditions[0].operator, 'ilike');
    assert.equal(window.document.querySelector('[data-filter-builder-part="value"]').disabled, false);
    assert.equal(window.document.activeElement, window.document.querySelector('[data-filter-builder-part="value"]'));

    builder.destroy();
  });
});

test('FilterBuilder preserves and repairs a hydrated select value removed from the catalog', () => {
  withDOM('<div id="host"></div><div id="preview"></div>', 'http://localhost/admin/items', window => {
    const changes = [];
    const builder = new FilterBuilder({
      mode: 'compact',
      host: '#host',
      previewElement: '#preview',
      fields,
      initialStructure: {
        groups: [{ logic: 'or', conditions: [{ field: 'status', operator: 'eq', value: 'paused' }] }],
        groupLogic: [],
      },
      onChange(structure) { changes.push(structure); },
    });

    const value = window.document.querySelector('[data-filter-builder-part="value"]');
    const status = window.document.querySelector('[data-filter-builder-field-status]');
    assert.equal(value.value, 'paused');
    assert.match(value.selectedOptions[0].textContent, /Unavailable value: paused/);
    assert.match(status.textContent, /paused.*no longer available/i);
    assert.equal(value.getAttribute('aria-describedby'), status.id);
    assert.equal(builder.getStructure().groups[0].conditions[0].value, 'paused');
    assert.match(window.document.getElementById('preview').textContent, /Unavailable value \(paused\)/);

    value.value = 'active';
    value.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.equal(builder.getStructure().groups[0].conditions[0].value, 'active');
    assert.equal(window.document.querySelector('[data-filter-builder-field-status]'), null);
    assert.equal(changes.length, 1);
    builder.destroy();
  });
});

test('FilterBuilder previews retain connectors from the original group positions', () => {
  withDOM('<div id="host"></div>', 'http://localhost/admin/items', window => {
    const builder = new FilterBuilder({
      mode: 'compact',
      host: '#host',
      fields,
      chrome: { sqlPreview: true },
      initialStructure: {
        groups: [
          { logic: 'or', conditions: [{ field: 'name', operator: 'eq', value: '' }] },
          { logic: 'or', conditions: [{ field: 'name', operator: 'eq', value: 'B' }] },
          { logic: 'or', conditions: [{ field: 'name', operator: 'eq', value: 'C' }] },
        ],
        groupLogic: ['or', 'and'],
      },
    });

    assert.equal(
      window.document.querySelector('[data-filter-builder-sql-preview]').textContent.trim(),
      "name = 'B' AND name = 'C'",
    );
    builder.destroy();
  });
});

test('FilterBuilder destroy restores caller-owned host and toggle state', () => {
  withDOM(`
    <button id="toggle" type="button" aria-controls="original-panel" aria-expanded="true">Filters</button>
    <div id="panel" class="hidden"><span data-caller-content>Keep me</span></div>
  `, 'http://localhost/admin/items', window => {
    const builder = new FilterBuilder({
      host: '#panel',
      toggleButton: '#toggle',
      restoreFromURL: false,
      fields,
    });
    const toggle = window.document.getElementById('toggle');
    const panel = window.document.getElementById('panel');

    assert.equal(panel.querySelectorAll(':scope > [data-filter-builder-root]').length, 1);
    assert.ok(panel.querySelector('[data-caller-content]'));
    toggle.click();
    assert.equal(toggle.getAttribute('aria-controls'), 'panel');
    assert.throws(
      () => new FilterBuilder({ mode: 'compact', host: '#panel', fields }),
      /already contains a mounted FilterBuilder/,
    );

    builder.destroy();
    assert.equal(toggle.getAttribute('aria-controls'), 'original-panel');
    assert.equal(toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(panel.querySelector('[data-filter-builder-root]'), null);
    assert.equal(panel.querySelector('[data-caller-content]').textContent, 'Keep me');
  });
});

test('compact FilterBuilder requires a valid host', () => {
  withDOM('<div></div>', 'http://localhost/admin/items', () => {
    assert.throws(
      () => new FilterBuilder({ mode: 'compact', host: '#missing', fields }),
      /requires a valid host/,
    );
  });
});

test('FilterBuilder compact contract is present in embedded and public artifacts', () => {
  const targets = [
    'dist/datatable/index.js',
    'dist-public/datatable.js',
    'dist-public/types/datatable/filter-builder.d.ts',
    'dist-public/types/datatable/index.d.ts',
  ];
  for (const target of targets) {
    assert.equal(existsSync(resolve(packageRoot, target)), true, `${target} should exist`);
  }

  const declaration = readFileSync(resolve(packageRoot, 'dist-public/types/datatable/filter-builder.d.ts'), 'utf8');
  const entryDeclaration = readFileSync(resolve(packageRoot, 'dist-public/types/datatable/index.d.ts'), 'utf8');
  assert.match(declaration, /FilterBuilderMode = 'overlay' \| 'compact'/);
  assert.match(declaration, /initialStructure\?: FilterStructure/);
  assert.match(declaration, /onChange\?: \(structure: FilterStructure\)/);
  assert.match(declaration, /messages\?: Partial<FilterBuilderMessages>/);
  assert.match(declaration, /limits\?: FilterBuilderLimitsConfig/);
  assert.match(declaration, /destroy\(\): void/);
  assert.match(entryDeclaration, /FilterBuilderFieldDefinition/);
  assert.match(entryDeclaration, /FilterBuilderLimitsConfig/);
  assert.match(entryDeclaration, /FilterBuilderMessages/);
});
