import test from 'node:test';
import assert from 'node:assert/strict';

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch (error) {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const { JSDOM } = await loadJSDOM();

// Bootstrap a minimal DOM so the module import succeeds (onReady guard).
const bootstrapDom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
setGlobals(bootstrapDom.window);
Object.defineProperty(globalThis.document, 'readyState', { value: 'loading', configurable: true });

// Provide a no-op fetch so the import doesn't blow up.
globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ items: [] }) });

const { initBlockLibraryPickers } = await import('../dist/formgen/block_library_picker.js');

function setGlobals(win) {
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.HTMLInputElement = win.HTMLInputElement;
  globalThis.HTMLSelectElement = win.HTMLSelectElement;
  globalThis.HTMLTextAreaElement = win.HTMLTextAreaElement;
  globalThis.HTMLTemplateElement = win.HTMLTemplateElement;
  globalThis.Event = win.Event;
  globalThis.MouseEvent = win.MouseEvent;
  globalThis.MutationObserver = win.MutationObserver;
  globalThis.requestAnimationFrame = win.requestAnimationFrame
    ? win.requestAnimationFrame.bind(win)
    : (cb) => setTimeout(cb, 0);
}

function setupEditor(html) {
  const dom = new JSDOM(html, { url: 'http://localhost' });
  setGlobals(dom.window);
  return dom;
}

function click(element) {
  element.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
}

function getOutputPayload(doc) {
  const output = doc.querySelector('input[data-block-output]');
  return JSON.parse(output.value || '[]');
}

// ---------------------------------------------------------------------------
// Fetch mock helpers
// ---------------------------------------------------------------------------

function mockFetch(handlers) {
  const calls = [];
  globalThis.fetch = async (url) => {
    const urlStr = String(url);
    calls.push(urlStr);
    for (const h of handlers) {
      if (h.match(urlStr)) {
        return {
          ok: h.ok !== false,
          status: h.status || 200,
          statusText: 'OK',
          json: async () => h.body,
        };
      }
    }
    return { ok: false, status: 404, statusText: 'Not Found', json: async () => ({}) };
  };
  return calls;
}

// ---------------------------------------------------------------------------
// Markup helpers
// ---------------------------------------------------------------------------

const metadataItems = [
  { slug: 'hero', name: 'Hero Section', icon: 'H', category: 'layout', status: 'active', schema_version: 'hero@v1.0.0' },
  { slug: 'text', name: 'Text Block', icon: 'T', category: 'content', status: 'active', schema_version: 'text@v1.0.0' },
];

const inactiveItem = { slug: 'legacy', name: 'Legacy Block', icon: 'L', category: 'other', status: 'inactive', schema_version: 'legacy@v1.0.0' };

const heroTemplate = {
  slug: 'hero',
  label: 'Hero Section',
  icon: 'H',
  category: 'layout',
  schema_version: 'hero@v1.0.0',
  status: 'active',
  disabled: false,
  required_fields: ['title'],
  html: '<div data-component="text"><label>Title <input name="title" /></label></div>',
};

const textTemplate = {
  slug: 'text',
  label: 'Text Block',
  icon: 'T',
  category: 'content',
  schema_version: 'text@v1.0.0',
  status: 'active',
  disabled: false,
  required_fields: [],
  html: '<div data-component="text"><label>Body <textarea name="body"></textarea></label></div>',
};

const pickerMarkup = (opts = {}) => {
  const outputValue = opts.outputValue || '';
  const config = opts.config || { lazyLoad: true };
  const allowedBlocks = opts.allowedBlocks || [];
  const maxBlocks = opts.maxBlocks;
  return `
  <form>
    <div data-block-editor="true"
         data-block-library-picker="true"
         data-block-init="manual"
         data-api-base="/admin/api/block_definitions"
         data-allowed-blocks='${JSON.stringify(allowedBlocks)}'
         data-block-sortable="true"
         ${maxBlocks ? `data-max-blocks="${maxBlocks}"` : ''}
         data-component-config='${JSON.stringify(config)}'>
      <div class="flex" style="display:none;">
        <select data-block-add-select="true"></select>
        <button type="button" data-block-add="true">Add block</button>
      </div>
      <div data-block-list="true"></div>
      <p data-block-empty="true">No blocks added yet.</p>
      <input type="hidden" name="blocks" data-block-output="true" value='${outputValue}' />
    </div>
  </form>
`;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('picker initializes: creates add button and dropdown', async () => {
  const calls = mockFetch([
    {
      match: (url) => url.includes('/admin/api/block_definitions') && !url.includes('/template'),
      body: { items: metadataItems },
    },
  ]);

  const dom = setupEditor(pickerMarkup());
  await initBlockLibraryPickers(dom.window.document);

  const doc = dom.window.document;
  const root = doc.querySelector('[data-block-library-picker]');

  assert.equal(root.getAttribute('data-picker-initialized'), 'true', 'should be marked initialized');
  assert.ok(doc.querySelector('[data-picker-add-btn]'), 'add button should exist');
  assert.ok(doc.querySelector('[data-picker-dropdown]'), 'dropdown should exist');

  // Verify metadata was fetched with filter_status=active
  assert.ok(calls.some((u) => u.includes('filter_status=active')), 'should filter active');
});

test('picker fetches templates for existing blocks before init', async () => {
  const existingBlocks = JSON.stringify([{ _type: 'hero', title: 'Hello' }]);

  const calls = mockFetch([
    {
      match: (url) => url.includes('/admin/api/block_definitions') && !url.includes('/template'),
      body: { items: metadataItems },
    },
    {
      match: (url) => url.includes('/templates?slugs='),
      body: { items: [heroTemplate] },
    },
  ]);

  const dom = setupEditor(pickerMarkup({ outputValue: existingBlocks }));
  await initBlockLibraryPickers(dom.window.document);

  const doc = dom.window.document;

  // Batch template fetch should have been called for existing block slug
  assert.ok(calls.some((u) => u.includes('/templates?slugs=hero')), 'should fetch hero template');

  // Existing block should be rendered
  const items = doc.querySelectorAll('[data-block-item]');
  assert.equal(items.length, 1, 'existing block should be rendered');
  assert.equal(items[0].dataset.blockType, 'hero');
});

test('picker with includeInactive=true omits status filter', async () => {
  const calls = mockFetch([
    {
      match: (url) => url.includes('/admin/api/block_definitions'),
      body: { items: [...metadataItems, inactiveItem] },
    },
  ]);

  const dom = setupEditor(pickerMarkup({ config: { lazyLoad: true, includeInactive: true } }));
  await initBlockLibraryPickers(dom.window.document);

  // Should NOT have filter_status param
  const metaCall = calls.find((u) => u.includes('/admin/api/block_definitions') && !u.includes('/template'));
  assert.ok(metaCall, 'metadata call should exist');
  assert.ok(!metaCall.includes('filter_status'), 'should not include status filter');
});

test('picker treats status case-insensitively for disabled flag', async () => {
  mockFetch([
    {
      match: (url) => url.includes('/admin/api/block_definitions') && !url.includes('/template'),
      body: { items: [{ slug: 'case', name: 'Case Block', status: 'Active', category: 'layout' }] },
    },
  ]);

  const dom = setupEditor(pickerMarkup());
  await initBlockLibraryPickers(dom.window.document);

  const doc = dom.window.document;
  const card = doc.querySelector('[data-picker-item="case"]');
  assert.ok(card, 'case block should be rendered');
  assert.equal(card.disabled, false, 'Active status should not be disabled');
});

test('picker with lazyLoad=false prefetches all templates', async () => {
  const calls = mockFetch([
    {
      match: (url) => url.includes('/admin/api/block_definitions') && !url.includes('/template'),
      body: { items: metadataItems },
    },
    {
      match: (url) => url.includes('/templates?slugs='),
      body: { items: [heroTemplate, textTemplate] },
    },
  ]);

  const dom = setupEditor(pickerMarkup({ config: { lazyLoad: false } }));
  await initBlockLibraryPickers(dom.window.document);

  const doc = dom.window.document;

  // Should have fetched templates for all definitions
  assert.ok(calls.some((u) => u.includes('/templates?slugs=')), 'should batch-fetch templates');

  // The block editor's select should have the block type options (registered before init)
  const select = doc.querySelector('[data-block-add-select]');
  const optionValues = Array.from(select.options).map((o) => o.value);
  assert.ok(optionValues.includes('hero'), 'select should have hero option');
  assert.ok(optionValues.includes('text'), 'select should have text option');
});

test('lazy-loaded blocks participate in validation after template refresh', async () => {
  mockFetch([
    {
      match: (url) => url.includes('/admin/api/block_definitions') && !url.includes('/template'),
      body: { items: metadataItems },
    },
    {
      match: (url) => url.includes('/hero/template'),
      body: { items: [heroTemplate] },
    },
  ]);

  const dom = setupEditor(pickerMarkup({ config: { lazyLoad: true } }));
  await initBlockLibraryPickers(dom.window.document);

  const doc = dom.window.document;
  const heroCard = doc.querySelector('[data-picker-item="hero"]');
  assert.ok(heroCard, 'hero card should exist');
  click(heroCard);

  await new Promise((r) => setTimeout(r, 0));

  const item = doc.querySelector('[data-block-item]');
  assert.ok(item, 'block item should be added');

  const errorBadge = item.querySelector('[data-block-error-badge]');
  assert.ok(errorBadge, 'error badge should appear for empty required field');
});

test('picker dropdown shows block types from metadata', async () => {
  mockFetch([
    {
      match: (url) => url.includes('/admin/api/block_definitions') && !url.includes('/template'),
      body: { items: metadataItems },
    },
  ]);

  const dom = setupEditor(pickerMarkup());
  await initBlockLibraryPickers(dom.window.document);

  const doc = dom.window.document;
  const dropdownItems = doc.querySelectorAll('[data-picker-item]');
  assert.equal(dropdownItems.length, 2, 'should show 2 block types');

  const slugs = Array.from(dropdownItems).map((el) => el.getAttribute('data-picker-item'));
  assert.ok(slugs.includes('hero'), 'should have hero');
  assert.ok(slugs.includes('text'), 'should have text');
});

test('picker maxBlocks disables add button when limit reached', async () => {
  const existingBlocks = JSON.stringify([
    { _type: 'hero', title: 'One' },
    { _type: 'hero', title: 'Two' },
  ]);

  mockFetch([
    {
      match: (url) => url.includes('/admin/api/block_definitions') && !url.includes('/template'),
      body: { items: metadataItems },
    },
    {
      match: (url) => url.includes('/templates?slugs='),
      body: { items: [heroTemplate] },
    },
  ]);

  const dom = setupEditor(pickerMarkup({ outputValue: existingBlocks, config: { lazyLoad: true, maxBlocks: 2 } }));
  await initBlockLibraryPickers(dom.window.document);

  const doc = dom.window.document;
  const addBtn = doc.querySelector('[data-picker-add-btn]');
  assert.equal(addBtn.disabled, true, 'add button should be disabled at max');
  assert.ok(addBtn.title.includes('Maximum'), 'should show max message');
});

test('picker disabled/inactive blocks are visually disabled in dropdown', async () => {
  mockFetch([
    {
      match: (url) => url.includes('/admin/api/block_definitions') && !url.includes('/template'),
      body: { items: [...metadataItems, { ...inactiveItem, disabled: true }] },
    },
  ]);

  const dom = setupEditor(pickerMarkup({ config: { lazyLoad: true, includeInactive: true } }));
  await initBlockLibraryPickers(dom.window.document);

  const doc = dom.window.document;
  const legacyBtn = doc.querySelector('[data-picker-item="legacy"]');
  assert.ok(legacyBtn, 'inactive block should appear in dropdown');
  assert.equal(legacyBtn.disabled, true, 'inactive block should be disabled');
});

test('picker does not re-initialize already initialized pickers', async () => {
  mockFetch([
    {
      match: (url) => url.includes('/admin/api/block_definitions'),
      body: { items: metadataItems },
    },
  ]);

  const dom = setupEditor(pickerMarkup());
  await initBlockLibraryPickers(dom.window.document);

  const doc = dom.window.document;
  const firstBtn = doc.querySelector('[data-picker-add-btn]');

  // Call init again
  await initBlockLibraryPickers(dom.window.document);

  // Should still have only one add button (not duplicated)
  const allBtns = doc.querySelectorAll('[data-picker-add-btn]');
  assert.equal(allBtns.length, 1, 'should not duplicate picker controls');
});

test('picker allowedBlocks filters definitions', async () => {
  mockFetch([
    {
      match: (url) => url.includes('/admin/api/block_definitions') && !url.includes('/template'),
      body: { items: metadataItems },
    },
  ]);

  const dom = setupEditor(pickerMarkup({ allowedBlocks: ['hero'] }));
  await initBlockLibraryPickers(dom.window.document);

  const doc = dom.window.document;
  const dropdownItems = doc.querySelectorAll('[data-picker-item]');
  assert.equal(dropdownItems.length, 1, 'should show only allowed block');
  assert.equal(dropdownItems[0].getAttribute('data-picker-item'), 'hero');
});

// ---------------------------------------------------------------------------
// Phase 6: Popover UI Tests
// ---------------------------------------------------------------------------

test('popover has search input by default (searchable !== false)', async () => {
  mockFetch([
    {
      match: (url) => url.includes('/admin/api/block_definitions') && !url.includes('/template'),
      body: { items: metadataItems },
    },
  ]);

  const dom = setupEditor(pickerMarkup());
  await initBlockLibraryPickers(dom.window.document);

  const doc = dom.window.document;
  const searchInput = doc.querySelector('[data-picker-search]');
  assert.ok(searchInput, 'search input should exist');
  assert.equal(searchInput.tagName, 'INPUT', 'search should be an input element');
  assert.equal(searchInput.getAttribute('autocomplete'), 'off', 'search should have autocomplete off');
});

test('popover has search disabled when searchable=false', async () => {
  mockFetch([
    {
      match: (url) => url.includes('/admin/api/block_definitions') && !url.includes('/template'),
      body: { items: metadataItems },
    },
  ]);

  const dom = setupEditor(pickerMarkup({ config: { lazyLoad: true, searchable: false } }));
  await initBlockLibraryPickers(dom.window.document);

  const doc = dom.window.document;
  const searchInput = doc.querySelector('[data-picker-search]');
  assert.equal(searchInput, null, 'search input should not exist when searchable=false');
});

test('popover groups blocks by category', async () => {
  mockFetch([
    {
      match: (url) => url.includes('/admin/api/block_definitions') && !url.includes('/template'),
      body: { items: metadataItems },
    },
  ]);

  const dom = setupEditor(pickerMarkup());
  await initBlockLibraryPickers(dom.window.document);

  const doc = dom.window.document;
  const categories = doc.querySelectorAll('[data-picker-category]');
  assert.ok(categories.length >= 2, 'should have at least 2 category headers');

  const catNames = Array.from(categories).map((el) => el.getAttribute('data-picker-category'));
  assert.ok(catNames.includes('layout'), 'should have layout category');
  assert.ok(catNames.includes('content'), 'should have content category');
});

test('popover without category grouping renders flat list', async () => {
  mockFetch([
    {
      match: (url) => url.includes('/admin/api/block_definitions') && !url.includes('/template'),
      body: { items: metadataItems },
    },
  ]);

  const dom = setupEditor(pickerMarkup({ config: { lazyLoad: true, groupByCategory: false } }));
  await initBlockLibraryPickers(dom.window.document);

  const doc = dom.window.document;
  const categories = doc.querySelectorAll('[data-picker-category]');
  assert.equal(categories.length, 0, 'should not have category headers');

  const items = doc.querySelectorAll('[data-picker-item]');
  assert.equal(items.length, 2, 'should still show all items');
});

test('popover shows empty state when no definitions available', async () => {
  mockFetch([
    {
      match: (url) => url.includes('/admin/api/block_definitions') && !url.includes('/template'),
      body: { items: [] },
    },
  ]);

  const dom = setupEditor(pickerMarkup());
  await initBlockLibraryPickers(dom.window.document);

  const doc = dom.window.document;
  const emptyState = doc.querySelector('[data-picker-empty]');
  assert.ok(emptyState, 'empty state element should exist');
  assert.notEqual(emptyState.style.display, 'none', 'empty state should be visible');

  const emptyText = doc.querySelector('[data-picker-empty-text]');
  assert.ok(emptyText, 'empty text should exist');
  assert.equal(emptyText.textContent, 'No block types available');
});

test('popover has ARIA attributes for accessibility', async () => {
  mockFetch([
    {
      match: (url) => url.includes('/admin/api/block_definitions') && !url.includes('/template'),
      body: { items: metadataItems },
    },
  ]);

  const dom = setupEditor(pickerMarkup());
  await initBlockLibraryPickers(dom.window.document);

  const doc = dom.window.document;
  const popover = doc.querySelector('[data-picker-popover]');
  assert.ok(popover, 'popover should exist');
  assert.equal(popover.getAttribute('role'), 'dialog', 'popover should have dialog role');
  assert.equal(popover.getAttribute('aria-label'), 'Add block', 'popover should have aria-label');

  const cards = doc.querySelector('[data-picker-cards]');
  assert.equal(cards.getAttribute('role'), 'listbox', 'cards container should have listbox role');

  const card = doc.querySelector('[data-picker-card]');
  assert.equal(card.getAttribute('role'), 'option', 'card should have option role');
});

test('popover disabled cards have aria-disabled and title', async () => {
  mockFetch([
    {
      match: (url) => url.includes('/admin/api/block_definitions') && !url.includes('/template'),
      body: { items: [...metadataItems, { ...inactiveItem, disabled: true }] },
    },
  ]);

  const dom = setupEditor(pickerMarkup({ config: { lazyLoad: true, includeInactive: true } }));
  await initBlockLibraryPickers(dom.window.document);

  const doc = dom.window.document;
  const legacyCard = doc.querySelector('[data-picker-card="legacy"]');
  assert.ok(legacyCard, 'legacy card should exist');
  assert.equal(legacyCard.getAttribute('aria-disabled'), 'true', 'should have aria-disabled');
  assert.ok(legacyCard.title.includes('inactive'), 'should have tooltip about inactive status');
  assert.ok(legacyCard.classList.contains('opacity-50'), 'should have muted styling');
});

test('popover card icons use blue styling for active and gray for disabled', async () => {
  mockFetch([
    {
      match: (url) => url.includes('/admin/api/block_definitions') && !url.includes('/template'),
      body: { items: [...metadataItems, { ...inactiveItem, disabled: true }] },
    },
  ]);

  const dom = setupEditor(pickerMarkup({ config: { lazyLoad: true, includeInactive: true } }));
  await initBlockLibraryPickers(dom.window.document);

  const doc = dom.window.document;

  // Active card icon should use blue styling
  const heroCard = doc.querySelector('[data-picker-card="hero"]');
  const heroIcon = heroCard.querySelector('span');
  assert.ok(heroIcon.classList.contains('bg-blue-50'), 'active card icon should have blue background');
  assert.ok(heroIcon.classList.contains('text-blue-600'), 'active card icon should have blue text');

  // Disabled card icon should use gray styling
  const legacyCard = doc.querySelector('[data-picker-card="legacy"]');
  const legacyIcon = legacyCard.querySelector('span');
  assert.ok(legacyIcon.classList.contains('bg-gray-100'), 'disabled card icon should have gray background');
  assert.ok(legacyIcon.classList.contains('text-gray-400'), 'disabled card icon should have gray text');
});

// ---------------------------------------------------------------------------
// Phase 7: Block Instance Headers + Schema Badges
// ---------------------------------------------------------------------------

test('picker blocks show schema version badge in header (7.1)', async () => {
  const existingBlocks = JSON.stringify([{ _type: 'hero', title: 'Hello' }]);

  mockFetch([
    {
      match: (url) => url.includes('/admin/api/block_definitions') && !url.includes('/template'),
      body: { items: metadataItems },
    },
    {
      match: (url) => url.includes('/templates?slugs='),
      body: { items: [heroTemplate] },
    },
  ]);

  const dom = setupEditor(pickerMarkup({ outputValue: existingBlocks }));
  await initBlockLibraryPickers(dom.window.document);

  const doc = dom.window.document;
  const item = doc.querySelector('[data-block-item]');
  assert.ok(item, 'block item should exist');

  const schemaBadge = item.querySelector('[data-block-schema-badge]');
  assert.ok(schemaBadge, 'schema badge should exist on picker block');
  assert.ok(schemaBadge.textContent.includes('hero@'), 'badge should show schema version');
});

test('picker blocks show required field indicators (7.2)', async () => {
  const existingBlocks = JSON.stringify([{ _type: 'hero', title: '' }]);

  mockFetch([
    {
      match: (url) => url.includes('/admin/api/block_definitions') && !url.includes('/template'),
      body: { items: metadataItems },
    },
    {
      match: (url) => url.includes('/templates?slugs='),
      body: { items: [heroTemplate] },
    },
  ]);

  const dom = setupEditor(pickerMarkup({ outputValue: existingBlocks }));
  await initBlockLibraryPickers(dom.window.document);

  const doc = dom.window.document;
  const item = doc.querySelector('[data-block-item]');
  assert.ok(item, 'block item should exist');

  // heroTemplate has required_fields: ['title']
  const requiredIndicators = item.querySelectorAll('[data-required-indicator]');
  assert.equal(requiredIndicators.length, 1, 'should have 1 required indicator for title field');
});

test('picker blocks show validation error badge for empty required fields (7.3)', async () => {
  const existingBlocks = JSON.stringify([{ _type: 'hero', title: '' }]);

  mockFetch([
    {
      match: (url) => url.includes('/admin/api/block_definitions') && !url.includes('/template'),
      body: { items: metadataItems },
    },
    {
      match: (url) => url.includes('/templates?slugs='),
      body: { items: [heroTemplate] },
    },
  ]);

  const dom = setupEditor(pickerMarkup({ outputValue: existingBlocks }));
  await initBlockLibraryPickers(dom.window.document);

  const doc = dom.window.document;
  const item = doc.querySelector('[data-block-item]');
  assert.ok(item, 'block item should exist');

  // title is required and empty — should show error badge
  const errorBadge = item.querySelector('[data-block-error-badge]');
  assert.ok(errorBadge, 'error badge should exist for empty required field');
  assert.ok(errorBadge.textContent.includes('1'), 'should show 1 error');
});

test('picker blocks with all required fields filled have no error badge (7.3)', async () => {
  const existingBlocks = JSON.stringify([{ _type: 'hero', title: 'Filled' }]);

  mockFetch([
    {
      match: (url) => url.includes('/admin/api/block_definitions') && !url.includes('/template'),
      body: { items: metadataItems },
    },
    {
      match: (url) => url.includes('/templates?slugs='),
      body: { items: [heroTemplate] },
    },
  ]);

  const dom = setupEditor(pickerMarkup({ outputValue: existingBlocks }));
  await initBlockLibraryPickers(dom.window.document);

  const doc = dom.window.document;
  const item = doc.querySelector('[data-block-item]');
  assert.ok(item, 'block item should exist');

  // title is required and filled — should NOT show error badge
  const errorBadge = item.querySelector('[data-block-error-badge]');
  assert.equal(errorBadge, null, 'no error badge when required fields are filled');
});
