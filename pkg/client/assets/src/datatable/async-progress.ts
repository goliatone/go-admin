/**
 * Async Progress UI Component (Phase 4 - TX-049)
 *
 * Provides async job progress tracking with:
 * - Status polling with configurable interval
 * - Progress bar based on counters
 * - Resume capability (localStorage persistence)
 * - Completion/failure states
 */

import { renderVocabularyStatusBadge, getStatusCssClass } from './translation-status-vocabulary.js';

// ============================================================================
// Types
// ============================================================================

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

const DEFAULT_LABELS: AsyncProgressLabels = {
  title: 'Job Progress',
  running: 'In Progress',
  completed: 'Completed',
  failed: 'Failed',
  processed: 'Processed',
  succeeded: 'Succeeded',
  failedCount: 'Failed',
  resume: 'Resume',
  cancel: 'Cancel',
  retry: 'Retry',
  dismiss: 'Dismiss',
  noActiveJob: 'No active job',
  pollingPaused: 'Polling paused',
  pollingStopped: 'Polling stopped',
  jobId: 'Job ID',
  startedAt: 'Started',
  elapsed: 'Elapsed',
  conflicts: 'Conflicts',
};

const DEFAULT_POLL_INTERVAL = 2000;
const DEFAULT_MAX_POLL_ATTEMPTS = 300; // 10 minutes at 2s interval
const DEFAULT_STORAGE_KEY_PREFIX = 'async_job_';

/**
 * Resolved config with all labels
 */
interface ResolvedAsyncProgressConfig {
  storageKeyPrefix: string;
  pollInterval: number;
  maxPollAttempts: number;
  onComplete?: (job: AsyncJobEnvelope) => void;
  onFailed?: (job: AsyncJobEnvelope) => void;
  onError?: (error: Error) => void;
  onProgress?: (job: AsyncJobEnvelope) => void;
  labels: AsyncProgressLabels;
  autoStart: boolean;
}

// ============================================================================
// AsyncProgress Class
// ============================================================================

/**
 * Async Progress UI component
 */
export class AsyncProgress {
  private config: ResolvedAsyncProgressConfig;
  private container: HTMLElement | null = null;
  private job: AsyncJobEnvelope | null = null;
  private pollingState: PollingState = 'idle';
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollAttempts: number = 0;
  private startTime: Date | null = null;
  private error: Error | null = null;

  constructor(config: AsyncProgressConfig = {}) {
    const labels = { ...DEFAULT_LABELS, ...(config.labels || {}) };
    this.config = {
      storageKeyPrefix: config.storageKeyPrefix || DEFAULT_STORAGE_KEY_PREFIX,
      pollInterval: config.pollInterval || DEFAULT_POLL_INTERVAL,
      maxPollAttempts: config.maxPollAttempts || DEFAULT_MAX_POLL_ATTEMPTS,
      onComplete: config.onComplete,
      onFailed: config.onFailed,
      onError: config.onError,
      onProgress: config.onProgress,
      labels,
      autoStart: config.autoStart !== false,
    };
  }

  /**
   * Mount the component to a container
   */
  mount(container: HTMLElement): void {
    this.container = container;
    this.render();
  }

  /**
   * Unmount and cleanup
   */
  unmount(): void {
    this.stopPolling();
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.container = null;
  }

  /**
   * Get current job
   */
  getJob(): AsyncJobEnvelope | null {
    return this.job;
  }

  /**
   * Get polling state
   */
  getPollingState(): PollingState {
    return this.pollingState;
  }

  /**
   * Set a new job to track
   */
  setJob(job: AsyncJobEnvelope): void {
    this.job = job;
    this.startTime = new Date();
    this.pollAttempts = 0;
    this.error = null;
    this.persistJob(job);

    if (this.config.autoStart && job.status === 'running') {
      this.startPolling();
    } else {
      this.render();
    }
  }

  /**
   * Start from a job envelope (initial response)
   */
  startFromEnvelope(envelope: AsyncJobEnvelope): void {
    this.setJob(envelope);
  }

  /**
   * Resume tracking a persisted job
   */
  resumeFromStorage(kind: string): boolean {
    const persisted = this.loadPersistedJob(kind);
    if (!persisted) {
      return false;
    }

    // Create minimal job envelope to start polling
    this.job = {
      id: persisted.jobId,
      kind: persisted.kind,
      status: 'running',
      poll_endpoint: persisted.pollEndpoint,
      progress: { processed: 0, succeeded: 0, failed: 0 },
      created_at: persisted.startedAt,
      updated_at: persisted.lastPolledAt || persisted.startedAt,
    };
    this.startTime = new Date(persisted.startedAt);
    this.pollAttempts = 0;
    this.error = null;

    if (this.config.autoStart) {
      this.startPolling();
    }

    return true;
  }

  /**
   * Check if there's a persisted job for a kind
   */
  hasPersistedJob(kind: string): boolean {
    return this.loadPersistedJob(kind) !== null;
  }

  /**
   * Start polling
   */
  startPolling(): void {
    if (!this.job) return;
    if (this.pollingState === 'polling') return;

    this.pollingState = 'polling';
    this.error = null;
    this.schedulePoll();
    this.render();
  }

  /**
   * Pause polling (can be resumed)
   */
  pausePolling(): void {
    if (this.pollingState !== 'polling') return;

    this.pollingState = 'paused';
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    this.render();
  }

  /**
   * Stop polling (cannot be resumed without new setJob)
   */
  stopPolling(): void {
    this.pollingState = 'stopped';
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    this.clearPersistedJob(this.job?.kind || '');
    this.render();
  }

  /**
   * Resume paused polling
   */
  resumePolling(): void {
    if (this.pollingState !== 'paused') return;

    this.pollingState = 'polling';
    this.schedulePoll();
    this.render();
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.stopPolling();
    this.job = null;
    this.pollingState = 'idle';
    this.pollAttempts = 0;
    this.startTime = null;
    this.error = null;
    this.render();
  }

  /**
   * Retry after failure
   */
  retry(): void {
    if (!this.job) return;
    this.pollAttempts = 0;
    this.error = null;
    this.startPolling();
  }

  private schedulePoll(): void {
    if (this.pollingState !== 'polling') return;

    this.pollTimer = setTimeout(() => {
      this.poll();
    }, this.config.pollInterval);
  }

  private async poll(): Promise<void> {
    if (!this.job || this.pollingState !== 'polling') return;

    this.pollAttempts++;

    try {
      const response = await fetch(this.job.poll_endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Poll failed: ${response.status}`);
      }

      const data = await response.json();
      this.handlePollResponse(data);
    } catch (err) {
      this.handlePollError(err instanceof Error ? err : new Error(String(err)));
    }
  }

  private handlePollResponse(data: AsyncJobEnvelope): void {
    this.job = data;
    this.updatePersistedJob(data);
    this.config.onProgress?.(data);

    if (data.status === 'completed') {
      this.pollingState = 'stopped';
      this.clearPersistedJob(data.kind);
      this.config.onComplete?.(data);
      this.render();
      return;
    }

    if (data.status === 'failed') {
      this.pollingState = 'stopped';
      this.clearPersistedJob(data.kind);
      this.config.onFailed?.(data);
      this.render();
      return;
    }

    // Check max attempts
    if (this.pollAttempts >= this.config.maxPollAttempts) {
      this.error = new Error('Max polling attempts reached');
      this.pollingState = 'stopped';
      this.config.onError?.(this.error);
      this.render();
      return;
    }

    // Continue polling
    this.render();
    this.schedulePoll();
  }

  private handlePollError(error: Error): void {
    this.error = error;
    this.pollingState = 'paused'; // Pause on error, allow retry
    this.config.onError?.(error);
    this.render();
  }

  // Storage helpers
  private getStorageKey(kind: string): string {
    return `${this.config.storageKeyPrefix}${kind}`;
  }

  private persistJob(job: AsyncJobEnvelope): void {
    try {
      const state: PersistedJobState = {
        jobId: job.id,
        kind: job.kind,
        pollEndpoint: job.poll_endpoint,
        startedAt: job.created_at,
      };
      localStorage.setItem(this.getStorageKey(job.kind), JSON.stringify(state));
    } catch {
      // localStorage not available
    }
  }

  private updatePersistedJob(job: AsyncJobEnvelope): void {
    try {
      const key = this.getStorageKey(job.kind);
      const existing = localStorage.getItem(key);
      if (existing) {
        const state: PersistedJobState = JSON.parse(existing);
        state.lastPolledAt = new Date().toISOString();
        localStorage.setItem(key, JSON.stringify(state));
      }
    } catch {
      // localStorage not available
    }
  }

  private clearPersistedJob(kind: string): void {
    try {
      localStorage.removeItem(this.getStorageKey(kind));
    } catch {
      // localStorage not available
    }
  }

  private loadPersistedJob(kind: string): PersistedJobState | null {
    try {
      const data = localStorage.getItem(this.getStorageKey(kind));
      if (!data) return null;
      return JSON.parse(data) as PersistedJobState;
    } catch {
      return null;
    }
  }

  // Rendering
  private render(): void {
    if (!this.container) return;

    const labels = this.config.labels;

    this.container.innerHTML = `
      <div class="async-progress" role="region" aria-label="${escapeHtml(labels.title)}">
        ${this.renderHeader()}
        ${this.renderContent()}
        ${this.renderFooter()}
      </div>
    `;

    this.attachEventListeners();
  }

  private renderHeader(): string {
    const labels = this.config.labels;

    if (!this.job) {
      return `
        <div class="progress-header idle">
          <h4 class="progress-title">${escapeHtml(labels.title)}</h4>
          <span class="progress-status">${escapeHtml(labels.noActiveJob)}</span>
        </div>
      `;
    }

    const statusClass = getStatusCssClass(this.job.status, 'exchange');
    const statusLabel = this.getStatusLabel();
    const statusHtml = this.pollingState === 'paused'
      ? `<span class="progress-status ${statusClass}">${escapeHtml(statusLabel)}</span>`
      : renderVocabularyStatusBadge(this.job.status, { domain: 'exchange', size: 'sm' });

    return `
      <div class="progress-header ${statusClass}">
        <h4 class="progress-title">${escapeHtml(labels.title)}</h4>
        ${statusHtml}
      </div>
    `;
  }

  private renderContent(): string {
    if (!this.job) {
      return '';
    }

    const labels = this.config.labels;
    const progress = this.job.progress;
    const total = progress.total || (progress.processed + 1); // Estimate if not provided
    const percentage = progress.total
      ? Math.round((progress.processed / progress.total) * 100)
      : null;

    return `
      <div class="progress-content">
        ${this.renderProgressBar(percentage)}
        <div class="progress-counters">
          <span class="counter processed">
            <span class="counter-label">${escapeHtml(labels.processed)}:</span>
            <span class="counter-value">${progress.processed}${progress.total ? ` / ${progress.total}` : ''}</span>
          </span>
          <span class="counter succeeded">
            <span class="counter-label">${escapeHtml(labels.succeeded)}:</span>
            <span class="counter-value">${progress.succeeded}</span>
          </span>
          <span class="counter failed">
            <span class="counter-label">${escapeHtml(labels.failedCount)}:</span>
            <span class="counter-value">${progress.failed}</span>
          </span>
        </div>
        ${this.renderJobInfo()}
        ${this.renderConflictSummary()}
        ${this.renderError()}
      </div>
    `;
  }

  private renderProgressBar(percentage: number | null): string {
    if (percentage === null) {
      // Indeterminate progress bar
      return `
        <div class="progress-bar-container">
          <div class="progress-bar indeterminate" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
      `;
    }

    return `
      <div class="progress-bar-container">
        <div class="progress-bar"
             role="progressbar"
             aria-valuenow="${percentage}"
             aria-valuemin="0"
             aria-valuemax="100"
             style="width: ${percentage}%">
        </div>
        <span class="progress-percentage">${percentage}%</span>
      </div>
    `;
  }

  private renderJobInfo(): string {
    if (!this.job) return '';

    const labels = this.config.labels;
    const elapsed = this.getElapsedTime();

    return `
      <div class="progress-info">
        <span class="info-item">
          <span class="info-label">${escapeHtml(labels.jobId)}:</span>
          <code class="info-value">${escapeHtml(this.job.id)}</code>
        </span>
        ${elapsed ? `
          <span class="info-item">
            <span class="info-label">${escapeHtml(labels.elapsed)}:</span>
            <span class="info-value">${escapeHtml(elapsed)}</span>
          </span>
        ` : ''}
      </div>
    `;
  }

  private renderConflictSummary(): string {
    if (!this.job?.conflict_summary || this.job.conflict_summary.total === 0) {
      return '';
    }

    const labels = this.config.labels;
    const summary = this.job.conflict_summary;

    return `
      <div class="progress-conflicts">
        <span class="conflicts-header">
          <span class="conflicts-label">${escapeHtml(labels.conflicts)}:</span>
          <span class="conflicts-count">${summary.total}</span>
        </span>
        <div class="conflicts-by-type">
          ${Object.entries(summary.by_type)
            .map(([type, count]) => `
              <span class="conflict-type">
                <span class="type-name">${escapeHtml(type)}:</span>
                <span class="type-count">${count}</span>
              </span>
            `)
            .join('')}
        </div>
      </div>
    `;
  }

  private renderError(): string {
    const errorMessage = this.error?.message || this.job?.error;
    if (!errorMessage) return '';

    return `
      <div class="progress-error" role="alert">
        <span class="error-message">${escapeHtml(errorMessage)}</span>
      </div>
    `;
  }

  private renderFooter(): string {
    const labels = this.config.labels;
    const buttons: string[] = [];

    if (this.pollingState === 'paused') {
      buttons.push(`<button type="button" class="resume-btn">${escapeHtml(labels.resume)}</button>`);
    }

    if (this.pollingState === 'polling') {
      buttons.push(`<button type="button" class="cancel-btn">${escapeHtml(labels.cancel)}</button>`);
    }

    if (this.error || this.job?.status === 'failed') {
      buttons.push(`<button type="button" class="retry-btn">${escapeHtml(labels.retry)}</button>`);
    }

    if (this.job?.status === 'completed' || this.job?.status === 'failed') {
      buttons.push(`<button type="button" class="dismiss-btn">${escapeHtml(labels.dismiss)}</button>`);
    }

    if (buttons.length === 0) {
      return '';
    }

    return `
      <div class="progress-footer">
        ${buttons.join('')}
      </div>
    `;
  }

  private getStatusLabel(): string {
    const labels = this.config.labels;

    if (this.pollingState === 'paused') {
      return labels.pollingPaused;
    }
    if (this.pollingState === 'stopped' && !this.job?.status) {
      return labels.pollingStopped;
    }

    switch (this.job?.status) {
      case 'running':
        return labels.running;
      case 'completed':
        return labels.completed;
      case 'failed':
        return labels.failed;
      default:
        return '';
    }
  }

  private getElapsedTime(): string | null {
    if (!this.startTime) return null;

    const now = new Date();
    const elapsed = now.getTime() - this.startTime.getTime();
    const seconds = Math.floor(elapsed / 1000);

    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes < 60) {
      return `${minutes}m ${remainingSeconds}s`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return `${hours}h ${remainingMinutes}m`;
  }

  private attachEventListeners(): void {
    if (!this.container) return;

    const resumeBtn = this.container.querySelector('.resume-btn');
    resumeBtn?.addEventListener('click', () => this.resumePolling());

    const cancelBtn = this.container.querySelector('.cancel-btn');
    cancelBtn?.addEventListener('click', () => this.stopPolling());

    const retryBtn = this.container.querySelector('.retry-btn');
    retryBtn?.addEventListener('click', () => this.retry());

    const dismissBtn = this.container.querySelector('.dismiss-btn');
    dismissBtn?.addEventListener('click', () => this.reset());
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Local getStatusClass removed - now using shared getStatusCssClass from translation-status-vocabulary.ts (TX-053)

// ============================================================================
// CSS Styles
// ============================================================================

/**
 * Get CSS styles for async progress component
 */
export function getAsyncProgressStyles(): string {
  return `
    /* Async Progress Styles */
    .async-progress {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .progress-title {
      font-size: 1rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }

    .progress-status {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: 9999px;
    }

    .progress-status.status-running {
      background: #dbeafe;
      color: #2563eb;
    }

    .progress-status.status-completed {
      background: #d1fae5;
      color: #059669;
    }

    .progress-status.status-failed {
      background: #fee2e2;
      color: #dc2626;
    }

    .progress-content {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    /* Progress Bar */
    .progress-bar-container {
      position: relative;
      height: 8px;
      background: #e5e7eb;
      border-radius: 9999px;
      overflow: hidden;
    }

    .progress-bar {
      height: 100%;
      background: #2563eb;
      border-radius: 9999px;
      transition: width 0.3s ease;
    }

    .progress-bar.indeterminate {
      width: 30%;
      animation: progress-indeterminate 1.5s infinite ease-in-out;
    }

    @keyframes progress-indeterminate {
      0% { transform: translateX(-100%); }
      50% { transform: translateX(200%); }
      100% { transform: translateX(-100%); }
    }

    .progress-percentage {
      position: absolute;
      right: 0;
      top: 12px;
      font-size: 0.75rem;
      color: #6b7280;
    }

    /* Counters */
    .progress-counters {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .counter {
      display: flex;
      gap: 0.25rem;
      font-size: 0.875rem;
    }

    .counter-label {
      color: #6b7280;
    }

    .counter-value {
      font-weight: 500;
      color: #1f2937;
    }

    .counter.succeeded .counter-value {
      color: #059669;
    }

    .counter.failed .counter-value {
      color: #dc2626;
    }

    /* Job Info */
    .progress-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding-top: 0.5rem;
      border-top: 1px solid #f3f4f6;
    }

    .info-item {
      display: flex;
      gap: 0.5rem;
      font-size: 0.75rem;
    }

    .info-label {
      color: #9ca3af;
    }

    .info-value {
      color: #6b7280;
    }

    .info-value code {
      font-family: monospace;
      background: #f3f4f6;
      padding: 0.125rem 0.25rem;
      border-radius: 0.25rem;
    }

    /* Conflicts */
    .progress-conflicts {
      padding: 0.5rem;
      background: #fef3c7;
      border-radius: 0.375rem;
    }

    .conflicts-header {
      display: flex;
      gap: 0.25rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: #92400e;
    }

    .conflicts-by-type {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin-top: 0.25rem;
    }

    .conflict-type {
      font-size: 0.75rem;
      color: #b45309;
    }

    /* Error */
    .progress-error {
      padding: 0.5rem;
      background: #fee2e2;
      border-radius: 0.375rem;
    }

    .progress-error .error-message {
      font-size: 0.875rem;
      color: #dc2626;
    }

    /* Footer */
    .progress-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      padding-top: 0.75rem;
      border-top: 1px solid #e5e7eb;
    }

    .resume-btn,
    .cancel-btn,
    .retry-btn,
    .dismiss-btn {
      padding: 0.375rem 0.75rem;
      font-size: 0.875rem;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .resume-btn,
    .retry-btn {
      background: #2563eb;
      border: none;
      color: white;
    }

    .resume-btn:hover,
    .retry-btn:hover {
      background: #1d4ed8;
    }

    .cancel-btn,
    .dismiss-btn {
      background: white;
      border: 1px solid #d1d5db;
      color: #374151;
    }

    .cancel-btn:hover,
    .dismiss-btn:hover {
      background: #f3f4f6;
    }
  `;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create and mount an async progress component
 */
export function createAsyncProgress(
  container: HTMLElement,
  config?: AsyncProgressConfig
): AsyncProgress {
  const component = new AsyncProgress(config);
  component.mount(container);
  return component;
}

/**
 * Initialize async progress from data attributes
 */
export function initAsyncProgress(container: HTMLElement): AsyncProgress | null {
  const pollInterval = container.dataset.pollInterval
    ? parseInt(container.dataset.pollInterval, 10)
    : undefined;
  const autoStart = container.dataset.autoStart !== 'false';

  return createAsyncProgress(container, {
    pollInterval,
    autoStart,
  });
}

/**
 * Check for and resume any persisted jobs for a kind
 */
export function checkForPersistedJob(
  kind: string,
  config?: AsyncProgressConfig
): AsyncProgress | null {
  const component = new AsyncProgress(config);
  if (component.hasPersistedJob(kind)) {
    return component;
  }
  return null;
}
