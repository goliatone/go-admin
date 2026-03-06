import { type AgreementFormRuntimeConfig } from './agreement-form-runtime.js';
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
export declare class AgreementFormController {
    private readonly config;
    private initialized;
    constructor(config: AgreementFormConfig);
    init(): void;
    destroy(): void;
}
export declare function initAgreementForm(config: AgreementFormConfig): AgreementFormController;
export declare function bootstrapAgreementForm(config: {
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
}): void;
//# sourceMappingURL=agreement-form.d.ts.map