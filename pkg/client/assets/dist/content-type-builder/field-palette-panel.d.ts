/**
 * Field Palette Panel
 *
 * Phase 9 implements the right-column field palette for the Block Library IDE:
 *   Task 9.1 - Data-driven palette: fetches from GET /admin/api/block_definitions/field_types,
 *              falls back to the local FIELD_TYPES registry when the endpoint is unavailable.
 *   Task 9.2 - Search and grouped categories with "Advanced" collapsed by default.
 *   Task 9.3 - Drag handle on each palette item; drop target integration with the block editor.
 *
 * The panel renders inside [data-block-ide-palette] in the three-column IDE layout.
 */
import type { FieldType } from './types';
import { ContentTypeAPIClient } from './api-client';
export interface FieldPalettePanelConfig {
    container: HTMLElement;
    api: ContentTypeAPIClient;
    /** Called when user clicks (non-drag) a palette item to add a field */
    onAddField: (fieldType: FieldType, defaultConfig?: Partial<Record<string, unknown>>) => void;
}
/** MIME type used for drag-and-drop data transfer */
export declare const PALETTE_DRAG_MIME = "application/x-field-palette-type";
export declare class FieldPalettePanel {
    private config;
    private fieldTypes;
    private categoryOrder;
    private searchQuery;
    private categoryStates;
    private isLoading;
    private enabled;
    constructor(config: FieldPalettePanelConfig);
    /** Initialize: fetch field types and render */
    init(): Promise<void>;
    /** Enable the palette (a block is selected) */
    enable(): void;
    /** Disable the palette (no block selected) */
    disable(): void;
    /** Refresh field types from the API */
    refresh(): Promise<void>;
    private loadFieldTypes;
    private initCategoryStates;
    private render;
    private renderCategoryGroups;
    private renderSearchResults;
    private renderPaletteItem;
    private bindEvents;
    private bindListEvents;
}
//# sourceMappingURL=field-palette-panel.d.ts.map