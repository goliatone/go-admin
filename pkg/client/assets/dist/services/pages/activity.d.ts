/**
 * Services Activity Page
 * Displays service activity with timeline and table views, filters, and pagination
 */
import type { ServiceActivityEntry } from '../types.js';
import { type ServicesAPIClient } from '../api-client.js';
import type { ToastNotifier } from '../../toast/types.js';
export type ActivityViewMode = 'timeline' | 'table';
export interface ActivityPageConfig {
    /** Container element or selector */
    container: string | HTMLElement;
    /** API client (optional, uses default) */
    apiClient?: ServicesAPIClient;
    /** Toast notifier for messages */
    notifier?: ToastNotifier;
    /** Items per page (default: 25) */
    perPage?: number;
    /** Enable URL state sync (default: true) */
    syncUrl?: boolean;
    /** Initial view mode (default: 'timeline') */
    viewMode?: ActivityViewMode;
    /** Enable deep links for object navigation with context preservation (default: true) */
    useDeepLinks?: boolean;
    /** Callback when activity entry is selected */
    onSelect?: (entry: ServiceActivityEntry) => void;
    /** Callback for navigating to related entity (overrides deep links if provided) */
    onNavigate?: (objectType: string, objectId: string) => void;
    /** Custom provider name resolver */
    getProviderName?: (providerId: string) => string;
    /** Custom action label resolver (from backend config) */
    getActionLabel?: (action: string) => string;
    /** Available providers for filter dropdown */
    providers?: Array<{
        id: string;
        name: string;
    }>;
    /** Available channels for filter dropdown */
    channels?: string[];
    /** Available actions for filter dropdown */
    actions?: string[];
}
export declare class ActivityPageManager {
    private config;
    private container;
    private client;
    private queryState;
    private state;
    private abortController;
    constructor(config: ActivityPageConfig);
    /**
     * Initialize the activity page
     */
    init(): Promise<void>;
    /**
     * Refresh the activity list
     */
    refresh(): Promise<void>;
    /**
     * Get the current entries
     */
    getEntries(): ServiceActivityEntry[];
    /**
     * Get an entry by ID
     */
    getEntry(id: string): ServiceActivityEntry | undefined;
    /**
     * Set view mode
     */
    setViewMode(mode: ActivityViewMode): void;
    /**
     * Get current view mode
     */
    getViewMode(): ActivityViewMode;
    /**
     * Destroy the manager
     */
    destroy(): void;
    private loadActivity;
    private renderStructure;
    private renderProviderOptions;
    private renderChannelOptions;
    private renderActionOptions;
    /**
     * Resolve action label using config override or centralized registry.
     */
    private resolveActionLabel;
    private restoreFilterValues;
    private bindEvents;
    private renderEntries;
    private bindNoResultsActions;
    private renderTimelineEntry;
    private renderTableRow;
    private bindEntryActions;
    /**
     * Create a navigate handler that uses deep links with context preservation.
     */
    private createDeepLinkNavigateHandler;
    /**
     * Build object link URL for an activity entry.
     * Returns a deep link URL if deep links are enabled, otherwise '#'.
     */
    private buildObjectLinkUrl;
    private updateViewModeUI;
    private updateFilterSummary;
    private renderError;
    private renderForbidden;
    private updateLoadingState;
    private updatePagination;
    private restoreViewMode;
    private saveViewMode;
    private formatProviderId;
    private formatLabel;
    private truncateId;
    private formatTime;
    private formatRelativeTime;
    private formatMetadataPreview;
    private escapeHtml;
}
/**
 * Create and initialize an activity page
 */
export declare function createActivityPage(config: ActivityPageConfig): Promise<ActivityPageManager>;
//# sourceMappingURL=activity.d.ts.map