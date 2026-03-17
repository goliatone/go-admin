import type { DocumentPreviewCard } from './preview-card';
import type { AgreementFormRefs } from './refs';
import type { WizardStateManager } from './state-manager';
import type { DraftSyncService } from './draft-sync-service';
import type { ActiveTabController } from './active-tab-controller';
import type { SyncController } from './sync-controller';

export interface NormalizedAgreementFormConfig {
  sync?: {
    base_url: string;
    bootstrap_path: string;
    client_base_path: string;
    resource_kind: string;
    storage_scope: string;
    action_operations: string[];
  };
  base_path: string;
  api_base_path: string;
  is_edit: boolean;
  create_success: boolean;
  submit_mode: string;
  agreement_id?: string;
  active_agreement_id?: string;
  routes: {
    index: string;
    documents: string;
    create: string;
    documents_upload_url: string;
  };
  initial_participants: Array<Record<string, any>>;
  initial_field_instances: Array<Record<string, any>>;
}

export interface AgreementFormRuntime {
  start(): void;
  destroy(): void;
}

export interface AgreementFormContext {
  config: NormalizedAgreementFormConfig;
  refs: AgreementFormRefs;
  basePath: string;
  apiBase: string;
  apiVersionBase: string;
  previewCard: DocumentPreviewCard;
  emitTelemetry(eventName: string, fields?: Record<string, unknown>): void;
  stateManager: WizardStateManager;
  syncService: DraftSyncService;
  activeTabController: ActiveTabController;
  syncController: SyncController;
}
