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
export type ShortcutCategory = 'save' | 'navigation' | 'locale' | 'actions' | 'help' | 'other';
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
/**
 * Detect if running on Mac platform
 */
export declare function isMacPlatform(): boolean;
/**
 * Get the primary modifier key label for the current platform
 */
export declare function getPrimaryModifierLabel(): string;
/**
 * Get the modifier key symbol for display
 */
export declare function getModifierSymbol(modifier: ModifierKey): string;
/**
 * Format a shortcut for display (e.g., "⌘+S" or "Ctrl+S")
 */
export declare function formatShortcutDisplay(shortcut: KeyboardShortcut): string;
/**
 * KeyboardShortcutRegistry manages keyboard shortcuts and their handlers.
 * Provides a centralized place to register, unregister, and trigger shortcuts.
 */
export declare class KeyboardShortcutRegistry {
    private shortcuts;
    private config;
    private keydownHandler;
    private boundElement;
    constructor(config?: ShortcutRegistryConfig);
    /**
     * Register a keyboard shortcut.
     */
    register(shortcut: KeyboardShortcut, options?: ShortcutRegistrationOptions): void;
    /**
     * Unregister a keyboard shortcut by ID.
     */
    unregister(id: string): boolean;
    /**
     * Enable or disable a specific shortcut.
     */
    setEnabled(id: string, enabled: boolean): void;
    /**
     * Set the current active context.
     */
    setContext(context: ShortcutContext): void;
    /**
     * Get the current context.
     */
    getContext(): ShortcutContext;
    /**
     * Get all registered shortcuts.
     */
    getShortcuts(): KeyboardShortcut[];
    /**
     * Get shortcuts by category.
     */
    getShortcutsByCategory(category: ShortcutCategory): KeyboardShortcut[];
    /**
     * Get shortcuts grouped by category.
     */
    getShortcutsGroupedByCategory(): Map<ShortcutCategory, KeyboardShortcut[]>;
    /**
     * Bind keyboard event listeners.
     */
    bind(element?: Document | HTMLElement): void;
    /**
     * Unbind keyboard event listeners.
     */
    unbind(): void;
    /**
     * Handle keydown event.
     */
    private handleKeydown;
    /**
     * Find a shortcut matching the given keyboard event.
     */
    private findMatchingShortcut;
    /**
     * Check if a shortcut matches a keyboard event.
     */
    private matchesEvent;
    /**
     * Check if an input element is focused.
     */
    private isInputFocused;
    /**
     * Destroy the registry and clean up.
     */
    destroy(): void;
}
/**
 * Create default translation workflow shortcuts.
 */
export declare function createTranslationShortcuts(handlers: {
    onSave?: () => void | Promise<void>;
    onPublish?: () => void | Promise<void>;
    onLocalePicker?: () => void;
    onPrevLocale?: () => void;
    onNextLocale?: () => void;
    onCreateTranslation?: () => void;
    onHelp?: () => void;
}): KeyboardShortcut[];
/**
 * Render keyboard shortcuts help modal content.
 */
export declare function renderShortcutsHelpContent(shortcuts: KeyboardShortcut[]): string;
/**
 * Get the default global shortcut registry.
 */
export declare function getDefaultShortcutRegistry(): KeyboardShortcutRegistry;
/**
 * Initialize shortcuts with handlers and bind to document.
 */
export declare function initKeyboardShortcuts(handlers: Parameters<typeof createTranslationShortcuts>[0], config?: ShortcutRegistryConfig): KeyboardShortcutRegistry;
//# sourceMappingURL=keyboard-shortcuts.d.ts.map