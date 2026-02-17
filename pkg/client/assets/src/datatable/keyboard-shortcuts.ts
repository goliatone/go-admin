/**
 * Keyboard Shortcuts Registry
 *
 * ===========================================================================
 * DESIGN NOTE (TX-072): Keyboard Shortcut System for Translation Workflow
 * ===========================================================================
 *
 * Goals:
 * 1. Accelerate common translation operations (save, publish, locale switch)
 * 2. Provide discoverability through visual cues and help modal
 * 3. Maintain consistency with standard editor conventions
 * 4. Support context-aware shortcuts (form vs list view)
 *
 * Shortcut Categories:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ Category        │ Shortcuts                                            │
 * ├─────────────────┼──────────────────────────────────────────────────────┤
 * │ Save/Submit     │ Ctrl/Cmd+S (save), Ctrl/Cmd+Enter (submit)           │
 * │ Locale          │ Ctrl/Cmd+Shift+L (locale picker), Ctrl/Cmd+1-9       │
 * │ Navigation      │ Ctrl/Cmd+[ ] (prev/next locale)                      │
 * │ Actions         │ Ctrl/Cmd+P (publish), Ctrl/Cmd+Shift+T (translate)   │
 * │ Help            │ ? (show shortcuts help), Esc (dismiss modals)        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Key Design Decisions:
 * - Use Cmd on Mac, Ctrl on other platforms (detected via platform check)
 * - Shortcuts are opt-in and configurable per context
 * - Conflicts with browser/OS shortcuts are avoided
 * - All shortcuts are documented and discoverable via ? key
 * - Shortcuts respect focus state (don't trigger when typing in inputs)
 *
 * Discoverability:
 * - Help modal (? key) shows all available shortcuts
 * - Tooltips on buttons show keyboard shortcuts
 * - First-time hint for ? key in toolbar
 *
 * ===========================================================================
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Platform-independent modifier key representation
 */
export type ModifierKey = 'ctrl' | 'alt' | 'shift' | 'meta';

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
  /** Unique identifier for this shortcut */
  id: string;
  /** Human-readable description */
  description: string;
  /** Category for grouping in help modal */
  category: ShortcutCategory;
  /** Primary key (e.g., 's', 'Enter', '1') */
  key: string;
  /** Modifier keys required */
  modifiers: ModifierKey[];
  /** Handler function called when shortcut is triggered */
  handler: (event: KeyboardEvent) => void | Promise<void>;
  /** Whether shortcut is enabled (default: true) */
  enabled?: boolean;
  /** Context where shortcut is active (default: 'global') */
  context?: ShortcutContext;
  /** Whether to prevent default browser behavior */
  preventDefault?: boolean;
  /** Whether shortcut should work when focused on form inputs */
  allowInInput?: boolean;
}

/**
 * Shortcut category for grouping
 */
export type ShortcutCategory =
  | 'save'
  | 'navigation'
  | 'locale'
  | 'actions'
  | 'help'
  | 'other';

/**
 * Context where shortcuts are active
 */
export type ShortcutContext = 'global' | 'form' | 'list' | 'modal';

/**
 * Shortcut registration options
 */
export interface ShortcutRegistrationOptions {
  /** Override existing shortcut with same ID */
  override?: boolean;
  /** Priority for handling (higher = processed first) */
  priority?: number;
}

/**
 * Configuration for the shortcut registry
 */
export interface ShortcutRegistryConfig {
  /** Enable/disable the entire registry */
  enabled?: boolean;
  /** Current active context */
  context?: ShortcutContext;
  /** Platform override for modifier key display (auto-detected if not set) */
  platform?: 'mac' | 'windows' | 'linux';
  /** Callback for when a shortcut is triggered */
  onShortcutTriggered?: (shortcut: KeyboardShortcut) => void;
  /** Callback for when help is requested (? key) */
  onHelpRequested?: () => void;
}

// ============================================================================
// Platform Detection
// ============================================================================

/**
 * Detect if running on Mac platform
 */
export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
}

/**
 * Get the primary modifier key label for the current platform
 */
export function getPrimaryModifierLabel(): string {
  return isMacPlatform() ? '⌘' : 'Ctrl';
}

/**
 * Get the modifier key symbol for display
 */
export function getModifierSymbol(modifier: ModifierKey): string {
  if (isMacPlatform()) {
    switch (modifier) {
      case 'ctrl': return '⌃';
      case 'alt': return '⌥';
      case 'shift': return '⇧';
      case 'meta': return '⌘';
    }
  }
  switch (modifier) {
    case 'ctrl': return 'Ctrl';
    case 'alt': return 'Alt';
    case 'shift': return 'Shift';
    case 'meta': return 'Win';
  }
}

/**
 * Format a shortcut for display (e.g., "⌘+S" or "Ctrl+S")
 */
export function formatShortcutDisplay(shortcut: KeyboardShortcut): string {
  const modifiers = shortcut.modifiers.map(getModifierSymbol);
  const key = formatKeyDisplay(shortcut.key);

  if (isMacPlatform()) {
    // Mac style: symbols without + separators
    return [...modifiers, key].join('');
  }
  // Windows/Linux style: with + separators
  return [...modifiers, key].join('+');
}

/**
 * Format a key for display
 */
function formatKeyDisplay(key: string): string {
  const keyMappings: Record<string, string> = {
    'Enter': '↵',
    'Escape': 'Esc',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    ' ': 'Space',
    '[': '[',
    ']': ']',
  };
  return keyMappings[key] || key.toUpperCase();
}

// ============================================================================
// Keyboard Shortcut Registry
// ============================================================================

/**
 * KeyboardShortcutRegistry manages keyboard shortcuts and their handlers.
 * Provides a centralized place to register, unregister, and trigger shortcuts.
 */
export class KeyboardShortcutRegistry {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private config: ShortcutRegistryConfig;
  private keydownHandler: ((event: KeyboardEvent) => void) | null = null;
  private boundElement: Document | HTMLElement | null = null;

  constructor(config: ShortcutRegistryConfig = {}) {
    this.config = {
      enabled: true,
      context: 'global',
      ...config,
    };
  }

  /**
   * Register a keyboard shortcut.
   */
  register(
    shortcut: KeyboardShortcut,
    options: ShortcutRegistrationOptions = {}
  ): void {
    const { override = false } = options;

    if (this.shortcuts.has(shortcut.id) && !override) {
      console.warn(`[KeyboardShortcuts] Shortcut "${shortcut.id}" already registered`);
      return;
    }

    this.shortcuts.set(shortcut.id, {
      enabled: true,
      context: 'global',
      preventDefault: true,
      allowInInput: false,
      ...shortcut,
    });
  }

  /**
   * Unregister a keyboard shortcut by ID.
   */
  unregister(id: string): boolean {
    return this.shortcuts.delete(id);
  }

  /**
   * Enable or disable a specific shortcut.
   */
  setEnabled(id: string, enabled: boolean): void {
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      shortcut.enabled = enabled;
    }
  }

  /**
   * Set the current active context.
   */
  setContext(context: ShortcutContext): void {
    this.config.context = context;
  }

  /**
   * Get the current context.
   */
  getContext(): ShortcutContext {
    return this.config.context || 'global';
  }

  /**
   * Get all registered shortcuts.
   */
  getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcuts by category.
   */
  getShortcutsByCategory(category: ShortcutCategory): KeyboardShortcut[] {
    return this.getShortcuts().filter((s) => s.category === category);
  }

  /**
   * Get shortcuts grouped by category.
   */
  getShortcutsGroupedByCategory(): Map<ShortcutCategory, KeyboardShortcut[]> {
    const grouped = new Map<ShortcutCategory, KeyboardShortcut[]>();
    for (const shortcut of this.shortcuts.values()) {
      const list = grouped.get(shortcut.category) || [];
      list.push(shortcut);
      grouped.set(shortcut.category, list);
    }
    return grouped;
  }

  /**
   * Bind keyboard event listeners.
   */
  bind(element: Document | HTMLElement = document): void {
    if (this.keydownHandler) {
      this.unbind();
    }

    this.keydownHandler = (event: KeyboardEvent) => {
      this.handleKeydown(event);
    };

    this.boundElement = element;
    element.addEventListener('keydown', this.keydownHandler as EventListener);
  }

  /**
   * Unbind keyboard event listeners.
   */
  unbind(): void {
    if (this.keydownHandler && this.boundElement) {
      this.boundElement.removeEventListener('keydown', this.keydownHandler as EventListener);
      this.keydownHandler = null;
      this.boundElement = null;
    }
  }

  /**
   * Handle keydown event.
   */
  private handleKeydown(event: KeyboardEvent): void {
    if (!this.config.enabled) return;

    // Check for help shortcut (? key without modifiers)
    if (event.key === '?' && !event.ctrlKey && !event.altKey && !event.metaKey) {
      if (!this.isInputFocused(event)) {
        event.preventDefault();
        this.config.onHelpRequested?.();
        return;
      }
    }

    // Find matching shortcut
    const matchingShortcut = this.findMatchingShortcut(event);
    if (!matchingShortcut) return;

    // Check if shortcut is enabled
    if (!matchingShortcut.enabled) return;

    // Check context
    if (matchingShortcut.context !== 'global' &&
        matchingShortcut.context !== this.config.context) {
      return;
    }

    // Check if we should allow in input
    if (!matchingShortcut.allowInInput && this.isInputFocused(event)) {
      return;
    }

    // Prevent default if configured
    if (matchingShortcut.preventDefault) {
      event.preventDefault();
    }

    // Trigger callback
    this.config.onShortcutTriggered?.(matchingShortcut);

    // Execute handler
    try {
      const result = matchingShortcut.handler(event);
      if (result instanceof Promise) {
        result.catch((err) => {
          console.error(`[KeyboardShortcuts] Handler error for "${matchingShortcut.id}":`, err);
        });
      }
    } catch (err) {
      console.error(`[KeyboardShortcuts] Handler error for "${matchingShortcut.id}":`, err);
    }
  }

  /**
   * Find a shortcut matching the given keyboard event.
   */
  private findMatchingShortcut(event: KeyboardEvent): KeyboardShortcut | null {
    for (const shortcut of this.shortcuts.values()) {
      if (this.matchesEvent(shortcut, event)) {
        return shortcut;
      }
    }
    return null;
  }

  /**
   * Check if a shortcut matches a keyboard event.
   */
  private matchesEvent(shortcut: KeyboardShortcut, event: KeyboardEvent): boolean {
    // Check key
    const eventKey = event.key.toLowerCase();
    const shortcutKey = shortcut.key.toLowerCase();

    if (eventKey !== shortcutKey && event.code.toLowerCase() !== shortcutKey) {
      return false;
    }

    // Check modifiers
    const isMac = isMacPlatform();
    const expectedModifiers = new Set(shortcut.modifiers);

    // On Mac, treat 'ctrl' in shortcuts as 'meta' (Cmd)
    const wantsCtrl = expectedModifiers.has('ctrl');
    const wantsMeta = expectedModifiers.has('meta');
    const wantsAlt = expectedModifiers.has('alt');
    const wantsShift = expectedModifiers.has('shift');

    // Check primary modifier (Cmd on Mac, Ctrl on others)
    if (wantsCtrl) {
      const hasModifier = isMac ? event.metaKey : event.ctrlKey;
      if (!hasModifier) return false;
    }

    // Check explicit meta requirement
    if (wantsMeta && !isMac && !event.metaKey) return false;

    // Check alt/option
    if (wantsAlt && !event.altKey) return false;

    // Check shift
    if (wantsShift && !event.shiftKey) return false;

    // Check for unexpected modifiers
    if (!wantsCtrl && !wantsMeta) {
      if (isMac ? event.metaKey : event.ctrlKey) return false;
    }
    if (!wantsAlt && event.altKey) return false;
    if (!wantsShift && event.shiftKey) return false;

    return true;
  }

  /**
   * Check if an input element is focused.
   */
  private isInputFocused(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement;
    if (!target) return false;

    const tagName = target.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
      return true;
    }

    // Check for contenteditable
    if (target.isContentEditable) {
      return true;
    }

    return false;
  }

  /**
   * Destroy the registry and clean up.
   */
  destroy(): void {
    this.unbind();
    this.shortcuts.clear();
  }
}

// ============================================================================
// Default Translation Shortcuts
// ============================================================================

/**
 * Create default translation workflow shortcuts.
 */
export function createTranslationShortcuts(handlers: {
  onSave?: () => void | Promise<void>;
  onPublish?: () => void | Promise<void>;
  onLocalePicker?: () => void;
  onPrevLocale?: () => void;
  onNextLocale?: () => void;
  onCreateTranslation?: () => void;
  onHelp?: () => void;
}): KeyboardShortcut[] {
  const shortcuts: KeyboardShortcut[] = [];

  if (handlers.onSave) {
    shortcuts.push({
      id: 'save',
      description: 'Save changes',
      category: 'save',
      key: 's',
      modifiers: ['ctrl'],
      handler: handlers.onSave,
      context: 'form',
    });
  }

  if (handlers.onPublish) {
    shortcuts.push({
      id: 'publish',
      description: 'Publish content',
      category: 'actions',
      key: 'p',
      modifiers: ['ctrl', 'shift'],
      handler: handlers.onPublish,
      context: 'form',
    });
  }

  if (handlers.onLocalePicker) {
    shortcuts.push({
      id: 'locale-picker',
      description: 'Open locale picker',
      category: 'locale',
      key: 'l',
      modifiers: ['ctrl', 'shift'],
      handler: handlers.onLocalePicker,
    });
  }

  if (handlers.onPrevLocale) {
    shortcuts.push({
      id: 'prev-locale',
      description: 'Switch to previous locale',
      category: 'locale',
      key: '[',
      modifiers: ['ctrl'],
      handler: handlers.onPrevLocale,
    });
  }

  if (handlers.onNextLocale) {
    shortcuts.push({
      id: 'next-locale',
      description: 'Switch to next locale',
      category: 'locale',
      key: ']',
      modifiers: ['ctrl'],
      handler: handlers.onNextLocale,
    });
  }

  if (handlers.onCreateTranslation) {
    shortcuts.push({
      id: 'create-translation',
      description: 'Create new translation',
      category: 'actions',
      key: 't',
      modifiers: ['ctrl', 'shift'],
      handler: handlers.onCreateTranslation,
    });
  }

  return shortcuts;
}

// ============================================================================
// Help Modal Rendering
// ============================================================================

/**
 * Render keyboard shortcuts help modal content.
 */
export function renderShortcutsHelpContent(shortcuts: KeyboardShortcut[]): string {
  const grouped = new Map<ShortcutCategory, KeyboardShortcut[]>();
  for (const shortcut of shortcuts) {
    // Treat undefined as enabled (default), only skip if explicitly false
    if (shortcut.enabled === false) continue;
    const list = grouped.get(shortcut.category) || [];
    list.push(shortcut);
    grouped.set(shortcut.category, list);
  }

  const categoryLabels: Record<ShortcutCategory, string> = {
    save: 'Save & Submit',
    navigation: 'Navigation',
    locale: 'Locale Switching',
    actions: 'Actions',
    help: 'Help',
    other: 'Other',
  };

  const categoryOrder: ShortcutCategory[] = ['save', 'locale', 'navigation', 'actions', 'help', 'other'];

  let html = `
    <div class="shortcuts-help" role="document">
      <div class="text-sm text-gray-500 mb-4">
        Press <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">?</kbd> to show this help anytime
      </div>
  `;

  for (const category of categoryOrder) {
    const categoryShortcuts = grouped.get(category);
    if (!categoryShortcuts || categoryShortcuts.length === 0) continue;

    html += `
      <div class="mb-4">
        <h4 class="text-sm font-medium text-gray-700 mb-2">${categoryLabels[category]}</h4>
        <dl class="space-y-1">
    `;

    for (const shortcut of categoryShortcuts) {
      const display = formatShortcutDisplay(shortcut);
      html += `
          <div class="flex justify-between items-center py-1">
            <dt class="text-sm text-gray-600">${escapeHtml(shortcut.description)}</dt>
            <dd class="flex-shrink-0 ml-4">
              <kbd class="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-mono text-gray-700">${escapeHtml(display)}</kbd>
            </dd>
          </div>
      `;
    }

    html += `
        </dl>
      </div>
    `;
  }

  html += `</div>`;
  return html;
}

/**
 * Simple HTML escaping
 */
function escapeHtml(text: string): string {
  const div = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (div) {
    div.textContent = text;
    return div.innerHTML;
  }
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================================
// Persistence and Settings
// ============================================================================

/**
 * Storage key for shortcut settings
 */
const SHORTCUTS_STORAGE_KEY = 'admin_keyboard_shortcuts_settings';

/**
 * Storage key for first-time hint dismissed
 */
const SHORTCUTS_HINT_DISMISSED_KEY = 'admin_keyboard_shortcuts_hint_dismissed';

/**
 * Persisted shortcut settings
 */
export interface ShortcutSettings {
  /** Whether shortcuts are globally enabled */
  enabled: boolean;
  /** Per-shortcut enable/disable overrides */
  shortcuts: Record<string, boolean>;
  /** When settings were last updated */
  updatedAt: string;
}

/**
 * Default shortcut settings
 */
const DEFAULT_SHORTCUT_SETTINGS: ShortcutSettings = {
  enabled: true,
  shortcuts: {},
  updatedAt: new Date().toISOString(),
};

/**
 * Load shortcut settings from localStorage.
 */
export function loadShortcutSettings(): ShortcutSettings {
  if (typeof localStorage === 'undefined') {
    return { ...DEFAULT_SHORTCUT_SETTINGS };
  }

  try {
    const stored = localStorage.getItem(SHORTCUTS_STORAGE_KEY);
    if (!stored) {
      return { ...DEFAULT_SHORTCUT_SETTINGS };
    }
    const parsed = JSON.parse(stored) as Partial<ShortcutSettings>;
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : true,
      shortcuts: typeof parsed.shortcuts === 'object' && parsed.shortcuts !== null
        ? parsed.shortcuts
        : {},
      updatedAt: typeof parsed.updatedAt === 'string'
        ? parsed.updatedAt
        : new Date().toISOString(),
    };
  } catch {
    return { ...DEFAULT_SHORTCUT_SETTINGS };
  }
}

/**
 * Save shortcut settings to localStorage.
 */
export function saveShortcutSettings(settings: ShortcutSettings): void {
  if (typeof localStorage === 'undefined') return;

  try {
    const toSave: ShortcutSettings = {
      ...settings,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

/**
 * Check if the first-time hint has been dismissed.
 */
export function isShortcutHintDismissed(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(SHORTCUTS_HINT_DISMISSED_KEY) === 'true';
}

/**
 * Mark the first-time hint as dismissed.
 */
export function dismissShortcutHint(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SHORTCUTS_HINT_DISMISSED_KEY, 'true');
  } catch {
    // Ignore storage errors
  }
}

// ============================================================================
// Discovery Hint Component
// ============================================================================

/**
 * Configuration for the discovery hint
 */
export interface DiscoveryHintConfig {
  /** Where to render the hint */
  container: HTMLElement;
  /** Position relative to container */
  position?: 'top' | 'bottom';
  /** Callback when hint is dismissed */
  onDismiss?: () => void;
  /** Callback when help is requested from hint */
  onShowHelp?: () => void;
  /** Auto-dismiss after delay (ms). Set to 0 to disable. */
  autoDismissMs?: number;
}

/**
 * Render a first-time discovery hint for keyboard shortcuts.
 * Shows once per user and can be permanently dismissed.
 */
export function renderDiscoveryHint(config: DiscoveryHintConfig): HTMLElement | null {
  if (isShortcutHintDismissed()) {
    return null;
  }

  const { container, position = 'bottom', onDismiss, onShowHelp, autoDismissMs = 10000 } = config;

  const hintEl = document.createElement('div');
  hintEl.className = `shortcuts-discovery-hint fixed ${position === 'top' ? 'top-4' : 'bottom-4'} right-4 z-50 animate-fade-in`;
  hintEl.setAttribute('role', 'alert');
  hintEl.setAttribute('aria-live', 'polite');

  const modKey = getPrimaryModifierLabel();

  hintEl.innerHTML = `
    <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-sm">
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0">
          <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 dark:text-white">
            Keyboard shortcuts available
          </p>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Press <kbd class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">?</kbd>
            to view all shortcuts, or use <kbd class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">${modKey}+S</kbd> to save.
          </p>
          <div class="mt-3 flex items-center gap-2">
            <button type="button" data-hint-action="show-help"
                    class="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 focus:outline-none focus:underline">
              View shortcuts
            </button>
            <span class="text-gray-300 dark:text-gray-600" aria-hidden="true">|</span>
            <button type="button" data-hint-action="dismiss"
                    class="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none focus:underline">
              Don't show again
            </button>
          </div>
        </div>
        <button type="button" data-hint-action="close" aria-label="Close hint"
                class="flex-shrink-0 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  // Bind events
  const removeHint = (permanent: boolean): void => {
    if (permanent) {
      dismissShortcutHint();
    }
    hintEl.remove();
    onDismiss?.();
  };

  hintEl.querySelector('[data-hint-action="show-help"]')?.addEventListener('click', () => {
    removeHint(true);
    onShowHelp?.();
  });

  hintEl.querySelector('[data-hint-action="dismiss"]')?.addEventListener('click', () => {
    removeHint(true);
  });

  hintEl.querySelector('[data-hint-action="close"]')?.addEventListener('click', () => {
    removeHint(false);
  });

  // Auto-dismiss after delay
  if (autoDismissMs > 0) {
    setTimeout(() => {
      if (hintEl.parentElement) {
        removeHint(false);
      }
    }, autoDismissMs);
  }

  container.appendChild(hintEl);
  return hintEl;
}

// ============================================================================
// Settings UI Component
// ============================================================================

/**
 * Configuration for the settings UI
 */
export interface ShortcutSettingsUIConfig {
  /** Container to render into */
  container: HTMLElement;
  /** Shortcuts to display */
  shortcuts: KeyboardShortcut[];
  /** Current settings */
  settings: ShortcutSettings;
  /** Callback when settings change */
  onSettingsChange: (settings: ShortcutSettings) => void;
}

/**
 * Render the keyboard shortcuts settings UI.
 * Allows users to enable/disable shortcuts globally and per-shortcut.
 */
export function renderShortcutSettingsUI(config: ShortcutSettingsUIConfig): void {
  const { container, shortcuts, settings, onSettingsChange } = config;

  const categoryLabels: Record<ShortcutCategory, string> = {
    save: 'Save & Submit',
    navigation: 'Navigation',
    locale: 'Locale Switching',
    actions: 'Actions',
    help: 'Help',
    other: 'Other',
  };

  // Group shortcuts by category
  const grouped = new Map<ShortcutCategory, KeyboardShortcut[]>();
  for (const shortcut of shortcuts) {
    const list = grouped.get(shortcut.category) || [];
    list.push(shortcut);
    grouped.set(shortcut.category, list);
  }

  const categoryOrder: ShortcutCategory[] = ['save', 'locale', 'navigation', 'actions', 'help', 'other'];

  let html = `
    <div class="shortcuts-settings space-y-6">
      <!-- Global toggle -->
      <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div>
          <label for="shortcuts-global-toggle" class="text-sm font-medium text-gray-900 dark:text-white">
            Enable keyboard shortcuts
          </label>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Turn off to disable all keyboard shortcuts
          </p>
        </div>
        <button type="button"
                id="shortcuts-global-toggle"
                role="switch"
                aria-checked="${settings.enabled}"
                data-settings-action="toggle-global"
                class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${settings.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}">
          <span class="sr-only">Enable keyboard shortcuts</span>
          <span aria-hidden="true"
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.enabled ? 'translate-x-5' : 'translate-x-0'}"></span>
        </button>
      </div>

      <!-- Per-shortcut toggles -->
      <div class="${settings.enabled ? '' : 'opacity-50 pointer-events-none'}" data-shortcuts-list>
  `;

  for (const category of categoryOrder) {
    const categoryShortcuts = grouped.get(category);
    if (!categoryShortcuts || categoryShortcuts.length === 0) continue;

    html += `
      <div class="space-y-2">
        <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          ${categoryLabels[category]}
        </h4>
        <div class="space-y-1">
    `;

    for (const shortcut of categoryShortcuts) {
      const isEnabled = settings.shortcuts[shortcut.id] !== false;
      const display = formatShortcutDisplay(shortcut);

      html += `
        <div class="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50">
          <div class="flex items-center gap-3">
            <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs font-mono text-gray-700 dark:text-gray-300">
              ${escapeHtml(display)}
            </kbd>
            <span class="text-sm text-gray-700 dark:text-gray-300">${escapeHtml(shortcut.description)}</span>
          </div>
          <input type="checkbox"
                 id="shortcut-${escapeHtml(shortcut.id)}"
                 data-settings-action="toggle-shortcut"
                 data-shortcut-id="${escapeHtml(shortcut.id)}"
                 ${isEnabled ? 'checked' : ''}
                 class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                 aria-label="Enable ${escapeHtml(shortcut.description)} shortcut">
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;
  }

  html += `
      </div>

      <!-- Reset button -->
      <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
        <button type="button"
                data-settings-action="reset"
                class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none focus:underline">
          Reset to defaults
        </button>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Bind events
  const globalToggle = container.querySelector<HTMLButtonElement>('[data-settings-action="toggle-global"]');
  globalToggle?.addEventListener('click', () => {
    const newSettings: ShortcutSettings = {
      ...settings,
      enabled: !settings.enabled,
    };
    onSettingsChange(newSettings);
  });

  const shortcutToggles = container.querySelectorAll<HTMLInputElement>('[data-settings-action="toggle-shortcut"]');
  shortcutToggles.forEach(toggle => {
    toggle.addEventListener('change', () => {
      const shortcutId = toggle.getAttribute('data-shortcut-id');
      if (!shortcutId) return;

      const newSettings: ShortcutSettings = {
        ...settings,
        shortcuts: {
          ...settings.shortcuts,
          [shortcutId]: toggle.checked,
        },
      };
      onSettingsChange(newSettings);
    });
  });

  const resetBtn = container.querySelector<HTMLButtonElement>('[data-settings-action="reset"]');
  resetBtn?.addEventListener('click', () => {
    onSettingsChange({ ...DEFAULT_SHORTCUT_SETTINGS });
  });
}

/**
 * Apply persisted settings to a shortcut registry.
 */
export function applyShortcutSettings(
  registry: KeyboardShortcutRegistry,
  settings: ShortcutSettings
): void {
  // Apply global enable/disable
  const config = registry as unknown as { config: ShortcutRegistryConfig };
  if (config.config) {
    config.config.enabled = settings.enabled;
  }

  // Apply per-shortcut settings
  for (const shortcut of registry.getShortcuts()) {
    const isEnabled = settings.shortcuts[shortcut.id] !== false;
    registry.setEnabled(shortcut.id, isEnabled);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let defaultRegistry: KeyboardShortcutRegistry | null = null;

/**
 * Get the default global shortcut registry.
 */
export function getDefaultShortcutRegistry(): KeyboardShortcutRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new KeyboardShortcutRegistry();
  }
  return defaultRegistry;
}

/**
 * Initialize shortcuts with handlers and bind to document.
 * Automatically loads and applies persisted settings.
 */
export function initKeyboardShortcuts(
  handlers: Parameters<typeof createTranslationShortcuts>[0],
  config?: ShortcutRegistryConfig
): KeyboardShortcutRegistry {
  // Load persisted settings
  const settings = loadShortcutSettings();

  const registry = new KeyboardShortcutRegistry({
    ...config,
    enabled: settings.enabled,
  });
  const shortcuts = createTranslationShortcuts(handlers);

  for (const shortcut of shortcuts) {
    registry.register(shortcut);
  }

  // Apply per-shortcut settings
  applyShortcutSettings(registry, settings);

  registry.bind();
  return registry;
}

/**
 * Initialize shortcuts with discovery hint support.
 * Shows first-time hint if not previously dismissed.
 */
export function initKeyboardShortcutsWithDiscovery(
  handlers: Parameters<typeof createTranslationShortcuts>[0],
  config: ShortcutRegistryConfig & {
    /** Container for discovery hint */
    hintContainer?: HTMLElement;
    /** Show help modal callback (for discovery hint) */
    onShowHelp?: () => void;
  }
): KeyboardShortcutRegistry {
  const registry = initKeyboardShortcuts(handlers, config);

  // Show discovery hint if not dismissed
  if (config.hintContainer) {
    renderDiscoveryHint({
      container: config.hintContainer,
      onShowHelp: config.onShowHelp,
      onDismiss: () => {
        // Hint was dismissed
      },
    });
  }

  return registry;
}
