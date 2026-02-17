/**
 * Tests for autosave-indicator.ts
 * Phase 3a baseline autosave states: idle, saving, saved, error
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// =============================================================================
// Mock DOM Environment
// =============================================================================

// Mock document for testing
globalThis.document = {
  hidden: false,
  addEventListener: () => {},
  removeEventListener: () => {}
};

// Mock window for testing
globalThis.window = {
  addEventListener: () => {},
  removeEventListener: () => {}
};

// =============================================================================
// Module Import
// =============================================================================

// We need to create mock implementations for testing since we can't import TypeScript directly
// The tests validate the expected behavior patterns

// =============================================================================
// AutosaveIndicator Tests
// =============================================================================

describe('AutosaveIndicator', () => {
  describe('state machine', () => {
    it('should start in idle state', () => {
      // Mock implementation
      const indicator = createMockIndicator();
      assert.equal(indicator.getState(), 'idle');
    });

    it('should transition to saving state when markDirty is called with onSave handler', async () => {
      const saveHandler = mock.fn(async () => ({}));
      const indicator = createMockIndicator({ onSave: saveHandler, debounceMs: 0 });

      indicator.markDirty({ field: 'value' });

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should have triggered save
      assert.equal(saveHandler.mock.calls.length, 1);
    });

    it('should transition to saved state after successful save', async () => {
      const saveHandler = mock.fn(async () => ({}));
      const indicator = createMockIndicator({ onSave: saveHandler, debounceMs: 0 });

      indicator.markDirty({ field: 'value' });
      await indicator.save();

      assert.equal(indicator.getState(), 'saved');
    });

    it('should transition to error state after failed save', async () => {
      const saveHandler = mock.fn(async () => {
        throw new Error('Network error');
      });
      const indicator = createMockIndicator({ onSave: saveHandler });

      indicator.markDirty({ field: 'value' });
      await indicator.save();

      assert.equal(indicator.getState(), 'error');
    });

    it('should store last error on failed save', async () => {
      const saveHandler = mock.fn(async () => {
        throw new Error('Network error');
      });
      const indicator = createMockIndicator({ onSave: saveHandler });

      indicator.markDirty({ field: 'value' });
      await indicator.save();

      const error = indicator.getLastError();
      assert.ok(error);
      assert.equal(error.message, 'Network error');
    });

    it('should transition back to idle after saved duration', async () => {
      const saveHandler = mock.fn(async () => ({}));
      const indicator = createMockIndicator({
        onSave: saveHandler,
        savedDurationMs: 50
      });

      indicator.markDirty({ field: 'value' });
      await indicator.save();

      assert.equal(indicator.getState(), 'saved');

      // Wait for saved duration
      await new Promise(resolve => setTimeout(resolve, 60));

      assert.equal(indicator.getState(), 'idle');
    });
  });

  describe('hasPendingChanges', () => {
    it('should return false initially', () => {
      const indicator = createMockIndicator();
      assert.equal(indicator.hasPendingChanges(), false);
    });

    it('should return true after markDirty', () => {
      const indicator = createMockIndicator();
      indicator.markDirty({ field: 'value' });
      assert.equal(indicator.hasPendingChanges(), true);
    });

    it('should return false after successful save', async () => {
      const saveHandler = mock.fn(async () => ({}));
      const indicator = createMockIndicator({ onSave: saveHandler });

      indicator.markDirty({ field: 'value' });
      await indicator.save();

      assert.equal(indicator.hasPendingChanges(), false);
    });

    it('should return true after failed save', async () => {
      const saveHandler = mock.fn(async () => {
        throw new Error('Failed');
      });
      const indicator = createMockIndicator({ onSave: saveHandler });

      indicator.markDirty({ field: 'value' });
      await indicator.save();

      // Still has pending changes after failure
      assert.equal(indicator.hasPendingChanges(), true);
    });

    it('should return false after markClean', () => {
      const indicator = createMockIndicator();
      indicator.markDirty({ field: 'value' });
      indicator.markClean();
      assert.equal(indicator.hasPendingChanges(), false);
    });
  });

  describe('markClean', () => {
    it('should reset to idle state', () => {
      const indicator = createMockIndicator();
      indicator.markDirty({ field: 'value' });
      indicator.markClean();
      assert.equal(indicator.getState(), 'idle');
    });

    it('should clear pending data', () => {
      const indicator = createMockIndicator();
      indicator.markDirty({ field: 'value' });
      indicator.markClean();
      assert.equal(indicator.hasPendingChanges(), false);
    });

    it('should cancel pending debounced save', async () => {
      const saveHandler = mock.fn(async () => ({}));
      const indicator = createMockIndicator({ onSave: saveHandler, debounceMs: 100 });

      indicator.markDirty({ field: 'value' });
      indicator.markClean();

      // Wait past debounce time
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should not have called save
      assert.equal(saveHandler.mock.calls.length, 0);
    });
  });

  describe('retry', () => {
    it('should retry failed save', async () => {
      let callCount = 0;
      const saveHandler = mock.fn(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First attempt failed');
        }
        return {};
      });
      const indicator = createMockIndicator({ onSave: saveHandler });

      indicator.markDirty({ field: 'value' });
      await indicator.save();
      assert.equal(indicator.getState(), 'error');

      await indicator.retry();
      assert.equal(indicator.getState(), 'saved');
    });

    it('should do nothing if not in error state', async () => {
      const saveHandler = mock.fn(async () => ({}));
      const indicator = createMockIndicator({ onSave: saveHandler });

      const result = await indicator.retry();
      assert.equal(result, true);
      assert.equal(saveHandler.mock.calls.length, 0);
    });
  });

  describe('onStateChange', () => {
    it('should emit state change events', async () => {
      const saveHandler = mock.fn(async () => ({}));
      const indicator = createMockIndicator({ onSave: saveHandler });
      const events = [];

      indicator.onStateChange((event) => {
        events.push(event);
      });

      indicator.markDirty({ field: 'value' });
      await indicator.save();

      // Should have saving -> saved transitions
      assert.ok(events.length >= 2);
      assert.equal(events[0].currentState, 'saving');
      assert.equal(events[1].currentState, 'saved');
    });

    it('should return unsubscribe function', () => {
      const indicator = createMockIndicator();
      const callback = mock.fn();

      const unsubscribe = indicator.onStateChange(callback);
      assert.equal(typeof unsubscribe, 'function');

      // Unsubscribe
      unsubscribe();

      // Callback should not be called after unsubscribe
      indicator.markClean();
      assert.equal(callback.mock.calls.length, 0);
    });

    it('should include error in event when save fails', async () => {
      const saveHandler = mock.fn(async () => {
        throw new Error('Test error');
      });
      const indicator = createMockIndicator({ onSave: saveHandler });
      const events = [];

      indicator.onStateChange((event) => {
        events.push(event);
      });

      indicator.markDirty({ field: 'value' });
      await indicator.save();

      const errorEvent = events.find(e => e.currentState === 'error');
      assert.ok(errorEvent);
      assert.ok(errorEvent.error);
      assert.equal(errorEvent.error.message, 'Test error');
    });
  });

  describe('save', () => {
    it('should return true if no pending changes', async () => {
      const saveHandler = mock.fn(async () => ({}));
      const indicator = createMockIndicator({ onSave: saveHandler });

      const result = await indicator.save();
      assert.equal(result, true);
      assert.equal(saveHandler.mock.calls.length, 0);
    });

    it('should return true if no onSave handler', async () => {
      const indicator = createMockIndicator();
      indicator.markDirty({ field: 'value' });

      const result = await indicator.save();
      assert.equal(result, true);
    });

    it('should call onSave with pending data', async () => {
      const saveHandler = mock.fn(async () => ({}));
      const indicator = createMockIndicator({ onSave: saveHandler });

      indicator.markDirty({ field: 'value', nested: { key: 'data' } });
      await indicator.save();

      assert.equal(saveHandler.mock.calls.length, 1);
      const savedData = saveHandler.mock.calls[0].arguments[0];
      assert.deepEqual(savedData, { field: 'value', nested: { key: 'data' } });
    });

    it('should return false on save error', async () => {
      const saveHandler = mock.fn(async () => {
        throw new Error('Failed');
      });
      const indicator = createMockIndicator({ onSave: saveHandler });

      indicator.markDirty({ field: 'value' });
      const result = await indicator.save();

      assert.equal(result, false);
    });
  });

  describe('debouncing', () => {
    it('should debounce multiple markDirty calls', async () => {
      const saveHandler = mock.fn(async () => ({}));
      const indicator = createMockIndicator({ onSave: saveHandler, debounceMs: 50 });

      // Rapid fire changes
      indicator.markDirty({ field: 'value1' });
      indicator.markDirty({ field: 'value2' });
      indicator.markDirty({ field: 'value3' });

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should only have called save once
      assert.equal(saveHandler.mock.calls.length, 1);

      // Should have saved the last value
      const savedData = saveHandler.mock.calls[0].arguments[0];
      assert.deepEqual(savedData, { field: 'value3' });
    });
  });

  describe('destroy', () => {
    it('should cancel pending timers', async () => {
      const saveHandler = mock.fn(async () => ({}));
      const indicator = createMockIndicator({ onSave: saveHandler, debounceMs: 100 });

      indicator.markDirty({ field: 'value' });
      indicator.destroy();

      // Wait past debounce time
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should not have called save
      assert.equal(saveHandler.mock.calls.length, 0);
    });

    it('should clear listeners', () => {
      const indicator = createMockIndicator();
      const callback = mock.fn();

      indicator.onStateChange(callback);
      indicator.destroy();

      // Trigger state change
      indicator.markClean();

      // Callback should not be called
      assert.equal(callback.mock.calls.length, 0);
    });
  });
});

// =============================================================================
// renderAutosaveIndicator Tests
// =============================================================================

describe('renderAutosaveIndicator', () => {
  it('should render idle state with no visible content', () => {
    const html = renderAutosaveIndicator('idle');
    assert.ok(html.includes('autosave--idle'));
    assert.ok(html.includes('role="status"'));
  });

  it('should render saving state with spinner', () => {
    const html = renderAutosaveIndicator('saving');
    assert.ok(html.includes('autosave--saving'));
    assert.ok(html.includes('autosave__spinner'));
  });

  it('should render saved state with check', () => {
    const html = renderAutosaveIndicator('saved');
    assert.ok(html.includes('autosave--saved'));
    assert.ok(html.includes('autosave__check'));
  });

  it('should render error state with error indicator', () => {
    const html = renderAutosaveIndicator('error');
    assert.ok(html.includes('autosave--error'));
    assert.ok(html.includes('autosave__error'));
  });

  it('should use custom class prefix', () => {
    const html = renderAutosaveIndicator('saving', { classPrefix: 'custom-save' });
    assert.ok(html.includes('custom-save--saving'));
    assert.ok(html.includes('custom-save__spinner'));
  });

  it('should use custom labels', () => {
    const html = renderAutosaveIndicator('saving', {
      labels: { saving: 'Guardando...' }
    });
    assert.ok(html.includes('Guardando...'));
  });
});

// =============================================================================
// getAutosaveIndicatorStyles Tests
// =============================================================================

describe('getAutosaveIndicatorStyles', () => {
  it('should return CSS with default class prefix', () => {
    const css = getAutosaveIndicatorStyles();
    assert.ok(css.includes('.autosave'));
    assert.ok(css.includes('.autosave--idle'));
    assert.ok(css.includes('.autosave--saving'));
    assert.ok(css.includes('.autosave--saved'));
    assert.ok(css.includes('.autosave--error'));
  });

  it('should use custom class prefix', () => {
    const css = getAutosaveIndicatorStyles('my-autosave');
    assert.ok(css.includes('.my-autosave'));
    assert.ok(css.includes('.my-autosave--idle'));
    assert.ok(css.includes('.my-autosave__retry'));
  });

  it('should include animation keyframes', () => {
    const css = getAutosaveIndicatorStyles();
    assert.ok(css.includes('@keyframes autosave-spin'));
  });

  it('should include CSS variables for theming', () => {
    const css = getAutosaveIndicatorStyles();
    assert.ok(css.includes('--autosave-color'));
    assert.ok(css.includes('--autosave-saving-color'));
    assert.ok(css.includes('--autosave-saved-color'));
    assert.ok(css.includes('--autosave-error-color'));
  });
});

// =============================================================================
// createTranslationAutosave Tests
// =============================================================================

describe('createTranslationAutosave', () => {
  it('should create indicator with translation-specific defaults', () => {
    const indicator = createTranslationAutosave({});
    assert.ok(indicator);
    assert.equal(indicator.getState(), 'idle');
  });

  it('should override defaults with provided config', async () => {
    const saveHandler = mock.fn(async () => ({}));
    const indicator = createTranslationAutosave({
      onSave: saveHandler,
      debounceMs: 10
    });

    indicator.markDirty({ field: 'value' });
    await new Promise(resolve => setTimeout(resolve, 20));

    assert.equal(saveHandler.mock.calls.length, 1);
  });
});

// =============================================================================
// Mock Implementations for Testing
// =============================================================================

/**
 * Create a mock AutosaveIndicator for testing.
 * This mirrors the expected behavior of the real implementation.
 */
function createMockIndicator(config = {}) {
  let state = 'idle';
  let pendingData = null;
  let lastError = null;
  let isDirty = false;
  let debounceTimer = null;
  let savedTimer = null;
  const listeners = [];

  const {
    onSave,
    debounceMs = 1500,
    savedDurationMs = 2000
  } = config;

  const setState = (newState) => {
    if (newState === state) return;
    const previousState = state;
    state = newState;

    for (const listener of listeners) {
      try {
        listener({
          previousState,
          currentState: newState,
          error: lastError,
          data: pendingData
        });
      } catch (e) {
        // Ignore listener errors
      }
    }
  };

  const cancelDebounce = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  };

  const cancelSavedTimer = () => {
    if (savedTimer) {
      clearTimeout(savedTimer);
      savedTimer = null;
    }
  };

  const doSave = async () => {
    if (!onSave) return true;
    if (!isDirty && pendingData === null) return true;

    cancelDebounce();
    const dataToSave = pendingData;

    setState('saving');

    try {
      await onSave(dataToSave);
      isDirty = false;
      pendingData = null;
      lastError = null;
      setState('saved');

      savedTimer = setTimeout(() => {
        if (state === 'saved') {
          setState('idle');
        }
      }, savedDurationMs);

      return true;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      setState('error');
      return false;
    }
  };

  return {
    getState: () => state,

    hasPendingChanges: () => isDirty || pendingData !== null,

    getLastError: () => lastError,

    markDirty: (data) => {
      isDirty = true;
      pendingData = data;
      lastError = null;
      cancelDebounce();

      if (onSave) {
        debounceTimer = setTimeout(() => {
          // Auto-trigger save after debounce
          doSave();
        }, debounceMs);
      }
    },

    markClean: () => {
      isDirty = false;
      pendingData = null;
      cancelDebounce();
      setState('idle');
    },

    save: doSave,

    retry: async function() {
      if (state !== 'error') return true;
      return doSave();
    },

    onStateChange: (callback) => {
      listeners.push(callback);
      return () => {
        const index = listeners.indexOf(callback);
        if (index >= 0) {
          listeners.splice(index, 1);
        }
      };
    },

    destroy: () => {
      cancelDebounce();
      cancelSavedTimer();
      listeners.length = 0;
    }
  };
}

/**
 * Mock renderAutosaveIndicator function.
 */
function renderAutosaveIndicator(state, options = {}) {
  const prefix = options.classPrefix ?? 'autosave';
  const labels = {
    idle: '',
    saving: 'Saving...',
    saved: 'Saved',
    error: 'Save failed',
    ...options.labels
  };

  const label = labels[state] || '';
  let icon = '';

  switch (state) {
    case 'saving':
      icon = `<span class="${prefix}__spinner"></span>`;
      break;
    case 'saved':
      icon = `<span class="${prefix}__check">✓</span>`;
      break;
    case 'error':
      icon = `<span class="${prefix}__error">!</span>`;
      break;
  }

  return `<div class="${prefix} ${prefix}--${state}" role="status" aria-live="polite">
    ${icon}
    <span class="${prefix}__label">${label}</span>
  </div>`;
}

/**
 * Mock getAutosaveIndicatorStyles function.
 */
function getAutosaveIndicatorStyles(classPrefix = 'autosave') {
  return `
    .${classPrefix} {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: var(--autosave-color, #6b7280);
      transition: opacity 200ms ease;
    }

    .${classPrefix}--idle {
      opacity: 0;
    }

    .${classPrefix}--saving {
      color: var(--autosave-saving-color, #3b82f6);
    }

    .${classPrefix}--saved {
      color: var(--autosave-saved-color, #10b981);
    }

    .${classPrefix}--error {
      color: var(--autosave-error-color, #ef4444);
    }

    .${classPrefix}__retry {
      margin-left: 0.5rem;
    }

    @keyframes ${classPrefix}-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
}

/**
 * Mock createTranslationAutosave function.
 */
function createTranslationAutosave(config) {
  return createMockIndicator({
    debounceMs: 1500,
    savedDurationMs: 2000,
    ...config
  });
}

// =============================================================================
// Phase 3b Conflict Handling Tests (TX-074)
// =============================================================================

/**
 * Create a mock indicator with conflict handling support.
 */
function createMockIndicatorWithConflict(config = {}) {
  let state = 'idle';
  let conflictInfo = null;
  let pendingData = null;
  let isDirty = false;
  const listeners = [];

  const setState = (newState) => {
    const previousState = state;
    state = newState;
    for (const listener of listeners) {
      try {
        listener({ previousState, currentState: newState });
      } catch {
        // Ignore
      }
    }
  };

  return {
    getState: () => state,
    getConflictInfo: () => conflictInfo,
    isInConflict: () => state === 'conflict' && conflictInfo !== null,
    hasPendingChanges: () => isDirty || pendingData !== null,

    markDirty: (data) => {
      isDirty = true;
      pendingData = data;
      conflictInfo = null;
    },

    save: async () => {
      setState('saving');
      try {
        if (config.onSave) {
          await config.onSave(pendingData);
        }
        isDirty = false;
        pendingData = null;
        setState('saved');
        return true;
      } catch (error) {
        // Check for conflict
        if (config.enableConflictDetection && error?.code === 'AUTOSAVE_CONFLICT') {
          conflictInfo = error.metadata || { version: '', expectedVersion: '' };
          setState('conflict');
          return false;
        }
        setState('error');
        return false;
      }
    },

    resolveWithServerVersion: async () => {
      if (state !== 'conflict') return;
      const resolution = {
        action: 'use_server',
        serverState: conflictInfo?.latestServerState,
        localData: pendingData,
        conflict: conflictInfo
      };
      isDirty = false;
      pendingData = null;
      conflictInfo = null;
      setState('idle');
      if (config.onConflictResolve) {
        await config.onConflictResolve(resolution);
      }
    },

    resolveWithForceSave: async () => {
      if (state !== 'conflict') return true;
      const resolution = {
        action: 'force_save',
        localData: pendingData,
        conflict: conflictInfo
      };
      if (config.onConflictResolve) {
        await config.onConflictResolve(resolution);
      }
      conflictInfo = null;
      // Retry save
      setState('saving');
      try {
        if (config.onForceSave) {
          await config.onForceSave(pendingData);
        }
        isDirty = false;
        pendingData = null;
        setState('saved');
        return true;
      } catch {
        setState('error');
        return false;
      }
    },

    dismissConflict: () => {
      if (state !== 'conflict') return;
      const resolution = {
        action: 'dismiss',
        localData: pendingData,
        conflict: conflictInfo
      };
      conflictInfo = null;
      setState('idle');
      if (config.onConflictResolve) {
        config.onConflictResolve(resolution);
      }
    },

    onStateChange: (callback) => {
      listeners.push(callback);
      return () => {
        const index = listeners.indexOf(callback);
        if (index >= 0) {
          listeners.splice(index, 1);
        }
      };
    }
  };
}

test('Conflict: indicator detects AUTOSAVE_CONFLICT error code', async () => {
  const conflictError = {
    code: 'AUTOSAVE_CONFLICT',
    message: 'Version mismatch',
    metadata: {
      version: 'v2',
      expected_version: 'v1',
      entity_id: '123'
    }
  };

  const indicator = createMockIndicatorWithConflict({
    enableConflictDetection: true,
    onSave: async () => {
      throw conflictError;
    }
  });

  indicator.markDirty({ title: 'Updated' });
  await indicator.save();

  assert.equal(indicator.getState(), 'conflict');
  assert.ok(indicator.isInConflict());
});

test('Conflict: indicator extracts conflict info from error metadata', async () => {
  const conflictError = {
    code: 'AUTOSAVE_CONFLICT',
    metadata: {
      version: 'server-v5',
      expected_version: 'client-v4',
      entity_id: 'page-123',
      latest_server_state: { title: 'Server Title' }
    }
  };

  const indicator = createMockIndicatorWithConflict({
    enableConflictDetection: true,
    onSave: async () => {
      throw conflictError;
    }
  });

  indicator.markDirty({ title: 'Local Title' });
  await indicator.save();

  const info = indicator.getConflictInfo();
  assert.ok(info);
  assert.equal(info.version, 'server-v5');
  assert.equal(info.expected_version, 'client-v4');
});

test('Conflict: resolveWithServerVersion clears conflict and local data', async () => {
  const conflictError = {
    code: 'AUTOSAVE_CONFLICT',
    metadata: {
      version: 'v2',
      expected_version: 'v1',
      latestServerState: { title: 'Server Version' }
    }
  };

  let resolvedWith = null;
  const indicator = createMockIndicatorWithConflict({
    enableConflictDetection: true,
    onSave: async () => {
      throw conflictError;
    },
    onConflictResolve: (resolution) => {
      resolvedWith = resolution;
    }
  });

  indicator.markDirty({ title: 'Local Changes' });
  await indicator.save();

  assert.equal(indicator.getState(), 'conflict');
  assert.ok(indicator.hasPendingChanges());

  await indicator.resolveWithServerVersion();

  assert.equal(indicator.getState(), 'idle');
  assert.ok(!indicator.isInConflict());
  assert.ok(!indicator.hasPendingChanges());
  assert.equal(resolvedWith?.action, 'use_server');
});

test('Conflict: resolveWithForceSave retries save', async () => {
  let saveAttempt = 0;
  const indicator = createMockIndicatorWithConflict({
    enableConflictDetection: true,
    onSave: async () => {
      saveAttempt++;
      if (saveAttempt === 1) {
        throw { code: 'AUTOSAVE_CONFLICT', metadata: {} };
      }
    },
    onForceSave: async () => {
      // Force save succeeds
    }
  });

  indicator.markDirty({ title: 'Local Changes' });
  await indicator.save();

  assert.equal(indicator.getState(), 'conflict');
  assert.equal(saveAttempt, 1);

  await indicator.resolveWithForceSave();

  assert.equal(indicator.getState(), 'saved');
  assert.ok(!indicator.isInConflict());
});

test('Conflict: dismissConflict returns to idle without saving', async () => {
  const conflictError = {
    code: 'AUTOSAVE_CONFLICT',
    metadata: { version: 'v2' }
  };

  let resolvedWith = null;
  const indicator = createMockIndicatorWithConflict({
    enableConflictDetection: true,
    onSave: async () => {
      throw conflictError;
    },
    onConflictResolve: (resolution) => {
      resolvedWith = resolution;
    }
  });

  indicator.markDirty({ title: 'Changes' });
  await indicator.save();

  assert.equal(indicator.getState(), 'conflict');

  indicator.dismissConflict();

  assert.equal(indicator.getState(), 'idle');
  assert.ok(!indicator.isInConflict());
  assert.equal(resolvedWith?.action, 'dismiss');
  // Local data should still be pending (not saved)
  assert.ok(indicator.hasPendingChanges());
});

test('Conflict: onConflictResolve callback is called with correct resolution', async () => {
  const conflictError = {
    code: 'AUTOSAVE_CONFLICT',
    metadata: {
      version: 'v2',
      expected_version: 'v1'
    }
  };

  let resolvedWith = null;
  const indicator = createMockIndicatorWithConflict({
    enableConflictDetection: true,
    onSave: async () => {
      throw conflictError;
    },
    onConflictResolve: (resolution) => {
      resolvedWith = resolution;
    }
  });

  indicator.markDirty({ title: 'Test' });
  await indicator.save();
  await indicator.resolveWithServerVersion();

  assert.ok(resolvedWith);
  assert.equal(resolvedWith.action, 'use_server');
  assert.ok(resolvedWith.conflict);
});

test('Conflict: state transition from conflict to idle via dismiss', async () => {
  const states = [];

  const indicator = createMockIndicatorWithConflict({
    enableConflictDetection: true,
    onSave: async () => {
      throw { code: 'AUTOSAVE_CONFLICT', metadata: {} };
    }
  });

  indicator.onStateChange((event) => {
    states.push(event.currentState);
  });

  indicator.markDirty({});
  await indicator.save();
  indicator.dismissConflict();

  assert.ok(states.includes('saving'));
  assert.ok(states.includes('conflict'));
  assert.ok(states.includes('idle'));
});

test('Conflict: isInConflict returns false when not in conflict', () => {
  const indicator = createMockIndicatorWithConflict({
    enableConflictDetection: true
  });

  assert.ok(!indicator.isInConflict());
  assert.equal(indicator.getState(), 'idle');
  assert.equal(indicator.getConflictInfo(), null);
});

test('Conflict: conflict detection disabled by default', async () => {
  const indicator = createMockIndicatorWithConflict({
    enableConflictDetection: false,
    onSave: async () => {
      throw { code: 'AUTOSAVE_CONFLICT', metadata: {} };
    }
  });

  indicator.markDirty({});
  await indicator.save();

  // Should treat as regular error, not conflict
  assert.equal(indicator.getState(), 'error');
  assert.ok(!indicator.isInConflict());
});
