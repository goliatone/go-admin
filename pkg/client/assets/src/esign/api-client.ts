/**
 * E-Sign API Client
 * Centralized API client for all e-sign operations
 */

import type {
  AgreementSummary,
  AgreementStats,
  DocumentSummary,
  ListResponse,
  APIResponse,
  APIError,
  GoogleIntegrationStatus,
  GoogleImportRun,
  DraftSummary,
  DraftDetail,
  WizardState,
} from './types.js';

export interface ESignAPIClientConfig {
  basePath: string;
  apiBasePath?: string;
  defaultHeaders?: Record<string, string>;
}

export class ESignAPIClient {
  private readonly basePath: string;
  private readonly apiBasePath: string;
  private readonly defaultHeaders: Record<string, string>;

  constructor(config: ESignAPIClientConfig) {
    this.basePath = config.basePath;
    this.apiBasePath = config.apiBasePath || `${config.basePath}/api`;
    this.defaultHeaders = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...config.defaultHeaders,
    };
  }

  // Agreement endpoints
  async listAgreements(params?: {
    page?: number;
    per_page?: number;
    status?: string;
    search?: string;
  }): Promise<ListResponse<AgreementSummary>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.per_page) queryParams.set('per_page', String(params.per_page));
    if (params?.status) queryParams.set('status', params.status);
    if (params?.search) queryParams.set('search', params.search);

    return this.get<ListResponse<AgreementSummary>>(
      `/esign_agreements?${queryParams.toString()}`
    );
  }

  async getAgreementStats(): Promise<AgreementStats> {
    const allRows: AgreementSummary[] = [];
    let page = 1;
    const perPage = 200;
    const maxPages = 25;

    while (page <= maxPages) {
      const response = await this.listAgreements({ page, per_page: perPage });
      const rows = response.items || response.records || [];
      allRows.push(...rows);

      if (rows.length === 0 || allRows.length >= response.total) {
        break;
      }
      page += 1;
    }

    const counters: Partial<Record<string, number>> = {};
    for (const row of allRows) {
      const status = String(row?.status || '').trim().toLowerCase();
      if (!status) continue;
      counters[status] = (counters[status] || 0) + 1;
    }

    const pending = (counters.sent || 0) + (counters.in_progress || 0);
    const actionRequired = pending + (counters.declined || 0);

    return {
      draft: counters.draft || 0,
      sent: counters.sent || 0,
      in_progress: counters.in_progress || 0,
      completed: counters.completed || 0,
      voided: counters.voided || 0,
      declined: counters.declined || 0,
      expired: counters.expired || 0,
      pending,
      action_required: actionRequired,
    };
  }

  // Document endpoints
  async listDocuments(params?: {
    page?: number;
    per_page?: number;
    search?: string;
  }): Promise<ListResponse<DocumentSummary>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.per_page) queryParams.set('per_page', String(params.per_page));
    if (params?.search) queryParams.set('search', params.search);

    return this.get<ListResponse<DocumentSummary>>(
      `/esign_documents?${queryParams.toString()}`
    );
  }

  // Google integration endpoints
  async getGoogleIntegrationStatus(): Promise<GoogleIntegrationStatus> {
    return this.get<GoogleIntegrationStatus>('/v1/esign/integrations/google/status');
  }

  async startGoogleImport(params: {
    google_file_id: string;
    document_title?: string;
    agreement_title?: string;
  }): Promise<GoogleImportRun> {
    return this.post<GoogleImportRun>('/v1/esign/google-drive/imports', params);
  }

  async getGoogleImportStatus(importRunId: string): Promise<GoogleImportRun> {
    return this.get<GoogleImportRun>(`/v1/esign/google-drive/imports/${importRunId}`);
  }

  // Draft persistence endpoints
  async listDrafts(params?: {
    limit?: number;
    cursor?: string;
  }): Promise<{ drafts: DraftSummary[]; next_cursor: string | null; total: number }> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set('limit', String(params.limit));
    if (params?.cursor) queryParams.set('cursor', params.cursor);

    return this.get(`/v1/esign/drafts?${queryParams.toString()}`);
  }

  async getDraft(id: string): Promise<DraftDetail> {
    return this.get<DraftDetail>(`/v1/esign/drafts/${id}`);
  }

  async createDraft(params: {
    wizard_id: string;
    wizard_state: WizardState;
    title: string;
    current_step: number;
    document_id?: string | null;
  }): Promise<DraftDetail> {
    return this.post<DraftDetail>('/v1/esign/drafts', params);
  }

  async updateDraft(
    id: string,
    params: {
      expected_revision: number;
      wizard_state: WizardState;
      title: string;
      current_step: number;
      document_id?: string | null;
    }
  ): Promise<DraftDetail> {
    return this.put<DraftDetail>(`/v1/esign/drafts/${id}`, params);
  }

  async deleteDraft(id: string): Promise<void> {
    return this.delete(`/v1/esign/drafts/${id}`);
  }

  async sendDraft(
    id: string,
    params: { expected_revision: number }
  ): Promise<{
    agreement_id: string;
    status: 'queued' | 'sent';
    draft_id: string;
    draft_deleted: boolean;
  }> {
    return this.post(`/v1/esign/drafts/${id}/send`, params);
  }

  // Generic HTTP methods
  private async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.apiBasePath}${path}`, {
      method: 'GET',
      headers: this.defaultHeaders,
    });
    return this.handleResponse<T>(response);
  }

  private async post<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.apiBasePath}${path}`, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  private async put<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.apiBasePath}${path}`, {
      method: 'PUT',
      headers: this.defaultHeaders,
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(response);
  }

  private async delete<T>(path: string): Promise<T> {
    const response = await fetch(`${this.apiBasePath}${path}`, {
      method: 'DELETE',
      headers: this.defaultHeaders,
    });
    return this.handleResponse<T>(response);
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let error: APIError;
      try {
        const errorData = await response.json();
        error = errorData.error || {
          code: `HTTP_${response.status}`,
          message: response.statusText,
        };
      } catch {
        error = {
          code: `HTTP_${response.status}`,
          message: response.statusText,
        };
      }
      throw new ESignAPIError(error.code, error.message, error.details);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }
}

export class ESignAPIError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ESignAPIError';
  }
}

// Singleton instance management
let defaultClient: ESignAPIClient | null = null;

export function getESignClient(): ESignAPIClient {
  if (!defaultClient) {
    throw new Error('ESign API client not initialized. Call setESignClient first.');
  }
  return defaultClient;
}

export function setESignClient(client: ESignAPIClient): void {
  defaultClient = client;
}

export function createESignClient(config: ESignAPIClientConfig): ESignAPIClient {
  const client = new ESignAPIClient(config);
  setESignClient(client);
  return client;
}
