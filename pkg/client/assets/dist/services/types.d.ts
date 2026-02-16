/**
 * Services Module - Type Definitions
 * Type definitions for the services integration platform API
 */
export type ScopeType = 'user' | 'org';
export interface ScopeRef {
    type: ScopeType;
    id: string;
}
export type ConnectionStatus = 'active' | 'disconnected' | 'errored' | 'pending_reauth' | 'needs_reconsent';
export type InstallationStatus = 'active' | 'suspended' | 'uninstalled' | 'needs_reconsent';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'errored';
export type SyncJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';
export type SyncJobMode = 'bootstrap' | 'incremental' | 'backfill';
export type CapabilityDeniedBehavior = 'block' | 'degrade';
export type ServiceActivityStatus = 'success' | 'failure' | 'pending';
export interface ProviderCapability {
    name: string;
    required_grants: string[];
    optional_grants: string[];
    denied_behavior: CapabilityDeniedBehavior;
}
export interface Provider {
    id: string;
    auth_kind: string;
    supported_scope_types: ScopeType[];
    capabilities: ProviderCapability[];
}
export interface ListProvidersResponse {
    providers: Provider[];
}
export interface Connection {
    id: string;
    provider_id: string;
    scope_type: ScopeType;
    scope_id: string;
    external_account_id: string;
    status: ConnectionStatus;
    last_error: string;
    created_at: string;
    updated_at: string;
}
export interface ConnectionsListFilter {
    provider_id?: string;
    scope_type?: ScopeType;
    scope_id?: string;
    status?: ConnectionStatus;
    q?: string;
    page?: number;
    per_page?: number;
}
export interface ListConnectionsResponse {
    connections: Connection[];
    page: number;
    per_page: number;
    total: number;
    has_next: boolean;
}
export interface BeginConnectionRequest {
    scope_type?: ScopeType;
    scope_id?: string;
    redirect_uri?: string;
    state?: string;
    requested_grants?: string[];
    metadata?: Record<string, unknown>;
}
export interface BeginConnectionResponse {
    begin: {
        authorize_url: string;
        state: string;
    };
}
export interface CompleteCallbackResponse {
    completion: {
        connection_id: string;
        provider_id: string;
        scope: ScopeRef;
        external_account_id: string;
        granted_scopes: string[];
    };
}
export interface GrantSnapshot {
    connection_id: string;
    requested_grants: string[];
    granted_grants: string[];
    version: number;
    captured_at: string;
}
export interface GetConnectionGrantsResponse {
    snapshot: GrantSnapshot;
}
export interface ConnectionCredentialHealth {
    has_active_credential: boolean;
    refreshable: boolean;
    expires_at: string | null;
    last_refresh_at: string | null;
    next_refresh_attempt_at: string | null;
    last_error: string;
}
export interface ConnectionGrantsSummary {
    snapshot_found: boolean;
    version: number;
    captured_at: string | null;
    requested_grants: string[];
    granted_grants: string[];
    required_grants: string[];
    missing_grants: string[];
}
export interface ConnectionSubscriptionSummary {
    total: number;
    active: number;
    expiring: number;
    last_delivery_at: string | null;
    subscriptions: Subscription[];
}
export interface ConnectionRateLimitSummary {
    total_buckets: number;
    exhausted_buckets: number;
    next_reset_at: string | null;
    max_retry_after_seconds: number;
}
export interface ConnectionDetailResponse {
    connection: Connection;
    credential_health: ConnectionCredentialHealth;
    grants_summary: ConnectionGrantsSummary;
    subscription_summary: ConnectionSubscriptionSummary;
    sync_summary: ConnectionSyncSummary;
    rate_limit_summary: ConnectionRateLimitSummary;
}
export interface BeginReconsentRequest {
    redirect_uri?: string;
    state?: string;
    requested_grants?: string[];
    metadata?: Record<string, unknown>;
}
export interface BeginReconsentResponse {
    begin: {
        authorize_url: string;
        state: string;
    };
}
export interface RefreshConnectionRequest {
    provider_id?: string;
}
export interface RefreshConnectionResponse {
    refresh?: {
        connection_id: string;
        provider_id: string;
        refreshed_at: string;
        expires_at?: string;
    };
    queued?: boolean;
    job_id?: string;
}
export interface RevokeConnectionRequest {
    reason?: string;
}
export interface RevokeConnectionResponse {
    status: 'revoked';
    connection_id: string;
}
export type InstallType = 'user' | 'workspace' | 'org' | 'marketplace_app' | 'standard';
export interface Installation {
    id: string;
    provider_id: string;
    scope_type: ScopeType;
    scope_id: string;
    install_type: InstallType;
    status: InstallationStatus;
    granted_at: string | null;
    revoked_at: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}
export interface InstallationsListFilter {
    provider_id?: string;
    scope_type?: ScopeType;
    scope_id?: string;
    install_type?: InstallType;
    status?: InstallationStatus;
    q?: string;
    page?: number;
    per_page?: number;
}
export interface ListInstallationsResponse {
    installations: Installation[];
    page: number;
    per_page: number;
    total: number;
    has_next: boolean;
}
export interface BeginInstallationRequest {
    scope_type?: ScopeType;
    scope_id?: string;
    install_type?: InstallType;
    redirect_uri?: string;
    state?: string;
    requested_grants?: string[];
    metadata?: Record<string, unknown>;
}
export interface BeginInstallationResponse {
    begin: {
        authorize_url: string;
        state: string;
    };
    installation: Installation;
}
export interface UninstallInstallationRequest {
    reason?: string;
}
export interface UninstallInstallationResponse {
    status: 'ok';
    installation_id: string;
    revoked_connections: number;
}
export interface Subscription {
    id: string;
    connection_id: string;
    provider_id: string;
    resource_type: string;
    resource_id: string;
    channel_id: string;
    remote_subscription_id: string;
    callback_url: string;
    status: SubscriptionStatus;
    expires_at: string | null;
    last_notified_at: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}
export interface SubscriptionsListFilter {
    provider_id?: string;
    connection_id?: string;
    status?: SubscriptionStatus;
    q?: string;
    page?: number;
    per_page?: number;
}
export interface ListSubscriptionsResponse {
    subscriptions: Subscription[];
    page: number;
    per_page: number;
    total: number;
    has_next: boolean;
}
export interface RenewSubscriptionRequest {
    metadata?: Record<string, unknown>;
}
export interface RenewSubscriptionResponse {
    subscription?: Subscription;
    queued?: boolean;
    job_id?: string;
}
export interface CancelSubscriptionRequest {
    reason?: string;
}
export interface CancelSubscriptionResponse {
    status: 'cancelled';
    subscription_id: string;
}
export interface SyncJob {
    id: string;
    connection_id: string;
    provider_id: string;
    mode: SyncJobMode;
    checkpoint?: string;
    status: SyncJobStatus;
    attempts: number;
    next_attempt_at?: string;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}
export interface RunSyncRequest {
    provider_id?: string;
    resource_type: string;
    resource_id: string;
    metadata?: Record<string, unknown>;
}
export interface RunSyncResponse {
    job?: SyncJob;
    queued?: boolean;
    job_id?: string;
}
export interface SyncCursor {
    id: string;
    connection_id: string;
    provider_id: string;
    resource_type: string;
    resource_id: string;
    cursor: string;
    status: string;
    last_synced_at: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}
export interface ConnectionSyncSummary {
    cursor_count: number;
    last_cursor: string;
    last_synced_at: string | null;
    last_sync_error: string;
    cursors: SyncCursor[];
    last_job?: SyncJob | null;
}
export interface GetSyncStatusResponse {
    connection_id: string;
    sync_summary: ConnectionSyncSummary;
}
export interface InvokeCapabilityRequest {
    scope_type?: ScopeType;
    scope_id?: string;
    connection_id?: string;
    payload?: Record<string, unknown>;
}
export interface CapabilityResult {
    allowed: boolean;
    mode: CapabilityDeniedBehavior;
    missing_grants?: string[];
    result?: unknown;
    metadata?: Record<string, unknown>;
}
export interface InvokeCapabilityResponse {
    result: CapabilityResult;
}
export interface ServiceActivityEntry {
    id: string;
    provider_id: string;
    scope_type: ScopeType;
    scope_id: string;
    connection_id?: string;
    action: string;
    status: ServiceActivityStatus;
    channel?: string;
    object_type?: string;
    object_id?: string;
    metadata: Record<string, unknown>;
    created_at: string;
}
export interface ActivityListFilter {
    provider_id?: string;
    scope_type?: ScopeType;
    scope_id?: string;
    action?: string;
    status?: ServiceActivityStatus;
    from?: string;
    to?: string;
    connections?: string[];
    page?: number;
    per_page?: number;
}
export interface ListActivityResponse {
    entries: ServiceActivityEntry[];
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
    next_offset: number;
    filter_applied: ActivityListFilter;
}
export interface ServiceStatusInfo {
    runtime_enabled: boolean;
    worker_enabled: boolean;
    webhook_processor_enabled: boolean;
    inbound_dispatcher_enabled: boolean;
    sync_orchestrator_enabled: boolean;
    lifecycle_dispatcher_enabled: boolean;
    activity_sink_status?: 'active' | 'degraded' | 'fallback';
    fallback_entries_count?: number;
    retention_config?: {
        ttl_days: number;
        max_rows: number;
    };
}
export interface GetStatusResponse extends ServiceStatusInfo {
}
export interface RunRetentionCleanupResponse {
    status: 'ok';
    deleted_count: number;
    execution_time_ms: number;
}
export interface WebhookProcessResult {
    status_code: number;
    processed: boolean;
    delivery_id?: string;
    metadata?: Record<string, unknown>;
}
export interface ProcessWebhookResponse {
    result: WebhookProcessResult;
}
export interface InboundDispatchResult {
    status_code: number;
    processed: boolean;
    surface: string;
    metadata?: Record<string, unknown>;
}
export interface DispatchInboundResponse {
    result: InboundDispatchResult;
}
export interface ServiceErrorResponse {
    error: string;
    text_code?: string;
    message?: string;
    code?: number;
    details?: Record<string, unknown>;
    field?: string;
}
export declare class ServicesAPIError extends Error {
    readonly code: string;
    readonly statusCode: number;
    readonly details?: Record<string, unknown>;
    constructor(message: string, code: string, statusCode: number, details?: Record<string, unknown>);
    static fromResponse(statusCode: number, payload: ServiceErrorResponse): ServicesAPIError;
    get isForbidden(): boolean;
    get isNotFound(): boolean;
    get isValidationError(): boolean;
    get isConflict(): boolean;
}
export declare const ServicesPermissions: {
    readonly VIEW: "admin.services.view";
    readonly CONNECT: "admin.services.connect";
    readonly EDIT: "admin.services.edit";
    readonly REVOKE: "admin.services.revoke";
    readonly RECONSENT: "admin.services.reconsent";
    readonly ACTIVITY_VIEW: "admin.services.activity.view";
    readonly WEBHOOKS: "admin.services.webhooks";
};
export type ServicesPermission = typeof ServicesPermissions[keyof typeof ServicesPermissions];
//# sourceMappingURL=types.d.ts.map