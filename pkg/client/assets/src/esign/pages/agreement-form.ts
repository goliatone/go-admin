import { onReady } from '../utils/dom-helpers.js';
import {
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
    base_path: String(config.base_path || config.basePath || '').trim(),
    api_base_path: String(config.api_base_path || config.apiBasePath || '').trim(),
    user_id: String(config.user_id || '').trim(),
    is_edit: Boolean(config.is_edit ?? config.isEditMode),
    create_success: Boolean(config.create_success ?? config.createSuccess),
    submit_mode: String(config.submit_mode || 'form').trim().toLowerCase(),
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
    this.initialized = false;
  }
}

export function initAgreementForm(config: AgreementFormConfig): AgreementFormController {
  const controller = new AgreementFormController(config);
  onReady(() => controller.init());
  return controller;
}

export function bootstrapAgreementForm(config: {
  basePath?: string;
  apiBasePath?: string;
  base_path?: string;
  api_base_path?: string;
  user_id?: string;
  isEditMode?: boolean;
  is_edit?: boolean;
  createSuccess?: boolean;
  create_success?: boolean;
  submit_mode?: 'form' | 'json' | string;
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
    basePath: config.basePath,
    apiBasePath: config.apiBasePath,
    base_path: config.base_path,
    api_base_path: config.api_base_path,
    user_id: config.user_id,
    isEditMode: config.isEditMode,
    is_edit: config.is_edit,
    createSuccess: config.createSuccess,
    create_success: config.create_success,
    submit_mode: config.submit_mode || 'form',
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
        base_path: config.base_path || config.basePath,
        api_base_path: config.api_base_path || config.apiBasePath,
        user_id: config.user_id || config.userId,
        is_edit: config.is_edit || config.isEditMode || false,
        create_success: config.create_success || config.createSuccess || false,
        submit_mode: config.submit_mode || 'form',
        initial_participants: Array.isArray(config.initial_participants) ? config.initial_participants : [],
        initial_field_instances: Array.isArray(config.initial_field_instances) ? config.initial_field_instances : [],
        routes: config.routes || { index: '' },
      });
    } catch (error) {
      console.warn('Failed to parse agreement form page config:', error);
    }
  });
}
