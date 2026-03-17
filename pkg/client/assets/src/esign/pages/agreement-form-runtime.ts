// @ts-nocheck

import type { AgreementFormRuntime } from './agreement-form/context';
import { createAgreementFormRuntimeCoordinator } from './agreement-form/composition';

export interface AgreementFormRuntimeConfig {
  sync?: {
    base_url?: string;
    bootstrap_path?: string;
    client_base_path?: string;
    resource_kind?: string;
    storage_scope?: string;
    action_operations?: string[];
  };
  base_path?: string;
  api_base_path?: string;
  is_edit?: boolean;
  create_success?: boolean;
  submit_mode?: 'form' | 'json' | string;
  agreement_id?: string;
  active_agreement_id?: string;
  routes?: { index?: string; documents?: string; create?: string; documents_upload_url?: string };
  initial_participants?: Array<Record<string, any>>;
  initial_field_instances?: Array<Record<string, any>>;
}

let activeAgreementFormRuntime: AgreementFormRuntime | null = null;

export function destroyAgreementFormRuntime(): void {
  activeAgreementFormRuntime?.destroy();
  activeAgreementFormRuntime = null;
  if (typeof window !== 'undefined') {
    delete window.__esignAgreementRuntime;
    delete window.__esignAgreementRuntimeInitialized;
  }
}

export function initAgreementFormRuntime(inputConfig: AgreementFormRuntimeConfig = {}): void {
  if (activeAgreementFormRuntime) {
    return;
  }

  const runtime = createAgreementFormRuntimeCoordinator(inputConfig);
  runtime.start();
  activeAgreementFormRuntime = runtime;
  if (typeof window !== 'undefined') {
    window.__esignAgreementRuntime = runtime;
    window.__esignAgreementRuntimeInitialized = true;
  }
}
