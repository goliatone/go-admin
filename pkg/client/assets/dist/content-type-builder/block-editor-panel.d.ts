/**
 * Block Editor Panel
 *
 * Phase 8 implements the inline block editor (center column):
 *   - Block metadata fields (name, slug, description, category, icon, status)
 *   - Inline field cards with expand/collapse accordion (one open at a time)
 *   - Section grouping with collapsible section headers
 *   - "Move to section" action per field card
 *
 * The panel is rendered inside [data-block-ide-editor] when a block is selected.
 */
import type { BlockDefinition, BlockDefinitionStatus, FieldDefinition, FieldTypeMetadata } from './types';
import { ContentTypeAPIClient } from './api-client';
import type { SaveState } from './shared/entity-header';
export interface BlockEditorPanelConfig {
    container: HTMLElement;
    block: BlockDefinition;
    categories: string[];
    api: ContentTypeAPIClient;
    onMetadataChange: (blockId: string, patch: Partial<BlockDefinition>) => void;
    onSchemaChange: (blockId: string, fields: FieldDefinition[]) => void;
    /** Called when a field type is dropped from the palette (Phase 9) */
    onFieldDrop?: (meta: FieldTypeMetadata) => void;
    /** Called when status is changed via the editor dropdown (Phase 11 — Task 11.3) */
    onStatusChange?: (blockId: string, newStatus: BlockDefinitionStatus) => void;
    /** Called when the user triggers a manual save (Phase 11 — Task 11.1) */
    onSave?: (blockId: string) => void;
    /** Called when the user clicks "+ Add Field" button in the fields header */
    onAddFieldClick?: () => void;
}
export declare class BlockEditorPanel {
    private config;
    private block;
    private fields;
    private expandedFieldId;
    private sectionStates;
    private moveMenuFieldId;
    private dropHighlight;
    /** Active intra-section drag reorder (Phase 10 — Task 10.1) */
    private dragReorder;
    /** Field id currently showing a drop-before indicator */
    private dropTargetFieldId;
    /** Save state tracking (Phase 11 — Task 11.2) */
    private saveState;
    private saveMessage;
    private saveDisplayTimer;
    /** Cached block definitions for inline block picker (Phase 4) */
    private cachedBlocks;
    private blocksLoading;
    private blockPickerModes;
    constructor(config: BlockEditorPanelConfig);
    render(): void;
    /** Refresh the panel for a new block without a full re-mount */
    update(block: BlockDefinition): void;
    getFields(): FieldDefinition[];
    /** Add a field to the end of the fields list (Phase 9 — palette insert) */
    addField(field: FieldDefinition): void;
    private renderHeader;
    /** Update the save state indicator without a full re-render */
    updateSaveState(state: SaveState, message?: string): void;
    /** Revert the status dropdown to a previous value (used on status change failure) */
    revertStatus(status?: BlockDefinitionStatus | string): void;
    private renderMetadataSection;
    private renderFieldsSection;
    private renderFieldCard;
    private renderFieldProperties;
    /** Standard field properties (non-blocks) */
    private renderStandardFieldProperties;
    /** Blocks field properties: block picker primary, field settings secondary */
    private renderBlocksFieldProperties;
    private renderMoveToSectionMenu;
    private groupFieldsBySection;
    private getSectionState;
    private getBlocksPickerMode;
    private ensureInlineBlocksPicker;
    private bindEvents;
    /** Bind drag-and-drop events on all [data-field-drop-zone] elements */
    private bindDropZoneEvents;
    private handleClick;
    private handleInput;
    private handleChange;
    private handleMetadataChange;
    private updateFieldProp;
    /** Load blocks and render inline picker for a blocks field (Phase 4) */
    private loadBlocksForField;
    /** Render and bind inline block picker into the DOM container */
    private renderInlineBlockPickerForField;
    private openFieldConfigModal;
    private moveFieldToSection;
    /** Move a field up (-1) or down (+1) within its section */
    private moveFieldInSection;
    /** Reorder a field by moving it before a target field in the same section */
    private reorderFieldBefore;
    /** Bind drag events on [data-field-card] for intra-section reordering */
    private bindFieldReorderEvents;
    /** Bind section-select dropdown changes (Phase 10 — Task 10.3) */
    private bindSectionSelectEvents;
    private notifySchemaChange;
}
//# sourceMappingURL=block-editor-panel.d.ts.map