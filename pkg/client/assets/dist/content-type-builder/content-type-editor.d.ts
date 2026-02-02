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
    private staticEventsBound;
    private previewDebounceTimer;
    private lifecycleOutsideClickHandler;
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
    removeField(fieldId: string): void;
    /**
     * Move a field to a new position
     */
    moveField(fieldId: string, newIndex: number): void;
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
    private renderCapabilitiesSection;
    private renderPreviewPanel;
    private getStatusBadge;
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
    private bindDragEvents;
    private bindLifecycleMenuEvents;
    private showFieldTypePicker;
    private showLayoutEditor;
    private bindFieldsEvents;
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
    private renderPreview;
    private renderValidationErrors;
    private showToast;
    private schedulePreview;
}
//# sourceMappingURL=content-type-editor.d.ts.map