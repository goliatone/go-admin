/**
 * E-Sign Integration Mappings Page Controller
 * CRUD management for integration mapping specifications
 */
/**
 * Configuration for the integration mappings page
 */
export interface IntegrationMappingsConfig {
    basePath: string;
    apiBasePath?: string;
}
/**
 * Integration Mappings page controller
 * Manages CRUD operations, validation, and preview for mapping specifications
 */
export declare class IntegrationMappingsController {
    private readonly config;
    private readonly apiBase;
    private readonly mappingsEndpoint;
    private mappings;
    private editingMappingId;
    private pendingPublishId;
    private pendingDeleteId;
    private currentPreviewMapping;
    private readonly elements;
    constructor(config: IntegrationMappingsConfig);
    /**
     * Initialize the mappings page
     */
    init(): Promise<void>;
    /**
     * Setup event listeners
     */
    private setupEventListeners;
    /**
     * Announce message for screen readers
     */
    private announce;
    /**
     * Show a specific page state
     */
    private showState;
    /**
     * Escape HTML for safe rendering
     */
    private escapeHtml;
    /**
     * Format date string
     */
    private formatDate;
    /**
     * Get status badge HTML
     */
    private getStatusBadge;
    /**
     * Load mappings from API
     */
    loadMappings(): Promise<void>;
    /**
     * Populate provider filter dropdown
     */
    private populateProviderFilter;
    /**
     * Render mappings list with filters applied
     */
    private renderMappings;
    /**
     * Attach event listeners to table row buttons
     */
    private attachRowListeners;
    /**
     * Create a schema field row element
     */
    private createSchemaFieldRow;
    /**
     * Create a mapping rule row element
     */
    private createMappingRuleRow;
    /**
     * Add a new schema field row
     */
    private addSchemaField;
    /**
     * Add a new mapping rule row
     */
    private addMappingRule;
    /**
     * Collect form data into a mapping spec object
     */
    private collectFormData;
    /**
     * Populate form with mapping data
     */
    private populateForm;
    /**
     * Reset the form to initial state
     */
    private resetForm;
    /**
     * Open create mapping modal
     */
    private openCreateModal;
    /**
     * Open edit mapping modal
     */
    private openEditModal;
    /**
     * Close mapping modal
     */
    private closeModal;
    /**
     * Open publish confirmation modal
     */
    private openPublishModal;
    /**
     * Close publish modal
     */
    private closePublishModal;
    /**
     * Open delete confirmation modal
     */
    private openDeleteModal;
    /**
     * Close delete modal
     */
    private closeDeleteModal;
    /**
     * Validate mapping
     */
    validateMapping(): Promise<void>;
    /**
     * Save mapping (create or update)
     */
    saveMapping(): Promise<void>;
    /**
     * Publish mapping
     */
    publishMapping(): Promise<void>;
    /**
     * Delete mapping
     */
    deleteMapping(): Promise<void>;
    /**
     * Open preview modal
     */
    private openPreviewModal;
    /**
     * Close preview modal
     */
    private closePreviewModal;
    /**
     * Show preview state
     */
    private showPreviewState;
    /**
     * Render preview rules table
     */
    private renderPreviewRules;
    /**
     * Load sample payload
     */
    private loadSamplePayload;
    /**
     * Validate source JSON
     */
    private validateSourceJson;
    /**
     * Run preview transform
     */
    private runPreviewTransform;
    /**
     * Simulate transform (client-side preview)
     */
    private simulateTransform;
    /**
     * Resolve source value from payload
     */
    private resolveSourceValue;
    /**
     * Render preview result
     */
    private renderPreviewResult;
    /**
     * Clear preview
     */
    private clearPreview;
    /**
     * Show toast notification
     */
    private showToast;
}
/**
 * Initialize integration mappings page from config
 */
export declare function initIntegrationMappings(config: IntegrationMappingsConfig): IntegrationMappingsController;
/**
 * Bootstrap integration mappings page from template context
 */
export declare function bootstrapIntegrationMappings(config: {
    basePath: string;
    apiBasePath?: string;
}): void;
//# sourceMappingURL=integration-mappings.d.ts.map