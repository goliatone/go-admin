/**
 * Connections List Page
 * Displays service connections with filters, pagination, and management actions
 */
import type { Connection, ScopeType } from '../types.js';
import { type ServicesAPIClient } from '../api-client.js';
import type { ToastNotifier } from '../../toast/types.js';
export interface ConnectionsListConfig {
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
    /** Callback when connection is selected */
    onSelect?: (connection: Connection) => void;
    /** Callback when connect action is triggered */
    onConnect?: (providerId: string, scopeType: ScopeType) => void;
    /** Custom provider name resolver */
    getProviderName?: (providerId: string) => string;
}
export declare class ConnectionsListManager {
    private config;
    private container;
    private client;
    private queryState;
    private state;
    private abortController;
    private actionQueue;
    constructor(config: ConnectionsListConfig);
    /**
     * Initialize the connections list
     */
    init(): Promise<void>;
    /**
     * Refresh the connections list
     */
    refresh(): Promise<void>;
    /**
     * Get the current connections
     */
    getConnections(): Connection[];
    /**
     * Get a connection by ID
     */
    getConnection(id: string): Connection | undefined;
    /**
     * Destroy the manager
     */
    destroy(): void;
    private loadConnections;
    private renderStructure;
    private restoreFilterValues;
    private bindEvents;
    private renderConnections;
    private loadProviders;
    private populateProviderFilterOptions;
    private handleConnect;
    private bindNoResultsActions;
    private renderConnectionRow;
    private buildRowActions;
    private bindRowActions;
    private handleRefresh;
    private handleReconsent;
    private handleRevoke;
    private renderError;
    private renderForbidden;
    private updateLoadingState;
    private updatePagination;
    private formatProviderId;
    private truncateId;
    private formatDate;
    private escapeHtml;
}
/**
 * Create and initialize a connections list
 */
export declare function createConnectionsList(config: ConnectionsListConfig): Promise<ConnectionsListManager>;
//# sourceMappingURL=connections-list.d.ts.map