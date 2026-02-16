/**
 * E-Sign API Client
 * Centralized API client for all e-sign operations
 */
import type { AgreementSummary, AgreementStats, DocumentSummary, ListResponse, GoogleIntegrationStatus, GoogleImportRun, DraftSummary, DraftDetail, WizardState } from './types.js';
export interface ESignAPIClientConfig {
    basePath: string;
    apiBasePath?: string;
    defaultHeaders?: Record<string, string>;
}
export declare class ESignAPIClient {
    private readonly basePath;
    private readonly apiBasePath;
    private readonly defaultHeaders;
    constructor(config: ESignAPIClientConfig);
    listAgreements(params?: {
        page?: number;
        per_page?: number;
        status?: string;
        search?: string;
    }): Promise<ListResponse<AgreementSummary>>;
    getAgreementStats(): Promise<AgreementStats>;
    listDocuments(params?: {
        page?: number;
        per_page?: number;
        search?: string;
    }): Promise<ListResponse<DocumentSummary>>;
    getGoogleIntegrationStatus(): Promise<GoogleIntegrationStatus>;
    startGoogleImport(params: {
        google_file_id: string;
        document_title?: string;
        agreement_title?: string;
    }): Promise<GoogleImportRun>;
    getGoogleImportStatus(importRunId: string): Promise<GoogleImportRun>;
    listDrafts(params?: {
        limit?: number;
        cursor?: string;
    }): Promise<{
        drafts: DraftSummary[];
        next_cursor: string | null;
        total: number;
    }>;
    getDraft(id: string): Promise<DraftDetail>;
    createDraft(params: {
        wizard_id: string;
        wizard_state: WizardState;
        title: string;
        current_step: number;
        document_id?: string | null;
    }): Promise<DraftDetail>;
    updateDraft(id: string, params: {
        expected_revision: number;
        wizard_state: WizardState;
        title: string;
        current_step: number;
        document_id?: string | null;
    }): Promise<DraftDetail>;
    deleteDraft(id: string): Promise<void>;
    sendDraft(id: string, params: {
        expected_revision: number;
    }): Promise<{
        agreement_id: string;
        status: 'queued' | 'sent';
        draft_id: string;
        draft_deleted: boolean;
    }>;
    private get;
    private post;
    private put;
    private delete;
    private handleResponse;
}
export declare class ESignAPIError extends Error {
    readonly code: string;
    readonly details?: Record<string, unknown> | undefined;
    constructor(code: string, message: string, details?: Record<string, unknown> | undefined);
}
export declare function getESignClient(): ESignAPIClient;
export declare function setESignClient(client: ESignAPIClient): void;
export declare function createESignClient(config: ESignAPIClientConfig): ESignAPIClient;
//# sourceMappingURL=api-client.d.ts.map