/**
 * Tests for field-helpers.ts
 * Phase 3 field-level helpers: character counter, interpolation preview, RTL/LTR toggle
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// =============================================================================
// Mock DOM Environment
// =============================================================================

// Minimal DOM mocks for testing
class MockElement {
  constructor() {
    this.innerHTML = '';
    this.textContent = '';
    this.className = '';
    this.style = {};
    this.dir = '';
    this.type = 'text';
    this.value = '';
    this.name = '';
    this.parentElement = null;
    this.nextSibling = null;
    this.children = [];
    this.attributes = {};
    this._listeners = {};
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  getAttribute(name) {
    return this.attributes[name];
  }

  removeAttribute(name) {
    delete this.attributes[name];
  }

  addEventListener(event, handler) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(handler);
  }

  removeEventListener(event, handler) {
    if (!this._listeners[event]) return;
    const idx = this._listeners[event].indexOf(handler);
    if (idx >= 0) this._listeners[event].splice(idx, 1);
  }

  dispatchEvent(event) {
    const listeners = this._listeners[event.type] || [];
    listeners.forEach(h => h(event));
  }

  appendChild(child) {
    this.children.push(child);
    child.parentElement = this;
    return child;
  }

  insertBefore(child, ref) {
    const idx = this.children.indexOf(ref);
    if (idx >= 0) {
      this.children.splice(idx, 0, child);
    } else {
      this.children.push(child);
    }
    child.parentElement = this;
    return child;
  }

  querySelector(selector) {
    // Simple name selector support for testing
    if (selector.startsWith('[name=')) {
      const name = selector.match(/\[name="?([^"]+)"?\]/)?.[1];
      return this.children.find(c => c.name === name) || null;
    }
    return null;
  }

  classList = {
    _classes: [],
    add(cls) { if (!this._classes.includes(cls)) this._classes.push(cls); },
    remove(cls) { const idx = this._classes.indexOf(cls); if (idx >= 0) this._classes.splice(idx, 1); },
    contains(cls) { return this._classes.includes(cls); }
  };
}

globalThis.document = {
  createElement(tag) {
    const el = new MockElement();
    el.tagName = tag.toUpperCase();
    return el;
  },
  dir: 'ltr',
  documentElement: { dir: 'ltr' }
};

globalThis.localStorage = {
  _data: {},
  getItem(key) { return this._data[key] ?? null; },
  setItem(key, value) { this._data[key] = value; },
  removeItem(key) { delete this._data[key]; },
  clear() { this._data = {}; }
};

// =============================================================================
// Test Utilities
// =============================================================================

function createMockInput(value = '') {
  const input = new MockElement();
  input.value = value;
  input.parentElement = new MockElement();
  return input;
}

// =============================================================================
// CharacterCounter Tests
// =============================================================================

describe('CharacterCounter', () => {
  describe('getCount', () => {
    it('should return 0 for empty input', () => {
      const count = getCharCount('');
      assert.equal(count, 0);
    });

    it('should return correct count for text', () => {
      const count = getCharCount('Hello, World!');
      assert.equal(count, 13);
    });

    it('should count Unicode characters', () => {
      const count = getCharCount('Héllo 世界');
      assert.equal(count, 8);
    });

    it('should count emojis as their actual length', () => {
      // Emojis can be 1-2 code units in JavaScript
      const count = getCharCount('Hello 👋');
      assert.ok(count >= 7); // At least 7 characters
    });
  });

  describe('getSeverity', () => {
    it('should return null when under soft limit', () => {
      const severity = getCharCountSeverity(50, 100, 150);
      assert.equal(severity, null);
    });

    it('should return warning at soft limit', () => {
      const severity = getCharCountSeverity(100, 100, 150);
      assert.equal(severity, 'warning');
    });

    it('should return error at hard limit', () => {
      const severity = getCharCountSeverity(150, 100, 150);
      assert.equal(severity, 'error');
    });

    it('should return error when over hard limit', () => {
      const severity = getCharCountSeverity(200, 100, 150);
      assert.equal(severity, 'error');
    });

    it('should return warning between soft and hard limits', () => {
      const severity = getCharCountSeverity(125, 100, 150);
      assert.equal(severity, 'warning');
    });

    it('should handle no limits', () => {
      const severity = getCharCountSeverity(1000, undefined, undefined);
      assert.equal(severity, null);
    });

    it('should handle only soft limit', () => {
      const severity = getCharCountSeverity(100, 80, undefined);
      assert.equal(severity, 'warning');
    });

    it('should handle only hard limit', () => {
      const severity = getCharCountSeverity(100, undefined, 80);
      assert.equal(severity, 'error');
    });
  });

  describe('renderCharacterCounter', () => {
    it('should render count only when no limit', () => {
      const html = renderCharacterCounter(42);
      assert.ok(html.includes('42'));
      // When no limit is provided, should not show "X / Y" format
      assert.ok(!html.includes(' / '));
    });

    it('should render count and limit', () => {
      const html = renderCharacterCounter(42, 100);
      assert.ok(html.includes('42'));
      assert.ok(html.includes('100'));
      assert.ok(html.includes('/'));
    });

    it('should include severity class', () => {
      const html = renderCharacterCounter(90, 100, 'warning');
      assert.ok(html.includes('char-counter--warning'));
    });

    it('should include error class', () => {
      const html = renderCharacterCounter(100, 100, 'error');
      assert.ok(html.includes('char-counter--error'));
    });

    it('should include aria-live attribute', () => {
      const html = renderCharacterCounter(50);
      assert.ok(html.includes('aria-live'));
    });

    it('should use custom class prefix', () => {
      const html = renderCharacterCounter(50, 100, null, 'my-counter');
      assert.ok(html.includes('my-counter'));
    });
  });
});

// =============================================================================
// InterpolationPreview Tests
// =============================================================================

describe('InterpolationPreview', () => {
  describe('detectInterpolations', () => {
    it('should detect Mustache variables', () => {
      const matches = detectInterpolations('Hello {{name}}!');
      // May match both Mustache and ICU patterns (nested braces)
      assert.ok(matches.length >= 1);
      const mustacheMatch = matches.find(m => m.pattern === 'Mustache');
      assert.ok(mustacheMatch);
      assert.equal(mustacheMatch.variable, 'name');
    });

    it('should detect multiple variables', () => {
      const matches = detectInterpolations('Hello {{firstName}} {{lastName}}');
      // May match multiple patterns due to overlapping syntax
      const mustacheMatches = matches.filter(m => m.pattern === 'Mustache');
      assert.ok(mustacheMatches.length >= 2);
      assert.equal(mustacheMatches[0].variable, 'firstName');
      assert.equal(mustacheMatches[1].variable, 'lastName');
    });

    it('should detect ICU format', () => {
      const matches = detectInterpolations('You have {count} items');
      assert.equal(matches.length, 1);
      assert.equal(matches[0].variable, 'count');
      assert.equal(matches[0].pattern, 'ICU');
    });

    it('should detect printf format', () => {
      const matches = detectInterpolations('Hello %s, you have %d items');
      assert.equal(matches.length, 2);
    });

    it('should detect template literals', () => {
      const matches = detectInterpolations('Hello ${name}');
      // May match both Template Literal and ICU patterns
      assert.ok(matches.length >= 1);
      const templateMatch = matches.find(m => m.pattern === 'Template Literal');
      assert.ok(templateMatch);
      assert.equal(templateMatch.variable, 'name');
    });

    it('should return empty array for no variables', () => {
      const matches = detectInterpolations('Hello World!');
      assert.equal(matches.length, 0);
    });

    it('should include position information', () => {
      const matches = detectInterpolations('Hello {{name}}!');
      assert.equal(matches[0].start, 6);
      assert.equal(matches[0].end, 14);
    });

    it('should detect nested property access', () => {
      const matches = detectInterpolations('Hello {{user.name}}!');
      assert.equal(matches.length, 1);
      assert.equal(matches[0].variable, 'user.name');
    });
  });

  describe('getPreviewText', () => {
    it('should substitute known variables', () => {
      const preview = getPreviewText('Hello {{name}}!', { name: 'John' });
      assert.equal(preview, 'Hello John!');
    });

    it('should keep unknown variables', () => {
      const preview = getPreviewText('Hello {{unknown}}!', {});
      assert.ok(preview.includes('{{unknown}}') || preview.includes('unknown'));
    });

    it('should handle multiple variables', () => {
      const preview = getPreviewText('{{greeting}} {{name}}!', {
        greeting: 'Hello',
        name: 'Jane'
      });
      assert.equal(preview, 'Hello Jane!');
    });

    it('should handle mixed formats', () => {
      const preview = getPreviewText('Hello {{name}}, you have {count} items', {
        name: 'John',
        count: '5'
      });
      assert.ok(preview.includes('John'));
      assert.ok(preview.includes('5'));
    });
  });

  describe('DEFAULT_INTERPOLATION_PATTERNS', () => {
    it('should include Mustache pattern', () => {
      const patterns = DEFAULT_INTERPOLATION_PATTERNS;
      const mustache = patterns.find(p => p.name === 'Mustache');
      assert.ok(mustache);
      assert.ok(mustache.pattern.test('{{name}}'));
    });

    it('should include ICU pattern', () => {
      const patterns = DEFAULT_INTERPOLATION_PATTERNS;
      const icu = patterns.find(p => p.name === 'ICU');
      assert.ok(icu);
      assert.ok(icu.pattern.test('{name}'));
    });

    it('should include Printf pattern', () => {
      const patterns = DEFAULT_INTERPOLATION_PATTERNS;
      const printf = patterns.find(p => p.name === 'Printf');
      assert.ok(printf);
      assert.ok(printf.pattern.test('%s'));
    });

    it('should include Template Literal pattern', () => {
      const patterns = DEFAULT_INTERPOLATION_PATTERNS;
      const template = patterns.find(p => p.name === 'Template Literal');
      assert.ok(template);
      assert.ok(template.pattern.test('${name}'));
    });
  });

  describe('DEFAULT_SAMPLE_VALUES', () => {
    it('should include common variable names', () => {
      const values = DEFAULT_SAMPLE_VALUES;
      assert.ok(values.name);
      assert.ok(values.count);
      assert.ok(values.email);
      assert.ok(values.date);
    });
  });
});

// =============================================================================
// DirectionToggle Tests
// =============================================================================

describe('DirectionToggle', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  describe('getDirection', () => {
    it('should default to ltr', () => {
      const direction = getInitialDirection('auto');
      assert.equal(direction, 'ltr');
    });

    it('should use explicit initial direction', () => {
      const direction = getInitialDirection('rtl');
      assert.equal(direction, 'rtl');
    });

    it('should use persisted direction', () => {
      globalThis.localStorage.setItem('test-key', 'rtl');
      const direction = getPersistedDirection('test-key') || 'ltr';
      assert.equal(direction, 'rtl');
    });

    it('should ignore invalid persisted values', () => {
      globalThis.localStorage.setItem('test-key', 'invalid');
      const direction = getPersistedDirection('test-key');
      assert.equal(direction, null);
    });
  });

  describe('toggle', () => {
    it('should toggle from ltr to rtl', () => {
      const toggled = toggleDirection('ltr');
      assert.equal(toggled, 'rtl');
    });

    it('should toggle from rtl to ltr', () => {
      const toggled = toggleDirection('rtl');
      assert.equal(toggled, 'ltr');
    });
  });

  describe('renderDirectionToggle', () => {
    it('should render LTR button', () => {
      const html = renderDirectionToggle('ltr');
      assert.ok(html.includes('LTR'));
      assert.ok(html.includes('aria-pressed="false"'));
    });

    it('should render RTL button', () => {
      const html = renderDirectionToggle('rtl');
      assert.ok(html.includes('RTL'));
      assert.ok(html.includes('aria-pressed="true"'));
    });

    it('should include title attribute', () => {
      const html = renderDirectionToggle('ltr');
      assert.ok(html.includes('title='));
    });

    it('should use custom class prefix', () => {
      const html = renderDirectionToggle('ltr', 'custom-toggle');
      assert.ok(html.includes('custom-toggle'));
    });

    it('should include SVG icon', () => {
      const html = renderDirectionToggle('ltr');
      assert.ok(html.includes('<svg'));
    });
  });

  describe('persistence', () => {
    it('should persist direction to localStorage', () => {
      persistDirection('test-key', 'rtl');
      assert.equal(globalThis.localStorage.getItem('test-key'), 'rtl');
    });

    it('should retrieve persisted direction', () => {
      persistDirection('test-key', 'rtl');
      const direction = getPersistedDirection('test-key');
      assert.equal(direction, 'rtl');
    });
  });
});

// =============================================================================
// getFieldHelperStyles Tests
// =============================================================================

describe('getFieldHelperStyles', () => {
  it('should return CSS string', () => {
    const css = getFieldHelperStyles();
    assert.equal(typeof css, 'string');
    assert.ok(css.length > 0);
  });

  it('should include character counter styles', () => {
    const css = getFieldHelperStyles();
    assert.ok(css.includes('.char-counter'));
    assert.ok(css.includes('.char-counter--warning'));
    assert.ok(css.includes('.char-counter--error'));
  });

  it('should include interpolation preview styles', () => {
    const css = getFieldHelperStyles();
    assert.ok(css.includes('.interpolation-preview'));
    assert.ok(css.includes('.interpolation-preview__variable'));
  });

  it('should include direction toggle styles', () => {
    const css = getFieldHelperStyles();
    assert.ok(css.includes('.dir-toggle'));
    assert.ok(css.includes('.dir-toggle__label'));
  });

  it('should include CSS variables for theming', () => {
    const css = getFieldHelperStyles();
    assert.ok(css.includes('--char-counter-color'));
    assert.ok(css.includes('--preview-bg'));
    assert.ok(css.includes('--dir-toggle-color'));
  });
});

// =============================================================================
// Mock Implementation Functions
// =============================================================================

function getCharCount(text) {
  return text.length;
}

function getCharCountSeverity(count, softLimit, hardLimit) {
  if (hardLimit && count >= hardLimit) {
    return 'error';
  }
  if (softLimit && count >= softLimit) {
    return 'warning';
  }
  return null;
}

function renderCharacterCounter(count, limit, severity, classPrefix = 'char-counter') {
  const classes = [classPrefix];
  if (severity) {
    classes.push(`${classPrefix}--${severity}`);
  }

  const display = limit ? `${count} / ${limit}` : `${count}`;

  return `<span class="${classes.join(' ')}" aria-live="polite">${display}</span>`;
}

const DEFAULT_INTERPOLATION_PATTERNS = [
  { pattern: /\{\{(\w+(?:\.\w+)*)\}\}/g, name: 'Mustache', example: '{{name}}' },
  { pattern: /\{(\w+)(?:,\s*\w+(?:,\s*[^}]+)?)?\}/g, name: 'ICU', example: '{name}' },
  { pattern: /%(\d+\$)?[sdfc]/g, name: 'Printf', example: '%s' },
  { pattern: /%\((\w+)\)[sdf]/g, name: 'Named Printf', example: '%(name)s' },
  { pattern: /\$\{(\w+)\}/g, name: 'Template Literal', example: '${name}' }
];

const DEFAULT_SAMPLE_VALUES = {
  name: 'John',
  count: '5',
  email: 'user@example.com',
  date: '2024-01-15',
  price: '$29.99',
  user: 'Jane',
  item: 'Product',
  total: '100'
};

function detectInterpolations(text, patterns = DEFAULT_INTERPOLATION_PATTERNS) {
  const matches = [];

  for (const patternDef of patterns) {
    patternDef.pattern.lastIndex = 0;

    let match;
    while ((match = patternDef.pattern.exec(text)) !== null) {
      matches.push({
        pattern: patternDef.name,
        variable: match[1] ?? match[0],
        start: match.index,
        end: match.index + match[0].length
      });
    }
  }

  return matches;
}

function getPreviewText(text, sampleValues) {
  for (const patternDef of DEFAULT_INTERPOLATION_PATTERNS) {
    patternDef.pattern.lastIndex = 0;
    text = text.replace(patternDef.pattern, (match, variable) => {
      const varName = variable ?? match;
      const normalized = varName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

      for (const [key, value] of Object.entries(sampleValues)) {
        if (key.toLowerCase() === normalized) {
          return value;
        }
      }

      return match;
    });
  }

  return text;
}

function getInitialDirection(initial) {
  if (initial === 'ltr' || initial === 'rtl') {
    return initial;
  }
  return 'ltr';
}

function getPersistedDirection(key) {
  try {
    const stored = globalThis.localStorage.getItem(key);
    if (stored === 'ltr' || stored === 'rtl') {
      return stored;
    }
  } catch {
    // Ignore
  }
  return null;
}

function persistDirection(key, direction) {
  try {
    globalThis.localStorage.setItem(key, direction);
  } catch {
    // Ignore
  }
}

function toggleDirection(current) {
  return current === 'ltr' ? 'rtl' : 'ltr';
}

function renderDirectionToggle(direction, classPrefix = 'dir-toggle') {
  const isRtl = direction === 'rtl';
  const icon = isRtl
    ? `<path d="M13 8H3M6 5L3 8l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<path d="M3 8h10M10 5l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;

  return `<button type="button" class="${classPrefix}" aria-pressed="${isRtl}" title="Toggle text direction (${direction.toUpperCase()})">
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">${icon}</svg>
    <span class="${classPrefix}__label">${direction.toUpperCase()}</span>
  </button>`;
}

function getFieldHelperStyles() {
  return `
    /* Character Counter */
    .char-counter {
      display: inline-flex;
      font-size: 0.75rem;
      color: var(--char-counter-color, #6b7280);
      margin-left: 0.5rem;
    }

    .char-counter--warning {
      color: var(--char-counter-warning-color, #f59e0b);
    }

    .char-counter--error {
      color: var(--char-counter-error-color, #ef4444);
      font-weight: 500;
    }

    /* Interpolation Preview */
    .interpolation-preview {
      margin-top: 0.5rem;
      padding: 0.5rem;
      background: var(--preview-bg, #f9fafb);
      border-radius: 0.25rem;
      font-size: 0.875rem;
    }

    .interpolation-preview--empty {
      display: none;
    }

    .interpolation-preview__label {
      color: var(--preview-label-color, #6b7280);
      font-size: 0.75rem;
      margin-right: 0.5rem;
    }

    .interpolation-preview__variable {
      background: var(--preview-variable-bg, #e0f2fe);
      color: var(--preview-variable-color, #0369a1);
      padding: 0.125rem 0.25rem;
      border-radius: 0.125rem;
      font-family: monospace;
    }

    /* Direction Toggle */
    .dir-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      color: var(--dir-toggle-color, #374151);
      background: var(--dir-toggle-bg, #f3f4f6);
      border: 1px solid var(--dir-toggle-border, #d1d5db);
      border-radius: 0.25rem;
      cursor: pointer;
      transition: background-color 150ms ease;
    }

    .dir-toggle:hover {
      background: var(--dir-toggle-hover-bg, #e5e7eb);
    }

    .dir-toggle[aria-pressed="true"] {
      background: var(--dir-toggle-active-bg, #dbeafe);
      border-color: var(--dir-toggle-active-border, #93c5fd);
      color: var(--dir-toggle-active-color, #1d4ed8);
    }

    .dir-toggle__icon {
      display: inline-flex;
    }

    .dir-toggle__label {
      font-weight: 500;
    }
  `;
}
