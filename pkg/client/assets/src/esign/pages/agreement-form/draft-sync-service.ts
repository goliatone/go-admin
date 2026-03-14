import type { NormalizedAgreementSyncConfig } from './bootstrap-config';
import type { WizardStateManager } from './state-manager';
import {
  loadSyncCoreModule,
  type SyncCoreModule,
  type SyncCoreMutationResponse,
  type SyncCoreResource,
  type SyncCoreResourceRef,
  type SyncCoreResourceSnapshot,
  type SyncCoreTransport,
} from './sync-core-loader';

export interface DraftSyncServiceOptions {
  stateManager: WizardStateManager;
  requestHeaders(includeContentType?: boolean): Record<string, string>;
  syncConfig: NormalizedAgreementSyncConfig;
  fetchImpl?: typeof fetch;
}

export interface DraftSyncRecord {
  id: string;
  revision: number;
  updated_at: string;
  wizard_state: Record<string, any>;
  resource_ref: SyncCoreResourceRef;
}

export interface DraftSendResult {
  replay: boolean;
  applied: boolean;
  snapshot: SyncCoreResourceSnapshot<Record<string, any>>;
  data: Record<string, any>;
}

export class DraftSyncService {
  readonly stateManager: WizardStateManager;
  pendingSync: Promise<any> | null = null;
  retryCount = 0;
  retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly requestHeaders: (includeContentType?: boolean) => Record<string, string>;
  private readonly fetchImpl: typeof fetch;
  private readonly syncConfig: NormalizedAgreementSyncConfig;
  private syncModulePromise: Promise<SyncCoreModule> | null = null;
  private syncModule: SyncCoreModule | null = null;
  private transport: SyncCoreTransport | null = null;
  private cache: ReturnType<SyncCoreModule['createInMemoryCache']> | null = null;
  private resource: SyncCoreResource<Record<string, any>, Record<string, any>> | null = null;
  private resourceRef: SyncCoreResourceRef | null = null;

  constructor(options: DraftSyncServiceOptions) {
    this.stateManager = options.stateManager;
    this.requestHeaders = options.requestHeaders;
    this.fetchImpl = options.fetchImpl || fetch.bind(globalThis);
    this.syncConfig = options.syncConfig;
  }

  async start(): Promise<void> {
    const state = this.stateManager.getState();
    const existingRef = this.resolveStoredResourceRef(state);
    if (existingRef) {
      await this.bindResource(existingRef);
    }
  }

  destroy(): void {
    this.resource = null;
    this.resourceRef = null;
  }

  async create(state: Record<string, any>): Promise<DraftSyncRecord> {
    const normalizedState = this.stateManager.normalizeLoadedState(state);
    await this.ensureBoundResource({
      forceBootstrap: true,
      preserveLocalState: true,
    });
    this.stateManager.setState({
      ...normalizedState,
      resourceRef: this.resourceRef,
      serverDraftId: this.resourceRef?.id || null,
      serverRevision: Number(this.resource?.getSnapshot()?.revision || 0),
      lastSyncedAt: this.resource?.getSnapshot()?.updatedAt || null,
      syncPending: true,
    }, {
      notify: false,
      save: true,
      syncPending: true,
    });
    const result = await this.sync();
    if (!result.success || !result.result) {
      throw this.toRuntimeError(result.error || 'draft_create_failed');
    }
    return result.result;
  }

  async load(draftId: string): Promise<DraftSyncRecord> {
    const ref = this.resolveStoredResourceRef(this.stateManager.getState(), draftId)
      || this.createFallbackResourceRef(draftId);
    await this.bindResource(ref);
    try {
      const snapshot = await this.resource!.refresh({ force: true });
      return this.snapshotToRecord(snapshot);
    } catch (error: any) {
      if (String(error?.code || '').trim().toUpperCase() === 'NOT_FOUND') {
        const notFound = new Error('HTTP 404') as Error & { status?: number; code?: string };
        notFound.status = 404;
        notFound.code = 'NOT_FOUND';
        throw notFound;
      }
      throw error;
    }
  }

  async dispose(draftId: string): Promise<void> {
    const targetRef = this.resourceRef?.id === draftId
      ? this.resourceRef
      : this.resolveStoredResourceRef(this.stateManager.getState(), draftId)
        || this.createFallbackResourceRef(draftId);

    await this.bindResource(targetRef);

    let revision = Number(this.resource?.getSnapshot()?.revision || 0);
    if (revision <= 0) {
      try {
        const loaded = await this.resource!.load();
        revision = Number(loaded.revision || 0);
      } catch (error: any) {
        if (Number(error?.status || 0) !== 404 && String(error?.code || '').trim().toUpperCase() !== 'NOT_FOUND') {
          throw error;
        }
        revision = 0;
      }
    }

    if (revision > 0) {
      await this.resource!.mutate({
        operation: 'dispose',
        payload: {},
        expectedRevision: revision,
        idempotencyKey: `dispose:${draftId}:${revision}`,
      });
    }

    if (this.resourceRef?.id === draftId) {
      this.resource = null;
      this.resourceRef = null;
    }
  }

  async refresh(options: { preserveDirty?: boolean; force?: boolean } = {}): Promise<DraftSyncRecord | null> {
    const resource = await this.ensureBoundResource();
    const snapshot = resource.getSnapshot()
      ? await resource.refresh({ force: options.force !== false })
      : await resource.load();
    this.stateManager.applyServerSnapshot(snapshot, {
      notify: true,
      save: true,
      preserveDirty: options.preserveDirty === true,
    });
    return this.snapshotToRecord(snapshot);
  }

  async send(expectedRevision: number, idempotencyKey: string, metadata: Record<string, any> = {}): Promise<DraftSendResult> {
    const resource = await this.ensureBoundResource();
    const response = await resource.mutate({
      operation: 'send',
      payload: {},
      expectedRevision,
      idempotencyKey,
      metadata,
    });
    return {
      replay: response.replay,
      applied: response.applied,
      snapshot: response.snapshot,
      data: this.snapshotData(response.snapshot),
    };
  }

  async sync(): Promise<{
    success: boolean;
    result?: DraftSyncRecord;
    conflict?: boolean;
    currentRevision?: number;
    latestSnapshot?: SyncCoreResourceSnapshot<Record<string, any>> | null;
    error?: string;
  }> {
    const state = this.stateManager.getState();
    if (!state.syncPending) {
      const snapshot = this.resource?.getSnapshot();
      return {
        success: true,
        result: snapshot ? this.snapshotToRecord(snapshot) : undefined,
      };
    }

    try {
      const resource = await this.ensureBoundResource({
        preserveLocalState: !state.serverDraftId,
      });
      const response = await resource.mutate({
        operation: 'autosave',
        payload: {
          wizard_state: state,
          title: state.details?.title || 'Untitled Agreement',
          current_step: state.currentStep,
          document_id: state.document?.id || null,
        },
        expectedRevision: Number(state.serverRevision || 0) || undefined,
      });
      this.applyMutationSnapshot(response);
      return {
        success: true,
        result: this.snapshotToRecord(response.snapshot),
      };
    } catch (error: any) {
      const conflict = error?.conflict;
      if (conflict || String(error?.code || '').trim().toUpperCase() === 'STALE_REVISION') {
        return {
          success: false,
          conflict: true,
          currentRevision: Number(conflict?.currentRevision || error?.currentRevision || 0),
          latestSnapshot: conflict?.latestSnapshot || error?.resource || null,
        };
      }
      return {
        success: false,
        error: String(error?.message || 'sync_failed').trim() || 'sync_failed',
      };
    }
  }

  async bootstrap(): Promise<{ resourceRef: SyncCoreResourceRef; snapshot: SyncCoreResourceSnapshot<Record<string, any>>; wizardID: string }> {
    const runtime = await this.ensureRuntime();
    const response = await this.fetchImpl(this.syncConfig.bootstrap_path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: this.requestHeaders(false),
    });
    const payload = await response.json().catch(() => ({} as any));
    if (!response.ok) {
      throw new Error(String(payload?.error?.message || `HTTP ${response.status}`));
    }

    const resourceRef = this.normalizeResourceRef(payload?.resource_ref);
    if (!resourceRef) {
      throw new Error('Invalid agreement draft bootstrap response');
    }
    const snapshot = runtime.parseReadEnvelope<Record<string, any>>(resourceRef, payload?.draft || {});
    return {
      resourceRef,
      snapshot,
      wizardID: String(payload?.wizard_id || '').trim(),
    };
  }

  private async ensureRuntime(): Promise<SyncCoreModule> {
    if (this.syncModule) {
      return this.syncModule;
    }
    if (!this.syncModulePromise) {
      this.syncModulePromise = loadSyncCoreModule(this.syncConfig.client_base_path);
    }
    this.syncModule = await this.syncModulePromise;
    if (!this.cache) {
      this.cache = this.syncModule.createInMemoryCache();
    }
    if (!this.transport) {
      this.transport = this.syncModule.createFetchSyncTransport({
        baseURL: this.syncConfig.base_url,
        credentials: 'same-origin',
        fetch: this.fetchImpl,
        headers: () => this.requestHeaders(false),
        actionOperations: this.syncConfig.action_operations,
      });
    }
    return this.syncModule;
  }

  private async ensureBoundResource(options: { forceBootstrap?: boolean; preserveLocalState?: boolean } = {}): Promise<SyncCoreResource<Record<string, any>, Record<string, any>>> {
    if (!options.forceBootstrap && this.resource && this.resourceRef) {
      return this.resource;
    }

    const state = this.stateManager.getState();
    const storedRef = !options.forceBootstrap
      ? this.resolveStoredResourceRef(state)
      : null;
    if (storedRef) {
      await this.bindResource(storedRef);
      return this.resource!;
    }

    if (!options.forceBootstrap && state.serverDraftId) {
      await this.bindResource(this.createFallbackResourceRef(state.serverDraftId));
      return this.resource!;
    }

    const bootstrapped = await this.bootstrap();
    await this.bindResource(bootstrapped.resourceRef, bootstrapped.snapshot);
    if (options.preserveLocalState) {
      this.stateManager.setState({
        ...this.stateManager.getState(),
        resourceRef: bootstrapped.resourceRef,
        serverDraftId: bootstrapped.resourceRef.id,
        serverRevision: bootstrapped.snapshot.revision,
        lastSyncedAt: bootstrapped.snapshot.updatedAt,
        syncPending: true,
      }, {
        notify: false,
        save: true,
        syncPending: true,
      });
    } else {
      this.stateManager.applyServerSnapshot(bootstrapped.snapshot, {
        notify: false,
        save: true,
      });
    }
    return this.resource!;
  }

  private async bindResource(
    resourceRef: SyncCoreResourceRef,
    seededSnapshot?: SyncCoreResourceSnapshot<Record<string, any>>,
  ): Promise<void> {
    const runtime = await this.ensureRuntime();
    const normalizedRef = this.normalizeResourceRef(resourceRef);
    if (!normalizedRef) {
      throw new Error('A valid draft resourceRef is required');
    }
    if (seededSnapshot && this.cache) {
      this.cache.set(normalizedRef, seededSnapshot);
    }

    const engine = runtime.createSyncEngine({
      transport: this.transport,
      cache: this.cache,
    });
    this.resourceRef = normalizedRef;
    this.resource = engine.resource<Record<string, any>, Record<string, any>>(normalizedRef);
    this.stateManager.bindResourceRef(normalizedRef, {
      notify: false,
      save: true,
    });
  }

  private applyMutationSnapshot(response: SyncCoreMutationResponse<Record<string, any>>): void {
    this.stateManager.applyServerSnapshot(response.snapshot, {
      notify: false,
      save: true,
    });
  }

  private snapshotToRecord(snapshot: SyncCoreResourceSnapshot<Record<string, any>>): DraftSyncRecord {
    const data = this.snapshotData(snapshot);
    return {
      id: String(data.id || snapshot.ref.id || '').trim(),
      revision: Number(snapshot.revision || 0),
      updated_at: String(data.updated_at || snapshot.updatedAt || '').trim(),
      wizard_state: this.snapshotWizardState(snapshot),
      resource_ref: snapshot.ref,
    };
  }

  private snapshotWizardState(snapshot: SyncCoreResourceSnapshot<Record<string, any>>): Record<string, any> {
    const data = this.snapshotData(snapshot);
    const rawState = data?.wizard_state;
    if (rawState && typeof rawState === 'object') {
      return rawState as Record<string, any>;
    }
    return {};
  }

  private snapshotData(snapshot: SyncCoreResourceSnapshot<Record<string, any>> | null): Record<string, any> {
    if (!snapshot?.data || typeof snapshot.data !== 'object') {
      return {};
    }
    return snapshot.data;
  }

  private resolveStoredResourceRef(state: Record<string, any>, draftID = ''): SyncCoreResourceRef | null {
    const resourceRef = this.normalizeResourceRef(state?.resourceRef || state?.resource_ref);
    if (!resourceRef) {
      return null;
    }
    if (draftID && resourceRef.id !== draftID) {
      return null;
    }
    return resourceRef;
  }

  private createFallbackResourceRef(draftID: string): SyncCoreResourceRef {
    const trimmedDraftID = String(draftID || '').trim();
    return {
      kind: this.syncConfig.resource_kind || 'agreement_draft',
      id: trimmedDraftID,
    };
  }

  private normalizeResourceRef(value: unknown): SyncCoreResourceRef | null {
    if (!value || typeof value !== 'object') {
      return null;
    }
    const candidate = value as Record<string, unknown>;
    const kind = String(candidate.kind || '').trim();
    const id = String(candidate.id || '').trim();
    if (kind === '' || id === '') {
      return null;
    }
    const rawScope = candidate.scope;
    const scope = rawScope && typeof rawScope === 'object' && !Array.isArray(rawScope)
      ? Object.entries(rawScope as Record<string, unknown>).reduce<Record<string, string>>((acc, [key, raw]) => {
        const nextKey = String(key || '').trim();
        if (nextKey !== '') {
          acc[nextKey] = String(raw ?? '').trim();
        }
        return acc;
      }, {})
      : undefined;

    return {
      kind,
      id,
      scope: scope && Object.keys(scope).length > 0 ? scope : undefined,
    };
  }

  private toRuntimeError(message: string): Error {
    return new Error(String(message || 'sync_failed').trim() || 'sync_failed');
  }
}
