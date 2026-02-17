/**
 * Translation Status Vocabulary (Phase 5 - TX-052)
 *
 * Provides a unified translation status vocabulary map and disabled-reason presenter
 * used by all translation surfaces. Implements the shared contracts from backend
 * translation_contracts.go and action_state_reason_codes.go.
 *
 * Status Domains:
 * - Core: readiness_state (ready, missing_locales, missing_fields, missing_locales_and_fields)
 * - Queue: queue_state (pending, assigned, in_progress, review, rejected, approved, published, archived)
 *          content_state (draft, review, ready, archived)
 *          due_state (overdue, due_soon, on_track, none)
 * - Exchange: row_status (success, error, conflict, skipped)
 *             job_status (running, completed, failed)
 *
 * Disabled Reason Codes:
 * - TRANSLATION_MISSING, INVALID_STATUS, PERMISSION_DENIED, MISSING_CONTEXT, FEATURE_DISABLED
 */
/**
 * Status domain categories matching backend structure
 */
export type StatusDomain = 'core' | 'queue' | 'exchange';
/**
 * Core readiness states
 */
export type CoreReadinessState = 'ready' | 'missing_locales' | 'missing_fields' | 'missing_locales_and_fields';
/**
 * Queue assignment states
 */
export type QueueState = 'pending' | 'assigned' | 'in_progress' | 'review' | 'rejected' | 'approved' | 'published' | 'archived';
/**
 * Queue content states
 */
export type QueueContentState = 'draft' | 'review' | 'ready' | 'archived';
/**
 * Queue due states
 */
export type QueueDueState = 'overdue' | 'due_soon' | 'on_track' | 'none';
/**
 * Exchange row statuses
 */
export type ExchangeRowStatus = 'success' | 'error' | 'conflict' | 'skipped';
/**
 * Exchange job statuses
 */
export type ExchangeJobStatus = 'running' | 'completed' | 'failed';
/**
 * All possible translation status values
 */
export type TranslationStatus = CoreReadinessState | QueueState | QueueContentState | QueueDueState | ExchangeRowStatus | ExchangeJobStatus;
/**
 * Canonical disabled reason codes from backend
 */
export type DisabledReasonCode = 'TRANSLATION_MISSING' | 'INVALID_STATUS' | 'PERMISSION_DENIED' | 'MISSING_CONTEXT' | 'FEATURE_DISABLED';
/**
 * Status display configuration
 */
export interface StatusDisplayConfig {
    /** Human-readable label */
    label: string;
    /** Short label for compact displays */
    shortLabel?: string;
    /** CSS color class (bg + text) */
    colorClass: string;
    /** Background color class */
    bgClass: string;
    /** Text color class */
    textClass: string;
    /** Border color class */
    borderClass?: string;
    /** Icon character or SVG path */
    icon: string;
    /** Icon type: 'char' for character, 'svg' for SVG path */
    iconType: 'char' | 'svg';
    /** Severity level for sorting/priority */
    severity: 'success' | 'warning' | 'error' | 'info' | 'neutral';
    /** Tooltip/description text */
    description?: string;
}
/**
 * Disabled reason display configuration
 */
export interface DisabledReasonDisplayConfig {
    /** Human-readable message */
    message: string;
    /** Short message for compact displays */
    shortMessage: string;
    /** CSS color class */
    colorClass: string;
    /** Background color class */
    bgClass: string;
    /** Text color class */
    textClass: string;
    /** Icon SVG path */
    icon: string;
    /** Severity level */
    severity: 'warning' | 'error' | 'info';
    /** Whether the reason can be resolved by user action */
    actionable: boolean;
    /** Suggested action label if actionable */
    actionLabel?: string;
}
/**
 * Status vocabulary payload from backend contracts
 */
export interface StatusVocabularyPayload {
    schema_version: number;
    status_enums: {
        core: {
            readiness_state: string[];
        };
        queue: {
            queue_state: string[];
            content_state: string[];
            due_state: string[];
        };
        exchange: {
            row_status: string[];
            job_status: string[];
        };
        all: string[];
    };
    disabled_reason_codes: string[];
}
/**
 * Core readiness state display configurations
 */
export declare const CORE_READINESS_DISPLAY: Record<CoreReadinessState, StatusDisplayConfig>;
/**
 * Queue state display configurations
 */
export declare const QUEUE_STATE_DISPLAY: Record<QueueState, StatusDisplayConfig>;
/**
 * Queue content state display configurations
 */
export declare const QUEUE_CONTENT_STATE_DISPLAY: Record<QueueContentState, StatusDisplayConfig>;
/**
 * Queue due state display configurations
 */
export declare const QUEUE_DUE_STATE_DISPLAY: Record<QueueDueState, StatusDisplayConfig>;
/**
 * Exchange row status display configurations
 */
export declare const EXCHANGE_ROW_STATUS_DISPLAY: Record<ExchangeRowStatus, StatusDisplayConfig>;
/**
 * Exchange job status display configurations
 */
export declare const EXCHANGE_JOB_STATUS_DISPLAY: Record<ExchangeJobStatus, StatusDisplayConfig>;
/**
 * Disabled reason code display configurations
 */
export declare const DISABLED_REASON_DISPLAY: Record<DisabledReasonCode, DisabledReasonDisplayConfig>;
/**
 * Get display configuration for a status value
 */
export declare function getStatusDisplay(status: string, domain?: StatusDomain): StatusDisplayConfig | null;
/**
 * Get display configuration for a disabled reason code
 */
export declare function getDisabledReasonDisplay(code: string): DisabledReasonDisplayConfig | null;
/**
 * Check if a status value is valid
 */
export declare function isValidStatus(status: string, domain?: StatusDomain): boolean;
/**
 * Check if a reason code is valid
 */
export declare function isValidReasonCode(code: string): boolean;
/**
 * Get all status values for a domain
 */
export declare function getStatusesForDomain(domain: StatusDomain): string[];
/**
 * Get all disabled reason codes
 */
export declare function getAllReasonCodes(): string[];
/**
 * Get a CSS class name for a status value.
 * Returns 'status-{status}' for valid statuses, empty string otherwise.
 * This replaces local getStatusClass() functions in consuming surfaces.
 */
export declare function getStatusCssClass(status: string, domain?: StatusDomain): string;
/**
 * Get a CSS class name based on severity level.
 * Maps status to its severity CSS class for consistent theming.
 */
export declare function getSeverityCssClass(status: string, domain?: StatusDomain): string;
/**
 * Render a status badge HTML string
 */
export declare function renderVocabularyStatusBadge(status: string, options?: {
    domain?: StatusDomain;
    size?: 'xs' | 'sm' | 'default';
    showIcon?: boolean;
    showLabel?: boolean;
    extraClass?: string;
}): string;
/**
 * Render a status icon
 */
export declare function renderVocabularyStatusIcon(display: StatusDisplayConfig, size?: 'xs' | 'sm' | 'default'): string;
/**
 * Render a disabled reason badge HTML string
 */
export declare function renderReasonCodeBadge(code: string, options?: {
    size?: 'sm' | 'default';
    showIcon?: boolean;
    showFullMessage?: boolean;
    extraClass?: string;
}): string;
/**
 * Render an inline disabled reason indicator (compact, icon-only)
 */
export declare function renderReasonCodeIndicator(code: string, tooltip?: string): string;
/**
 * Create a status cell renderer for DataGrid
 */
export declare function createStatusCellRenderer(options?: {
    domain?: StatusDomain;
    size?: 'xs' | 'sm' | 'default';
    showIcon?: boolean;
}): (value: unknown, record: Record<string, unknown>, column: string) => string;
/**
 * Create a disabled reason cell renderer for DataGrid
 */
export declare function createReasonCodeCellRenderer(options?: {
    size?: 'sm' | 'default';
    showIcon?: boolean;
}): (value: unknown, record: Record<string, unknown>, column: string) => string;
/**
 * Initialize vocabulary from backend payload (for dynamic vocabulary updates)
 */
export declare function initializeVocabularyFromPayload(_payload: StatusVocabularyPayload): void;
/**
 * Get CSS styles for status vocabulary components
 */
export declare function getStatusVocabularyStyles(): string;
//# sourceMappingURL=translation-status-vocabulary.d.ts.map