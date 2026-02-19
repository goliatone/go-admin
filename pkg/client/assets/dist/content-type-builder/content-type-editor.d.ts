/**
 * Content Type Editor
 *
 * Main editor component for creating/editing content types.
 * Includes field list with drag-and-drop ordering, quick edit cards,
 * and schema preview integration.
 */
import type { ContentTypeEditorConfig, FieldType } from './types';
export declare class ContentTypeEditor {
    private config;
    private container;
    private api;
    private state;
    private dragState;
    private dropIndicator;
    private dragOverRAF;
    private staticEventsBound;
    private previewDebounceTimer;
    private palettePanel;
    private paletteVisible;
    private sectionStates;
    private lifecycleOutsideClickHandler;
    private cachedBlocks;
    private blocksLoading;
    private blockPickerModes;
    /** Currently open field kebab menu (null = none open) */
    private fieldActionsMenuId;
    constructor(container: HTMLElement, config: ContentTypeEditorConfig);
    /**
     * Initialize the editor
     */
    init(): Promise<void>;
    /**
     * Load a content type for editing
     */
    loadContentType(idOrSlug: string): Promise<void>;
    /**
     * Save the content type
     */
    save(): Promise<void>;
    private buildSchemaPayload;
    private schemaHasChanges;
    private serializeFields;
    /**
     * Add a new field
     */
    addField(type: FieldType): void;
    /**
     * Edit an existing field
     */
    editField(fieldId: string): void;
    /**
     * Remove a field
     */
    removeField(fieldId: string): Promise<void>;
    /**
     * Move a field to a new position (optionally across sections)
     */
    moveField(fieldId: string, targetSection: string, targetIndex: number): void;
    /**
     * Move a field up (-1) or down (+1) within its section
     */
    moveFieldByDirection(fieldId: string, direction: -1 | 1): void;
    /**
     * Validate the schema
     */
    validateSchema(): Promise<void>;
    /**
     * Preview the schema as a rendered form
     */
    previewSchema(): Promise<void>;
    private render;
    private renderBasicInfo;
    private renderFieldsSection;
    private renderFieldListHTML;
    private renderFieldCard;
    private renderFieldActionsMenu;
    private renderBlocksInlineContent;
    private renderCapabilitiesSection;
    private renderPreviewPanel;
    private renderHeader;
    private renderHeaderActions;
    private renderLifecycleActions;
    /**
     * Publish the content type
     */
    publishContentType(): Promise<void>;
    /**
     * Deprecate the content type
     */
    deprecateContentType(): Promise<void>;
    /**
     * Clone the content type
     */
    cloneContentType(): Promise<void>;
    /**
     * Show version history
     */
    showVersionHistory(): void;
    private bindEvents;
    private bindStaticEvents;
    private bindDynamicEvents;
    private removeDropIndicator;
    private getOrCreateDropIndicator;
    private bindDragEvents;
    /** Bind drag-and-drop events on [data-field-drop-zone] for palette drops */
    private bindFieldDropZoneEvents;
    private bindLifecycleMenuEvents;
    private togglePalette;
    private initPaletteIfNeeded;
    private showFieldTypePicker;
    private showLayoutEditor;
    private bindFieldsEvents;
    private bindSectionToggleEvents;
    private getSlug;
    private getDescription;
    private getIcon;
    private getCapabilities;
    private buildUISchema;
    private updateLoadingState;
    private updateSavingState;
    private updatePreviewState;
    private updateDirtyState;
    private renderFieldList;
    private renderFieldListContent;
    private groupFieldsBySection;
    private getSectionState;
    private toggleSection;
    private getBlocksPickerMode;
    private loadBlocksForField;
    private renderInlineBlockPickerError;
    private renderInlineBlockPickerForField;
    private applyBlockSelection;
    private renderPreview;
    /**
     * Initialize preview field enhancements that require client-side behavior.
     * formgen-behaviors provides JSON editor hydration and
     * formgen-relationships provides WYSIWYG hydration.
     */
    private initPreviewEditors;
    private renderValidationErrors;
    private showToast;
    private schedulePreview;
}
//# sourceMappingURL=content-type-editor.d.ts.map