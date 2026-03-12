import type { WizardStateManager } from './state-manager';

export interface DraftSyncServiceOptions {
  stateManager: WizardStateManager;
  currentUserID: string;
  draftsEndpoint: string;
  draftEndpointWithUserID(url: string): string;
  draftRequestHeaders(includeContentType?: boolean): Record<string, string>;
  fetchImpl?: typeof fetch;
}

export class DraftSyncService {
  readonly stateManager: WizardStateManager;
  pendingSync: Promise<any> | null = null;
  retryCount = 0;
  retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly currentUserID: string;
  private readonly draftsEndpoint: string;
  private readonly draftEndpointWithUserID: (url: string) => string;
  private readonly draftRequestHeaders: (includeContentType?: boolean) => Record<string, string>;
  private readonly fetchImpl: typeof fetch;

  constructor(options: DraftSyncServiceOptions) {
    this.stateManager = options.stateManager;
    this.currentUserID = options.currentUserID;
    this.draftsEndpoint = options.draftsEndpoint;
    this.draftEndpointWithUserID = options.draftEndpointWithUserID;
    this.draftRequestHeaders = options.draftRequestHeaders;
    this.fetchImpl = options.fetchImpl || fetch.bind(globalThis);
  }

  async create(state: Record<string, any>): Promise<any> {
    const payload = {
      wizard_id: state.wizardId,
      wizard_state: state,
      title: state.details.title || 'Untitled Agreement',
      current_step: state.currentStep,
      document_id: state.document.id || null,
      created_by_user_id: this.currentUserID,
    };

    const response = await this.fetchImpl(this.draftEndpointWithUserID(this.draftsEndpoint), {
      method: 'POST',
      credentials: 'same-origin',
      headers: this.draftRequestHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({} as any));
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async update(draftId: string, state: Record<string, any>, expectedRevision: number): Promise<any> {
    const payload = {
      expected_revision: expectedRevision,
      wizard_state: state,
      title: state.details.title || 'Untitled Agreement',
      current_step: state.currentStep,
      document_id: state.document.id || null,
      updated_by_user_id: this.currentUserID,
    };

    const response = await this.fetchImpl(this.draftEndpointWithUserID(`${this.draftsEndpoint}/${draftId}`), {
      method: 'PUT',
      credentials: 'same-origin',
      headers: this.draftRequestHeaders(),
      body: JSON.stringify(payload),
    });

    if (response.status === 409) {
      const error = await response.json().catch(() => ({} as any));
      const conflict = new Error('stale_revision') as Error & { code?: string; currentRevision?: number };
      conflict.code = 'stale_revision';
      conflict.currentRevision = error.error?.details?.current_revision;
      throw conflict;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({} as any));
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async load(draftId: string): Promise<any> {
    const response = await this.fetchImpl(this.draftEndpointWithUserID(`${this.draftsEndpoint}/${draftId}`), {
      credentials: 'same-origin',
      headers: this.draftRequestHeaders(false),
    });

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }

    return response.json();
  }

  async delete(draftId: string): Promise<void> {
    const response = await this.fetchImpl(this.draftEndpointWithUserID(`${this.draftsEndpoint}/${draftId}`), {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: this.draftRequestHeaders(false),
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`HTTP ${response.status}`);
    }
  }

  async list(): Promise<any> {
    const response = await this.fetchImpl(this.draftEndpointWithUserID(`${this.draftsEndpoint}?limit=10`), {
      credentials: 'same-origin',
      headers: this.draftRequestHeaders(false),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  }

  async sync(): Promise<{ success: boolean; result?: any; conflict?: boolean; currentRevision?: number; error?: string }> {
    const state = this.stateManager.getState();
    if (!state.syncPending) return { success: true, result: null };

    try {
      let result;
      if (state.serverDraftId) {
        result = await this.update(state.serverDraftId, state, state.serverRevision);
      } else {
        result = await this.create(state);
      }

      this.stateManager.markSynced(result.id, result.revision);
      this.retryCount = 0;
      return { success: true, result };
    } catch (error: any) {
      if (error?.code === 'stale_revision') {
        return { success: false, conflict: true, currentRevision: error.currentRevision };
      }
      return { success: false, error: error?.message || 'sync_failed' };
    }
  }
}
