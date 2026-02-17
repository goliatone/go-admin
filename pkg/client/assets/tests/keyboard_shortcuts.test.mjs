import test from 'node:test';
import assert from 'node:assert/strict';

// Import keyboard shortcuts exports from datatable index
const {
  KeyboardShortcutRegistry,
  isMacPlatform,
  getPrimaryModifierLabel,
  getModifierSymbol,
  formatShortcutDisplay,
  createTranslationShortcuts,
  renderShortcutsHelpContent,
} = await import('../dist/datatable/index.js');

// =============================================================================
// Platform Detection Tests (these will vary based on test environment)
// =============================================================================

test('isMacPlatform returns a boolean', () => {
  const result = isMacPlatform();
  assert.equal(typeof result, 'boolean');
});

test('getPrimaryModifierLabel returns a string', () => {
  const result = getPrimaryModifierLabel();
  assert.equal(typeof result, 'string');
  // Should be either '⌘' (Mac) or 'Ctrl' (other)
  assert.ok(result === '⌘' || result === 'Ctrl');
});

// =============================================================================
// getModifierSymbol Tests
// =============================================================================

test('getModifierSymbol returns symbol for ctrl', () => {
  const result = getModifierSymbol('ctrl');
  assert.ok(result === '⌃' || result === 'Ctrl');
});

test('getModifierSymbol returns symbol for shift', () => {
  const result = getModifierSymbol('shift');
  assert.ok(result === '⇧' || result === 'Shift');
});

test('getModifierSymbol returns symbol for alt', () => {
  const result = getModifierSymbol('alt');
  assert.ok(result === '⌥' || result === 'Alt');
});

test('getModifierSymbol returns symbol for meta', () => {
  const result = getModifierSymbol('meta');
  assert.ok(result === '⌘' || result === 'Win');
});

// =============================================================================
// formatShortcutDisplay Tests
// =============================================================================

test('formatShortcutDisplay formats simple shortcut', () => {
  const shortcut = {
    id: 'test',
    description: 'Test',
    category: 'other',
    key: 's',
    modifiers: ['ctrl'],
    handler: () => {},
  };

  const result = formatShortcutDisplay(shortcut);
  assert.equal(typeof result, 'string');
  assert.ok(result.length > 0);
  // Should contain S in some form
  assert.ok(result.toUpperCase().includes('S'));
});

test('formatShortcutDisplay formats shortcut with multiple modifiers', () => {
  const shortcut = {
    id: 'test',
    description: 'Test',
    category: 'other',
    key: 'p',
    modifiers: ['ctrl', 'shift'],
    handler: () => {},
  };

  const result = formatShortcutDisplay(shortcut);
  assert.equal(typeof result, 'string');
  // Should contain P and shift indicator
  assert.ok(result.toUpperCase().includes('P'));
});

test('formatShortcutDisplay formats Enter key', () => {
  const shortcut = {
    id: 'test',
    description: 'Test',
    category: 'other',
    key: 'Enter',
    modifiers: ['ctrl'],
    handler: () => {},
  };

  const result = formatShortcutDisplay(shortcut);
  // Should show Enter as ↵ or Enter
  assert.ok(result.includes('↵') || result.includes('Enter'));
});

// =============================================================================
// KeyboardShortcutRegistry Constructor Tests
// =============================================================================

test('KeyboardShortcutRegistry can be instantiated', () => {
  const registry = new KeyboardShortcutRegistry();
  assert.ok(registry);
});

test('KeyboardShortcutRegistry accepts config', () => {
  const registry = new KeyboardShortcutRegistry({
    enabled: true,
    context: 'form',
  });
  assert.ok(registry);
  assert.equal(registry.getContext(), 'form');
});

test('KeyboardShortcutRegistry defaults to global context', () => {
  const registry = new KeyboardShortcutRegistry();
  assert.equal(registry.getContext(), 'global');
});

// =============================================================================
// KeyboardShortcutRegistry Registration Tests
// =============================================================================

test('KeyboardShortcutRegistry.register adds a shortcut', () => {
  const registry = new KeyboardShortcutRegistry();

  registry.register({
    id: 'test-save',
    description: 'Save',
    category: 'save',
    key: 's',
    modifiers: ['ctrl'],
    handler: () => {},
  });

  const shortcuts = registry.getShortcuts();
  assert.equal(shortcuts.length, 1);
  assert.equal(shortcuts[0].id, 'test-save');
});

test('KeyboardShortcutRegistry.register prevents duplicates by default', () => {
  const registry = new KeyboardShortcutRegistry();

  registry.register({
    id: 'test-save',
    description: 'Save',
    category: 'save',
    key: 's',
    modifiers: ['ctrl'],
    handler: () => {},
  });

  // Try to register again
  registry.register({
    id: 'test-save',
    description: 'Save 2',
    category: 'save',
    key: 's',
    modifiers: ['ctrl'],
    handler: () => {},
  });

  const shortcuts = registry.getShortcuts();
  assert.equal(shortcuts.length, 1);
  // Should keep original description
  assert.equal(shortcuts[0].description, 'Save');
});

test('KeyboardShortcutRegistry.register allows override', () => {
  const registry = new KeyboardShortcutRegistry();

  registry.register({
    id: 'test-save',
    description: 'Save',
    category: 'save',
    key: 's',
    modifiers: ['ctrl'],
    handler: () => {},
  });

  registry.register({
    id: 'test-save',
    description: 'Save 2',
    category: 'save',
    key: 's',
    modifiers: ['ctrl'],
    handler: () => {},
  }, { override: true });

  const shortcuts = registry.getShortcuts();
  assert.equal(shortcuts.length, 1);
  // Should have new description
  assert.equal(shortcuts[0].description, 'Save 2');
});

test('KeyboardShortcutRegistry.unregister removes a shortcut', () => {
  const registry = new KeyboardShortcutRegistry();

  registry.register({
    id: 'test-save',
    description: 'Save',
    category: 'save',
    key: 's',
    modifiers: ['ctrl'],
    handler: () => {},
  });

  const removed = registry.unregister('test-save');
  assert.equal(removed, true);
  assert.equal(registry.getShortcuts().length, 0);
});

test('KeyboardShortcutRegistry.unregister returns false for non-existent', () => {
  const registry = new KeyboardShortcutRegistry();
  const removed = registry.unregister('non-existent');
  assert.equal(removed, false);
});

// =============================================================================
// KeyboardShortcutRegistry Enable/Disable Tests
// =============================================================================

test('KeyboardShortcutRegistry.setEnabled enables/disables shortcut', () => {
  const registry = new KeyboardShortcutRegistry();

  registry.register({
    id: 'test-save',
    description: 'Save',
    category: 'save',
    key: 's',
    modifiers: ['ctrl'],
    handler: () => {},
    enabled: true,
  });

  registry.setEnabled('test-save', false);

  const shortcuts = registry.getShortcuts();
  assert.equal(shortcuts[0].enabled, false);

  registry.setEnabled('test-save', true);
  assert.equal(registry.getShortcuts()[0].enabled, true);
});

// =============================================================================
// KeyboardShortcutRegistry Context Tests
// =============================================================================

test('KeyboardShortcutRegistry.setContext updates context', () => {
  const registry = new KeyboardShortcutRegistry();

  registry.setContext('form');
  assert.equal(registry.getContext(), 'form');

  registry.setContext('list');
  assert.equal(registry.getContext(), 'list');
});

// =============================================================================
// KeyboardShortcutRegistry Category Tests
// =============================================================================

test('KeyboardShortcutRegistry.getShortcutsByCategory filters by category', () => {
  const registry = new KeyboardShortcutRegistry();

  registry.register({
    id: 'save',
    description: 'Save',
    category: 'save',
    key: 's',
    modifiers: ['ctrl'],
    handler: () => {},
  });

  registry.register({
    id: 'publish',
    description: 'Publish',
    category: 'actions',
    key: 'p',
    modifiers: ['ctrl', 'shift'],
    handler: () => {},
  });

  const saveShortcuts = registry.getShortcutsByCategory('save');
  assert.equal(saveShortcuts.length, 1);
  assert.equal(saveShortcuts[0].id, 'save');

  const actionShortcuts = registry.getShortcutsByCategory('actions');
  assert.equal(actionShortcuts.length, 1);
  assert.equal(actionShortcuts[0].id, 'publish');
});

test('KeyboardShortcutRegistry.getShortcutsGroupedByCategory groups correctly', () => {
  const registry = new KeyboardShortcutRegistry();

  registry.register({
    id: 'save',
    description: 'Save',
    category: 'save',
    key: 's',
    modifiers: ['ctrl'],
    handler: () => {},
  });

  registry.register({
    id: 'prev-locale',
    description: 'Previous locale',
    category: 'locale',
    key: '[',
    modifiers: ['ctrl'],
    handler: () => {},
  });

  registry.register({
    id: 'next-locale',
    description: 'Next locale',
    category: 'locale',
    key: ']',
    modifiers: ['ctrl'],
    handler: () => {},
  });

  const grouped = registry.getShortcutsGroupedByCategory();
  assert.equal(grouped.get('save')?.length, 1);
  assert.equal(grouped.get('locale')?.length, 2);
});

// =============================================================================
// createTranslationShortcuts Tests
// =============================================================================

test('createTranslationShortcuts creates shortcuts from handlers', () => {
  const shortcuts = createTranslationShortcuts({
    onSave: () => {},
    onPublish: () => {},
    onLocalePicker: () => {},
  });

  assert.equal(shortcuts.length, 3);

  const ids = shortcuts.map((s) => s.id);
  assert.ok(ids.includes('save'));
  assert.ok(ids.includes('publish'));
  assert.ok(ids.includes('locale-picker'));
});

test('createTranslationShortcuts only creates shortcuts for provided handlers', () => {
  const shortcuts = createTranslationShortcuts({
    onSave: () => {},
  });

  assert.equal(shortcuts.length, 1);
  assert.equal(shortcuts[0].id, 'save');
});

test('createTranslationShortcuts creates locale navigation shortcuts', () => {
  const shortcuts = createTranslationShortcuts({
    onPrevLocale: () => {},
    onNextLocale: () => {},
  });

  assert.equal(shortcuts.length, 2);

  const ids = shortcuts.map((s) => s.id);
  assert.ok(ids.includes('prev-locale'));
  assert.ok(ids.includes('next-locale'));
});

test('createTranslationShortcuts sets correct categories', () => {
  const shortcuts = createTranslationShortcuts({
    onSave: () => {},
    onPublish: () => {},
    onLocalePicker: () => {},
  });

  const save = shortcuts.find((s) => s.id === 'save');
  assert.equal(save?.category, 'save');

  const publish = shortcuts.find((s) => s.id === 'publish');
  assert.equal(publish?.category, 'actions');

  const localePicker = shortcuts.find((s) => s.id === 'locale-picker');
  assert.equal(localePicker?.category, 'locale');
});

// =============================================================================
// renderShortcutsHelpContent Tests
// =============================================================================

test('renderShortcutsHelpContent returns HTML string', () => {
  const shortcuts = createTranslationShortcuts({
    onSave: () => {},
    onPublish: () => {},
  });

  const html = renderShortcutsHelpContent(shortcuts);
  assert.equal(typeof html, 'string');
  assert.ok(html.length > 0);
});

test('renderShortcutsHelpContent includes shortcut descriptions', () => {
  const shortcuts = createTranslationShortcuts({
    onSave: () => {},
    onPublish: () => {},
  });

  const html = renderShortcutsHelpContent(shortcuts);
  // Check for the descriptions - escapeHtml may affect string matching
  const htmlLower = html.toLowerCase();
  assert.ok(htmlLower.includes('save') || html.includes('changes'));
  assert.ok(htmlLower.includes('publish') || html.includes('content'));
});

test('renderShortcutsHelpContent includes category headers', () => {
  const shortcuts = createTranslationShortcuts({
    onSave: () => {},
    onLocalePicker: () => {},
  });

  const html = renderShortcutsHelpContent(shortcuts);
  // Should have category labels (case insensitive check)
  const htmlLower = html.toLowerCase();
  assert.ok(htmlLower.includes('save') || htmlLower.includes('submit'));
  assert.ok(htmlLower.includes('locale') || htmlLower.includes('switch'));
});

test('renderShortcutsHelpContent filters disabled shortcuts', () => {
  const shortcuts = [
    {
      id: 'enabled',
      description: 'Enabled shortcut',
      category: 'save',
      key: 's',
      modifiers: ['ctrl'],
      handler: () => {},
      enabled: true,
    },
    {
      id: 'disabled',
      description: 'Disabled shortcut',
      category: 'save',
      key: 'd',
      modifiers: ['ctrl'],
      handler: () => {},
      enabled: false,
    },
  ];

  const html = renderShortcutsHelpContent(shortcuts);
  assert.ok(html.includes('Enabled shortcut'));
  assert.ok(!html.includes('Disabled shortcut'));
});

test('renderShortcutsHelpContent includes help hint', () => {
  const shortcuts = createTranslationShortcuts({
    onSave: () => {},
  });

  const html = renderShortcutsHelpContent(shortcuts);
  // Should include hint about ? key
  assert.ok(html.includes('?'));
});

// =============================================================================
// KeyboardShortcutRegistry Destroy Tests
// =============================================================================

test('KeyboardShortcutRegistry.destroy clears shortcuts', () => {
  const registry = new KeyboardShortcutRegistry();

  registry.register({
    id: 'test',
    description: 'Test',
    category: 'other',
    key: 't',
    modifiers: ['ctrl'],
    handler: () => {},
  });

  registry.destroy();
  assert.equal(registry.getShortcuts().length, 0);
});

// =============================================================================
// Default Values Tests
// =============================================================================

test('KeyboardShortcutRegistry sets default shortcut values', () => {
  const registry = new KeyboardShortcutRegistry();

  registry.register({
    id: 'minimal',
    description: 'Minimal shortcut',
    category: 'other',
    key: 'm',
    modifiers: ['ctrl'],
    handler: () => {},
  });

  const shortcut = registry.getShortcuts()[0];
  assert.equal(shortcut.enabled, true);
  assert.equal(shortcut.context, 'global');
  assert.equal(shortcut.preventDefault, true);
  assert.equal(shortcut.allowInInput, false);
});

// =============================================================================
// Shortcut Settings Persistence Tests (TX-073)
// =============================================================================

// Import the persistence functions
const {
  loadShortcutSettings,
  saveShortcutSettings,
  isShortcutHintDismissed,
  dismissShortcutHint,
  applyShortcutSettings,
  renderShortcutSettingsUI,
} = await import('../dist/datatable/index.js');

test('loadShortcutSettings returns default settings when no stored value', () => {
  // Clear any existing storage (simulated in Node.js environment)
  const settings = loadShortcutSettings();

  assert.equal(typeof settings, 'object');
  assert.equal(settings.enabled, true);
  assert.equal(typeof settings.shortcuts, 'object');
  assert.equal(typeof settings.updatedAt, 'string');
});

test('loadShortcutSettings returns valid settings object structure', () => {
  const settings = loadShortcutSettings();

  assert.ok('enabled' in settings);
  assert.ok('shortcuts' in settings);
  assert.ok('updatedAt' in settings);
});

test('saveShortcutSettings does not throw', () => {
  const settings = {
    enabled: true,
    shortcuts: { save: true, publish: false },
    updatedAt: new Date().toISOString(),
  };

  // Should not throw even without localStorage
  assert.doesNotThrow(() => {
    saveShortcutSettings(settings);
  });
});

test('isShortcutHintDismissed returns boolean', () => {
  const result = isShortcutHintDismissed();
  assert.equal(typeof result, 'boolean');
});

test('dismissShortcutHint does not throw', () => {
  assert.doesNotThrow(() => {
    dismissShortcutHint();
  });
});

test('applyShortcutSettings updates registry shortcuts', () => {
  const registry = new KeyboardShortcutRegistry();

  registry.register({
    id: 'test-save',
    description: 'Save',
    category: 'save',
    key: 's',
    modifiers: ['ctrl'],
    handler: () => {},
    enabled: true,
  });

  registry.register({
    id: 'test-publish',
    description: 'Publish',
    category: 'actions',
    key: 'p',
    modifiers: ['ctrl', 'shift'],
    handler: () => {},
    enabled: true,
  });

  const settings = {
    enabled: true,
    shortcuts: {
      'test-save': true,
      'test-publish': false,
    },
    updatedAt: new Date().toISOString(),
  };

  applyShortcutSettings(registry, settings);

  const shortcuts = registry.getShortcuts();
  const save = shortcuts.find((s) => s.id === 'test-save');
  const publish = shortcuts.find((s) => s.id === 'test-publish');

  assert.equal(save?.enabled, true);
  assert.equal(publish?.enabled, false);
});

test('applyShortcutSettings enables shortcuts by default when not in settings', () => {
  const registry = new KeyboardShortcutRegistry();

  registry.register({
    id: 'test-new',
    description: 'New shortcut',
    category: 'other',
    key: 'n',
    modifiers: ['ctrl'],
    handler: () => {},
    enabled: false, // Start disabled
  });

  const settings = {
    enabled: true,
    shortcuts: {}, // No specific setting for test-new
    updatedAt: new Date().toISOString(),
  };

  applyShortcutSettings(registry, settings);

  const shortcut = registry.getShortcuts()[0];
  // Should be enabled since not explicitly disabled in settings
  assert.equal(shortcut.enabled, true);
});

test('renderShortcutSettingsUI is a function', () => {
  assert.equal(typeof renderShortcutSettingsUI, 'function');
});

// =============================================================================
// Settings UI Rendering Tests (TX-073)
// =============================================================================

test('renderShortcutSettingsUI accepts required parameters', () => {
  // We can't fully test DOM rendering in Node, but we can verify the function signature
  const shortcuts = createTranslationShortcuts({
    onSave: () => {},
    onPublish: () => {},
  });

  const settings = {
    enabled: true,
    shortcuts: {},
    updatedAt: new Date().toISOString(),
  };

  // Create a minimal mock container
  const mockContainer = {
    innerHTML: '',
    querySelector: () => null,
    querySelectorAll: () => [],
  };

  // Should not throw with valid parameters
  assert.doesNotThrow(() => {
    renderShortcutSettingsUI({
      container: mockContainer,
      shortcuts,
      settings,
      onSettingsChange: () => {},
    });
  });
});

test('renderShortcutSettingsUI generates HTML', () => {
  const shortcuts = createTranslationShortcuts({
    onSave: () => {},
  });

  const settings = {
    enabled: true,
    shortcuts: {},
    updatedAt: new Date().toISOString(),
  };

  const mockContainer = {
    innerHTML: '',
    querySelector: () => null,
    querySelectorAll: () => [],
  };

  renderShortcutSettingsUI({
    container: mockContainer,
    shortcuts,
    settings,
    onSettingsChange: () => {},
  });

  // Should have set innerHTML
  assert.ok(mockContainer.innerHTML.length > 0);
  assert.ok(mockContainer.innerHTML.includes('shortcuts-settings'));
});

test('renderShortcutSettingsUI includes global toggle', () => {
  const shortcuts = [];
  const settings = {
    enabled: true,
    shortcuts: {},
    updatedAt: new Date().toISOString(),
  };

  const mockContainer = {
    innerHTML: '',
    querySelector: () => null,
    querySelectorAll: () => [],
  };

  renderShortcutSettingsUI({
    container: mockContainer,
    shortcuts,
    settings,
    onSettingsChange: () => {},
  });

  // Should include global toggle
  assert.ok(mockContainer.innerHTML.includes('shortcuts-global-toggle'));
  assert.ok(mockContainer.innerHTML.includes('Enable keyboard shortcuts'));
});

test('renderShortcutSettingsUI includes reset button', () => {
  const shortcuts = [];
  const settings = {
    enabled: true,
    shortcuts: {},
    updatedAt: new Date().toISOString(),
  };

  const mockContainer = {
    innerHTML: '',
    querySelector: () => null,
    querySelectorAll: () => [],
  };

  renderShortcutSettingsUI({
    container: mockContainer,
    shortcuts,
    settings,
    onSettingsChange: () => {},
  });

  // Should include reset button
  assert.ok(mockContainer.innerHTML.includes('Reset to defaults'));
});
