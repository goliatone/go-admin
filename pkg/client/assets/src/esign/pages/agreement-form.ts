import { onReady } from '../utils/dom-helpers.js';
import {
  destroyAgreementFormRuntime,
  initAgreementFormRuntime,
  type AgreementFormRuntimeConfig,
} from './agreement-form-runtime.js';

export interface AgreementFormConfig extends AgreementFormRuntimeConfig {
  basePath?: string;
  apiBasePath?: string;
  isEditMode?: boolean;
  createSuccess?: boolean;
  routes: {
    index: string;
    documents?: string;
    create?: string;
    documents_upload_url?: string;
  };
}

function normalizeAgreementFormConfig(config: AgreementFormConfig): AgreementFormRuntimeConfig {
  return {
    sync: config.sync && typeof config.sync === 'object'
      ? {
        base_url: String(config.sync.base_url || '').trim(),
        bootstrap_path: String(config.sync.bootstrap_path || '').trim(),
        client_base_path: String(config.sync.client_base_path || '').trim(),
        resource_kind: String(config.sync.resource_kind || '').trim(),
        storage_scope: String(config.sync.storage_scope || '').trim(),
        action_operations: Array.isArray(config.sync.action_operations)
          ? config.sync.action_operations.map((value) => String(value || '').trim()).filter(Boolean)
          : [],
      }
      : undefined,
    base_path: String(config.base_path || config.basePath || '').trim(),
    api_base_path: String(config.api_base_path || config.apiBasePath || '').trim(),
    is_edit: Boolean(config.is_edit ?? config.isEditMode),
    create_success: Boolean(config.create_success ?? config.createSuccess),
    submit_mode: String(config.submit_mode || 'json').trim().toLowerCase(),
    agreement_id: String(config.agreement_id || '').trim(),
    active_agreement_id: String(config.active_agreement_id || '').trim(),
    routes: {
      index: String(config.routes?.index || '').trim(),
      documents: String(config.routes?.documents || '').trim(),
      create: String(config.routes?.create || '').trim(),
      documents_upload_url: String(config.routes?.documents_upload_url || '').trim(),
    },
    initial_participants: Array.isArray(config.initial_participants) ? config.initial_participants : [],
    initial_field_instances: Array.isArray(config.initial_field_instances) ? config.initial_field_instances : [],
  };
}

export class AgreementFormController {
  private readonly config: AgreementFormRuntimeConfig;
  private initialized = false;

  constructor(config: AgreementFormConfig) {
    this.config = normalizeAgreementFormConfig(config);
  }

  init(): void {
    if (this.initialized) return;
    this.initialized = true;
    initAgreementFormRuntime(this.config);
  }

  destroy(): void {
    destroyAgreementFormRuntime();
    this.initialized = false;
  }
}

export function initAgreementForm(config: AgreementFormConfig): AgreementFormController {
  const controller = new AgreementFormController(config);
  onReady(() => controller.init());
  return controller;
}

export function bootstrapAgreementForm(config: {
  sync?: {
    base_url?: string;
    bootstrap_path?: string;
    client_base_path?: string;
    resource_kind?: string;
    storage_scope?: string;
    action_operations?: string[];
  };
  basePath?: string;
  apiBasePath?: string;
  base_path?: string;
  api_base_path?: string;
  isEditMode?: boolean;
  is_edit?: boolean;
  createSuccess?: boolean;
  create_success?: boolean;
  submit_mode?: 'form' | 'json' | string;
  agreement_id?: string;
  active_agreement_id?: string;
  initial_participants?: Array<Record<string, any>>;
  initial_field_instances?: Array<Record<string, any>>;
  routes: {
    index: string;
    documents?: string;
    create?: string;
    documents_upload_url?: string;
  };
}): void {
  const controller = new AgreementFormController({
    sync: config.sync,
    basePath: config.basePath,
    apiBasePath: config.apiBasePath,
    base_path: config.base_path,
    api_base_path: config.api_base_path,
    isEditMode: config.isEditMode,
    is_edit: config.is_edit,
    createSuccess: config.createSuccess,
    create_success: config.create_success,
    submit_mode: config.submit_mode || 'json',
    agreement_id: config.agreement_id,
    active_agreement_id: config.active_agreement_id,
    initial_participants: config.initial_participants || [],
    initial_field_instances: config.initial_field_instances || [],
    routes: config.routes,
  });

  onReady(() => controller.init());

  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).esignAgreementFormController = controller;
  }
}

if (typeof document !== 'undefined') {
  onReady(() => {
    const pageEl = document.querySelector('[data-esign-page="agreement-form"]');
    if (!pageEl) return;
    const configScript = document.getElementById('esign-page-config');
    if (!configScript) return;

    try {
      const config = JSON.parse(configScript.textContent || '{}');
      bootstrapAgreementForm({
        sync: config.sync && typeof config.sync === 'object' ? config.sync : undefined,
        base_path: config.base_path || config.basePath,
        api_base_path: config.api_base_path || config.apiBasePath,
        is_edit: config.is_edit || config.isEditMode || false,
        create_success: config.create_success || config.createSuccess || false,
        submit_mode: config.submit_mode || 'json',
        agreement_id: config.agreement_id || '',
        active_agreement_id: config.active_agreement_id || '',
        initial_participants: Array.isArray(config.initial_participants) ? config.initial_participants : [],
        initial_field_instances: Array.isArray(config.initial_field_instances) ? config.initial_field_instances : [],
        routes: config.routes || { index: '' },
      });
    } catch (error) {
      console.warn('Failed to parse agreement form page config:', error);
    }
  });
}
