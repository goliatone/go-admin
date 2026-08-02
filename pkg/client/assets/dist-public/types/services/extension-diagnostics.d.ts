/**
 * Extension Diagnostics Module
 * UI panels for viewing downstream package registration state, provider pack status,
 * hooks enabled, config health, and latest extension errors.
 *
 * This module renders diagnostic information for operators to understand
 * the current state of go-services extensions and registered packages.
 */
/** Status of an extension pack */
export type ExtensionStatus = 'active' | 'degraded' | 'errored' | 'disabled';
/** Information about a registered provider pack */
export interface ProviderPackInfo {
    /** Pack identifier (e.g., "google-drive", "slack") */
    id: string;
    /** Human-readable name */
    name: string;
    /** Pack version */
    version: string;
    /** Current status */
    status: ExtensionStatus;
    /** Provider IDs registered by this pack */
    providers: string[];
    /** Capabilities registered */
    capabilities: string[];
    /** Hooks registered by this pack */
    hooks: string[];
    /** Last error message if status is errored */
    lastError?: string;
    /** When the pack was registered */
    registeredAt: string;
    /** When the status last changed */
    lastStatusChange?: string;
}
/** Information about a registered hook */
export interface HookInfo {
    /** Hook name/type */
    name: string;
    /** Source pack that registered this hook */
    sourcePack: string;
    /** Whether the hook is currently enabled */
    enabled: boolean;
    /** Last execution time */
    lastExecutionAt?: string;
    /** Last execution result */
    lastResult?: 'success' | 'failure';
    /** Execution count */
    executionCount: number;
    /** Failure count */
    failureCount: number;
}
/** Configuration health status */
export interface ConfigHealth {
    /** Overall health status */
    status: 'healthy' | 'warning' | 'error';
    /** List of configuration issues */
    issues: Array<{
        severity: 'warning' | 'error';
        message: string;
        field?: string;
    }>;
    /** Last validation time */
    lastValidatedAt: string;
}
/** Recent extension error */
export interface ExtensionError {
    /** Error ID */
    id: string;
    /** Source pack */
    packId: string;
    /** Error type/code */
    type: string;
    /** Error message */
    message: string;
    /** Stack trace if available */
    stack?: string;
    /** When the error occurred */
    occurredAt: string;
    /** Related entity if applicable */
    relatedEntity?: {
        type: string;
        id: string;
    };
}
/** Full extension diagnostics state */
export interface ExtensionDiagnosticsState {
    /** Registered provider packs */
    packs: ProviderPackInfo[];
    /** Registered hooks */
    hooks: HookInfo[];
    /** Configuration health */
    configHealth: ConfigHealth;
    /** Recent errors */
    recentErrors: ExtensionError[];
    /** go-services runtime version */
    runtimeVersion: string;
    /** Worker status */
    workerStatus: 'running' | 'stopped' | 'degraded';
    /** Last data refresh */
    lastRefreshedAt: string;
}
/** Configuration for the diagnostics panel */
export interface ExtensionDiagnosticsPanelConfig {
    /** Container element or selector */
    container: string | HTMLElement;
    /** Initial state (or will show loading) */
    state?: ExtensionDiagnosticsState;
    /** Callback to refresh diagnostics */
    onRefresh?: () => Promise<ExtensionDiagnosticsState>;
    /** Callback when pack is selected */
    onPackSelect?: (packId: string) => void;
    /** Callback when error is selected */
    onErrorSelect?: (error: ExtensionError) => void;
}
/**
 * Renders extension diagnostics panel.
 */
export declare class ExtensionDiagnosticsPanel {
    private config;
    private container;
    private state;
    private loading;
    constructor(config: ExtensionDiagnosticsPanelConfig);
    /**
     * Initialize the panel.
     */
    init(): void;
    /**
     * Update state and re-render.
     */
    setState(state: ExtensionDiagnosticsState): void;
    /**
     * Refresh diagnostics data.
     */
    refresh(): Promise<void>;
    private render;
    private renderLoading;
    private renderSummaryCard;
    private renderConfigHealthCard;
    private renderErrorsCard;
    private renderPackRow;
    private renderHookRow;
    private renderErrorRow;
    private renderEmptyState;
    private bindEvents;
    private updateRefreshButton;
    private countByStatus;
    private countHookStatus;
    private formatTime;
}
/** Source of state data */
export type StateSource = 'go-services' | 'downstream' | 'mixed';
/** Configuration for state source indicator */
export interface StateSourceIndicatorConfig {
    /** The source of the state */
    source: StateSource;
    /** Optional pack name for downstream state */
    packName?: string;
    /** Whether to show as inline badge or tooltip */
    mode?: 'badge' | 'tooltip';
    /** Additional context */
    context?: string;
}
/**
 * Render a state source indicator to help operators distinguish
 * between go-services primitive state and downstream domain-package state.
 */
export declare function renderStateSourceIndicator(config: StateSourceIndicatorConfig): string;
/**
 * Add state source indicator to a field/section.
 */
export declare function addStateSourceIndicator(container: HTMLElement, config: StateSourceIndicatorConfig): void;
/**
 * Create a legend for state source indicators (for documentation/help).
 */
export declare function renderStateSourceLegend(): string;
//# sourceMappingURL=extension-diagnostics.d.ts.map