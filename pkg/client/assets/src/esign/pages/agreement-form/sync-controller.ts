import type { DraftSyncService } from './draft-sync-service';
import type { WizardStateManager } from './state-manager';
import type { ActiveTabController } from './active-tab-controller';
import {
  buildSendDebugFields,
  logSendInfo,
  logSendWarn,
} from './send-debug';

export interface SyncControllerOptions {
  stateManager: WizardStateManager;
  syncService: DraftSyncService;
  activeTabController: ActiveTabController;
  storageKey: string;
  statusUpdater(status: string): void;
  showConflictDialog(serverRevision: number): void;
  syncDebounceMs: number;
  syncRetryDelays: number[];
  fetchImpl?: typeof fetch;
  documentRef?: Document;
  windowRef?: Window;
}

export class SyncController {
  readonly stateManager: WizardStateManager;
  readonly syncService: DraftSyncService;
  readonly activeTabController: ActiveTabController;
  private readonly options: SyncControllerOptions;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryCount = 0;
  private isSyncing = false;
  private cleanupFns: Array<() => void> = [];

  constructor(options: SyncControllerOptions) {
    this.options = options;
    this.stateManager = options.stateManager;
    this.syncService = options.syncService;
    this.activeTabController = options.activeTabController;
  }

  start(): void {
    this.activeTabController.start();
    void this.syncService.start().catch(() => {});
    this.bindRefreshEvents();
    this.activeTabController.setActiveDraft(this.stateManager.getState()?.serverDraftId || null);
  }

  destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.cleanupFns.forEach((cleanup) => cleanup());
    this.cleanupFns = [];
    this.syncService.destroy();
    this.activeTabController.stop();
  }

  broadcastStateUpdate(): void {
    this.activeTabController.setActiveDraft(this.stateManager.getState()?.serverDraftId || null);
  }

  broadcastSyncCompleted(draftId: string, revision: number): void {
    this.activeTabController.setActiveDraft(draftId);
    this.activeTabController.broadcastSyncCompleted(draftId, revision);
  }

  broadcastDraftDisposed(draftId: string, reason = ''): void {
    this.activeTabController.broadcastDraftDisposed(draftId, reason);
  }

  async refreshCurrentDraft(options: { preserveDirty?: boolean; force?: boolean } = {}): Promise<Record<string, any>> {
    try {
      const record = await this.syncService.refresh(options);
      if (!record) {
        return { skipped: true, reason: 'no_active_draft' };
      }
      this.activeTabController.setActiveDraft(record.id);
      this.options.statusUpdater(this.stateManager.getState().syncPending ? 'pending' : 'saved');
      return { success: true, draftId: record.id, revision: record.revision };
    } catch (error: any) {
      if (String(error?.code || '').trim().toUpperCase() === 'NOT_FOUND') {
        return { stale: true, reason: 'not_found' };
      }
      return { error: true, reason: String(error?.message || 'refresh_failed').trim() || 'refresh_failed' };
    }
  }

  scheduleSync(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.options.statusUpdater('pending');
    this.debounceTimer = setTimeout(() => {
      void this.performSync();
    }, this.options.syncDebounceMs);
  }

  async forceSync(): Promise<Record<string, any>> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    return this.performSync();
  }

  async performSync(): Promise<Record<string, any>> {
    if (this.isSyncing) return { blocked: true, reason: 'sync_in_progress' };

    const state = this.stateManager.getState();
    if (!state.syncPending) {
      this.options.statusUpdater('saved');
      return { skipped: true, reason: 'not_pending' };
    }

    this.isSyncing = true;
    this.options.statusUpdater('saving');
    logSendInfo('sync_perform_start', buildSendDebugFields({
      state,
      storageKey: this.options.storageKey,
      sendAttemptId: null,
      extra: {
        mode: state.serverDraftId ? 'update' : 'bootstrap_autosave',
        targetDraftId: String(state.serverDraftId || '').trim() || null,
        expectedRevision: Number(state.serverRevision || 0),
      },
    }));

    const result = await this.syncService.sync();
    this.isSyncing = false;

    if (result.success) {
      if (result.result?.id && result.result?.revision) {
        this.activeTabController.setActiveDraft(result.result.id);
        this.broadcastSyncCompleted(result.result.id, result.result.revision);
      }
      this.options.statusUpdater('saved');
      this.retryCount = 0;
      return {
        success: true,
        draftId: result.result?.id || null,
        revision: result.result?.revision || 0,
      };
    }
    if (result.conflict) {
      this.options.statusUpdater('conflict');
      this.options.showConflictDialog(Number(result.currentRevision || state.serverRevision || 0));
      logSendWarn('sync_perform_conflict', buildSendDebugFields({
        state,
        storageKey: this.options.storageKey,
        sendAttemptId: null,
        extra: {
          targetDraftId: String(state.serverDraftId || '').trim() || null,
          currentRevision: Number(result.currentRevision || 0),
        },
      }));
      return { conflict: true, currentRevision: result.currentRevision };
    }

    this.options.statusUpdater('error');
    this.scheduleRetry();
    return { error: true, reason: result.error || 'sync_failed' };
  }

  manualRetry(): Promise<Record<string, any>> | Record<string, any> {
    this.retryCount = 0;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    return this.performSync();
  }

  private scheduleRetry(): void {
    if (this.retryCount >= this.options.syncRetryDelays.length) {
      return;
    }
    const delay = this.options.syncRetryDelays[this.retryCount];
    this.retryCount += 1;
    this.retryTimer = setTimeout(() => {
      void this.performSync();
    }, delay);
  }

  private bindRefreshEvents(): void {
    const doc = this.options.documentRef || (typeof document === 'undefined' ? null : document);
    const win = this.options.windowRef || (typeof window === 'undefined' ? null : window);
    if (!doc || !win) {
      return;
    }

    const onFocus = () => {
      if (doc.visibilityState === 'hidden') {
        return;
      }
      if (this.stateManager.getState().serverDraftId) {
        void this.refreshCurrentDraft({ preserveDirty: true, force: true });
      }
    };
    win.addEventListener('focus', onFocus);
    this.cleanupFns.push(() => win.removeEventListener('focus', onFocus));

    const onVisible = () => {
      if (doc.visibilityState === 'visible' && this.stateManager.getState().serverDraftId) {
        void this.refreshCurrentDraft({ preserveDirty: true, force: true });
      }
    };
    doc.addEventListener('visibilitychange', onVisible);
    this.cleanupFns.push(() => doc.removeEventListener('visibilitychange', onVisible));
  }
}
