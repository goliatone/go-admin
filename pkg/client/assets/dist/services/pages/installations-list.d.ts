/**
 * Installations List Page
 * Displays service installations with filters, pagination, and management actions
 */
import type { Installation, ScopeType } from '../types.js';
import { type ServicesAPIClient } from '../api-client.js';
import type { ToastNotifier } from '../../toast/types.js';
export interface InstallationsListConfig {
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
    /** Callback when installation is selected */
    onSelect?: (installation: Installation) => void;
    /** Callback when begin action is triggered */
    onBegin?: (providerId: string, scopeType: ScopeType) => void;
    /** Custom provider name resolver */
    getProviderName?: (providerId: string) => string;
}
export declare class InstallationsListManager {
    private config;
    private container;
    private client;
    private queryState;
    private state;
    private abortController;
    private actionQueue;
    constructor(config: InstallationsListConfig);
    /**
     * Initialize the installations list
     */
    init(): Promise<void>;
    /**
     * Refresh the installations list
     */
    refresh(): Promise<void>;
    /**
     * Get the current installations
     */
    getInstallations(): Installation[];
    /**
     * Get an installation by ID
     */
    getInstallation(id: string): Installation | undefined;
    /**
     * Destroy the manager
     */
    destroy(): void;
    private loadInstallations;
    private renderStructure;
    private restoreFilterValues;
    private bindEvents;
    private renderInstallations;
    private bindNoResultsActions;
    private renderInstallationRow;
    private buildRowActions;
    private bindRowActions;
    private handleUninstall;
    private handleReinstall;
    private renderError;
    private renderForbidden;
    private updateLoadingState;
    private loadProviders;
    private populateProviderFilterOptions;
    private updatePagination;
    private formatProviderId;
    private truncateId;
    private formatDate;
    private escapeHtml;
}
/**
 * Create and initialize an installations list
 */
export declare function createInstallationsList(config: InstallationsListConfig): Promise<InstallationsListManager>;
//# sourceMappingURL=installations-list.d.ts.map