/**
 * E-Sign Integration Sync Runs Page Controller
 * Timeline view for CRM/HRIS sync operations
 */
/**
 * Configuration for the integration sync runs page
 */
export interface IntegrationSyncRunsConfig {
    basePath: string;
    apiBasePath?: string;
}
/**
 * Integration Sync Runs page controller
 * Manages sync operations timeline, start sync, and run detail
 */
export declare class IntegrationSyncRunsController {
    private readonly config;
    private readonly apiBase;
    private readonly syncRunsEndpoint;
    private readonly mappingsEndpoint;
    private syncRuns;
    private mappings;
    private currentRunId;
    private readonly elements;
    constructor(config: IntegrationSyncRunsConfig);
    /**
     * Initialize the sync runs page
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
     * Get direction badge HTML
     */
    private getDirectionBadge;
    /**
     * Load mappings from API
     */
    loadMappings(): Promise<void>;
    /**
     * Populate mapping select dropdown
     */
    private populateMappingSelect;
    /**
     * Load sync runs from API
     */
    loadSyncRuns(): Promise<void>;
    /**
     * Populate provider filter dropdown
     */
    private populateProviderFilter;
    /**
     * Update stats display
     */
    private updateStats;
    /**
     * Render sync runs timeline with filters applied
     */
    private renderTimeline;
    /**
     * Open start sync modal
     */
    private openStartSyncModal;
    /**
     * Close start sync modal
     */
    private closeStartSyncModal;
    /**
     * Start a new sync run
     */
    private startSync;
    /**
     * Open run detail modal
     */
    private openRunDetail;
    /**
     * Render checkpoints
     */
    private renderCheckpoints;
    /**
     * Close run detail modal
     */
    private closeRunDetail;
    /**
     * Run an action on the current sync run
     */
    private runAction;
    /**
     * Open diagnostics for current run
     */
    private openDiagnostics;
    /**
     * Show toast notification
     */
    private showToast;
}
/**
 * Initialize integration sync runs page from config
 */
export declare function initIntegrationSyncRuns(config: IntegrationSyncRunsConfig): IntegrationSyncRunsController;
/**
 * Bootstrap integration sync runs page from template context
 */
export declare function bootstrapIntegrationSyncRuns(config: {
    basePath: string;
    apiBasePath?: string;
}): void;
//# sourceMappingURL=integration-sync-runs.d.ts.map