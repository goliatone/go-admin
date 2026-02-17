/**
 * E-Sign Integration Conflicts Page Controller
 * Conflict queue management for CRM/HRIS sync operations
 */
/**
 * Configuration for the integration conflicts page
 */
export interface IntegrationConflictsConfig {
    basePath: string;
    apiBasePath?: string;
}
/**
 * Integration Conflicts page controller
 * Manages conflict queue, detail view, and resolution workflow
 */
export declare class IntegrationConflictsController {
    private readonly config;
    private readonly apiBase;
    private readonly conflictsEndpoint;
    private conflicts;
    private currentConflictId;
    private readonly elements;
    constructor(config: IntegrationConflictsConfig);
    /**
     * Initialize the conflicts page
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
     * Get entity badge HTML
     */
    private getEntityBadge;
    /**
     * Load conflicts from API
     */
    loadConflicts(): Promise<void>;
    /**
     * Populate provider filter dropdown
     */
    private populateProviderFilter;
    /**
     * Update stats display
     */
    private updateStats;
    /**
     * Render conflicts list with filters applied
     */
    private renderConflicts;
    /**
     * Open conflict detail modal
     */
    private openConflictDetail;
    /**
     * Close conflict detail modal
     */
    private closeConflictDetail;
    /**
     * Open resolve modal
     */
    private openResolveModal;
    /**
     * Close resolve modal
     */
    private closeResolveModal;
    /**
     * Submit resolution
     */
    private submitResolution;
    /**
     * Show toast notification
     */
    private showToast;
}
/**
 * Initialize integration conflicts page from config
 */
export declare function initIntegrationConflicts(config: IntegrationConflictsConfig): IntegrationConflictsController;
/**
 * Bootstrap integration conflicts page from template context
 */
export declare function bootstrapIntegrationConflicts(config: {
    basePath: string;
    apiBasePath?: string;
}): void;
//# sourceMappingURL=integration-conflicts.d.ts.map