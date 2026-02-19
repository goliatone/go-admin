/**
 * Shared Block Picker
 *
 * Extracted from field-config-form.ts BlockPickerModal.
 * Provides reusable block loading, normalization, and inline rendering
 * for both the expanded field card (block-editor-panel) and the
 * FieldConfigForm modal.
 */
import type { BlockDefinitionSummary } from '../types';
import type { ContentTypeAPIClient } from '../api-client';
export interface InlineBlockPickerConfig {
    /** Available blocks (call loadAvailableBlocks first) */
    availableBlocks: BlockDefinitionSummary[];
    /** Currently selected block keys */
    selectedBlocks: Set<string>;
    /** Optional search filter */
    searchQuery?: string;
    /** Callback when selection changes */
    onSelectionChange: (selected: Set<string>) => void;
    /** Label shown above the list (default: "Allowed Blocks") */
    label?: string;
    /** Color accent: 'blue' for allowed, 'red' for denied */
    accent?: 'blue' | 'red';
    /** Optional label when selection is empty (e.g., "All blocks allowed") */
    emptySelectionText?: string;
}
/**
 * Load available block definitions from the API.
 */
export declare function loadAvailableBlocks(api: ContentTypeAPIClient): Promise<BlockDefinitionSummary[]>;
/** Canonical key for a block: prefers slug, falls back to type */
export declare function blockKey(block: BlockDefinitionSummary): string;
/**
 * Normalize a set of selected block keys against the available blocks.
 * Handles legacy type-based keys by mapping them to slugs.
 */
export declare function normalizeBlockSelection(selected: Set<string>, available: BlockDefinitionSummary[]): Set<string>;
/**
 * Render an inline block picker (checkbox list with search).
 * Designed for use inside an expanded field card.
 */
export declare function renderInlineBlockPicker(config: InlineBlockPickerConfig): string;
/**
 * Bind events for an inline block picker.
 * Call after inserting renderInlineBlockPicker HTML into the DOM.
 */
export declare function bindInlineBlockPickerEvents(container: HTMLElement, config: InlineBlockPickerConfig): void;
//# sourceMappingURL=block-picker.d.ts.map