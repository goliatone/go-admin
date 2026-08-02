export type TranslationProfile = "none" | "core" | "core+exchange" | "core+queue" | "full";
export type TranslationCapabilityMode = TranslationProfile;
export type TranslationModuleKey = "exchange" | "queue";
export type DisabledReasonCode = "TRANSLATION_MISSING" | "INVALID_STATUS" | "PERMISSION_DENIED" | "MISSING_CONTEXT" | "FEATURE_DISABLED" | "RESOURCE_IN_USE" | "PRECONDITION_FAILED" | "INVALID_SELECTION" | "RATE_LIMITED" | "TEMPORARILY_UNAVAILABLE";
export interface TranslationActionState {
    enabled: boolean;
    reason?: string;
    reason_code?: string;
    severity?: string;
    kind?: string;
    permission?: string;
    metadata?: Record<string, unknown>;
    remediation?: {
        label?: string;
        href?: string;
        kind?: string;
    };
}
export interface TranslationModuleState {
    enabled: boolean;
    visible: boolean;
    entry: TranslationActionState;
    actions: Record<string, TranslationActionState>;
}
export interface TranslationSuggestionFeatureState extends TranslationActionState {
    service_configured: boolean;
    queue_enabled: boolean;
    command_name: string;
    command_registered: boolean;
    command_dispatchable: boolean;
    inline_result_supported: boolean;
    rpc_allowed: boolean;
}
export interface TranslationCapabilities {
    profile: TranslationProfile;
    capability_mode: TranslationCapabilityMode;
    supported_profiles: TranslationProfile[];
    schema_version: number;
    modules: {
        exchange: TranslationModuleState;
        queue: TranslationModuleState;
    };
    features: {
        cms: boolean;
        dashboard: boolean;
        suggestions: TranslationSuggestionFeatureState;
    };
    routes: Record<string, string>;
    panels: string[];
    resolver_keys: string[];
    warnings: string[];
    contracts?: Record<string, unknown>;
}
export interface TranslationSuccessEnvelope<T> {
    data: T;
    meta: Record<string, unknown>;
}
export interface TranslationErrorEnvelope {
    error: {
        code?: string;
        text_code?: string;
        message: string;
        details?: Record<string, unknown>;
        metadata?: Record<string, unknown>;
        validation_errors?: Array<Record<string, unknown>>;
        request_id?: string;
    };
}
export interface TranslationEntrypoint {
    id: string;
    label: string;
    icon: string;
    href: string;
    module: "exchange" | "queue" | "core";
    enabled: boolean;
    description?: string;
    disabledReason?: string;
    disabledReasonCode?: string;
    permission?: string;
    badge?: string;
    badgeVariant?: "info" | "warning" | "success" | "danger";
}
export interface TranslationOpenAPIArtifact {
    schema_version: number;
    artifact_path: string;
    artifact_bytes: number;
}
export type TranslationExchangeJobKind = "export" | "import_validate" | "import_apply";
export type TranslationExchangeJobStatus = "running" | "completed" | "failed";
export type TranslationExchangeUploadState = "idle" | "selected" | "uploading" | "validated" | "error";
export type TranslationExchangeConflictType = "missing_linkage" | "duplicate_row" | "stale_source_hash";
export interface TranslationExchangeJobProgress {
    total?: number;
    processed: number;
    succeeded: number;
    failed: number;
    conflicts?: number;
    skipped?: number;
}
export interface TranslationExchangeValidationSummary {
    processed: number;
    succeeded: number;
    failed: number;
    conflicts?: number;
    skipped?: number;
    partial_success?: boolean;
    by_status?: Record<string, number>;
    by_conflict?: Record<string, number>;
}
export interface TranslationExchangeConflictRow {
    index: number;
    resource: string;
    entity_id: string;
    family_id: string;
    target_locale: string;
    field_path: string;
    status: "success" | "error" | "conflict" | "skipped";
    error?: string;
    conflict?: {
        type: TranslationExchangeConflictType;
        message?: string;
        current_source_hash?: string;
        provided_source_hash?: string;
    };
    metadata?: Record<string, unknown>;
}
export interface TranslationExchangeJob {
    id: string;
    kind: TranslationExchangeJobKind;
    status: TranslationExchangeJobStatus;
    poll_endpoint: string;
    progress: TranslationExchangeJobProgress;
    actor?: {
        id: string;
        label?: string;
    };
    file?: {
        name?: string;
        format?: string;
        row_count?: number;
    };
    summary?: Record<string, unknown>;
    downloads?: Record<string, TranslationExchangeJobDownload>;
    fixture?: boolean;
    request_hash?: string;
    request?: Record<string, unknown>;
    result?: Record<string, unknown>;
    retention?: TranslationExchangeJobRetention;
    request_id?: string;
    trace_id?: string;
    error?: string;
    created_at?: string;
    updated_at?: string;
}
export interface TranslationExchangeJobDownload {
    kind: string;
    label: string;
    filename: string;
    content_type: string;
    href: string;
}
export interface TranslationExchangeJobRetention {
    hard_delete_supported: boolean;
    hard_delete_path?: string;
    download_kinds?: string[];
    artifact_count?: number;
    retained?: boolean;
}
export interface TranslationExchangeValidationResult {
    summary: TranslationExchangeValidationSummary;
    results: TranslationExchangeConflictRow[];
    total_rows?: number;
    conflicts?: {
        total: number;
        by_type: Record<string, number>;
        rows?: Array<Record<string, unknown>>;
    };
    job?: TranslationExchangeJob;
}
export interface TranslationExchangeUploadDescriptor {
    state: TranslationExchangeUploadState;
    filename?: string;
    format?: "csv" | "json";
    row_count?: number;
    message?: string;
}
export interface TranslationExchangeHistoryResponse {
    history: {
        items: TranslationExchangeJob[];
        page: number;
        per_page: number;
        total: number;
        has_more: boolean;
        counts?: {
            by_kind?: Record<string, number>;
            by_status?: Record<string, number>;
        };
    };
    meta: {
        job_kinds: TranslationExchangeJobKind[];
        job_statuses: TranslationExchangeJobStatus[];
        download_kinds: string[];
        retention_fields?: string[];
        include_examples?: boolean;
    };
}
export declare const EMPTY_TRANSLATION_CAPABILITIES: TranslationCapabilities;
export declare function normalizeTranslationProfile(value: unknown): TranslationProfile;
export declare function normalizeTranslationActionState(value: unknown): TranslationActionState | null;
export declare function normalizeTranslationModuleState(value: unknown): TranslationModuleState;
export declare function normalizeTranslationSuggestionFeatureState(value: unknown): TranslationSuggestionFeatureState;
export declare function normalizeTranslationRoutes(value: unknown): Record<string, string>;
export declare function normalizeTranslationCapabilities(raw: unknown): TranslationCapabilities;
export declare function normalizeTranslationExchangeJob(raw: unknown): TranslationExchangeJob | null;
export declare function normalizeTranslationExchangeHistoryResponse(raw: unknown): TranslationExchangeHistoryResponse;
export declare function normalizeTranslationExchangeValidationResult(raw: unknown): TranslationExchangeValidationResult;
export declare function normalizeTranslationExchangeUploadDescriptor(raw: unknown): TranslationExchangeUploadDescriptor;
//# sourceMappingURL=index.d.ts.map