/**
 * Copy text to clipboard and provide visual feedback on the button.
 *
 * @param text - The text to copy to clipboard
 * @param button - The button element to update with feedback
 * @param options - Optional configuration for feedback behavior
 */
export type CopyFeedbackOptions = {
    /** Duration in ms to show the "Copied" feedback. Defaults to 1500. */
    feedbackDuration?: number;
    /** Use icon-based feedback (for console) vs SVG-based (for toolbar). Defaults to false. */
    useIconFeedback?: boolean;
    /** CSS class to add on success. Defaults to 'copied' for toolbar, 'debug-copy--success' for console. */
    successClass?: string;
    /** CSS class to add on error. Defaults to 'debug-copy--error'. */
    errorClass?: string;
};
/**
 * Copy text to clipboard with visual feedback on the button element.
 * Supports both console (icon-based) and toolbar (SVG-based) feedback styles.
 */
export declare function copyToClipboard(text: string, button: HTMLElement, options?: CopyFeedbackOptions): Promise<boolean>;
/**
 * Attach copy-to-clipboard listeners to all buttons with [data-copy-trigger] attribute.
 * Buttons must be inside a container with [data-copy-content] attribute.
 *
 * @param root - The root element to search for copy triggers (e.g., panel container or shadow root)
 * @param options - Optional configuration for feedback behavior
 */
export declare function attachCopyListeners(root: ParentNode, options?: CopyFeedbackOptions): void;
/**
 * Attach expand/collapse listeners to all rows with .expandable-row class.
 * Clicking a row toggles the 'expanded' class.
 *
 * @param root - The root element to search for expandable rows
 */
export declare function attachExpandableRowListeners(root: ParentNode): void;
/**
 * Attach sort toggle listeners to checkboxes with [data-sort-toggle] attribute.
 * When the checkbox changes, calls the provided callback with panel ID and new state.
 *
 * @param root - The root element to search for sort toggles
 * @param onToggle - Callback function called when sort order changes
 */
export declare function attachSortToggleListeners(root: ParentNode, onToggle: (panelId: string, newestFirst: boolean) => void): void;
/**
 * Data attribute constants for copy/expand behaviors.
 * Using constants ensures consistency across console and toolbar.
 */
export declare const DATA_ATTRS: {
    /** Attribute for the copy button trigger */
    readonly COPY_TRIGGER: "data-copy-trigger";
    /** Attribute for the container holding the content to copy */
    readonly COPY_CONTENT: "data-copy-content";
    /** Attribute for row ID (used in SQL expandable rows) */
    readonly ROW_ID: "data-row-id";
    /** Attribute linking expansion row to its parent row */
    readonly EXPANSION_FOR: "data-expansion-for";
    /** Attribute for sort toggle checkbox */
    readonly SORT_TOGGLE: "data-sort-toggle";
};
/**
 * CSS class constants for interactive states.
 */
export declare const INTERACTION_CLASSES: {
    /** Class for rows that can be expanded */
    readonly EXPANDABLE_ROW: "expandable-row";
    /** Class added when a row is expanded */
    readonly EXPANDED: "expanded";
    /** Class for the hidden expansion row */
    readonly EXPANSION_ROW: "expansion-row";
    /** Class for slow query rows */
    readonly SLOW_QUERY: "slow-query";
    /** Class for error query rows */
    readonly ERROR_QUERY: "error-query";
    /** Class for expand/collapse icon */
    readonly EXPAND_ICON: "expand-icon";
};
/**
 * Generate HTML attributes for a copy button container.
 * Use this when rendering panel content to ensure proper data attributes.
 *
 * @param content - The content that will be copied
 * @returns The data-copy-content attribute string
 */
export declare function copyContentAttr(content: string): string;
/**
 * Generate HTML attributes for a copy trigger button.
 *
 * @param id - Optional ID for the trigger (useful for accessibility)
 * @returns The data-copy-trigger attribute string
 */
export declare function copyTriggerAttr(id?: string): string;
/**
 * Generate HTML attributes for an expandable row.
 *
 * @param rowId - Unique ID for the row
 * @returns The data-row-id attribute string
 */
export declare function rowIdAttr(rowId: string): string;
/**
 * Generate HTML attributes for an expansion row.
 *
 * @param forRowId - The row ID this expansion belongs to
 * @returns The data-expansion-for attribute string
 */
export declare function expansionForAttr(forRowId: string): string;
/**
 * Generate HTML attributes for a sort toggle checkbox.
 *
 * @param panelId - The panel ID this toggle controls
 * @returns The data-sort-toggle attribute string
 */
export declare function sortToggleAttr(panelId: string): string;
/**
 * Initialize all interaction listeners on a root element.
 * This is a convenience function that attaches all listeners at once.
 *
 * @param root - The root element (panel container or shadow root)
 * @param options - Configuration options
 */
export declare function initInteractions(root: ParentNode, options?: {
    copyOptions?: CopyFeedbackOptions;
    onSortToggle?: (panelId: string, newestFirst: boolean) => void;
}): void;
//# sourceMappingURL=interactions.d.ts.map