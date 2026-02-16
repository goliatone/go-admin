/**
 * Services API Client
 * Unified client for all services integration platform endpoints
 */
import type { ListProvidersResponse, ConnectionsListFilter, ListConnectionsResponse, ConnectionDetailResponse, BeginConnectionRequest, BeginConnectionResponse, CompleteCallbackResponse, GetConnectionGrantsResponse, BeginReconsentRequest, BeginReconsentResponse, RefreshConnectionRequest, RefreshConnectionResponse, RevokeConnectionRequest, RevokeConnectionResponse, InstallationsListFilter, ListInstallationsResponse, BeginInstallationRequest, BeginInstallationResponse, UninstallInstallationRequest, UninstallInstallationResponse, SubscriptionsListFilter, ListSubscriptionsResponse, RenewSubscriptionRequest, RenewSubscriptionResponse, CancelSubscriptionRequest, CancelSubscriptionResponse, RunSyncRequest, RunSyncResponse, GetSyncStatusResponse, InvokeCapabilityRequest, InvokeCapabilityResponse, ActivityListFilter, ListActivityResponse, GetStatusResponse, RunRetentionCleanupResponse, ProcessWebhookResponse, DispatchInboundResponse } from './types.js';
import { ServicesAPIError } from './types.js';
export interface ServicesAPIClientConfig {
    /** Base path for admin API (default: /admin/api) */
    basePath?: string;
    /** Request timeout in milliseconds (default: 30000) */
    timeout?: number;
    /** Custom headers to include with every request */
    headers?: Record<string, string>;
    /** Handler for errors (optional) */
    onError?: (error: ServicesAPIError) => void;
}
export declare class ServicesAPIClient {
    private config;
    private abortControllers;
    constructor(config?: ServicesAPIClientConfig);
    /**
     * List all registered providers
     */
    listProviders(signal?: AbortSignal): Promise<ListProvidersResponse>;
    /**
     * List connections with optional filters
     */
    listConnections(filter?: ConnectionsListFilter, signal?: AbortSignal): Promise<ListConnectionsResponse>;
    /**
     * Get full connection detail payload
     */
    getConnectionDetail(connectionRef: string, signal?: AbortSignal): Promise<ConnectionDetailResponse>;
    /**
     * Begin a new connection flow (OAuth2 redirect)
     */
    beginConnection(providerRef: string, request?: BeginConnectionRequest, idempotencyKey?: string): Promise<BeginConnectionResponse>;
    /**
     * Complete OAuth callback (typically called via redirect)
     */
    completeCallback(providerRef: string, params: Record<string, string>, signal?: AbortSignal): Promise<CompleteCallbackResponse>;
    /**
     * Get grant snapshot for a connection
     */
    getConnectionGrants(connectionRef: string, signal?: AbortSignal): Promise<GetConnectionGrantsResponse>;
    /**
     * Begin re-consent flow for a connection
     */
    beginReconsent(connectionRef: string, request?: BeginReconsentRequest, idempotencyKey?: string): Promise<BeginReconsentResponse>;
    /**
     * Refresh a connection's credentials
     */
    refreshConnection(connectionRef: string, request?: RefreshConnectionRequest, idempotencyKey?: string): Promise<RefreshConnectionResponse>;
    /**
     * Revoke a connection
     */
    revokeConnection(connectionRef: string, request?: RevokeConnectionRequest, idempotencyKey?: string): Promise<RevokeConnectionResponse>;
    /**
     * List installations with optional filters
     */
    listInstallations(filter?: InstallationsListFilter, signal?: AbortSignal): Promise<ListInstallationsResponse>;
    /**
     * Begin a new installation flow
     */
    beginInstallation(providerRef: string, request?: BeginInstallationRequest, idempotencyKey?: string): Promise<BeginInstallationResponse>;
    /**
     * Uninstall an installation
     */
    uninstallInstallation(installationRef: string, request?: UninstallInstallationRequest, idempotencyKey?: string): Promise<UninstallInstallationResponse>;
    /**
     * List subscriptions with optional filters
     */
    listSubscriptions(filter?: SubscriptionsListFilter, signal?: AbortSignal): Promise<ListSubscriptionsResponse>;
    /**
     * Renew a subscription
     */
    renewSubscription(subscriptionId: string, request?: RenewSubscriptionRequest, idempotencyKey?: string): Promise<RenewSubscriptionResponse>;
    /**
     * Cancel a subscription
     */
    cancelSubscription(subscriptionId: string, request?: CancelSubscriptionRequest, idempotencyKey?: string): Promise<CancelSubscriptionResponse>;
    /**
     * Run a sync job for a connection
     */
    runSync(connectionId: string, request: RunSyncRequest, idempotencyKey?: string): Promise<RunSyncResponse>;
    /**
     * Get sync status summary for a connection
     */
    getSyncStatus(connectionId: string, signal?: AbortSignal): Promise<GetSyncStatusResponse>;
    /**
     * Invoke a provider capability
     */
    invokeCapability(providerId: string, capability: string, request?: InvokeCapabilityRequest, idempotencyKey?: string): Promise<InvokeCapabilityResponse>;
    /**
     * List activity entries with optional filters
     */
    listActivity(filter?: ActivityListFilter, signal?: AbortSignal): Promise<ListActivityResponse>;
    /**
     * Get service status
     */
    getStatus(signal?: AbortSignal): Promise<GetStatusResponse>;
    /**
     * Run activity retention cleanup
     */
    runRetentionCleanup(idempotencyKey?: string): Promise<RunRetentionCleanupResponse>;
    /**
     * Process a webhook from a provider
     */
    processWebhook(providerId: string, body: unknown, headers?: Record<string, string>): Promise<ProcessWebhookResponse>;
    /**
     * Dispatch an inbound surface request
     */
    dispatchInbound(providerId: string, surface: string, body: unknown, headers?: Record<string, string>): Promise<DispatchInboundResponse>;
    /**
     * Cancel all pending requests
     */
    cancelAll(): void;
    /**
     * Cancel a specific request by key
     */
    cancel(key: string): void;
    private get;
    private post;
    private buildUrl;
    private fetchWithTimeout;
    private createIdempotencyKey;
    private handleResponse;
    private buildListParams;
    private buildActivityParams;
}
/**
 * Get the default services API client instance
 */
export declare function getServicesClient(): ServicesAPIClient;
/**
 * Set the default services API client instance
 */
export declare function setServicesClient(client: ServicesAPIClient): void;
/**
 * Create a new services API client with custom configuration
 */
export declare function createServicesClient(config?: ServicesAPIClientConfig): ServicesAPIClient;
//# sourceMappingURL=api-client.d.ts.map