/**
 * Subscriptions and Sync Page
 * Displays subscription channels and sync job status with management actions
 */
import type { Subscription, SyncJob } from '../types.js';
import { type ServicesAPIClient } from '../api-client.js';
import type { ToastNotifier } from '../../toast/types.js';
export type SubscriptionsSyncTab = 'subscriptions' | 'sync';
export interface SubscriptionsSyncPageConfig {
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
    /** Initial tab (default: 'subscriptions') */
    activeTab?: SubscriptionsSyncTab;
    /** Callback when subscription is selected */
    onSubscriptionSelect?: (subscription: Subscription) => void;
    /** Callback when sync job is selected */
    onSyncJobSelect?: (job: SyncJob) => void;
    /** Custom provider name resolver */
    getProviderName?: (providerId: string) => string;
}
export declare class SubscriptionsSyncPageManager {
    private config;
    private container;
    private client;
    private queryState;
    private state;
    private abortController;
    private actionQueue;
    constructor(config: SubscriptionsSyncPageConfig);
    /**
     * Initialize the page
     */
    init(): Promise<void>;
    /**
     * Refresh the data
     */
    refresh(): Promise<void>;
    /**
     * Set active tab
     */
    setTab(tab: SubscriptionsSyncTab): void;
    /**
     * Get active tab
     */
    getTab(): SubscriptionsSyncTab;
    /**
     * Get subscriptions
     */
    getSubscriptions(): Subscription[];
    /**
     * Get sync jobs
     */
    getSyncJobs(): SyncJob[];
    /**
     * Destroy the manager
     */
    destroy(): void;
    private loadData;
    private loadSubscriptions;
    private loadSyncJobs;
    private renderStructure;
    private renderSubscriptionStatusOptions;
    private renderSyncStatusOptions;
    private loadProviders;
    private populateProviderFilterOptions;
    private restoreFilterValues;
    private bindEvents;
    private renderSubscriptions;
    private bindNoResultsActions;
    private renderSubscriptionRow;
    private buildSubscriptionActions;
    private bindSubscriptionActions;
    private renderSyncJobs;
    private renderSyncJobRow;
    private buildSyncJobActions;
    private bindSyncJobActions;
    private handleRenew;
    private handleCancel;
    private handleRunSync;
    private updateTabUI;
    private updateEmptyState;
    private renderError;
    private renderForbidden;
    private updateLoadingState;
    private loadSyncConnections;
    private toSyncJob;
    private matchesSyncSearch;
    private updatePagination;
    private restoreTab;
    private saveTab;
    private formatProviderId;
    private truncateId;
    private formatTime;
    private formatRelativeTime;
    private isExpiringSoon;
    private escapeHtml;
}
/**
 * Create and initialize a subscriptions/sync page
 */
export declare function createSubscriptionsSyncPage(config: SubscriptionsSyncPageConfig): Promise<SubscriptionsSyncPageManager>;
//# sourceMappingURL=subscriptions-sync.d.ts.map