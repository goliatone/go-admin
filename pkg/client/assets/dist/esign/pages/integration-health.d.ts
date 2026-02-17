/**
 * E-Sign Integration Health Page Controller
 * Real-time observability dashboard for CRM/HRIS integrations
 */
/**
 * Configuration for the integration health page
 */
export interface IntegrationHealthConfig {
    basePath: string;
    apiBasePath?: string;
    autoRefreshInterval?: number;
}
/**
 * Integration Health page controller
 * Manages health dashboard, charts, and real-time updates
 */
export declare class IntegrationHealthController {
    private readonly config;
    private readonly apiBase;
    private healthData;
    private autoRefreshTimer;
    private readonly elements;
    constructor(config: IntegrationHealthConfig);
    /**
     * Initialize the health dashboard
     */
    init(): Promise<void>;
    /**
     * Cleanup resources
     */
    destroy(): void;
    /**
     * Setup event listeners
     */
    private setupEventListeners;
    /**
     * Initialize chart canvases
     */
    private initCharts;
    /**
     * Load health data from API
     */
    loadHealthData(): Promise<void>;
    /**
     * Generate mock health data for demonstration
     */
    private generateMockHealthData;
    /**
     * Generate activity feed data
     */
    private generateActivityFeed;
    /**
     * Get activity message
     */
    private getActivityMessage;
    /**
     * Generate time series data
     */
    private generateTimeSeriesData;
    /**
     * Render all health data
     */
    private renderHealthData;
    /**
     * Render health score section
     */
    private renderHealthScore;
    /**
     * Render sync statistics
     */
    private renderSyncStats;
    /**
     * Render conflict statistics
     */
    private renderConflictStats;
    /**
     * Render lag statistics
     */
    private renderLagStats;
    /**
     * Render retry activity
     */
    private renderRetryActivity;
    /**
     * Render provider health table
     */
    private renderProviderHealth;
    /**
     * Render alerts
     */
    private renderAlerts;
    /**
     * Get alert icon SVG
     */
    private getAlertIcon;
    /**
     * Dismiss an alert
     */
    private dismissAlert;
    /**
     * Render activity feed
     */
    private renderActivityFeed;
    /**
     * Update charts
     */
    private updateCharts;
    /**
     * Render a bar chart on canvas
     */
    private renderBarChart;
    /**
     * Escape HTML
     */
    private escapeHtml;
}
/**
 * Initialize integration health page from config
 */
export declare function initIntegrationHealth(config: IntegrationHealthConfig): IntegrationHealthController;
/**
 * Bootstrap integration health page from template context
 */
export declare function bootstrapIntegrationHealth(config: {
    basePath: string;
    apiBasePath?: string;
    autoRefreshInterval?: number;
}): void;
//# sourceMappingURL=integration-health.d.ts.map