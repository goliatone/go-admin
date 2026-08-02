/**
 * Async Progress UI Component (Phase 4 - TX-049)
 *
 * Provides async job progress tracking with:
 * - Status polling with configurable interval
 * - Progress bar based on counters
 * - Resume capability (localStorage persistence)
 * - Completion/failure states
 */
/**
 * Job status from backend
 */
export type JobStatus = 'running' | 'completed' | 'failed';
/**
 * Component polling state
 */
export type PollingState = 'idle' | 'polling' | 'paused' | 'stopped';
/**
 * Progress counters from backend
 */
export interface JobProgress {
    processed: number;
    succeeded: number;
    failed: number;
    total?: number;
}
/**
 * Conflict summary from backend
 */
export interface ConflictSummary {
    total: number;
    by_type: Record<string, number>;
    rows?: Array<{
        index: number;
        type: string;
        message: string;
    }>;
}
/**
 * Async job envelope from backend
 */
export interface AsyncJobEnvelope {
    id: string;
    kind: string;
    status: JobStatus;
    poll_endpoint: string;
    progress: JobProgress;
    created_at: string;
    updated_at: string;
    error?: string;
    result?: Record<string, unknown>;
    conflict_summary?: ConflictSummary;
}
/**
 * Persisted job state for resume capability
 */
export interface PersistedJobState {
    jobId: string;
    kind: string;
    pollEndpoint: string;
    startedAt: string;
    lastPolledAt?: string;
}
/**
 * Progress component configuration
 */
export interface AsyncProgressConfig {
    /** Storage key prefix for persistence */
    storageKeyPrefix?: string;
    /** Polling interval in milliseconds */
    pollInterval?: number;
    /** Maximum polling attempts before giving up */
    maxPollAttempts?: number;
    /** Callback when job completes successfully */
    onComplete?: (job: AsyncJobEnvelope) => void;
    /** Callback when job fails */
    onFailed?: (job: AsyncJobEnvelope) => void;
    /** Callback on polling error */
    onError?: (error: Error) => void;
    /** Callback on each progress update */
    onProgress?: (job: AsyncJobEnvelope) => void;
    /** Custom labels */
    labels?: Partial<AsyncProgressLabels>;
    /** Auto-start polling when job is set */
    autoStart?: boolean;
}
/**
 * Customizable labels
 */
export interface AsyncProgressLabels {
    title: string;
    running: string;
    completed: string;
    failed: string;
    processed: string;
    succeeded: string;
    failedCount: string;
    resume: string;
    cancel: string;
    retry: string;
    dismiss: string;
    noActiveJob: string;
    pollingPaused: string;
    pollingStopped: string;
    jobId: string;
    startedAt: string;
    elapsed: string;
    conflicts: string;
}
/**
 * Async Progress UI component
 */
export declare class AsyncProgress {
    private config;
    private container;
    private job;
    private pollingState;
    private pollTimer;
    private pollAttempts;
    private startTime;
    private error;
    constructor(config?: AsyncProgressConfig);
    /**
     * Mount the component to a container
     */
    mount(container: HTMLElement): void;
    /**
     * Unmount and cleanup
     */
    unmount(): void;
    /**
     * Get current job
     */
    getJob(): AsyncJobEnvelope | null;
    /**
     * Get polling state
     */
    getPollingState(): PollingState;
    /**
     * Set a new job to track
     */
    setJob(job: AsyncJobEnvelope): void;
    /**
     * Start from a job envelope (initial response)
     */
    startFromEnvelope(envelope: AsyncJobEnvelope): void;
    /**
     * Resume tracking a persisted job
     */
    resumeFromStorage(kind: string): boolean;
    /**
     * Check if there's a persisted job for a kind
     */
    hasPersistedJob(kind: string): boolean;
    /**
     * Start polling
     */
    startPolling(): void;
    /**
     * Pause polling (can be resumed)
     */
    pausePolling(): void;
    /**
     * Stop polling (cannot be resumed without new setJob)
     */
    stopPolling(): void;
    /**
     * Resume paused polling
     */
    resumePolling(): void;
    /**
     * Reset to initial state
     */
    reset(): void;
    /**
     * Retry after failure
     */
    retry(): void;
    private schedulePoll;
    private poll;
    private handlePollResponse;
    private handlePollError;
    private getStorageKey;
    private persistJob;
    private updatePersistedJob;
    private clearPersistedJob;
    private loadPersistedJob;
    private render;
    private renderHeader;
    private renderContent;
    private renderProgressBar;
    private renderJobInfo;
    private renderConflictSummary;
    private renderError;
    private renderFooter;
    private getStatusLabel;
    private getElapsedTime;
    private attachEventListeners;
}
/**
 * Get CSS styles for async progress component
 */
export declare function getAsyncProgressStyles(): string;
/**
 * Create and mount an async progress component
 */
export declare function createAsyncProgress(container: HTMLElement, config?: AsyncProgressConfig): AsyncProgress;
/**
 * Initialize async progress from data attributes
 */
export declare function initAsyncProgress(container: HTMLElement): AsyncProgress | null;
/**
 * Check for and resume any persisted jobs for a kind
 */
export declare function checkForPersistedJob(kind: string, config?: AsyncProgressConfig): AsyncProgress | null;
//# sourceMappingURL=async-progress.d.ts.map