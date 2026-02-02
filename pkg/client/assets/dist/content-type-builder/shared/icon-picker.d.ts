/**
 * Shared Icon Picker
 *
 * A popover-based icon/emoji picker component with:
 *   - Built-in Emoji and SVG Icons tabs
 *   - Global registry for custom tabs (per-project extensibility)
 *   - Trigger element that replaces plain text inputs
 *   - Search filtering, category grouping, dark mode
 *
 * Usage:
 *   import { renderIconTrigger, bindIconTriggerEvents } from './shared/icon-picker';
 *
 * Extension:
 *   import { registerIconTab } from './shared/icon-picker';
 *   registerIconTab({ id: 'custom', label: 'My Icons', entries: [...] });
 */
export interface IconEntry {
    /** Stored value (emoji char or key string) */
    value: string;
    /** Display name for search */
    label: string;
    /** Extra search terms */
    keywords?: string;
    /** Rendered HTML (emoji text or SVG markup) */
    display: string;
}
export interface IconTab {
    /** Unique tab ID */
    id: string;
    /** Tab button text */
    label: string;
    /** Tab button icon (emoji char or small HTML) */
    icon?: string;
    /** All selectable items */
    entries: IconEntry[];
    /** Optional category grouping within the tab */
    categories?: {
        id: string;
        label: string;
        startIndex: number;
    }[];
}
export interface IconPickerConfig {
    /** Current value */
    value: string;
    /** Called when user picks an icon */
    onSelect: (value: string) => void;
    /** Called when user clears the icon */
    onClear?: () => void;
    /** Compact mode (xs sizing) for block editor */
    compact?: boolean;
}
/** Register a custom icon tab. Appears in all picker instances. */
export declare function registerIconTab(tab: IconTab): void;
/** Remove a tab by ID (including built-in tabs). */
export declare function unregisterIconTab(id: string): void;
/** Get all registered tabs. */
export declare function getIconTabs(): IconTab[];
/**
 * Resolve a stored icon value to displayable HTML.
 *
 * Resolution order:
 *   1. Empty → empty string
 *   2. iconForKey() match (built-in SVG icons) → SVG HTML
 *   3. Custom tab entry match → entry.display
 *   4. Passthrough (assumed emoji text)
 */
export declare function resolveIcon(value: string): string;
/**
 * Render an icon picker trigger element.
 *
 * Replaces a plain `<input type="text">` with a preview + open/clear buttons.
 * Contains a hidden input with the original field attribute(s) so that
 * existing event delegation (data-meta-field, data-ct-icon, name=...) still works.
 *
 * @param value   Current icon value (emoji or key)
 * @param fieldAttr  Attribute string for the hidden input, e.g. 'data-meta-field="icon"' or 'name="icon"'
 * @param compact  Use xs sizing
 */
export declare function renderIconTrigger(value: string, fieldAttr: string, compact?: boolean): string;
/** Open the icon picker popover anchored to a trigger element. */
export declare function openIconPicker(anchor: HTMLElement, config: IconPickerConfig): void;
/** Close the icon picker popover. */
export declare function closeIconPicker(): void;
/**
 * Bind click events on icon trigger elements within a container.
 *
 * @param container  Parent element containing icon triggers
 * @param selector   CSS selector for trigger elements (e.g. '[data-icon-trigger]')
 * @param getConfig  Factory function that returns IconPickerConfig for a given trigger
 */
export declare function bindIconTriggerEvents(container: HTMLElement, selector: string, getConfig: (trigger: HTMLElement) => IconPickerConfig): void;
//# sourceMappingURL=icon-picker.d.ts.map