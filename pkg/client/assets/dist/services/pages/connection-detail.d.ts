/**
 * Connection Detail Panel
 * Displays connection information with grant matrix and re-consent workflow
 */
import type { Connection, GrantSnapshot } from '../types.js';
import { type ServicesAPIClient } from '../api-client.js';
import type { ToastNotifier } from '../../toast/types.js';
export interface ConnectionDetailConfig {
    /** Container element or selector */
    container: string | HTMLElement;
    /** Connection ID to display */
    connectionId: string;
    /** API client (optional, uses default) */
    apiClient?: ServicesAPIClient;
    /** Toast notifier for messages */
    notifier?: ToastNotifier;
    /** Custom provider name resolver */
    getProviderName?: (providerId: string) => string;
    /** Callback when re-consent is completed */
    onReconsentComplete?: (connectionId: string) => void;
    /** Callback when connection is revoked */
    onRevoke?: (connectionId: string) => void;
    /** Callback to navigate back to list */
    onBack?: () => void;
}
export declare class ConnectionDetailManager {
    private config;
    private container;
    private client;
    private state;
    private abortController;
    private actionQueue;
    constructor(config: ConnectionDetailConfig);
    /**
     * Initialize the detail panel
     */
    init(): Promise<void>;
    /**
     * Refresh the connection data
     */
    refresh(): Promise<void>;
    /**
     * Get the current connection
     */
    getConnection(): Connection | null;
    /**
     * Get the grant snapshot
     */
    getGrantSnapshot(): GrantSnapshot | null;
    /**
     * Set the connection ID and reload
     */
    setConnectionId(connectionId: string): Promise<void>;
    /**
     * Destroy the manager
     */
    destroy(): void;
    private loadConnection;
    private render;
    private renderGrantMatrix;
    private renderCapabilities;
    private renderCredentialHealthPanel;
    private renderRateLimitPanel;
    private formatDuration;
    private formatRelativeTime;
    private bindEvents;
    private handleReconsent;
    private handleRefresh;
    private handleRevoke;
    private updateReconsentButtonState;
    private renderLoading;
    private renderError;
    private renderForbidden;
    private buildGrantInfoList;
    private formatProviderId;
    private formatLabel;
    private truncateId;
    private formatTime;
    private escapeHtml;
}
/**
 * Create and initialize a connection detail panel
 */
export declare function createConnectionDetail(config: ConnectionDetailConfig): Promise<ConnectionDetailManager>;
//# sourceMappingURL=connection-detail.d.ts.map