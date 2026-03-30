import type {
  SyncCoreResourceRef,
  SyncCoreResourceSnapshot,
} from './sync-core-loader';
import { parseJSONValue } from '../../../shared/json-parse.js';

export interface WizardStateManagerOptions {
  storageKey: string;
  stateVersion: number;
  totalWizardSteps: number;
  titleSource: {
    USER: string;
    AUTOFILL: string;
    SERVER_SEED: string;
  };
  normalizeTitleSource(value: unknown, fallback?: string): string;
  parsePositiveInt(value: unknown, fallback?: number): number;
  hasMeaningfulWizardProgress(state: Record<string, any> | null): boolean;
  collectFormState(): Record<string, any>;
  emitTelemetry(eventName: string, fields?: Record<string, unknown>): void;
  sessionStorage?: Storage | null;
  now?(): string;
}

export class WizardStateManager {
  private state: Record<string, any> | null = null;
  private listeners: Array<(state: Record<string, any>) => void> = [];
  private readonly options: WizardStateManagerOptions;

  constructor(options: WizardStateManagerOptions) {
    this.options = options;
  }

  start(): void {
    this.state = this.loadFromSession() || this.createInitialState();
  }

  destroy(): void {
    this.listeners = [];
  }

  private now(): string {
    return this.options.now ? this.options.now() : new Date().toISOString();
  }

  private storage(): Storage | null {
    if (this.options.sessionStorage !== undefined) return this.options.sessionStorage;
    if (typeof window === 'undefined') return null;
    return window.sessionStorage ?? null;
  }

  private createInitialState(): Record<string, any> {
    return {
      wizardId: this.generateWizardId(),
      version: this.options.stateVersion,
      createdAt: this.now(),
      updatedAt: this.now(),
      currentStep: 1,
      document: { id: null, title: null, pageCount: null },
      details: { title: '', message: '' },
      participants: [],
      fieldDefinitions: [],
      fieldPlacements: [],
      fieldRules: [],
      review: {
        enabled: false,
        gate: 'approve_before_send',
        commentsEnabled: false,
        participants: [],
      },
      titleSource: this.options.titleSource.AUTOFILL,
      resourceRef: null,
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null,
      syncPending: false,
    };
  }

  private generateWizardId(): string {
    return `wizard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadFromSession(): Record<string, any> | null {
    const storage = this.storage();
    if (!storage) return null;

    const stored = storage.getItem(this.options.storageKey);
    if (!stored) return null;

    const state = parseJSONValue<Record<string, unknown> | null>(stored, null);
    if (!state) {
      return null;
    }

    if (state.version !== this.options.stateVersion) {
      return this.migrateState(state);
    }

    return this.normalizeLoadedState(state);
  }

  normalizeLoadedState(state: any): Record<string, any> {
    if (!state || typeof state !== 'object') {
      return this.createInitialState();
    }

    const initial = this.createInitialState();
    const normalized = { ...initial, ...state };

    const parsedStep = Number.parseInt(String(state.currentStep ?? initial.currentStep), 10);
    normalized.currentStep = Number.isFinite(parsedStep)
      ? Math.min(Math.max(parsedStep, 1), this.options.totalWizardSteps)
      : initial.currentStep;

    const documentState = state.document && typeof state.document === 'object' ? state.document : {};
    const rawDocumentID = documentState.id;
    normalized.document = {
      id: rawDocumentID == null ? null : (String(rawDocumentID).trim() || null),
      title: String(documentState.title ?? '').trim() || null,
      pageCount: this.options.parsePositiveInt(documentState.pageCount, 0) || null,
    };

    const detailsState = state.details && typeof state.details === 'object' ? state.details : {};
    const parsedTitle = String(detailsState.title ?? '').trim();
    const inferredTitleSource = parsedTitle === ''
      ? this.options.titleSource.AUTOFILL
      : this.options.titleSource.USER;

    normalized.details = {
      title: parsedTitle,
      message: String(detailsState.message ?? ''),
    };
    normalized.participants = Array.isArray(state.participants) ? state.participants : [];
    normalized.fieldDefinitions = Array.isArray(state.fieldDefinitions) ? state.fieldDefinitions : [];
    normalized.fieldPlacements = Array.isArray(state.fieldPlacements) ? state.fieldPlacements : [];
    normalized.fieldRules = Array.isArray(state.fieldRules) ? state.fieldRules : [];
    const reviewState = state.review && typeof state.review === 'object' ? state.review : {};
    normalized.review = {
      enabled: Boolean(reviewState.enabled),
      gate: String(reviewState.gate ?? initial.review.gate).trim() || initial.review.gate,
      commentsEnabled: Boolean(reviewState.commentsEnabled),
      participants: Array.isArray(reviewState.participants) ? reviewState.participants : [],
    };

    const wizardID = String(state.wizardId ?? '').trim();
    normalized.wizardId = wizardID || initial.wizardId;
    normalized.version = this.options.stateVersion;
    normalized.createdAt = String(state.createdAt ?? initial.createdAt);
    normalized.updatedAt = String(state.updatedAt ?? initial.updatedAt);
    normalized.titleSource = this.options.normalizeTitleSource(state.titleSource, inferredTitleSource);
    normalized.resourceRef = this.normalizeResourceRef(state.resourceRef ?? state.resource_ref);

    const serverDraftID = String(state.serverDraftId ?? '').trim();
    normalized.serverDraftId = serverDraftID || null;
    normalized.serverRevision = this.options.parsePositiveInt(state.serverRevision, 0);
    normalized.lastSyncedAt = String(state.lastSyncedAt ?? '').trim() || null;
    normalized.syncPending = Boolean(state.syncPending);

    return normalized;
  }

  private normalizeResourceRef(value: unknown): SyncCoreResourceRef | null {
    if (!value || typeof value !== 'object') {
      return null;
    }
    const candidate = value as Record<string, unknown>;
    const kind = String(candidate.kind ?? '').trim();
    const id = String(candidate.id ?? '').trim();
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

  private migrateState(_oldState: any): Record<string, any> | null {
    return null;
  }

  private saveToSession(): void {
    const storage = this.storage();
    if (!storage || !this.state) return;

    try {
      this.state.updatedAt = this.now();
      storage.setItem(this.options.storageKey, JSON.stringify(this.state));
    } catch {
      // Best effort cache only.
    }
  }

  getState(): Record<string, any> {
    if (!this.state) {
      this.state = this.createInitialState();
    }
    return this.state;
  }

  setState(nextState: Record<string, any>, options: { syncPending?: boolean; save?: boolean; notify?: boolean } = {}): void {
    this.state = this.normalizeLoadedState(nextState);
    if (options.syncPending === true) {
      this.state.syncPending = true;
    } else if (options.syncPending === false) {
      this.state.syncPending = false;
    }
    if (options.save !== false) {
      this.saveToSession();
    }
    if (options.notify !== false) {
      this.notifyListeners();
    }
  }

  updateState(partial: Record<string, any>): void {
    this.setState(
      { ...this.getState(), ...partial, syncPending: true, updatedAt: this.now() },
      { syncPending: true },
    );
  }

  updateStep(step: number): void {
    this.updateState({ currentStep: step });
  }

  updateDocument(doc: Record<string, any>): void {
    this.updateState({ document: { ...this.getState().document, ...doc } });
  }

  updateDetails(details: Record<string, any>, options: { titleSource?: string } = {}): void {
    const patch: Record<string, any> = {
      details: { ...this.getState().details, ...details },
    };
    if (Object.prototype.hasOwnProperty.call(options, 'titleSource')) {
      patch.titleSource = this.options.normalizeTitleSource(options.titleSource, this.getState().titleSource);
    } else if (Object.prototype.hasOwnProperty.call(details || {}, 'title')) {
      patch.titleSource = this.options.titleSource.USER;
    }
    this.updateState(patch);
  }

  setTitleSource(source: string, options: { syncPending?: boolean } = {}): void {
    const nextSource = this.options.normalizeTitleSource(source, this.getState().titleSource);
    if (nextSource === this.getState().titleSource) return;
    if (options.syncPending === false) {
      this.setState({ ...this.getState(), titleSource: nextSource }, { syncPending: false });
      return;
    }
    this.updateState({ titleSource: nextSource });
  }

  updateParticipants(participants: Array<Record<string, any>>): void {
    this.updateState({ participants });
  }

  updateFieldDefinitions(fieldDefinitions: Array<Record<string, any>>): void {
    this.updateState({ fieldDefinitions });
  }

  updateFieldPlacements(fieldPlacements: Array<Record<string, any>>): void {
    this.updateState({ fieldPlacements });
  }

  markSynced(serverDraftId: string, serverRevision: number): void {
    this.setState({
      ...this.getState(),
      serverDraftId,
      serverRevision,
      lastSyncedAt: this.now(),
      syncPending: false,
    }, { syncPending: false });
  }

  bindResourceRef(resourceRef: SyncCoreResourceRef | null, options: { notify?: boolean; save?: boolean } = {}): void {
    const normalizedRef = this.normalizeResourceRef(resourceRef);
    this.setState({
      ...this.getState(),
      resourceRef: normalizedRef,
      serverDraftId: normalizedRef?.id || null,
    }, {
      save: options.save,
      notify: options.notify,
      syncPending: false,
    });
  }

  applyServerSnapshot(
    snapshot: SyncCoreResourceSnapshot<Record<string, any>>,
    options: { notify?: boolean; save?: boolean; preserveDirty?: boolean } = {},
  ): Record<string, any> {
    const localState = this.getState();
    const preserveDirty = options.preserveDirty === true && localState.syncPending === true;
    if (preserveDirty) {
      this.setState({
        ...localState,
        resourceRef: snapshot.ref,
        serverDraftId: snapshot.ref.id,
        serverRevision: snapshot.revision,
        lastSyncedAt: snapshot.updatedAt,
        syncPending: true,
      }, {
        save: options.save,
        notify: options.notify,
        syncPending: true,
      });
      return this.getState();
    }

    const payload = snapshot?.data && typeof snapshot.data === 'object'
      ? snapshot.data
      : {};
    const nextState = this.normalizeLoadedState({
      ...(payload?.wizard_state && typeof payload.wizard_state === 'object' ? payload.wizard_state : {}),
      resourceRef: snapshot.ref,
      serverDraftId: snapshot.ref.id,
      serverRevision: snapshot.revision,
      lastSyncedAt: snapshot.updatedAt,
      syncPending: false,
    });
    this.setState(nextState, {
      save: options.save,
      notify: options.notify,
      syncPending: false,
    });
    return this.getState();
  }

  applyRemoteSync(serverDraftId: string, serverRevision: number, options: { lastSyncedAt?: string; save?: boolean; notify?: boolean } = {}): {
    preservedLocalChanges: boolean;
    state: Record<string, any>;
  } {
    const localState = this.getState();
    const preserveDirty = localState.syncPending === true;
    const nextDraftID = String(serverDraftId ?? '').trim() || null;
    const nextRevision = this.options.parsePositiveInt(serverRevision, 0);
    this.setState({
      ...localState,
      serverDraftId: nextDraftID || localState.serverDraftId,
      serverRevision: nextRevision > 0 ? nextRevision : localState.serverRevision,
      lastSyncedAt: String(options.lastSyncedAt || this.now()).trim() || localState.lastSyncedAt,
      syncPending: preserveDirty,
    }, {
      syncPending: preserveDirty,
      save: options.save,
      notify: options.notify,
    });
    return {
      preservedLocalChanges: preserveDirty,
      state: this.getState(),
    };
  }

  applyRemoteState(remoteState: Record<string, any>, options: { save?: boolean; notify?: boolean } = {}): {
    preservedLocalChanges: boolean;
    replacedLocalState: boolean;
    state: Record<string, any>;
  } {
    const normalizedRemote = this.normalizeLoadedState(remoteState);
    const localState = this.getState();
    const preserveDirty = localState.syncPending === true;
    if (preserveDirty) {
      this.setState({
        ...localState,
        serverDraftId: normalizedRemote.serverDraftId || localState.serverDraftId,
        serverRevision: Math.max(
          this.options.parsePositiveInt(localState.serverRevision, 0),
          this.options.parsePositiveInt(normalizedRemote.serverRevision, 0),
        ),
        lastSyncedAt: normalizedRemote.lastSyncedAt || localState.lastSyncedAt,
        syncPending: true,
      }, {
        syncPending: true,
        save: options.save,
        notify: options.notify,
      });
      return {
        preservedLocalChanges: true,
        replacedLocalState: false,
        state: this.getState(),
      };
    }

    this.setState(normalizedRemote, {
      syncPending: Boolean(normalizedRemote.syncPending),
      save: options.save,
      notify: options.notify,
    });
    return {
      preservedLocalChanges: false,
      replacedLocalState: true,
      state: this.getState(),
    };
  }

  clear(): void {
    const storage = this.storage();
    this.state = this.createInitialState();
    storage?.removeItem(this.options.storageKey);
    this.notifyListeners();
  }

  hasResumableState(): boolean {
    return this.options.hasMeaningfulWizardProgress(this.getState());
  }

  onStateChange(callback: (state: Record<string, any>) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((listener) => listener !== callback);
    };
  }

  notifyListeners(): void {
    const snapshot = this.getState();
    this.listeners.forEach((callback) => callback(snapshot));
  }

  collectFormState(): Record<string, any> {
    const state = this.getState();
    const formState = this.options.collectFormState();
    const details = formState.details && typeof formState.details === 'object'
      ? formState.details
      : {};
    const activeTitleSource = this.options.normalizeTitleSource(
      formState.titleSource,
      String(details.title || '').trim() === ''
        ? this.options.titleSource.AUTOFILL
        : this.options.titleSource.USER,
    );

    return {
      ...formState,
      resourceRef: state.resourceRef || null,
      titleSource: activeTitleSource,
      serverDraftId: state.serverDraftId,
      serverRevision: state.serverRevision,
      lastSyncedAt: state.lastSyncedAt,
      currentStep: state.currentStep,
      wizardId: state.wizardId,
      version: state.version,
      createdAt: state.createdAt,
      updatedAt: this.now(),
      syncPending: true,
    };
  }
}
