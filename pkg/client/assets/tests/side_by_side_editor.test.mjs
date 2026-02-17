/**
 * Side-by-Side Translation Editor Tests (Phase 5 - TX-051)
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

// Mock DOM environment
const createMockElement = (tag) => {
  const el = {
    tagName: tag.toUpperCase(),
    innerHTML: '',
    textContent: '',
    className: '',
    classList: {
      add: mock.fn((cls) => { el.className += ' ' + cls; }),
      remove: mock.fn((cls) => { el.className = el.className.replace(cls, '').trim(); }),
      contains: (cls) => el.className.includes(cls),
    },
    style: {},
    dataset: {},
    attributes: {},
    children: [],
    querySelector: mock.fn(() => null),
    querySelectorAll: mock.fn(() => []),
    addEventListener: mock.fn(),
    removeEventListener: mock.fn(),
    setAttribute: mock.fn((name, val) => { el.attributes[name] = val; }),
    getAttribute: mock.fn((name) => el.attributes[name]),
    hasAttribute: (name) => name in el.attributes,
    removeAttribute: mock.fn((name) => { delete el.attributes[name]; }),
    dispatchEvent: mock.fn(),
    remove: mock.fn(),
    append: mock.fn(),
    appendChild: mock.fn(),
  };
  return el;
};

const mockDocument = {
  createElement: createMockElement,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: mock.fn(),
  removeEventListener: mock.fn(),
  body: createMockElement('body'),
  head: createMockElement('head'),
  documentElement: createMockElement('html'),
};

global.document = mockDocument;
global.window = {
  addEventListener: mock.fn(),
  removeEventListener: mock.fn(),
  location: { href: 'http://localhost' },
  navigator: { userAgent: 'test' },
  localStorage: {
    getItem: mock.fn(() => null),
    setItem: mock.fn(),
    removeItem: mock.fn(),
  },
  sessionStorage: {
    getItem: mock.fn(() => null),
    setItem: mock.fn(),
    removeItem: mock.fn(),
  },
  matchMedia: mock.fn(() => ({
    matches: false,
    addEventListener: mock.fn(),
    removeEventListener: mock.fn(),
  })),
  getComputedStyle: mock.fn(() => ({})),
};
global.HTMLElement = class HTMLElement {};
global.Event = class Event {
  constructor(type, opts = {}) {
    this.type = type;
    this.bubbles = opts.bubbles || false;
  }
};
global.CustomEvent = class CustomEvent extends Event {
  constructor(type, opts = {}) {
    super(type, opts);
    this.detail = opts.detail;
  }
};
global.MutationObserver = class MutationObserver {
  constructor(callback) { this.callback = callback; }
  observe() {}
  disconnect() {}
};

// Import functions after mocks are set up (from dist for compiled JS)
const {
  extractSourceTargetDrift,
  hasFieldDrift,
  getChangedFields,
  SideBySideEditor,
  createSideBySideEditor,
  initSideBySideEditorFromRecord,
  getSideBySideEditorStyles,
  DEFAULT_SIDE_BY_SIDE_LABELS
} = await import('../dist/datatable/index.js');

// ============================================================================
// Source Target Drift Tests
// ============================================================================

describe('extractSourceTargetDrift', () => {
  it('should return empty drift for null/undefined input', () => {
    const result = extractSourceTargetDrift(null);
    assert.strictEqual(result.hasDrift, false);
    assert.strictEqual(result.sourceHash, null);
    assert.strictEqual(result.sourceVersion, null);
    assert.deepStrictEqual(result.changedFieldsSummary, { count: 0, fields: [] });
  });

  it('should return empty drift for record without drift metadata', () => {
    const record = { id: '123', title: 'Test' };
    const result = extractSourceTargetDrift(record);
    assert.strictEqual(result.hasDrift, false);
  });

  it('should extract drift from source_target_drift object', () => {
    const record = {
      id: '123',
      source_target_drift: {
        source_hash: 'abc123',
        source_version: 'v2',
        changed_fields_summary: {
          count: 2,
          fields: ['title', 'body'],
        },
      },
    };
    const result = extractSourceTargetDrift(record);
    assert.strictEqual(result.hasDrift, true);
    assert.strictEqual(result.sourceHash, 'abc123');
    assert.strictEqual(result.sourceVersion, 'v2');
    assert.strictEqual(result.changedFieldsSummary.count, 2);
    assert.deepStrictEqual(result.changedFieldsSummary.fields, ['title', 'body']);
  });

  it('should handle drift with only count', () => {
    const record = {
      source_target_drift: {
        source_hash: 'xyz',
        changed_fields_summary: {
          count: 3,
        },
      },
    };
    const result = extractSourceTargetDrift(record);
    assert.strictEqual(result.hasDrift, true);
    assert.strictEqual(result.changedFieldsSummary.count, 3);
    assert.deepStrictEqual(result.changedFieldsSummary.fields, []);
  });

  it('should handle drift with only fields', () => {
    const record = {
      source_target_drift: {
        source_hash: 'xyz',
        changed_fields_summary: {
          fields: ['title'],
        },
      },
    };
    const result = extractSourceTargetDrift(record);
    assert.strictEqual(result.hasDrift, true);
    assert.strictEqual(result.changedFieldsSummary.count, 0);
    assert.deepStrictEqual(result.changedFieldsSummary.fields, ['title']);
  });
});

describe('hasFieldDrift', () => {
  it('should return false for null drift', () => {
    assert.strictEqual(hasFieldDrift(null, 'title'), false);
  });

  it('should return false when no drift present', () => {
    const drift = { hasDrift: false, sourceHash: null, sourceVersion: null, changedFieldsSummary: { count: 0, fields: [] } };
    assert.strictEqual(hasFieldDrift(drift, 'title'), false);
  });

  it('should return true when field is in changed fields', () => {
    const drift = {
      hasDrift: true,
      sourceHash: 'abc',
      sourceVersion: 'v1',
      changedFieldsSummary: { count: 2, fields: ['title', 'body'] },
    };
    assert.strictEqual(hasFieldDrift(drift, 'title'), true);
    assert.strictEqual(hasFieldDrift(drift, 'body'), true);
  });

  it('should return false when field is not in changed fields', () => {
    const drift = {
      hasDrift: true,
      sourceHash: 'abc',
      sourceVersion: 'v1',
      changedFieldsSummary: { count: 1, fields: ['title'] },
    };
    assert.strictEqual(hasFieldDrift(drift, 'description'), false);
  });

  it('should be case-insensitive for field matching', () => {
    const drift = {
      hasDrift: true,
      sourceHash: 'abc',
      sourceVersion: 'v1',
      changedFieldsSummary: { count: 1, fields: ['Title'] },
    };
    assert.strictEqual(hasFieldDrift(drift, 'title'), true);
    assert.strictEqual(hasFieldDrift(drift, 'TITLE'), true);
  });
});

describe('getChangedFields', () => {
  it('should return empty array for null drift', () => {
    assert.deepStrictEqual(getChangedFields(null), []);
  });

  it('should return empty array when no drift', () => {
    const drift = { hasDrift: false, sourceHash: null, sourceVersion: null, changedFieldsSummary: { count: 0, fields: [] } };
    assert.deepStrictEqual(getChangedFields(drift), []);
  });

  it('should return copy of changed fields', () => {
    const drift = {
      hasDrift: true,
      sourceHash: 'abc',
      sourceVersion: 'v1',
      changedFieldsSummary: { count: 2, fields: ['title', 'body'] },
    };
    const result = getChangedFields(drift);
    assert.deepStrictEqual(result, ['title', 'body']);

    // Verify it's a copy
    result.push('extra');
    assert.deepStrictEqual(drift.changedFieldsSummary.fields, ['title', 'body']);
  });
});

// ============================================================================
// SideBySideEditor Class Tests
// ============================================================================

describe('SideBySideEditor', () => {
  it('should export DEFAULT_SIDE_BY_SIDE_LABELS', () => {
    assert.ok(DEFAULT_SIDE_BY_SIDE_LABELS);
    assert.strictEqual(DEFAULT_SIDE_BY_SIDE_LABELS.sourceColumn, 'Source');
    assert.strictEqual(DEFAULT_SIDE_BY_SIDE_LABELS.targetColumn, 'Translation');
    assert.ok(DEFAULT_SIDE_BY_SIDE_LABELS.driftBannerTitle);
    assert.ok(DEFAULT_SIDE_BY_SIDE_LABELS.copySourceButton);
  });

  it('should create editor instance with config', () => {
    const container = mockDocument.createElement('div');
    const config = {
      container,
      fields: [],
      drift: null,
      sourceLocale: 'en',
      targetLocale: 'fr',
      panelName: 'pages',
      recordId: '123',
    };
    const editor = new SideBySideEditor(config);
    assert.ok(editor);
  });

  it('should build HTML with header columns', () => {
    const container = mockDocument.createElement('div');
    const config = {
      container,
      fields: [],
      drift: null,
      sourceLocale: 'en',
      targetLocale: 'fr',
      panelName: 'pages',
      recordId: '123',
    };
    const editor = new SideBySideEditor(config);
    const html = editor.buildHTML();

    assert.ok(html.includes('side-by-side-editor'));
    assert.ok(html.includes('data-source-locale="en"'));
    assert.ok(html.includes('data-target-locale="fr"'));
    assert.ok(html.includes('EN'));
    assert.ok(html.includes('FR'));
  });

  it('should include drift banner when drift is present', () => {
    const container = mockDocument.createElement('div');
    const drift = {
      hasDrift: true,
      sourceHash: 'abc123',
      sourceVersion: 'v2',
      changedFieldsSummary: { count: 2, fields: ['title', 'body'] },
    };
    const config = {
      container,
      fields: [],
      drift,
      sourceLocale: 'en',
      targetLocale: 'fr',
      panelName: 'pages',
      recordId: '123',
    };
    const editor = new SideBySideEditor(config);
    const html = editor.buildHTML();

    assert.ok(html.includes('sbs-drift-banner'));
    assert.ok(html.includes('data-drift-banner'));
    assert.ok(html.includes('2 field'));
    assert.ok(html.includes('title'));
    assert.ok(html.includes('body'));
  });

  it('should not include drift banner when no drift', () => {
    const container = mockDocument.createElement('div');
    const config = {
      container,
      fields: [],
      drift: null,
      sourceLocale: 'en',
      targetLocale: 'fr',
      panelName: 'pages',
      recordId: '123',
    };
    const editor = new SideBySideEditor(config);
    const html = editor.buildHTML();

    assert.ok(!html.includes('sbs-drift-banner'));
  });

  it('should render field rows with source and target', () => {
    const container = mockDocument.createElement('div');
    const fields = [
      {
        key: 'title',
        label: 'Title',
        type: 'text',
        hasSourceChanged: false,
        sourceValue: 'Hello World',
        targetValue: 'Bonjour le Monde',
        sourceLocale: 'en',
        targetLocale: 'fr',
      },
    ];
    const config = {
      container,
      fields,
      drift: null,
      sourceLocale: 'en',
      targetLocale: 'fr',
      panelName: 'pages',
      recordId: '123',
    };
    const editor = new SideBySideEditor(config);
    const html = editor.buildHTML();

    assert.ok(html.includes('data-field-key="title"'));
    assert.ok(html.includes('Hello World'));
    assert.ok(html.includes('value="Bonjour le Monde"'));
    assert.ok(html.includes('sbs-copy-source'));
  });

  it('should mark fields with source changes', () => {
    const container = mockDocument.createElement('div');
    const fields = [
      {
        key: 'title',
        label: 'Title',
        type: 'text',
        hasSourceChanged: true,
        sourceValue: 'Updated Title',
        targetValue: 'Old Translation',
        sourceLocale: 'en',
        targetLocale: 'fr',
      },
    ];
    const config = {
      container,
      fields,
      drift: null,
      sourceLocale: 'en',
      targetLocale: 'fr',
      panelName: 'pages',
      recordId: '123',
    };
    const editor = new SideBySideEditor(config);
    const html = editor.buildHTML();

    assert.ok(html.includes('sbs-field-changed-row'));
    assert.ok(html.includes('sbs-field-changed'));
  });

  it('should render textarea for textarea/richtext fields', () => {
    const container = mockDocument.createElement('div');
    const fields = [
      {
        key: 'body',
        label: 'Body',
        type: 'textarea',
        hasSourceChanged: false,
        sourceValue: 'Source content',
        targetValue: 'Target content',
        sourceLocale: 'en',
        targetLocale: 'fr',
      },
    ];
    const config = {
      container,
      fields,
      drift: null,
      sourceLocale: 'en',
      targetLocale: 'fr',
      panelName: 'pages',
      recordId: '123',
    };
    const editor = new SideBySideEditor(config);
    const html = editor.buildHTML();

    assert.ok(html.includes('<textarea'));
    assert.ok(html.includes('sbs-textarea-input'));
  });

  it('should include required indicator for required fields', () => {
    const container = mockDocument.createElement('div');
    const fields = [
      {
        key: 'title',
        label: 'Title',
        type: 'text',
        hasSourceChanged: false,
        sourceValue: 'Source',
        targetValue: 'Target',
        sourceLocale: 'en',
        targetLocale: 'fr',
        required: true,
      },
    ];
    const config = {
      container,
      fields,
      drift: null,
      sourceLocale: 'en',
      targetLocale: 'fr',
      panelName: 'pages',
      recordId: '123',
    };
    const editor = new SideBySideEditor(config);
    const html = editor.buildHTML();

    assert.ok(html.includes('sbs-required'));
    assert.ok(html.includes('*'));
    assert.ok(html.includes('required'));
  });

  it('should show empty placeholder for empty source values', () => {
    const container = mockDocument.createElement('div');
    const fields = [
      {
        key: 'title',
        label: 'Title',
        type: 'text',
        hasSourceChanged: false,
        sourceValue: '',
        targetValue: '',
        sourceLocale: 'en',
        targetLocale: 'fr',
      },
    ];
    const config = {
      container,
      fields,
      drift: null,
      sourceLocale: 'en',
      targetLocale: 'fr',
      panelName: 'pages',
      recordId: '123',
    };
    const editor = new SideBySideEditor(config);
    const html = editor.buildHTML();

    assert.ok(html.includes('sbs-empty'));
    assert.ok(html.includes('Empty'));
  });

  it('should track drift acknowledgement state', () => {
    const container = mockDocument.createElement('div');
    const drift = {
      hasDrift: true,
      sourceHash: 'abc',
      sourceVersion: 'v1',
      changedFieldsSummary: { count: 1, fields: ['title'] },
    };
    const config = {
      container,
      fields: [],
      drift,
      sourceLocale: 'en',
      targetLocale: 'fr',
      panelName: 'pages',
      recordId: '123',
    };
    const editor = new SideBySideEditor(config);

    assert.strictEqual(editor.isDriftAcknowledged(), false);
    editor.acknowledgeDrift();
    assert.strictEqual(editor.isDriftAcknowledged(), true);
  });
});

// ============================================================================
// Factory Function Tests
// ============================================================================

describe('createSideBySideEditor', () => {
  it('should create and render editor', () => {
    const container = mockDocument.createElement('div');
    const config = {
      container,
      fields: [],
      drift: null,
      sourceLocale: 'en',
      targetLocale: 'fr',
      panelName: 'pages',
      recordId: '123',
    };
    const editor = createSideBySideEditor(config);
    assert.ok(editor);
  });
});

describe('initSideBySideEditorFromRecord', () => {
  it('should create editor from record data', () => {
    const container = mockDocument.createElement('div');
    const record = {
      title: 'Bonjour',
      body: 'Corps du texte',
      source_target_drift: {
        source_hash: 'abc',
        changed_fields_summary: { count: 1, fields: ['title'] },
      },
    };
    const sourceRecord = {
      title: 'Hello',
      body: 'Body text',
    };
    const fieldKeys = ['title', 'body'];
    const config = {
      sourceLocale: 'en',
      targetLocale: 'fr',
      panelName: 'pages',
      recordId: '123',
    };

    const editor = initSideBySideEditorFromRecord(container, record, sourceRecord, fieldKeys, config);
    assert.ok(editor);
  });

  it('should detect field drift from record', () => {
    const container = mockDocument.createElement('div');
    const record = {
      title: 'Translated title',
      source_target_drift: {
        source_hash: 'abc',
        changed_fields_summary: { count: 1, fields: ['title'] },
      },
    };
    const sourceRecord = { title: 'Updated Source' };
    const editor = initSideBySideEditorFromRecord(
      container,
      record,
      sourceRecord,
      ['title'],
      { sourceLocale: 'en', targetLocale: 'fr', panelName: 'pages', recordId: '123' }
    );

    const html = editor.buildHTML();
    assert.ok(html.includes('sbs-drift-banner'));
  });
});

// ============================================================================
// CSS Styles Tests
// ============================================================================

describe('getSideBySideEditorStyles', () => {
  it('should return CSS string', () => {
    const css = getSideBySideEditorStyles();
    assert.ok(typeof css === 'string');
    assert.ok(css.length > 0);
  });

  it('should include main editor class', () => {
    const css = getSideBySideEditorStyles();
    assert.ok(css.includes('.side-by-side-editor'));
  });

  it('should include drift banner styles', () => {
    const css = getSideBySideEditorStyles();
    assert.ok(css.includes('.sbs-drift-banner'));
    assert.ok(css.includes('.sbs-drift-acknowledged'));
  });

  it('should include field styles', () => {
    const css = getSideBySideEditorStyles();
    assert.ok(css.includes('.sbs-field-row'));
    assert.ok(css.includes('.sbs-source-field'));
    assert.ok(css.includes('.sbs-target-field'));
    assert.ok(css.includes('.sbs-copy-source'));
  });

  it('should include responsive styles', () => {
    const css = getSideBySideEditorStyles();
    assert.ok(css.includes('@media (max-width: 768px)'));
  });

  it('should include dark mode styles', () => {
    const css = getSideBySideEditorStyles();
    assert.ok(css.includes('@media (prefers-color-scheme: dark)'));
  });
});

// ============================================================================
// Edge Case Tests
// ============================================================================

describe('Edge Cases', () => {
  it('should handle HTML special characters in source/target values', () => {
    const container = mockDocument.createElement('div');
    const fields = [
      {
        key: 'title',
        label: 'Title',
        type: 'text',
        hasSourceChanged: false,
        sourceValue: '<script>alert("xss")</script>',
        targetValue: 'Normal & safe "text"',
        sourceLocale: 'en',
        targetLocale: 'fr',
      },
    ];
    const config = {
      container,
      fields,
      drift: null,
      sourceLocale: 'en',
      targetLocale: 'fr',
      panelName: 'pages',
      recordId: '123',
    };
    const editor = new SideBySideEditor(config);
    const html = editor.buildHTML();

    // Should escape HTML
    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(html.includes('&amp;'));
    assert.ok(html.includes('&quot;'));
  });

  it('should handle empty fields array', () => {
    const container = mockDocument.createElement('div');
    const config = {
      container,
      fields: [],
      drift: null,
      sourceLocale: 'en',
      targetLocale: 'fr',
      panelName: 'pages',
      recordId: '123',
    };
    const editor = new SideBySideEditor(config);
    const html = editor.buildHTML();

    assert.ok(html.includes('sbs-fields'));
    // Should have empty fields container
    assert.ok(html.includes('<div class="sbs-fields">'));
  });

  it('should handle malformed drift data gracefully', () => {
    const record = {
      source_target_drift: 'not an object',
    };
    const result = extractSourceTargetDrift(record);
    assert.strictEqual(result.hasDrift, false);
  });

  it('should handle drift with non-array fields', () => {
    const record = {
      source_target_drift: {
        source_hash: 'abc',
        changed_fields_summary: {
          fields: 'not an array',
          count: 1,
        },
      },
    };
    const result = extractSourceTargetDrift(record);
    assert.strictEqual(result.hasDrift, true);
    assert.deepStrictEqual(result.changedFieldsSummary.fields, []);
  });

  it('should support custom labels', () => {
    const container = mockDocument.createElement('div');
    const config = {
      container,
      fields: [],
      drift: null,
      sourceLocale: 'en',
      targetLocale: 'fr',
      panelName: 'pages',
      recordId: '123',
      labels: {
        sourceColumn: 'Original',
        targetColumn: 'Traduction',
      },
    };
    const editor = new SideBySideEditor(config);
    const html = editor.buildHTML();

    assert.ok(html.includes('Original'));
    assert.ok(html.includes('Traduction'));
  });
});
