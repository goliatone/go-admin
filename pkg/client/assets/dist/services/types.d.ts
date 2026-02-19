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
export type MappingStatus = 'draft' | 'validated' | 'published';
export interface MappingRule {
    id?: string;
    source_path: string;
    target_path: string;
    transform?: string;
    required?: boolean;
    constraints?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}
export interface MappingSpec {
    spec_id: string;
    provider_id: string;
    scope_type: ScopeType;
    scope_id: string;
    name: string;
    source_object: string;
    target_model: string;
    version: number;
    status: MappingStatus;
    schema_ref?: string;
    rules: MappingRule[];
    created_at?: string;
    updated_at?: string;
}
export interface ListMappingsFilter {
    provider_id: string;
    scope_type?: ScopeType;
    scope_id?: string;
}
export interface ListMappingsResponse {
    mappings: MappingSpec[];
    total: number;
    limit: number;
    offset: number;
    page?: number;
    per_page?: number;
    has_more?: boolean;
    has_next?: boolean;
    next_offset?: number;
    filter_applied?: Record<string, unknown>;
}
export interface MappingScopeRequest {
    provider_id: string;
    scope_type?: ScopeType;
    scope_id?: string;
}
export interface GetMappingRequest extends MappingScopeRequest {
    version?: number;
}
export interface GetMappingResponse {
    mapping: MappingSpec;
}
export interface CreateMappingDraftRequest extends MappingScopeRequest {
    spec_id: string;
    name: string;
    source_object: string;
    target_model: string;
    schema_ref?: string;
    rules: MappingRule[];
}
export interface CreateMappingDraftResponse {
    mapping: MappingSpec;
}
export interface UpdateMappingDraftRequest extends MappingScopeRequest {
    version: number;
    name?: string;
    source_object?: string;
    target_model?: string;
    schema_ref?: string;
    rules?: MappingRule[];
    metadata?: Record<string, unknown>;
}
export interface UpdateMappingDraftResponse {
    mapping: MappingSpec;
}
export interface MarkMappingVersionRequest extends MappingScopeRequest {
    version: number;
}
export interface MarkMappingVersionResponse {
    mapping: MappingSpec;
}
export interface MappingValidationIssue {
    code: string;
    message: string;
    severity?: 'error' | 'warning' | string;
    field?: string;
    path?: string;
    details?: Record<string, unknown>;
}
export interface MappingValidationResult {
    valid: boolean;
    issues: MappingValidationIssue[];
    normalized_spec?: MappingSpec | Record<string, unknown>;
    compiled?: Record<string, unknown>;
}
export interface ValidateMappingRequest extends MappingScopeRequest {
    spec: MappingSpec | Record<string, unknown>;
    schema: Record<string, unknown>;
}
export interface ValidateMappingResponse {
    validation: MappingValidationResult;
}
export interface MappingPreviewRecord {
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    diff?: Record<string, unknown>;
    [key: string]: unknown;
}
export interface MappingPreviewResult {
    records: MappingPreviewRecord[];
    report: Record<string, unknown>;
    deterministic_hash?: string;
}
export interface PreviewMappingRequest extends MappingScopeRequest {
    spec: MappingSpec | Record<string, unknown>;
    schema: Record<string, unknown>;
    samples: Record<string, unknown>[];
}
export interface PreviewMappingResponse {
    preview: MappingPreviewResult;
}
export type WorkflowSyncMode = 'dry_run' | 'apply';
export type WorkflowSyncDirection = 'import' | 'export' | string;
export type SyncConflictStatus = 'pending' | 'resolved' | 'ignored' | string;
export type SyncConflictAction = 'resolve' | 'ignore' | 'retry';
export interface WorkflowSyncBinding {
    id?: string;
    provider_id: string;
    scope?: ScopeRef;
    scope_type?: ScopeType;
    scope_id?: string;
    connection_id?: string;
    mapping_spec_id?: string;
    source_object?: string;
    target_model?: string;
    direction?: WorkflowSyncDirection;
    status?: string;
    metadata?: Record<string, unknown>;
}
export interface WorkflowSyncPlan {
    id?: string;
    provider_id?: string;
    scope?: ScopeRef;
    sync_binding_id?: string;
    mode?: WorkflowSyncMode | string;
    direction?: WorkflowSyncDirection;
    from_checkpoint_id?: string;
    limit?: number;
    metadata?: Record<string, unknown>;
}
export interface WorkflowSyncChange {
    source_object?: string;
    external_id?: string;
    source_version?: string;
    payload?: Record<string, unknown>;
    [key: string]: unknown;
}
export interface WorkflowSyncConflict {
    id?: string;
    provider_id?: string;
    scope?: ScopeRef;
    connection_id?: string;
    sync_binding_id?: string;
    source_object?: string;
    external_id?: string;
    reason?: string;
    status?: SyncConflictStatus;
    policy?: string;
    payload?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
}
export interface WorkflowSyncRunResult {
    status: 'succeeded' | 'failed' | string;
    run_id?: string;
    processed_count?: number;
    skipped_count?: number;
    conflict_count?: number;
    failed_count?: number;
    next_checkpoint?: WorkflowSyncCheckpoint | null;
    processed?: number;
    skipped?: number;
    conflicted?: number;
    failed?: number;
    errors?: Record<string, unknown>[];
    [key: string]: unknown;
}
export interface WorkflowSyncCheckpoint {
    id?: string;
    provider_id?: string;
    scope_type?: ScopeType | string;
    scope_id?: string;
    connection_id?: string;
    sync_binding_id?: string;
    direction?: WorkflowSyncDirection;
    cursor?: string;
    sequence?: number;
    source_version?: string;
    idempotency_seed?: string;
    metadata?: Record<string, unknown>;
    last_event_at?: string;
    created_at?: string;
    updated_at?: string;
}
export interface WorkflowSyncRunRecord {
    run_id: string;
    provider_id?: string;
    scope_type?: ScopeType | string;
    scope_id?: string;
    sync_binding_id?: string;
    mode?: WorkflowSyncMode | string;
    direction?: WorkflowSyncDirection;
    status?: string;
    plan?: WorkflowSyncPlan;
    result?: WorkflowSyncRunResult;
    recorded_conflicts?: WorkflowSyncConflict[];
    created_at?: string;
    updated_at?: string;
}
export interface PlanWorkflowSyncRequest {
    binding: WorkflowSyncBinding;
    mode?: WorkflowSyncMode | string;
    from_checkpoint_id?: string;
    limit?: number;
    metadata?: Record<string, unknown>;
}
export interface PlanWorkflowSyncResponse {
    binding: WorkflowSyncBinding;
    plan: WorkflowSyncPlan;
}
export interface RunWorkflowSyncRequest {
    plan?: WorkflowSyncPlan;
    binding?: WorkflowSyncBinding;
    mode?: WorkflowSyncMode | string;
    direction?: WorkflowSyncDirection;
    changes?: WorkflowSyncChange[];
    conflicts?: WorkflowSyncConflict[];
    metadata?: Record<string, unknown>;
}
export interface RunWorkflowSyncResponse {
    plan: WorkflowSyncPlan;
    result: WorkflowSyncRunResult;
    recorded_conflicts: WorkflowSyncConflict[];
    run?: WorkflowSyncRunRecord;
}
export interface ListSyncRunsFilter extends MappingScopeRequest {
    sync_binding_id?: string;
    status?: 'planned' | 'running' | 'succeeded' | 'failed' | string;
    mode?: WorkflowSyncMode | string;
    page?: number;
    per_page?: number;
    limit?: number;
    offset?: number;
}
export interface ListSyncRunsResponse {
    runs: WorkflowSyncRunRecord[];
    total: number;
    limit: number;
    offset: number;
    page?: number;
    per_page?: number;
    has_more?: boolean;
    has_next?: boolean;
    next_offset?: number;
    filter_applied?: Record<string, unknown>;
}
export interface GetSyncRunRequest extends MappingScopeRequest {
}
export interface GetSyncRunResponse {
    run: WorkflowSyncRunRecord;
}
export interface ResumeSyncRunRequest extends MappingScopeRequest {
    mode?: WorkflowSyncMode | string;
    direction?: WorkflowSyncDirection;
    limit?: number;
    changes?: WorkflowSyncChange[];
    conflicts?: WorkflowSyncConflict[];
    metadata?: Record<string, unknown>;
}
export interface ResumeSyncRunResponse {
    resumed_from_run_id: string;
    resumed_from_checkpoint_id?: string;
    plan: WorkflowSyncPlan;
    result: WorkflowSyncRunResult;
    recorded_conflicts: WorkflowSyncConflict[];
    run: WorkflowSyncRunRecord;
}
export interface GetSyncCheckpointRequest extends MappingScopeRequest {
}
export interface GetSyncCheckpointResponse {
    checkpoint: WorkflowSyncCheckpoint;
}
export interface ListSyncConflictsFilter extends MappingScopeRequest {
    sync_binding_id?: string;
    status?: SyncConflictStatus;
}
export interface ListSyncConflictsResponse {
    conflicts: WorkflowSyncConflict[];
    total: number;
    limit: number;
    offset: number;
    page?: number;
    per_page?: number;
    has_more?: boolean;
    has_next?: boolean;
    next_offset?: number;
    filter_applied?: Record<string, unknown>;
}
export interface GetSyncConflictRequest extends MappingScopeRequest {
}
export interface GetSyncConflictResponse {
    conflict: WorkflowSyncConflict;
}
export interface ResolveSyncConflictRequest extends MappingScopeRequest {
    action: SyncConflictAction;
    patch?: Record<string, unknown>;
    reason?: string;
    resolved_by?: string;
    metadata?: Record<string, unknown>;
}
export interface ResolveSyncConflictResponse {
    conflict: WorkflowSyncConflict;
}
export interface SchemaDriftBaseline {
    id?: string;
    provider_id?: string;
    scope_type?: ScopeType | string;
    scope_id?: string;
    spec_id: string;
    version?: number;
    schema_ref?: string;
    captured_by?: string;
    metadata?: Record<string, unknown>;
    captured_at?: string;
    updated_at?: string;
}
export interface SchemaDriftItem {
    spec_id: string;
    provider_id?: string;
    scope_type?: ScopeType | string;
    scope_id?: string;
    mapping_version?: number;
    mapping_schema_ref?: string;
    baseline_found?: boolean;
    baseline_version?: number;
    baseline_schema_ref?: string;
    baseline_captured_at?: string;
    status?: 'baseline_missing' | 'in_sync' | 'drift_detected' | string;
    drift_detected?: boolean;
}
export interface ListSchemaDriftFilter extends MappingScopeRequest {
    spec_id?: string;
}
export interface ListSchemaDriftResponse {
    drift_items: SchemaDriftItem[];
    total: number;
    limit: number;
    offset: number;
    page?: number;
    per_page?: number;
    has_more?: boolean;
    has_next?: boolean;
    next_offset?: number;
    filter_applied?: Record<string, unknown>;
}
export interface SetSchemaDriftBaselineRequest extends MappingScopeRequest {
    spec_id: string;
    version?: number;
    schema_ref?: string;
    captured_by?: string;
    metadata?: Record<string, unknown>;
}
export interface SetSchemaDriftBaselineResponse {
    baseline: SchemaDriftBaseline;
    drift: SchemaDriftItem;
}
export interface ConnectionCandidate {
    connection_id: string;
    provider_id: string;
    scope_type: ScopeType | string;
    scope_id: string;
    external_account_id?: string;
    status?: string;
    [key: string]: unknown;
}
export interface ListConnectionCandidatesFilter {
    provider_id: string;
    scope_type?: ScopeType;
    scope_id?: string;
}
export interface ListConnectionCandidatesResponse {
    candidates: ConnectionCandidate[];
    total: number;
    limit: number;
    offset: number;
    page?: number;
    per_page?: number;
    has_more?: boolean;
    has_next?: boolean;
    next_offset?: number;
    filter_applied?: Record<string, unknown>;
}
export interface CallbackDiagnosticsStatus {
    status: 'ok' | 'degraded' | string;
    strict?: boolean;
    checks?: Record<string, unknown>[];
    errors?: Record<string, unknown>[];
    [key: string]: unknown;
}
export interface GetCallbackDiagnosticsStatusResponse {
    resolver: CallbackDiagnosticsStatus;
}
export interface PreviewCallbackDiagnosticsRequest {
    provider_id: string;
    flow?: 'connect' | 'reconsent' | string;
}
export interface PreviewCallbackDiagnosticsResponse {
    preview: Record<string, unknown>;
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
    candidate_count?: number;
    selected_connection?: string;
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