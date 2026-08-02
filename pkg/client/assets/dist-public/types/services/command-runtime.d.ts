import { type StructuredError } from '../toast/error-helpers.js';
import type { ToastNotifier } from '../toast/types.js';
export type CommandTransport = 'action' | 'rpc';
export interface CommandDispatchReceipt {
    accepted?: boolean;
    mode?: string;
    commandId?: string;
    dispatchId?: string;
    enqueuedAt?: string;
    correlationId?: string;
}
export interface CommandFeedbackEvent {
    type: string;
    resourceType?: string;
    resourceId?: string;
    tenantId?: string;
    orgId?: string;
    correlationId?: string;
    status?: string;
    message?: string;
    sections?: string[];
    metadata?: Record<string, unknown>;
    reason?: string;
    lastEventId?: string;
    requiresGapReconcile?: boolean;
}
export interface CommandFeedbackAdapter {
    subscribe(listener: (event: CommandFeedbackEvent) => void): () => void;
}
/**
 * Inline status states for command feedback display
 */
export type InlineStatusState = 'submitting' | 'accepted' | 'completed' | 'failed' | 'stale' | 'retry_scheduled';
/**
 * Inline status entry for tracking command progress
 */
export interface InlineStatusEntry {
    correlationId: string;
    commandName: string;
    state: InlineStatusState;
    message?: string;
    section?: string;
    targetSelector?: string;
    participantId?: string;
    timestamp: number;
}
/**
 * Inline status change event
 */
export interface InlineStatusChangeEvent {
    entry: InlineStatusEntry;
    previousState: InlineStatusState | null;
}
/**
 * Inline status listener callback
 */
export type InlineStatusListener = (event: InlineStatusChangeEvent) => void;
export interface CommandFeedbackPendingDetail {
    correlationId: string;
    commandName: string;
    transport: CommandTransport;
    responseMode?: string;
    receipt?: CommandDispatchReceipt;
    refreshSelectors: string[];
    trigger: HTMLElement;
    section?: string;
    participantId?: string;
}
export interface CommandFeedbackReconcileDetail {
    controller: CommandRuntimeController;
    event: CommandFeedbackEvent;
    pending: CommandFeedbackPendingDetail | null;
}
export interface CommandFeedbackConfig {
    adapter: CommandFeedbackAdapter;
    onEvent?: (detail: CommandFeedbackReconcileDetail) => void | Promise<void>;
    onStreamGap?: (detail: CommandFeedbackReconcileDetail) => void | Promise<void>;
}
export interface CommandRuntimeMountConfig {
    mount: HTMLElement;
    apiBasePath: string;
    panelName?: string;
    recordId?: string;
    rpcEndpoint?: string;
    tenantId?: string;
    orgId?: string;
    notifier?: ToastNotifier;
    fetchImpl?: typeof fetch;
    defaultRefreshSelectors?: string[];
    feedback?: CommandFeedbackConfig;
    onBeforeDispatch?: (detail: CommandDispatchDetail) => void;
    onAfterDispatch?: (detail: CommandDispatchDetail) => void;
    onAfterRefresh?: (detail: CommandRefreshDetail) => void;
}
export interface CommandDispatchDetail {
    trigger: HTMLElement;
    form: HTMLFormElement | null;
    commandName: string;
    transport: CommandTransport;
    payload: Record<string, unknown>;
    correlationId: string;
    success: boolean;
    data?: Record<string, unknown>;
    error?: StructuredError;
    receipt?: CommandDispatchReceipt;
    responseMode?: string;
}
export interface CommandRefreshDetail {
    mount: HTMLElement;
    trigger: HTMLElement;
    selectors: string[];
    sourceDocument: Document;
}
export interface CommandManualDispatchConfig {
    trigger?: HTMLElement | null;
    form?: HTMLFormElement | null;
    submitter?: HTMLElement | null;
    commandName: string;
    dispatchName?: string;
    transport?: CommandTransport;
    payload?: Record<string, unknown>;
    successMessage?: string;
    fallbackMessage?: string;
    refreshSelectors?: string[];
    confirmMessage?: string;
    confirmTitle?: string;
    reasonTitle?: string;
    reasonSubject?: string;
    busyTarget?: HTMLElement | null;
    section?: string;
    participantId?: string;
}
export declare class CommandRuntimeController {
    private readonly mount;
    private readonly apiBasePath;
    private readonly panelName;
    private readonly recordId;
    private readonly rpcEndpoint;
    private readonly tenantId;
    private readonly orgId;
    private readonly notifier;
    private readonly fetchImpl;
    private readonly defaultRefreshSelectors;
    private readonly feedback?;
    private readonly onBeforeDispatch?;
    private readonly onAfterDispatch?;
    private readonly onAfterRefresh?;
    private submitHandler;
    private clickHandler;
    private feedbackUnsubscribe;
    private readonly pendingFeedback;
    private readonly inlineStatus;
    private readonly inlineStatusListeners;
    constructor(config: CommandRuntimeMountConfig);
    init(): void;
    destroy(): void;
    /**
     * Subscribe to inline status changes.
     * Returns an unsubscribe function.
     */
    subscribeToInlineStatus(listener: InlineStatusListener): () => void;
    /**
     * Get current inline status for a correlation ID
     */
    getInlineStatus(correlationId: string): InlineStatusEntry | null;
    /**
     * Get all current inline status entries
     */
    getAllInlineStatus(): InlineStatusEntry[];
    /**
     * Clear inline status for a correlation ID
     */
    clearInlineStatus(correlationId: string): void;
    /**
     * Clear all inline statuses
     */
    clearAllInlineStatus(): void;
    /**
     * Mark stale statuses (e.g., after stream gap)
     */
    markStaleStatuses(): void;
    private setInlineStatus;
    private emitInlineStatusChange;
    private updateInlineStatusFromDispatch;
    private resolveSection;
    private resolveParticipantId;
    private scopePayload;
    private buildSpec;
    private buildManualSpec;
    dispatch(config: CommandManualDispatchConfig): Promise<CommandDispatchDetail>;
    private handleCommand;
    private executeSpec;
    private shouldWaitForFeedback;
    private handleFeedbackEvent;
    private dispatchAction;
    private dispatchRPC;
    refreshSelectors(selectors: string[], trigger?: HTMLElement | null): Promise<Document | null>;
    private refreshFragments;
    private replaceFragment;
}
export declare function initCommandRuntime(config: CommandRuntimeMountConfig): CommandRuntimeController | null;
//# sourceMappingURL=command-runtime.d.ts.map