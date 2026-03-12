import type { DraftSyncService } from './draft-sync-service';
import type { WizardStateManager } from './state-manager';
import type { ActiveTabController } from './active-tab-controller';

export interface SyncControllerOptions {
  stateManager: WizardStateManager;
  syncService: DraftSyncService;
  activeTabController: ActiveTabController;
  statusUpdater(status: string): void;
  showConflictDialog(serverRevision: number): void;
  syncDebounceMs: number;
  syncRetryDelays: number[];
  currentUserID: string;
  draftsEndpoint: string;
  draftEndpointWithUserID(url: string): string;
  draftRequestHeaders(includeContentType?: boolean): Record<string, string>;
  fetchImpl?: typeof fetch;
}

export class SyncController {
  readonly stateManager: WizardStateManager;
  readonly syncService: DraftSyncService;
  readonly activeTabController: ActiveTabController;
  private readonly options: SyncControllerOptions;
  private readonly fetchImpl: typeof fetch;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryCount = 0;
  private isSyncing = false;

  constructor(options: SyncControllerOptions) {
    this.options = options;
    this.stateManager = options.stateManager;
    this.syncService = options.syncService;
    this.activeTabController = options.activeTabController;
    this.fetchImpl = options.fetchImpl || fetch.bind(globalThis);
  }

  start(): void {
    this.activeTabController.start();
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
    this.activeTabController.stop();
  }

  get isOwner(): boolean {
    return this.activeTabController.isOwner;
  }

  get currentClaim() {
    return this.activeTabController.currentClaim;
  }

  get lastBlockedReason(): string {
    return this.activeTabController.lastBlockedReason;
  }

  ensureActiveTabOwnership(reason = 'sync', options: { allowClaimIfAvailable?: boolean } = {}): boolean {
    return this.activeTabController.ensureOwnership(reason, options);
  }

  takeControl(): boolean {
    return this.activeTabController.takeControl();
  }

  broadcastStateUpdate(): void {
    this.activeTabController.broadcastStateUpdate(this.stateManager.getState());
  }

  broadcastSyncCompleted(draftId: string, revision: number): void {
    this.activeTabController.broadcastSyncCompleted(draftId, revision);
  }

  scheduleSync(): void {
    if (!this.ensureActiveTabOwnership('schedule_sync', { allowClaimIfAvailable: false })) {
      this.options.statusUpdater('paused');
      return;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.options.statusUpdater('pending');
    this.debounceTimer = setTimeout(() => {
      void this.performSync();
    }, this.options.syncDebounceMs);
  }

  async forceSync(options: { keepalive?: boolean } = {}): Promise<Record<string, any>> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    const useKeepalive = options.keepalive === true;
    if (!this.ensureActiveTabOwnership(useKeepalive ? 'keepalive_sync' : 'force_sync', { allowClaimIfAvailable: true })) {
      return { blocked: true, reason: 'passive_tab' };
    }
    const state = this.stateManager.getState();
    if (!useKeepalive) {
      return this.performSync();
    }

    if (state.syncPending && state.serverDraftId) {
      const payload = JSON.stringify({
        expected_revision: state.serverRevision,
        wizard_state: state,
        title: state.details.title || 'Untitled Agreement',
        current_step: state.currentStep,
        document_id: state.document.id || null,
        updated_by_user_id: this.options.currentUserID,
      });
      try {
        const response = await this.fetchImpl(this.options.draftEndpointWithUserID(`${this.options.draftsEndpoint}/${state.serverDraftId}`), {
          method: 'PUT',
          credentials: 'same-origin',
          headers: this.options.draftRequestHeaders(),
          body: payload,
          keepalive: true,
        });

        if (response.status === 409) {
          const error = await response.json().catch(() => ({} as any));
          const currentRevision = Number(error?.error?.details?.current_revision || 0);
          this.options.statusUpdater('conflict');
          this.options.showConflictDialog(currentRevision > 0 ? currentRevision : state.serverRevision);
          return { conflict: true };
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json().catch(() => ({} as any));
        const syncedDraftID = String(data?.id || data?.draft_id || state.serverDraftId || '').trim();
        const syncedRevision = Number(data?.revision || 0);
        if (syncedDraftID && Number.isFinite(syncedRevision) && syncedRevision > 0) {
          this.stateManager.markSynced(syncedDraftID, syncedRevision);
          this.options.statusUpdater('saved');
          this.retryCount = 0;
          this.broadcastSyncCompleted(syncedDraftID, syncedRevision);
          return { success: true, draftId: syncedDraftID, revision: syncedRevision };
        }
      } catch {
        // Fall back to canonical sync path.
      }
    }

    return this.performSync();
  }

  async performSync(): Promise<Record<string, any>> {
    if (this.isSyncing) return { blocked: true, reason: 'sync_in_progress' };
    if (!this.ensureActiveTabOwnership('perform_sync', { allowClaimIfAvailable: true })) {
      return { blocked: true, reason: 'passive_tab' };
    }

    const state = this.stateManager.getState();
    if (!state.syncPending) {
      this.options.statusUpdater('saved');
      return { skipped: true, reason: 'not_pending' };
    }

    this.isSyncing = true;
    this.options.statusUpdater('saving');

    const result = await this.syncService.sync();
    this.isSyncing = false;

    if (result.success) {
      if (result.result?.id && result.result?.revision) {
        this.broadcastSyncCompleted(result.result.id, result.result.revision);
      }
      this.options.statusUpdater('saved');
      this.retryCount = 0;
      return { success: true, draftId: result.result?.id || null, revision: result.result?.revision || 0 };
    }
    if (result.conflict) {
      this.options.statusUpdater('conflict');
      this.options.showConflictDialog(Number(result.currentRevision || state.serverRevision || 0));
      return { conflict: true, currentRevision: result.currentRevision };
    }

    this.options.statusUpdater('error');
    this.scheduleRetry();
    return { error: true, reason: result.error || 'sync_failed' };
  }

  manualRetry(): Promise<Record<string, any>> | Record<string, any> {
    if (!this.ensureActiveTabOwnership('manual_retry', { allowClaimIfAvailable: true })) {
      return { blocked: true, reason: 'passive_tab' };
    }
    this.retryCount = 0;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    return this.performSync();
  }

  private scheduleRetry(): void {
    if (!this.isOwner) return;
    if (this.retryCount >= this.options.syncRetryDelays.length) {
      return;
    }
    const delay = this.options.syncRetryDelays[this.retryCount];
    this.retryCount += 1;
    this.retryTimer = setTimeout(() => {
      void this.performSync();
    }, delay);
  }
}
