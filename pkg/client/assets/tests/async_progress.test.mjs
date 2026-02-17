/**
 * Tests for Async Progress component (TX-049)
 *
 * Tests job progress tracking, polling, resume capability,
 * and completion/failure states.
 */
import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ============================================================================
// Mock Implementations
// ============================================================================

/**
 * @typedef {'running' | 'completed' | 'failed'} JobStatus
 * @typedef {'idle' | 'polling' | 'paused' | 'stopped'} PollingState
 */

/**
 * Mock localStorage
 */
class MockLocalStorage {
  constructor() {
    this.store = new Map();
  }

  getItem(key) {
    return this.store.get(key) || null;
  }

  setItem(key, value) {
    this.store.set(key, value);
  }

  removeItem(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

const DEFAULT_LABELS = {
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
const DEFAULT_MAX_POLL_ATTEMPTS = 300;
const DEFAULT_STORAGE_KEY_PREFIX = 'async_job_';

/**
 * Mock AsyncProgress class (reimplemented for testing)
 */
class AsyncProgress {
  constructor(config = {}) {
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
    this.container = null;
    this.job = null;
    this.pollingState = 'idle';
    this.pollTimer = null;
    this.pollAttempts = 0;
    this.startTime = null;
    this.error = null;

    // Use mock localStorage for testing
    this.storage = config._mockStorage || new MockLocalStorage();
  }

  mount(container) {
    this.container = container;
  }

  unmount() {
    this.stopPolling();
    this.container = null;
  }

  getJob() {
    return this.job;
  }

  getPollingState() {
    return this.pollingState;
  }

  setJob(job) {
    this.job = job;
    this.startTime = new Date();
    this.pollAttempts = 0;
    this.error = null;
    this.persistJob(job);

    if (this.config.autoStart && job.status === 'running') {
      this.pollingState = 'polling';
    }
  }

  startFromEnvelope(envelope) {
    this.setJob(envelope);
  }

  resumeFromStorage(kind) {
    const persisted = this.loadPersistedJob(kind);
    if (!persisted) {
      return false;
    }

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
      this.pollingState = 'polling';
    }

    return true;
  }

  hasPersistedJob(kind) {
    return this.loadPersistedJob(kind) !== null;
  }

  startPolling() {
    if (!this.job) return;
    if (this.pollingState === 'polling') return;

    this.pollingState = 'polling';
    this.error = null;
  }

  pausePolling() {
    if (this.pollingState !== 'polling') return;

    this.pollingState = 'paused';
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  stopPolling() {
    this.pollingState = 'stopped';
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    this.clearPersistedJob(this.job?.kind || '');
  }

  resumePolling() {
    if (this.pollingState !== 'paused') return;

    this.pollingState = 'polling';
  }

  reset() {
    this.stopPolling();
    this.job = null;
    this.pollingState = 'idle';
    this.pollAttempts = 0;
    this.startTime = null;
    this.error = null;
  }

  retry() {
    if (!this.job) return;
    this.pollAttempts = 0;
    this.error = null;
    this.startPolling();
  }

  // Simulate poll response handling
  handlePollResponse(data) {
    this.job = data;
    this.updatePersistedJob(data);
    this.config.onProgress?.(data);

    if (data.status === 'completed') {
      this.pollingState = 'stopped';
      this.clearPersistedJob(data.kind);
      this.config.onComplete?.(data);
      return;
    }

    if (data.status === 'failed') {
      this.pollingState = 'stopped';
      this.clearPersistedJob(data.kind);
      this.config.onFailed?.(data);
      return;
    }

    // Check max attempts
    this.pollAttempts++;
    if (this.pollAttempts >= this.config.maxPollAttempts) {
      this.error = new Error('Max polling attempts reached');
      this.pollingState = 'stopped';
      this.config.onError?.(this.error);
    }
  }

  handlePollError(error) {
    this.error = error;
    this.pollingState = 'paused';
    this.config.onError?.(error);
  }

  // Storage helpers
  getStorageKey(kind) {
    return `${this.config.storageKeyPrefix}${kind}`;
  }

  persistJob(job) {
    const state = {
      jobId: job.id,
      kind: job.kind,
      pollEndpoint: job.poll_endpoint,
      startedAt: job.created_at,
    };
    this.storage.setItem(this.getStorageKey(job.kind), JSON.stringify(state));
  }

  updatePersistedJob(job) {
    const key = this.getStorageKey(job.kind);
    const existing = this.storage.getItem(key);
    if (existing) {
      const state = JSON.parse(existing);
      state.lastPolledAt = new Date().toISOString();
      this.storage.setItem(key, JSON.stringify(state));
    }
  }

  clearPersistedJob(kind) {
    this.storage.removeItem(this.getStorageKey(kind));
  }

  loadPersistedJob(kind) {
    const data = this.storage.getItem(this.getStorageKey(kind));
    if (!data) return null;
    return JSON.parse(data);
  }

  getElapsedTime() {
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
}

/**
 * Helper to create mock job envelope
 */
function createMockJobEnvelope(overrides = {}) {
  return {
    id: 'txex_job_123',
    kind: 'import',
    status: 'running',
    poll_endpoint: '/admin/api/translations/jobs/txex_job_123',
    progress: {
      processed: 0,
      succeeded: 0,
      failed: 0,
      total: 100,
    },
    created_at: '2024-01-01T12:00:00Z',
    updated_at: '2024-01-01T12:00:00Z',
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('AsyncProgress', () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const component = new AsyncProgress({ _mockStorage: mockStorage });

      assert.equal(component.config.pollInterval, 2000);
      assert.equal(component.config.maxPollAttempts, 300);
      assert.equal(component.config.autoStart, true);
      assert.equal(component.config.labels.title, 'Job Progress');
    });

    it('should allow custom config', () => {
      const component = new AsyncProgress({
        _mockStorage: mockStorage,
        pollInterval: 5000,
        maxPollAttempts: 100,
        autoStart: false,
        labels: {
          title: 'Custom Progress',
        },
      });

      assert.equal(component.config.pollInterval, 5000);
      assert.equal(component.config.maxPollAttempts, 100);
      assert.equal(component.config.autoStart, false);
      assert.equal(component.config.labels.title, 'Custom Progress');
      // Default labels should still be present
      assert.equal(component.config.labels.running, 'In Progress');
    });

    it('should start in idle state', () => {
      const component = new AsyncProgress({ _mockStorage: mockStorage });

      assert.equal(component.getPollingState(), 'idle');
      assert.equal(component.getJob(), null);
    });
  });

  describe('setJob', () => {
    it('should set job and persist to storage', () => {
      const component = new AsyncProgress({ _mockStorage: mockStorage });
      const job = createMockJobEnvelope();

      component.setJob(job);

      assert.equal(component.getJob(), job);
      assert.notEqual(component.startTime, null);

      // Check persisted
      const persisted = mockStorage.getItem('async_job_import');
      assert.notEqual(persisted, null);
      const parsed = JSON.parse(persisted);
      assert.equal(parsed.jobId, job.id);
    });

    it('should auto-start polling if autoStart is true and job is running', () => {
      const component = new AsyncProgress({
        _mockStorage: mockStorage,
        autoStart: true,
      });
      const job = createMockJobEnvelope({ status: 'running' });

      component.setJob(job);

      assert.equal(component.getPollingState(), 'polling');
    });

    it('should not auto-start polling if job is not running', () => {
      const component = new AsyncProgress({
        _mockStorage: mockStorage,
        autoStart: true,
      });
      const job = createMockJobEnvelope({ status: 'completed' });

      component.setJob(job);

      // Should remain idle since job is already completed
      assert.equal(component.getPollingState(), 'idle');
    });
  });

  describe('polling state transitions', () => {
    it('should transition from idle to polling on startPolling', () => {
      const component = new AsyncProgress({ _mockStorage: mockStorage });
      const job = createMockJobEnvelope();

      component.setJob(job);
      component.pollingState = 'idle';
      component.startPolling();

      assert.equal(component.getPollingState(), 'polling');
    });

    it('should transition from polling to paused on pausePolling', () => {
      const component = new AsyncProgress({ _mockStorage: mockStorage });
      const job = createMockJobEnvelope();

      component.setJob(job);
      component.startPolling();
      component.pausePolling();

      assert.equal(component.getPollingState(), 'paused');
    });

    it('should transition from paused to polling on resumePolling', () => {
      const component = new AsyncProgress({ _mockStorage: mockStorage });
      const job = createMockJobEnvelope();

      component.setJob(job);
      component.startPolling();
      component.pausePolling();
      component.resumePolling();

      assert.equal(component.getPollingState(), 'polling');
    });

    it('should transition to stopped on stopPolling', () => {
      const component = new AsyncProgress({ _mockStorage: mockStorage });
      const job = createMockJobEnvelope();

      component.setJob(job);
      component.startPolling();
      component.stopPolling();

      assert.equal(component.getPollingState(), 'stopped');
    });

    it('should not resume from non-paused state', () => {
      const component = new AsyncProgress({ _mockStorage: mockStorage });
      const job = createMockJobEnvelope();

      component.setJob(job);
      component.pollingState = 'idle';
      component.resumePolling();

      // Should remain idle
      assert.equal(component.getPollingState(), 'idle');
    });
  });

  describe('handlePollResponse', () => {
    it('should update job on progress response', () => {
      let progressCalled = false;
      const component = new AsyncProgress({
        _mockStorage: mockStorage,
        onProgress: () => {
          progressCalled = true;
        },
      });

      const job = createMockJobEnvelope();
      component.setJob(job);
      component.startPolling();

      const updatedJob = createMockJobEnvelope({
        progress: { processed: 50, succeeded: 48, failed: 2, total: 100 },
      });

      component.handlePollResponse(updatedJob);

      assert.equal(component.getJob().progress.processed, 50);
      assert.equal(progressCalled, true);
    });

    it('should stop polling and call onComplete when completed', () => {
      let completeCalled = false;
      const component = new AsyncProgress({
        _mockStorage: mockStorage,
        onComplete: () => {
          completeCalled = true;
        },
      });

      const job = createMockJobEnvelope();
      component.setJob(job);
      component.startPolling();

      const completedJob = createMockJobEnvelope({
        status: 'completed',
        progress: { processed: 100, succeeded: 100, failed: 0, total: 100 },
      });

      component.handlePollResponse(completedJob);

      assert.equal(component.getPollingState(), 'stopped');
      assert.equal(completeCalled, true);
    });

    it('should stop polling and call onFailed when failed', () => {
      let failedCalled = false;
      const component = new AsyncProgress({
        _mockStorage: mockStorage,
        onFailed: () => {
          failedCalled = true;
        },
      });

      const job = createMockJobEnvelope();
      component.setJob(job);
      component.startPolling();

      const failedJob = createMockJobEnvelope({
        status: 'failed',
        error: 'Something went wrong',
      });

      component.handlePollResponse(failedJob);

      assert.equal(component.getPollingState(), 'stopped');
      assert.equal(failedCalled, true);
    });

    it('should clear persisted job when completed', () => {
      const component = new AsyncProgress({ _mockStorage: mockStorage });
      const job = createMockJobEnvelope();

      component.setJob(job);
      assert.notEqual(mockStorage.getItem('async_job_import'), null);

      const completedJob = createMockJobEnvelope({ status: 'completed' });
      component.handlePollResponse(completedJob);

      assert.equal(mockStorage.getItem('async_job_import'), null);
    });

    it('should stop on max poll attempts', () => {
      let errorCalled = false;
      const component = new AsyncProgress({
        _mockStorage: mockStorage,
        maxPollAttempts: 3,
        onError: () => {
          errorCalled = true;
        },
      });

      const job = createMockJobEnvelope();
      component.setJob(job);
      component.startPolling();
      component.pollAttempts = 2; // Already at 2

      const runningJob = createMockJobEnvelope({ status: 'running' });
      component.handlePollResponse(runningJob);

      assert.equal(component.getPollingState(), 'stopped');
      assert.notEqual(component.error, null);
      assert.equal(errorCalled, true);
    });
  });

  describe('handlePollError', () => {
    it('should pause polling and set error', () => {
      let errorCalled = false;
      const component = new AsyncProgress({
        _mockStorage: mockStorage,
        onError: () => {
          errorCalled = true;
        },
      });

      const job = createMockJobEnvelope();
      component.setJob(job);
      component.startPolling();

      const error = new Error('Network error');
      component.handlePollError(error);

      assert.equal(component.getPollingState(), 'paused');
      assert.equal(component.error, error);
      assert.equal(errorCalled, true);
    });
  });

  describe('resume from storage', () => {
    it('should resume job from storage', () => {
      const component = new AsyncProgress({ _mockStorage: mockStorage });

      // Persist a job
      const persistedState = {
        jobId: 'txex_job_456',
        kind: 'export',
        pollEndpoint: '/admin/api/translations/jobs/txex_job_456',
        startedAt: '2024-01-01T11:00:00Z',
      };
      mockStorage.setItem('async_job_export', JSON.stringify(persistedState));

      const result = component.resumeFromStorage('export');

      assert.equal(result, true);
      assert.notEqual(component.getJob(), null);
      assert.equal(component.getJob().id, 'txex_job_456');
      assert.equal(component.getPollingState(), 'polling');
    });

    it('should return false if no persisted job', () => {
      const component = new AsyncProgress({ _mockStorage: mockStorage });

      const result = component.resumeFromStorage('nonexistent');

      assert.equal(result, false);
      assert.equal(component.getJob(), null);
    });

    it('should check for persisted job existence', () => {
      const component = new AsyncProgress({ _mockStorage: mockStorage });

      assert.equal(component.hasPersistedJob('export'), false);

      mockStorage.setItem('async_job_export', JSON.stringify({ jobId: 'test' }));

      assert.equal(component.hasPersistedJob('export'), true);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      const component = new AsyncProgress({ _mockStorage: mockStorage });
      const job = createMockJobEnvelope();

      component.setJob(job);
      component.startPolling();
      component.error = new Error('test');

      component.reset();

      assert.equal(component.getJob(), null);
      assert.equal(component.getPollingState(), 'idle');
      assert.equal(component.pollAttempts, 0);
      assert.equal(component.startTime, null);
      assert.equal(component.error, null);
    });
  });

  describe('retry', () => {
    it('should reset attempts and start polling', () => {
      const component = new AsyncProgress({ _mockStorage: mockStorage });
      const job = createMockJobEnvelope();

      component.setJob(job);
      component.pollAttempts = 100;
      component.error = new Error('previous error');
      component.pollingState = 'paused';

      component.retry();

      assert.equal(component.pollAttempts, 0);
      assert.equal(component.error, null);
      assert.equal(component.getPollingState(), 'polling');
    });

    it('should do nothing if no job', () => {
      const component = new AsyncProgress({ _mockStorage: mockStorage });

      component.retry();

      assert.equal(component.getPollingState(), 'idle');
    });
  });

  describe('elapsed time', () => {
    it('should return null if no start time', () => {
      const component = new AsyncProgress({ _mockStorage: mockStorage });

      assert.equal(component.getElapsedTime(), null);
    });

    it('should format seconds correctly', () => {
      const component = new AsyncProgress({ _mockStorage: mockStorage });
      component.startTime = new Date(Date.now() - 45000); // 45 seconds ago

      const elapsed = component.getElapsedTime();
      assert.ok(elapsed.endsWith('s'));
    });

    it('should format minutes correctly', () => {
      const component = new AsyncProgress({ _mockStorage: mockStorage });
      component.startTime = new Date(Date.now() - 125000); // 2m 5s ago

      const elapsed = component.getElapsedTime();
      assert.ok(elapsed.includes('m'));
    });

    it('should format hours correctly', () => {
      const component = new AsyncProgress({ _mockStorage: mockStorage });
      component.startTime = new Date(Date.now() - 3720000); // 1h 2m ago

      const elapsed = component.getElapsedTime();
      assert.ok(elapsed.includes('h'));
    });
  });

  describe('mount/unmount', () => {
    it('should track mounted container', () => {
      const component = new AsyncProgress({ _mockStorage: mockStorage });
      const container = {};

      component.mount(container);
      assert.equal(component.container, container);

      component.unmount();
      assert.equal(component.container, null);
    });

    it('should stop polling on unmount', () => {
      const component = new AsyncProgress({ _mockStorage: mockStorage });
      const job = createMockJobEnvelope();

      component.setJob(job);
      component.startPolling();
      component.mount({});

      assert.equal(component.getPollingState(), 'polling');

      component.unmount();

      assert.equal(component.getPollingState(), 'stopped');
    });
  });
});

describe('Storage Persistence', () => {
  it('should use custom storage key prefix', () => {
    const mockStorage = new MockLocalStorage();
    const component = new AsyncProgress({
      _mockStorage: mockStorage,
      storageKeyPrefix: 'custom_prefix_',
    });

    const job = createMockJobEnvelope({ kind: 'export' });
    component.setJob(job);

    assert.notEqual(mockStorage.getItem('custom_prefix_export'), null);
    assert.equal(mockStorage.getItem('async_job_export'), null);
  });

  it('should update lastPolledAt on poll response', () => {
    const mockStorage = new MockLocalStorage();
    const component = new AsyncProgress({ _mockStorage: mockStorage });

    const job = createMockJobEnvelope();
    component.setJob(job);

    const persisted1 = JSON.parse(mockStorage.getItem('async_job_import'));
    assert.equal(persisted1.lastPolledAt, undefined);

    component.handlePollResponse(createMockJobEnvelope({
      progress: { processed: 10, succeeded: 10, failed: 0, total: 100 },
    }));

    const persisted2 = JSON.parse(mockStorage.getItem('async_job_import'));
    assert.notEqual(persisted2.lastPolledAt, undefined);
  });
});

describe('Conflict Summary Handling', () => {
  it('should handle job with conflict summary', () => {
    const mockStorage = new MockLocalStorage();
    const component = new AsyncProgress({ _mockStorage: mockStorage });

    const job = createMockJobEnvelope({
      conflict_summary: {
        total: 5,
        by_type: {
          source_hash_mismatch: 3,
          entity_not_found: 2,
        },
      },
    });

    component.setJob(job);

    assert.equal(component.getJob().conflict_summary.total, 5);
    assert.equal(component.getJob().conflict_summary.by_type.source_hash_mismatch, 3);
  });
});
